import { useState, useEffect } from 'react';
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

export default function ServerManagement() {
  const { serverInfo, currentSelectedServerId, setCurrentSelectedServerId } =
    useServers();
  const [currentServerSetting, setCurrentServerSetting] = useState<
    Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> & Variables
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

  useEffect(() => {
    if (serverInfo.length > 0) {
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
        });
      } else {
        setCurrentServerSetting({});
      }
    }
    async function fetchFileStructure() {
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
    }

    fetchServerSettings();
    fetchFileStructure();
  }, [currentSelectedServerId]);

  return (
    <div className='flex flex-col w-full h-full p-4 grow'>
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
      <div className='flex flex-col grow h-full relative'>
        {currentSelectedServerId === '' ? (
          <div className='text-gray-500'>No server selected.</div>
        ) : (
          <>
            <div className='text-gray-700 flex'>
              Management options for server ID: {currentSelectedServerId}
            </div>
            <div className='grid grid-cols-2 gap-4 h-full mt-4 grow'>
              <div className='flex flex-col grow overflow-y-auto overflow-x-hidden h-full relative'>
                <ServerSetting
                  isToggleAble={false}
                  open={true}
                  defaultValue={
                    Object.keys(currentServerSetting).length > 0
                      ? {
                          ...currentServerSetting,
                          serverSettingId: currentSelectedServerId,
                        }
                      : {
                          serverSettingId: '',
                        }
                  }
                  setSetting={setNewServerSetting}
                ></ServerSetting>
                <button
                  className='flex flex-row items-center gap-2 mt-4 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 self-end'
                  onClick={() => {
                    async function submitSettings() {
                      fetch('/api/server-instance', {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          serverName: currentSelectedServerId,
                          variables: newServerSetting,
                        }),
                      });
                    }
                    submitSettings();
                  }}
                >
                  <Send></Send>
                  Submit
                </button>
              </div>

              <DirectoryDisplay
                fileStructure={currentFileStructure}
                currentPath={[]}
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
                handleCreate={(path, type) => {
                  if (currentSelectedServerId === '') return;
                  const createEntry = async () => {
                    await fetch(`/api/file-system`, {
                      method: 'POST',
                      body: JSON.stringify({
                        name: currentSelectedServerId,
                        type,
                        path: path,
                        ...(type === DirectoryType.File ? { content: '' } : {}),
                      }),
                    });
                  };
                  createEntry();
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
                    confirm(
                      `Are you sure you want to recursively delete the folder at ${path} and all its contents? This action cannot be undone.`,
                    );
                  }
                  if (type === DirectoryType.Directory && !recursive) {
                    confirm(
                      `Are you sure you want to delete the folder at ${path} without deleting its contents? This may fail if the folder is not empty.`,
                    );
                  }
                  let response: Response;
                  try {
                    response = await fetch(
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
                  } catch (e) {
                    console.error('Error during delete request:', e);
                    return false;
                  }

                  if (response.ok) {
                    const data = await response.json();
                    console.log('Delete successful:', data);
                    return data.success;
                  } else {
                    const data = await response.json();
                    console.error(
                      'Delete request failed with status:',
                      response.status,
                    );
                    alert(
                      data.message || 'Unknown error occurred during deletion.',
                    );
                  }
                  return false;
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
