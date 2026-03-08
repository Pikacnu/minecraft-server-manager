import { useState, useEffect, useOptimistic, useTransition } from 'react';
import { useServers } from '../contexts/servers';
import ServerSetting from './../component/serverSetting';
import { Send } from 'lucide-react';
import {
  DirectoryType,
  MinecraftServerType,
  type DirectoryStructure,
  type MinecraftServerDeploymentsGeneratorArguments,
  type Variables,
} from '@/utils/type';
import DirectoryDisplay from '../component/directoryDisplay';
import { useNotification } from '../contexts/notification';

export default function ServerManagement() {
  const { serverInfo, currentSelectedServerId, setCurrentSelectedServerId } =
    useServers();
  const [isPending, startTransition] = useTransition();
  const { addNotification } = useNotification();
  const [currentServerSetting, setCurrentServerSetting] = useState<
    Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> &
      Variables & { serverSettingId?: string }
  >({});
  const [newServerSetting, setNewServerSetting] = useState<
    Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> & Variables
  >({});

  const [currentFileStructure, setCurrentFileStructure] =
    useState<DirectoryStructure>({
      name: '/',
      type: DirectoryType.Directory,
      children: [],
    });

  const [optimisticFileStructure, addOptimisticFileStructure] = useOptimistic(
    currentFileStructure,
    (state, action: { type: string; payload: any }) => {
      const updateNode = (
        node: DirectoryStructure,
        pathParts: string[],
        updateFn: (n: DirectoryStructure) => DirectoryStructure,
      ): DirectoryStructure => {
        if (pathParts.length === 0) return updateFn(node);
        const [head, ...tail] = pathParts;
        return {
          ...node,
          children: node.children?.map((child) =>
            child.name === head ? updateNode(child, tail, updateFn) : child,
          ),
        };
      };

      switch (action.type) {
        case 'create': {
          const { path, type } = action.payload;
          const parts = path.split('/').filter(Boolean);
          const name = parts.pop();
          return updateNode(state, parts, (node) => ({
            ...node,
            children: [
              ...(node.children || []),
              {
                name: name!,
                type,
                children: type === DirectoryType.Directory ? [] : undefined,
              },
            ],
          }));
        }
        case 'delete': {
          const { path } = action.payload;
          const parts = path.split('/').filter(Boolean);
          const name = parts.pop();
          return updateNode(state, parts, (node) => ({
            ...node,
            children: node.children?.filter((child) => child.name !== name),
          }));
        }
        case 'rename': {
          const { oldPath, newPath } = action.payload;
          const oldParts = oldPath.split('/').filter(Boolean);
          const oldName = oldParts.pop();
          const newName = newPath.split('/').filter(Boolean).pop();
          return updateNode(state, oldParts, (node) => ({
            ...node,
            children: node.children?.map((child) =>
              child.name === oldName ? { ...child, name: newName! } : child,
            ),
          }));
        }
        default:
          return state;
      }
    },
  );

  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const fetchFileStructure = async () => {
    if (currentSelectedServerId === '') return;
    const response = await fetch(
      `/api/file-system?name=${currentSelectedServerId}&type=structure`,
    );
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        setCurrentFileStructure(data.data);
      } else {
        setCurrentFileStructure({
          name: '/',
          type: DirectoryType.Directory,
          children: [],
        });
      }
    } else {
      setCurrentFileStructure({
        name: '/',
        type: DirectoryType.Directory,
        children: [],
      });
    }
  };

  useEffect(() => {
    if (serverInfo.length > 0 && currentSelectedServerId === '') {
      setCurrentSelectedServerId(serverInfo[0]!.id);
    }
    async function fetchServerSettings() {
      if (currentSelectedServerId === '') {
        setCurrentServerSetting({});
        return;
      }
      const response = await fetch(
        `/api/server-instance?serverName=${currentSelectedServerId}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.status !== 'ok') {
          setCurrentServerSetting({});
          return;
        }
        const dataValues = data.data as Record<string, string>;
        setCurrentServerSetting({
          ...dataValues,
          version: dataValues.VERSION,
          memoryLimit: Number(dataValues.memoryLimit!) || 2048,
          type: dataValues.TYPE! as MinecraftServerType,
          SERVER_NAME: dataValues.SERVER_NAME,
          domain: dataValues.domain,
          serverSettingId: currentSelectedServerId,
        });
      } else {
        setCurrentServerSetting({});
      }
    }

    fetchServerSettings();
    fetchFileStructure();
  }, [currentSelectedServerId]);

  return (
    <div className='flex flex-col w-full p-4 grow relative  overflow-y-auto'>
      <select
        className=' bg-gray-400/80 p-2 rounded-lg'
        value={currentSelectedServerId}
        name='server-select'
        onChange={(e) => setCurrentSelectedServerId(e.target.value)}
      >
        {serverInfo.map((server) => (
          <option
            key={server.id}
            value={server.id}
          >
            {server.name} - {server.address}
          </option>
        ))}
      </select>
      <hr className='my-4 border-gray-300' />
      <div className='flex flex-col grow relative'>
        {currentSelectedServerId === '' ? (
          <div className='text-gray-500'>No server selected.</div>
        ) : (
          <div className='flex flex-col grow relative'>
            <div className='text-gray-700 flex'>
              Management options for server ID: {currentSelectedServerId}
            </div>
            <div className='grid grid-cols-2 gap-4 mt-4 relative grow'>
              <div className='flex flex-col grow overflow-x-hidden relative'>
                <ServerSetting
                  isToggleAble={false}
                  open={true}
                  defaultValue={
                    Object.keys(currentServerSetting).length > 0
                      ? {
                          ...currentServerSetting,
                          serverSettingId:
                            currentServerSetting.serverSettingId || '',
                        }
                      : {
                          serverSettingId: '',
                        }
                  }
                  setSetting={setNewServerSetting}
                ></ServerSetting>
                <button
                  className='flex flex-row items-center gap-2 mt-4 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-800 self-end cursor-pointer transition-colors'
                  onClick={() => {
                    async function submitSettings() {
                      try {
                        const response = await fetch('/api/server-instance', {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            serverName: currentSelectedServerId,
                            variables: newServerSetting,
                          }),
                        });
                        if (response.ok) {
                          addNotification(
                            'Server settings updated successfully',
                            'success',
                          );
                        } else {
                          addNotification(
                            'Failed to update server settings',
                            'error',
                          );
                        }
                      } catch (error) {
                        addNotification(
                          'Failed to update server settings',
                          'error',
                        );
                      }
                    }
                    submitSettings();
                  }}
                >
                  <Send></Send>
                  Submit
                </button>
              </div>

              <DirectoryDisplay
                fileStructure={optimisticFileStructure}
                currentPath={[]}
                selectedFiles={selectedFiles}
                onFileSelect={(fileName) => {
                  setSelectedFiles((prev) =>
                    prev.includes(fileName)
                      ? prev.filter((f) => f !== fileName)
                      : [...prev, fileName],
                  );
                }}
                onCompress={async (path, files) => {
                  if (currentSelectedServerId === '') return;
                  const outputPath = path
                    ? `${path}/compressed.zip`
                    : 'compressed.zip';
                  await fetch('/api/file-system', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'compress',
                      name: currentSelectedServerId,
                      files: files.map((f) => (path ? `${path}/${f}` : f)),
                      outputPath,
                    }),
                  });
                  setSelectedFiles([]);
                  fetchFileStructure();
                }}
                onUncompress={async (path, zipFile) => {
                  if (currentSelectedServerId === '') return;
                  const outputDir = path
                    ? `${path}/${zipFile}-uncompressed`
                    : `${zipFile}-uncompressed`;
                  await fetch('/api/file-system', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'uncompress',
                      name: currentSelectedServerId,
                      zipPath: path ? `${path}/${zipFile}` : zipFile,
                      outputDir,
                    }),
                  });
                  setSelectedFiles([]);
                  fetchFileStructure();
                }}
                onNavigate={(path) => {}}
                handleFileChange={(path, content) => {
                  if (path === '' || currentSelectedServerId === '') return;
                  const submitFileChange = async () => {
                    await fetch(
                      `/api/file-system?name=${currentSelectedServerId}&type=file&path=${encodeURIComponent(
                        path,
                      )}`,
                      { method: 'PUT', body: content },
                    );
                    fetchFileStructure();
                  };
                  submitFileChange();
                }}
                handleFileRead={async (path) => {
                  if (path === '' || currentSelectedServerId === '') return '';
                  const fileResponse = await fetch(
                    `/api/file-system?name=${currentSelectedServerId}&type=file&path=${encodeURIComponent(
                      path,
                    )}`,
                  );
                  if (fileResponse.ok) {
                    const data = await fileResponse.json();
                    if (data.success) {
                      return data.data as string;
                    }
                  } else {
                    return `Error: ${fileResponse.status} ${fileResponse.statusText}`;
                  }
                  return '';
                }}
                handleCreate={async (path, type) => {
                  if (currentSelectedServerId === '') return;
                  startTransition(async () => {
                    addOptimisticFileStructure({
                      type: 'create',
                      payload: { path, type },
                    });
                    await fetch(`/api/file-system`, {
                      method: 'POST',
                      body: JSON.stringify({
                        name: currentSelectedServerId,
                        type,
                        path: path,
                        ...(type === DirectoryType.File ? { content: '' } : {}),
                      }),
                    });
                    fetchFileStructure();
                  });
                }}
                handleDelete={async (path, type, recursive) => {
                  if (currentSelectedServerId === '') return false;
                  if (path === '') {
                    console.error('Cannot delete root directory');
                    return false;
                  }
                  if (recursive) {
                    if (type === DirectoryType.File) {
                      throw new Error(
                        'Invalid state: recursive delete on file',
                      );
                    }
                    if (
                      !confirm(
                        `Are you sure you want to recursively delete the folder at ${path} and all its contents? This action cannot be undone.`,
                      )
                    )
                      return false;
                  }
                  if (type === DirectoryType.Directory && !recursive) {
                    if (
                      !confirm(
                        `Are you sure you want to delete the folder at ${path} without deleting its contents? This may fail if the folder is not empty.`,
                      )
                    )
                      return false;
                  }

                  startTransition(async () => {
                    addOptimisticFileStructure({
                      type: 'delete',
                      payload: { path },
                    });
                    try {
                      const response = await fetch(
                        `/api/file-system?name=${currentSelectedServerId}`,
                        {
                          method: 'DELETE',
                          body: JSON.stringify({
                            name: currentSelectedServerId,
                            path,
                            type,
                            recursive,
                          }),
                        },
                      );
                      if (response.ok) {
                        setSelectedFiles([]);
                        fetchFileStructure();
                      } else {
                        const data = await response.json();
                        console.error(
                          'Delete request failed with status:',
                          response.status,
                        );
                        alert(
                          data.message ||
                            'Unknown error occurred during deletion.',
                        );
                        fetchFileStructure();
                      }
                    } catch (e) {
                      console.error('Error during delete request:', e);
                      fetchFileStructure();
                    }
                  });
                  return true;
                }}
                handleRename={async (oldPath, newPath) => {
                  if (currentSelectedServerId === '') return;
                  startTransition(async () => {
                    addOptimisticFileStructure({
                      type: 'rename',
                      payload: { oldPath, newPath },
                    });
                    await fetch(`/api/file-system`, {
                      method: 'PATCH',
                      body: JSON.stringify({
                        name: currentSelectedServerId,
                        oldPath,
                        newPath,
                      }),
                    });
                    setSelectedFiles([]);
                    fetchFileStructure();
                  });
                }}
                handleUpload={async (path, file) => {
                  if (currentSelectedServerId === '') return;
                  startTransition(async () => {
                    addOptimisticFileStructure({
                      type: 'create',
                      payload: { path, type: DirectoryType.File },
                    });
                    await fetch(
                      `/api/file-system?name=${currentSelectedServerId}&type=file&path=${encodeURIComponent(
                        path,
                      )}`,
                      { method: 'PUT', body: file },
                    );
                    fetchFileStructure();
                  });
                }}
                handleDownload={async (path, fileName) => {
                  if (path === '' || currentSelectedServerId === '') return;
                  const fileResponse = await fetch(
                    `/api/file-system?name=${currentSelectedServerId}&type=file&path=${encodeURIComponent(
                      path,
                    )}`,
                  );
                  if (fileResponse.ok) {
                    const data = await fileResponse.json();
                    if (data.success) {
                      const blob = new Blob([data.data], {
                        type: 'application/octet-stream',
                      });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = fileName;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    }
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
