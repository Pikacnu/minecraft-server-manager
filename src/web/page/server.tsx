import { useServers } from '../contexts/servers';
import { CirclePlus, SquarePen, RotateCcw, Power, Trash } from 'lucide-react';
import Rcon from './../component/rcon';
import ServerSetting from './../component/serverSetting';
import { useState } from 'react';
import AddServerPopUp from '../component/addServerPopUp';
import { useOpenServerPanel } from '../contexts/addServerPanel';
import { PageSectionEnum, usePage } from '../contexts/page';
import { useNotification } from '../contexts/notification';
import { NotificationType } from '../utils/enums';

export default function Server() {
  const { serverInfo, setCurrentSelectedServerId, setServerInfo } =
    useServers();
  const { setCurrentSection } = usePage();
  const [serverSettingSaver, setServerSettingSaver] = useState({});
  const { isOpen: isOpenAddServerPopUp, setIsOpen: setIsOpenAddServerPopUp } =
    useOpenServerPanel();
  const { addNotification } = useNotification();

  return (
    <div className='flex flex-col w-full relative gap-2'>
      {isOpenAddServerPopUp && <AddServerPopUp />}
      <div className='flex flex-row justify-between m-4 rounded-lg pl-4 pr-4'>
        <div></div>
        <button
          className=' p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex flex-row items-center gap-2'
          onClick={() => setIsOpenAddServerPopUp(true)}
        >
          <CirclePlus /> Add Server
        </button>
      </div>
      <div className='flex flex-col grow'>
        <div className='flex flex-col m-4 rounded-lg p-4 grow gap-4'>
          <div className='text-2xl font-bold mb-8 border-b border-gray-300'>
            Server Management
          </div>
          {serverInfo.length === 0 ? (
            <div className='text-gray-500'>No servers available.</div>
          ) : (
            serverInfo.map((server) => (
              <div
                key={server.id}
                className='flex flex-col justify-between items-center py-2 border-2 p-2 rounded-lg bg-gray-500/40 '
              >
                <div className='flex flex-row justify-between w-full border-b border-gray-300'>
                  <div className='flex flex-col'>
                    <div className='text-lg font-semibold'>{server.name}</div>
                    <div className='text-sm text-gray-500 dark:text-gray-400'>
                      {server.address}
                    </div>
                  </div>
                  <div className='flex flex-row items-center gap-4'>
                    <div className='text-sm'>
                      Status:{' '}
                      <span className='font-medium'>{server.status}</span>
                    </div>
                    <div className='text-sm'>
                      Players Online:{' '}
                      <span className='font-medium'>
                        {server.playersOnline}
                      </span>
                    </div>
                  </div>
                </div>
                <div className='flex flex-row justify-around *:p-2 *:border *:border-gray-300 rounded-md mt-2 *:rounded-lg w-full *:select-none'>
                  <button
                    className='bg-blue-500 hover:bg-blue-700 text-white p-2 flex flex-row items-center gap-2 rounded-md cursor-pointer transition-colors'
                    onClick={() => {
                      setCurrentSelectedServerId?.(server.id);
                      setCurrentSection(PageSectionEnum.ServerManagement);
                    }}
                  >
                    <SquarePen /> Edit
                  </button>
                  <button
                    className='bg-yellow-500 hover:bg-yellow-700 text-white p-2 flex flex-row items-center gap-2 rounded-md cursor-pointer transition-colors'
                    onClick={() => {
                      async function restartServer() {
                        try {
                          const response = await fetch('/api/server-manage', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              action: 'restart',
                              serverName: server.name,
                            }),
                          });
                          if (response.ok) {
                            addNotification(
                              `Server "${server.name}" is restarting`,
                              NotificationType.Success,
                            );
                          } else {
                            addNotification(
                              `Failed to restart "${server.name}"`,
                              NotificationType.Error,
                            );
                          }
                        } catch (error) {
                          addNotification(
                            `Failed to restart "${server.name}"`,
                            NotificationType.Error,
                          );
                        }
                      }
                      restartServer();
                    }}
                  >
                    <RotateCcw /> Restart
                  </button>
                  <button
                    className='bg-red-500 hover:bg-red-700 text-white p-2 flex flex-row items-center gap-2 rounded-md cursor-pointer transition-colors'
                    onClick={() => {
                      async function terminateServer() {
                        try {
                          const response = await fetch('/api/server-manage', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              action: 'stop',
                              serverName: server.name,
                            }),
                          });
                          if (response.ok) {
                            addNotification(
                              `Server "${server.name}" is stopping`,
                              NotificationType.Success,
                            );
                          } else {
                            addNotification(
                              `Failed to stop "${server.name}"`,
                              NotificationType.Error,
                            );
                          }
                        } catch (error) {
                          addNotification(
                            `Failed to stop "${server.name}"`,
                            NotificationType.Error,
                          );
                        }
                      }
                      terminateServer();
                    }}
                  >
                    <Power /> Terminate
                  </button>
                  <button
                    className='bg-gray-700 hover:bg-gray-900 text-white p-2 flex flex-row items-center gap-2 rounded-md cursor-pointer transition-colors'
                    onClick={() => {
                      async function deleteServer() {
                        try {
                          const response = await fetch('/api/server-instance', {
                            method: 'DELETE',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              serverName: server.name,
                            }),
                          });
                          if (response.ok) {
                            addNotification(
                              `Server "${server.name}" deleted successfully`,
                              NotificationType.Success,
                            );
                            setServerInfo((prev) =>
                              prev.filter((s) => s.id !== server.id),
                            );
                          } else {
                            addNotification(
                              `Failed to delete "${server.name}"`,
                              NotificationType.Error,
                            );
                          }
                        } catch (error) {
                          addNotification(
                            `Failed to delete "${server.name}"`,
                            NotificationType.Error,
                          );
                        }
                      }
                      deleteServer();
                    }}
                  >
                    <Trash /> Delete
                  </button>
                </div>
                <Rcon serverName={server.name} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
