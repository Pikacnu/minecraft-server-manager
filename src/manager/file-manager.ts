import { ManagerMountPath, NFSPath } from '@/utils/config';
import { join, relative, resolve, normalize, isAbsolute } from 'node:path';
import { file, Glob } from 'bun';
import { lstat, mkdir, rmdir } from 'node:fs/promises';

export class FileController {
  private name: string;
  private basePath: string;
  private fileScanner: Glob;
  private fileStructure: Record<string, string | Record<string, string>> = {};
  private initialized: boolean = false;
  private filter: Filter = new Filter();
  private isAllowHiddenFiles: boolean = false;
  private isReadonly: boolean = false;

  private fileSet: Set<string> = new Set();
  private directorySet: Set<string> = new Set();

  constructor(
    name: string,
    {
      filter = defaultFilter,
      isAllowHiddenFiles = false,
      readonly = false,
    }: Partial<{
      filter?: Filter;
      isAllowHiddenFiles?: boolean;
      readonly?: boolean;
    }>,
  ) {
    this.name = name;
    this.basePath = join(NFSPath, ManagerMountPath, this.name);
    this.fileScanner = new Glob('**/*');
    this.initialize();
    if (filter) {
      this.filter = filter;
    }
    this.isAllowHiddenFiles = isAllowHiddenFiles;
    this.isReadonly = readonly;
  }

  public async initialize() {
    if (this.initialized) return;
    await this.buildFileStructure();
    this.initialized = true;
  }

  private async buildFileStructure() {
    this.fileStructure = {};
    const files = this.fileScanner.scan({
      cwd: this.basePath,
      dot: this.isAllowHiddenFiles,
      onlyFiles: true,
    });
    for await (const filePath of files) {
      const relativePath = normalize(filePath).replaceAll('\\', '/');
      this.fileSet.add(relativePath);
      if (!this.filter.matches(relativePath)) {
        continue;
      }
      const pathToFile = relativePath.split('/');
      let currentLevel = this.fileStructure;
      for (let i = 0; i < pathToFile.length; i++) {
        const dir = pathToFile[i]!;
        if (i === pathToFile.length - 1) {
          if (dir === '' || dir === '/') continue;
          currentLevel[dir] = relativePath;
          if (pathToFile.length > 1) {
            this.directorySet.add(
              pathToFile.slice(0, pathToFile.length - 1).join('/'),
            );
          }
        } else {
          if (!(dir in currentLevel)) {
            currentLevel[dir] = {};
            this.directorySet.add(
              pathToFile.slice(0, pathToFile.length - 2).join('/'),
            );
          }
          currentLevel = currentLevel[dir] as Record<
            string,
            string | Record<string, string>
          >;
        }
      }
    }
  }

  public getFileStructure(
    path: string = '',
  ): Record<string, string | Record<string, string>> {
    if (!this.initialized) {
      throw new Error('FileManager not initialized yet.');
    }
    if (path === '') {
      return this.fileStructure;
    }
    const segments = normalize(path).split(/\/|\\/);
    let currentLevel: any = this.fileStructure;
    for (const segment of segments) {
      if (segment in currentLevel) {
        currentLevel = currentLevel[segment];
      } else {
        throw new Error('Path does not exist in file structure.');
      }
    }
    return currentLevel;
  }

  private isPathValid(filePath: string): boolean {
    const resolvedPath = resolve(this.basePath, filePath);
    const isRelative = relative(this.basePath, resolvedPath);
    if (!this.isAllowHiddenFiles) {
      const pathSegments = normalize(filePath).split(/\/|\\/);
      if (pathSegments.some((segment) => segment.startsWith('.'))) {
        return false;
      }
    }
    return !isRelative.startsWith('..') && !isAbsolute(isRelative);
  }

  public async readFile(filePath: string): Promise<string> {
    if (!this.isPathValid(filePath)) {
      throw new Error('Invalid file path.');
    }
    if (!this.fileSet.has(filePath)) {
      throw new Error('File does not exist.');
    }
    const fullPath = join(this.basePath, filePath);
    return await Bun.file(fullPath).text();
  }

  public async writeFile(
    filePath: string,
    data: Uint8Array | string,
  ): Promise<void> {
    if (this.isReadonly) throw new Error('FileManager is in read-only mode.');
    if (!this.isPathValid(filePath)) {
      throw new Error('Invalid file path.');
    }
    if (!this.filter.matches(filePath)) {
      throw new Error('File path is excluded by filter.');
    }
    const segments = normalize(filePath).split(/\/|\\/);
    let currentLevel = this.fileStructure;
    for (let i = 0; i < segments.length - 1; i++) {
      const dir = segments[i]!;
      if (!(dir in currentLevel)) {
        throw new Error('Directory does not exist in file structure.');
      }
      currentLevel = currentLevel[dir] as Record<
        string,
        string | Record<string, string>
      >;
    }
    const fileName = segments[segments.length - 1]!;
    currentLevel[fileName] = filePath;

    const fullPath = join(this.basePath, filePath);
    await Bun.write(fullPath, data);
    if (!this.fileSet.has(fullPath)) {
      this.fileSet.add(fullPath);
    }
  }

  public async deleteFile(filePath: string): Promise<void> {
    if (this.isReadonly) throw new Error('FileManager is in read-only mode.');
    if (!this.isPathValid(filePath)) {
      throw new Error('Invalid file path.');
    }
    const fullPath = join(this.basePath, filePath);
    await file(fullPath).delete();
    this.fileSet.delete(filePath);
    // Update file structure
    const segments = normalize(filePath).split(/\/|\\/);
    if (segments.length < 1) return;
    if (segments.length === 1) {
      delete this.fileStructure[segments[0]!];
    }
    let currentLevel = this.fileStructure;
    for (let i = 0; i < segments.length - 1; i++) {
      const dir = segments[i]!;
      if (!(dir in currentLevel)) {
        throw new Error('Directory does not exist in file structure.');
      }
      currentLevel = currentLevel[dir] as Record<
        string,
        string | Record<string, string>
      >;
    }
    delete currentLevel[segments[segments.length - 1]!];
  }

  public async createDirectory(dirPath: string): Promise<void> {
    if (this.isReadonly) throw new Error('FileManager is in read-only mode.');
    if (!this.isPathValid(dirPath)) {
      throw new Error('Invalid directory path.');
    }
    if (!this.filter.matches(dirPath)) {
      throw new Error('Directory path is excluded by filter.');
    }
    if (this.directorySet.has(dirPath)) {
      return;
    }
    const segments = normalize(dirPath).split(/\/|\\/);
    let currentLevel = this.fileStructure;
    for (let i = 0; i < segments.length; i++) {
      const dir = segments[i]!;
      if (!(dir in currentLevel)) {
        currentLevel[dir] = {};
      }
      currentLevel = currentLevel[dir] as Record<
        string,
        string | Record<string, string>
      >;
    }
    const fullPath = join(this.basePath, dirPath);
    await mkdir(fullPath, { recursive: true });
    this.directorySet.add(dirPath);
  }
  public async deleteDirectory(
    dirPath: string,
    recursive: boolean = false,
  ): Promise<void> {
    if (this.isReadonly) throw new Error('FileManager is in read-only mode.');
    if (!this.isPathValid(dirPath)) {
      throw new Error('Invalid directory path.');
    }
    if (!this.directorySet.has(dirPath)) {
      throw new Error('Directory does not exist.');
    }
    const segments = normalize(dirPath).split(/\/|\\/);
    if (!recursive) {
      const currentLevel = this.getFileStructure(dirPath);
      if (Object.keys(currentLevel).length > 0) {
        throw new Error('Directory is not empty.');
      }
    }
    const fullPath = join(this.basePath, dirPath);
    await rmdir(fullPath, { recursive });
    this.directorySet.delete(dirPath);
    if (segments.length < 1) return;
    if (segments.length === 1) {
      delete this.fileStructure[segments[0]!];
    }
    let currentLevel = this.fileStructure;
    for (let i = 0; i < segments.length - 2; i++) {
      const dir = segments[i]!;
      if (!(dir in currentLevel)) {
        throw new Error('Directory does not exist in file structure.');
      }
      if (i === segments.length - 2) {
        delete currentLevel[segments[i + 1]!];
        return;
      }
    }
  }
}

export class Filter {
  private include: RegExp[];
  private exclude: RegExp[];
  constructor(include: RegExp[] = [], exclude: RegExp[] = []) {
    this.include = include;
    this.exclude = exclude;
  }
  public matches(filePath: string): boolean {
    const isIncluded =
      this.include.length === 0 ||
      this.include.some((pattern) => pattern.test(filePath));
    const isExcluded = this.exclude.some((pattern) => pattern.test(filePath));
    return isIncluded && !isExcluded;
  }
  public addIncludePattern(pattern: RegExp) {
    this.include.push(pattern);
    return this;
  }
  public addExcludePattern(pattern: RegExp) {
    this.exclude.push(pattern);
    return this;
  }
}

export const defaultFilter = new Filter()
  // .addExcludePattern(/\.dat(_old)?$/)
  // .addExcludePattern(/region\//)
  // .addExcludePattern(/poi\//)
  // .addExcludePattern(/playerdata\//)
  // .addExcludePattern(/entities\//)
  // .addExcludePattern(/DIM.{0,2}\//)
  // .addExcludePattern(/DIM\//)
  .addExcludePattern(/logs\//)
  //.addExcludePattern(/\bserver\b\.jar$/)
  .addExcludePattern(/\.lock$/)
  .addExcludePattern(/cache\//)
  .addExcludePattern(/crash-reports\//)
  .addExcludePattern(/libraries\//)
  .addExcludePattern(/stats\//)
  .addExcludePattern(/.*(mc.*server|server.*mc).*\.jar$/);

export class FileControllerManager {
  private static controllers: Map<string, FileController> = new Map();

  public static async initialize(
    path?: string,
    options?: Partial<ConstructorParameters<typeof FileController>[1]>,
  ) {
    const basePath = join(NFSPath, ManagerMountPath, path || '');
    const directorys = new Glob('*').scan({
      cwd: basePath,
      onlyFiles: false,
    });
    for await (const dir of directorys) {
      const isDir = (await lstat(join(basePath, dir))).isDirectory();
      if (!isDir) continue;
      const controller = new FileController(dir, options || {});
      try {
        FileControllerManager.registerController(dir, controller);
      } catch (e) {}
    }
  }

  public static hasController(name: string): boolean {
    return FileControllerManager.controllers.has(name);
  }

  public static registerController(name: string, controller: FileController) {
    if (FileControllerManager.controllers.has(name)) {
      throw new Error(`FileController for ${name} already exists.`);
    }
    FileControllerManager.controllers.set(name, controller);
  }

  public static unregisterController(name: string) {
    if (!FileControllerManager.controllers.has(name)) {
      throw new Error(`FileController for ${name} does not exist.`);
    }
    FileControllerManager.controllers.delete(name);
  }

  public static getController(name: string): FileController {
    const controller = FileControllerManager.controllers.get(name);
    if (!controller) {
      throw new Error(`FileController for ${name} does not exist.`);
    }
    return controller;
  }

  public static listControllers(): string[] {
    return Array.from(FileControllerManager.controllers.keys());
  }
}
