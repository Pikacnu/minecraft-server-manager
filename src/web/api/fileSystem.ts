import { FileControllerManager } from '@/manager/file-manager';
import { DirectoryType, type DirectoryStructure } from '@/utils/type';

function normalizeFileStructure(
  fileStructure: Record<string, string | Record<string, string>>,
  isRoot = true,
): DirectoryStructure {
  const currentLevelEntries = Object.entries(fileStructure);
  let result: DirectoryStructure = {
    name: isRoot ? '/' : '',
    type: DirectoryType.Directory,
    children: [],
  } as DirectoryStructure;
  if (isRoot) {
    result = {
      name: '/',
      type: DirectoryType.Directory,
      children: [],
    };
  }

  currentLevelEntries.forEach(([name, value]) => {
    if (typeof value === 'string') {
      result.children!.push({
        name,
        type: DirectoryType.File,
      });
      return;
    }
    const childStructure = normalizeFileStructure(value, false);
    result.children!.push({
      name,
      type: DirectoryType.Directory,
      children: childStructure.children,
    });
  });
  return result;
}

export async function GET(request: Request) {
  const searcghParams = new URL(request.url).searchParams;
  const name = searcghParams.get('name');
  const type = searcghParams.get('type');
  if (['file', 'structure'].includes(type ?? '') === false) {
    return Response.json(
      {
        success: false,
        message: 'Invalid "type" query parameter.',
      },
      { status: 400 },
    );
  }
  if (!name) {
    return Response.json(
      {
        success: false,
        message: 'Missing "name" query parameter.',
      },
      { status: 400 },
    );
  }
  try {
    const controller = FileControllerManager.getController(name);
    if (!controller) {
      return Response.json(
        {
          success: false,
          message: `FileController for ${name} does not exist.`,
        },
        { status: 404 },
      );
    }
    switch (type) {
      case 'structure': {
        const fileList = normalizeFileStructure(controller.getFileStructure());
        return Response.json({
          success: true,
          data: fileList,
        });
      }
      case 'file': {
        const fileContent = await controller.readFile(
          searcghParams.get('path') || '',
        );
        return Response.json({
          success: true,
          data: fileContent,
        });
      }
      default:
        return Response.json(
          {
            success: false,
            message: 'Invalid "type" query parameter.',
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Error fetching file structure:', error);
    return Response.json(
      {
        success: false,
        message: 'Error fetching file structure.',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const content = await request.text();
  const searcghParams = new URL(request.url).searchParams;
  const name = searcghParams.get('name');
  const type = searcghParams.get('type');
  if (type !== 'file') {
    return Response.json(
      {
        success: false,
        message: 'Invalid "type" query parameter.',
      },
      { status: 400 },
    );
  }
  if (!name) {
    return Response.json(
      {
        success: false,
        message: 'Missing "name" query parameter.',
      },
      { status: 400 },
    );
  }
  try {
    const controller = FileControllerManager.getController(name);
    if (!controller) {
      return Response.json(
        {
          success: false,
          message: `FileController for ${name} does not exist.`,
        },
        { status: 404 },
      );
    }
    await controller.writeFile(searcghParams.get('path') || '', content);
    return Response.json({
      success: true,
      message: 'File written successfully.',
    });
  } catch (error) {
    console.error('Error writing file:', error);
    return Response.json(
      {
        success: false,
        message: 'Error writing file.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    path: string;
    content: string;
    type: DirectoryType;
  };
  const { name, path, content, type } = body;
  if (
    !['file', 'directory'].includes(type) ||
    ['name', 'path', 'type'].some((key) => !(key in body)) ||
    !name ||
    !path ||
    (type === 'file' && content === undefined)
  ) {
    return Response.json(
      {
        success: false,
        message: 'Invalid request body.',
      },
      { status: 400 },
    );
  }
  try {
    const controller = FileControllerManager.getController(name);
    if (!controller) {
      return Response.json(
        {
          success: false,
          message: `FileController for ${name} does not exist.`,
        },
        { status: 404 },
      );
    }
    switch (type) {
      case DirectoryType.File:
        await controller.writeFile(path, content);
        break;
      case DirectoryType.Directory:
        await controller.createDirectory(path);
        break;
    }
    return Response.json({
      success: true,
      message: `${
        type === 'file' ? 'File' : 'Directory'
      } created successfully.`,
    });
  } catch (error) {
    console.error('Error creating file/directory:', error);
    return Response.json(
      {
        success: false,
        message: 'Error creating file/directory.',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as {
    name: string;
    path: string;
    type: DirectoryType;
    recursive: boolean;
  };
  const { name, path, type, recursive } = body;
  if (
    !['file', 'directory'].includes(type) ||
    ['name', 'path', 'type', 'recursive'].some((key) => !(key in body)) ||
    !name ||
    !path
  ) {
    return Response.json(
      {
        success: false,
        message: 'Invalid request body.',
      },
      { status: 400 },
    );
  }
  try {
    const controller = FileControllerManager.getController(name);
    if (!controller) {
      return Response.json(
        {
          success: false,
          message: `FileController for ${name} does not exist.`,
        },
        { status: 404 },
      );
    }
    switch (type) {
      case DirectoryType.File:
        await controller.deleteFile(path);
        break;
      case DirectoryType.Directory:
        await controller.deleteDirectory(path, recursive);
        break;
      default:
        return Response.json(
          {
            success: false,
            message: 'Invalid "type" parameter.',
          },
          { status: 400 },
        );
    }
    return Response.json({
      success: true,
      message: `${
        type === 'file' ? 'File' : 'Directory'
      } deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting file/directory:', error);
    return Response.json(
      {
        success: false,
        message: 'Error deleting file/directory.',
      },
      { status: 500 },
    );
  }
}

export default {
  GET,
  PUT,
  POST,
  DELETE,
};
