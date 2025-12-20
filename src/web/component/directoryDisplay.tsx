import { DirectoryType, type DirectoryStructure } from '@/utils/type';
import { Folder, File, CirclePlus } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';

enum FileCreatingState {
  None,
  Naming,
}

export default function DirectoryDisplay({
  fileStructure,
  currentPath,
  onNavigate,
  handleFileChange,
  handleFileRead,
  handleCreate,
  handleDelete,
}: {
  fileStructure: DirectoryStructure;
  currentPath: string[];
  onNavigate: (path: string[]) => void;
  handleFileChange: (path: string, content: string) => void;
  handleFileRead: (content: string) => Promise<string>;
  handleCreate: (path: string, type: DirectoryType) => void;
  handleDelete: (
    path: string,
    type: DirectoryType,
    recursive: boolean,
  ) => Promise<boolean>;
}) {
  const [currentFileStructure, setcurrentFileStructure] =
    useState<DirectoryStructure>(fileStructure);
  const [path, setPath] = useState<string[]>(currentPath);
  const [isOpenFile, setIsOpenFile] = useState<boolean>(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [creatingState, setCreatingState] = useState<FileCreatingState>(
    FileCreatingState.None,
  );
  const [currentCreatingType, setCurrentCreatingType] = useState<DirectoryType>(
    DirectoryType.File,
  );

  const openFilePath = useRef<string>('');
  const fileData = useRef('');
  const newNameRef = useRef<HTMLInputElement>(null);

  const [currentDirectory, setCurrentDirectory] = useMemo(() => {
    let dir = currentFileStructure;
    for (const segment of path) {
      if (
        dir.type !== DirectoryType.Directory ||
        !dir.children ||
        dir.children.length === 0
      ) {
        break;
      }
      const nextDir = dir.children.find(
        (child) =>
          child.type === DirectoryType.Directory && child.name === segment,
      ) as DirectoryStructure | undefined;
      if (nextDir) {
        dir = nextDir;
      }
    }
    return [dir, setPath] as const;
  }, [currentFileStructure, path]);

  const handleNavigate = (name: string) => {
    const newPath = [...path, name];
    setPath(newPath);
    onNavigate(newPath);
  };

  const handleNewFile = (path: string) => {
    handleCreate(`${path}`, DirectoryType.File);
  };

  const handleNewFolder = (path: string) => {
    handleCreate(`${path}`, DirectoryType.Directory);
  };

  const handleChangeFileContent = (content: string) => {
    handleFileChange(`${openFilePath.current}`, content);
    setFileContent('');
  };

  const handleDeleteFile = async (name: string): Promise<boolean> => {
    try {
      const success = await handleDelete(
        `${[...path, name].join('/')}`,
        DirectoryType.File,
        false,
      );
      return success;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  };

  const handleDeleteFolder = async (name: string): Promise<boolean> => {
    try {
      const success = await handleDelete(
        `${[...path, name].join('/')}`,
        DirectoryType.Directory,
        false,
      );
      return success;
    } catch (error) {
      console.error('Error deleting folder:', error);
      return false;
    }
  };

  useEffect(() => {
    setcurrentFileStructure(fileStructure);
  }, [fileStructure]);

  return (
    <div className='p-4 bg-gray-100 dark:bg-gray-800 rounded-lg h-full overflow-y-auto'>
      {isOpenFile && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-900 rounded-lg w-3/4 h-3/4 p-4 flex flex-col'>
            <div className='flex justify-between items-center mb-2'>
              <h2 className='text-lg font-semibold'>File Viewer</h2>
              <div className='flex flex-row gap-2'>
                <button
                  className='text-red-500 hover:text-red-700'
                  onClick={() => {
                    setIsOpenFile(false);
                    setFileContent(fileData.current);
                  }}
                >
                  Close
                </button>
                <button
                  className='text-green-500 hover:text-green-700'
                  onClick={() => {
                    handleChangeFileContent(fileData.current);
                    setIsOpenFile(false);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
            <div className='flex-1 overflow-auto'>
              <Editor
                height='100%'
                theme='vs-dark'
                language='yaml'
                value={fileContent}
                onChange={(value) => {
                  fileData.current = value || '';
                }}
                options={{ readOnly: false }}
              />
            </div>
          </div>
        </div>
      )}
      {FileCreatingState.Naming === creatingState && (
        <div className='mb-4 p-4 bg-gray-200 dark:bg-gray-700 rounded-lg absolute z-20'>
          <h3 className='text-md font-semibold mb-2'>Create New File/Folder</h3>
          <input
            type='text'
            placeholder='Enter name'
            ref={newNameRef}
            className='w-full p-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 placeholder:text-gray-400/80'
          />
          <div className='flex justify-end gap-2'>
            <button
              className='px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500'
              onClick={() => {
                setCreatingState(FileCreatingState.None);
                setIsCreating(false);
              }}
            >
              Cancel
            </button>
            <button
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
              onClick={() => {
                // Handle create file/folder action
                const newName = newNameRef.current;
                setCreatingState(FileCreatingState.None);
                setIsCreating(false);
                if (!newName || newName.value.trim() === '') {
                  return;
                }
                switch (currentCreatingType) {
                  case DirectoryType.File:
                    handleNewFile(`${[...path, newName.value].join('/')}`);
                    break;
                  case DirectoryType.Directory:
                    handleNewFolder(`${[...path, newName.value].join('/')}`);
                    break;
                  default:
                    break;
                }
                setcurrentFileStructure((prev) => {
                  const newItem: DirectoryStructure = {
                    name: newName.value,
                    type: currentCreatingType,
                  };

                  const updateStructure = (
                    root: DirectoryStructure,
                    p: string[],
                  ): DirectoryStructure => {
                    if (p.length === 0) {
                      return {
                        ...root,
                        children: root.children
                          ? [...root.children, newItem]
                          : [newItem],
                      };
                    }
                    const [head, ...tail] = p;
                    return {
                      ...root,
                      children: root.children?.map((child) => {
                        if (
                          child.name === head &&
                          child.type === DirectoryType.Directory
                        ) {
                          return updateStructure(child, tail);
                        }
                        return child;
                      }),
                    };
                  };

                  return updateStructure(prev, path);
                });
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}
      <div className='mb-4 flex select-none flex-row justify-between'>
        <p className='flex flex-row gap-2'>
          <span
            className='text-blue-600 dark:text-blue-400 cursor-pointer'
            onClick={() => {
              setPath([]);
              onNavigate([]);
            }}
          >
            /
          </span>
          {path.map((segment, index) => (
            <span
              key={index}
              className='text-blue-600 dark:text-blue-400 cursor-pointer flex gap-2'
              onClick={() => {
                const newPath = path.slice(0, index + 1);
                setPath(newPath);
                onNavigate(newPath);
              }}
            >
              {index > 0 && <span>/</span>}
              <span>{segment}</span>
            </span>
          ))}
        </p>
        <div
          className='flex flex-col relative'
          onClick={() => {
            setIsCreating(!isCreating);
            setCreatingState(FileCreatingState.None);
          }}
        >
          <button className='flex flex-row gap-2'>
            <CirclePlus /> Add File/Folder
          </button>
          {isCreating && (
            <div className='absolute top-full right-0 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-1 mt-2 z-10'>
              {['File', 'Folder'].map((type) => (
                <button
                  key={type}
                  className='block w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg'
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreating(false);
                    setCreatingState(FileCreatingState.Naming);
                    setCurrentCreatingType(
                      type === 'File'
                        ? DirectoryType.File
                        : DirectoryType.Directory,
                    );
                    console.log('Creating new', type);
                  }}
                >
                  New {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <ul>
        <li>
          <span
            className='mb-2 cursor-pointer hover:underline flex flex-row items-center gap-2 select-none'
            onClick={() => {
              if (path.length > 0) {
                const newPath = path.slice(0, path.length - 1);
                setPath(newPath);
                onNavigate(newPath);
              }
            }}
          >
            <Folder /> ..
          </span>
        </li>
        {currentDirectory.children && currentDirectory.children.length > 0 ? (
          currentDirectory.children.map((item) => (
            <li
              key={item.name}
              className='mb-2 cursor-pointer hover:underline flex flex-row items-center gap-2 select-none'
              onClick={() => {
                if (item.type === DirectoryType.Directory) {
                  handleNavigate(item.name);
                } else if (item.type === DirectoryType.File) {
                  setIsOpenFile(true);
                  //setFileContent(item.file?.content || '');
                  openFilePath.current = `${[...path, item.name].join('/')}`;
                  //setFileContent('Loading...');
                  handleFileRead(`${[...path, item.name].join('/')}`).then(
                    (content) => {
                      setFileContent(content);
                      fileData.current = content;
                    },
                  );
                }
              }}
            >
              <div className='flex flex-row justify-between w-full *:flex *:flex-row *:items-center *:gap-2 h-full transform-gpu'>
                <span>
                  {item.type === DirectoryType.Directory ? (
                    <Folder
                      scale={1}
                      className='text-yellow-500'
                    />
                  ) : (
                    <File
                      scale={1}
                      className='text-green-500'
                    />
                  )}
                  {item.name}
                </span>
                <p className='flex flex-row gap-2 text-gray-500 text-sm'>
                  <span>
                    {item.file?.size
                      ? `${(item.file.size / 1024).toFixed(2)} KB`
                      : item.type === DirectoryType.Directory
                      ? `${item.children ? item.children.length : 0} items`
                      : ''}
                  </span>
                  <button>
                    <span
                      className='text-red-500 hover:text-red-700'
                      onClick={(e) => {
                        e.stopPropagation();
                        (item.type === DirectoryType.Directory
                          ? handleDeleteFolder(item.name)
                          : handleDeleteFile(item.name)
                        ).then((success) => {
                          console.log('Delete', item.name, 'success:', success);
                          if (!success) return;
                          const dir = currentDirectory.children?.filter(
                            (child) => child.name !== item.name,
                          );
                          const updateStructure = (
                            root: DirectoryStructure,
                            p: string[],
                          ): DirectoryStructure => {
                            if (p.length === 0) {
                              return { ...root, children: dir };
                            }
                            const [head, ...tail] = p;
                            return {
                              ...root,
                              children: root.children?.map((child) => {
                                if (
                                  child.name === head &&
                                  child.type === DirectoryType.Directory
                                ) {
                                  return updateStructure(child, tail);
                                }
                                return child;
                              }),
                            };
                          };

                          setcurrentFileStructure(
                            updateStructure(currentFileStructure, path),
                          );
                        });
                      }}
                    >
                      Delete
                    </span>
                  </button>
                </p>
              </div>
            </li>
          ))
        ) : (
          <li className='text-gray-500'>This directory is empty.</li>
        )}
      </ul>
    </div>
  );
}
