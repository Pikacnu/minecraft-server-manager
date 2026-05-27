export const DirectoryType = {
  File: 'file',
  Directory: 'directory',
} as const;

export type DirectoryType = (typeof DirectoryType)[keyof typeof DirectoryType];

export type DirectoryFileType = 'compressed' | 'textFile';

export type DirectoryFile = {
  name: string;
  format: typeof DirectoryType.File;
  size: number;
  content?: string;
  fileType: DirectoryFileType;
};

export type DirectoryStructure = {
  children?: DirectoryStructure[];
  name: string;
  type: DirectoryType;
  file?: DirectoryFile;
};
