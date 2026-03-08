import { DirectoryType, type DirectoryStructure } from '@/utils/type';
import {
  Folder,
  File,
  CirclePlus,
  Upload,
  Pencil,
  Download,
  Trash2,
  PackageOpen,
  FolderArchive,
} from 'lucide-react';
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
  handleRename,
  handleUpload,
  handleDownload,
  selectedFiles,
  onFileSelect,
  onCompress,
  onUncompress,
  showConfirmDialog,
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
  handleRename: (oldPath: string, newPath: string) => Promise<void>;
  handleUpload: (path: string, file: File) => Promise<void>;
  handleDownload: (path: string, fileName: string) => Promise<void>;
  selectedFiles: string[];
  onFileSelect: (fileName: string) => void;
  onCompress: (path: string, files: string[]) => void;
  onUncompress: (path: string, zipFile: string) => void;
  showConfirmDialog?: (options: any) => Promise<boolean>;
}) {
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
  const [isRenaming, setIsRenaming] = useState<string | null>(null);

  const openFilePath = useRef<string>('');
  const fileData = useRef('');
  const newNameRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentDirectory, setCurrentDirectory] = useMemo(() => {
    let dir = fileStructure;
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
  }, [fileStructure, path]);

  const handleNavigate = (name: string) => {
    const newPath = [...path, name];
    setPath(newPath);
    onNavigate(newPath);
  };

  const handleChangeFileContent = (content: string) => {
    handleFileChange(`${openFilePath.current}`, content);
    setFileContent('');
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const [currentDirectory] = useMemo(() => {
        let dir = fileStructure;
        for (const segment of path) {
          const child = dir.children?.find((c) => c.name === segment);
          if (child && child.type === DirectoryType.Directory) {
            dir = child;
          } else {
            break;
          }
        }
        return [dir];
      }, []);

      const fileExists = currentDirectory.children?.some(
        (child) => child.name === file.name,
      );

      if (fileExists && showConfirmDialog) {
        const confirmed = await showConfirmDialog({
          title: 'Overwrite File',
          message: `A file named "${file.name}" already exists in this directory.\n\nDo you want to overwrite it?`,
          confirmText: 'Overwrite',
          cancelText: 'Cancel',
        });

        if (!confirmed) {
          // Reset the file input
          e.target.value = '';
          return;
        }
      }

      handleUpload(`${[...path, file.name].join('/')}`, file);
      // Reset the file input
      e.target.value = '';
    }
  };

  return (
    <div className='p-4 bg-gray-100 dark:bg-gray-800 rounded-lg h-full'>
      {isOpenFile && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-900 rounded-lg w-3/4 h-3/4 p-4 flex flex-col'>
            <div className='flex justify-between items-center mb-2'>
              <h2 className='text-lg font-semibold'>File Viewer</h2>
              <div className='flex flex-row gap-2'>
                <button
                  className='px-3 py-1 rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-colors'
                  onClick={() => {
                    setIsOpenFile(false);
                    setFileContent(fileData.current);
                  }}
                >
                  Close
                </button>
                <button
                  className='px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors'
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
                handleCreate(
                  `${[...path, newName.value].join('/')}`,
                  currentCreatingType,
                );
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}
      <div className='mb-4 flex select-none flex-row justify-between '>
        <p className='flex flex-row gap-2 overflow-x-auto'>
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
        <div className='flex flex-row gap-2'>
          <div
            className='flex flex-col relative'
            onClick={() => {
              setIsCreating(!isCreating);
              setCreatingState(FileCreatingState.None);
            }}
          >
            <button className='flex flex-row gap-2'>
              <CirclePlus /> New
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
                <button
                  className='w-full text-left px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg flex flex-row items-center gap-2'
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCreating(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <Upload size={16} /> Upload File
                </button>
              </div>
            )}
          </div>
          <input
            type='file'
            ref={fileInputRef}
            className='hidden'
            onChange={onFileChange}
          />
          <div className='flex gap-2 items-center'>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='checkbox'
                checked={
                  currentDirectory.children &&
                  currentDirectory.children.length > 0 &&
                  currentDirectory.children.every((item) =>
                    selectedFiles.includes(item.name),
                  )
                }
                ref={(el) => {
                  if (el) {
                    const allFileNames =
                      currentDirectory.children?.map((item) => item.name) || [];
                    const selectedInCurrentDir = allFileNames.filter((name) =>
                      selectedFiles.includes(name),
                    );
                    el.indeterminate =
                      selectedInCurrentDir.length > 0 &&
                      selectedInCurrentDir.length < allFileNames.length;
                  }
                }}
                onChange={(e) => {
                  const allFileNames =
                    currentDirectory.children?.map((item) => item.name) || [];
                  if (e.target.checked) {
                    // Select all files in current directory that aren't already selected
                    allFileNames.forEach((name) => {
                      if (!selectedFiles.includes(name)) {
                        onFileSelect(name);
                      }
                    });
                  } else {
                    // Deselect all files in current directory
                    allFileNames.forEach((name) => {
                      if (selectedFiles.includes(name)) {
                        onFileSelect(name);
                      }
                    });
                  }
                }}
                className='w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
              />
              <span className='text-sm'>Select All</span>
            </label>
            <button
              onClick={() => onCompress(path.join('/'), selectedFiles)}
              disabled={selectedFiles.length === 0}
            >
              <FolderArchive />
            </button>
            <button
              onClick={() => {
                if (selectedFiles.length === 1) {
                  onUncompress(path.join('/'), selectedFiles[0]!);
                }
                // If not exactly 1 file selected, button is disabled anyway
              }}
              disabled={selectedFiles.length !== 1}
            >
              <PackageOpen />
            </button>
          </div>
        </div>
      </div>
      <ul className=' overflow-y-auto h-full'>
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
            >
              <input
                type='checkbox'
                checked={selectedFiles.includes(item.name)}
                onChange={(e) => {
                  e.stopPropagation();
                  onFileSelect(item.name);
                }}
                className='w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
              />
              <div
                className='flex flex-row justify-between w-full *:flex *:flex-row *:items-center *:gap-2 h-full transform-gpu'
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
                <span className='flex flex-row items-center grow gap-2'>
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
                  {isRenaming === item.name ? (
                    <input
                      ref={renameRef}
                      type='text'
                      defaultValue={item.name}
                      className='bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 grow w-full'
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newName = renameRef.current?.value;
                          if (newName && newName !== item.name) {
                            handleRename(
                              `${[...path, item.name].join('/')}`,
                              `${[...path, newName].join('/')}`,
                            );
                          }
                          setIsRenaming(null);
                        } else if (e.key === 'Escape') {
                          setIsRenaming(null);
                        }
                      }}
                      onBlur={() => setIsRenaming(null)}
                      autoFocus
                    />
                  ) : (
                    item.name
                  )}
                </span>
                <p className='flex flex-row gap-2 text-gray-500 text-sm'>
                  <span>
                    {item.file?.size
                      ? `${(item.file.size / 1024).toFixed(2)} KB`
                      : item.type === DirectoryType.Directory
                        ? `${item.children ? item.children.length : 0} items`
                        : ''}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRenaming(item.name);
                    }}
                  >
                    <Pencil
                      size={16}
                      className='text-blue-500 hover:text-blue-700'
                    />
                  </button>
                  {item.type === DirectoryType.File && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(
                          `${[...path, item.name].join('/')}`,
                          item.name,
                        );
                      }}
                    >
                      <Download
                        size={16}
                        className='text-green-500 hover:text-green-700'
                      />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(
                        `${[...path, item.name].join('/')}`,
                        item.type,
                        false,
                      );
                    }}
                  >
                    <Trash2
                      size={16}
                      className='text-red-500 hover:text-red-700'
                    />
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
