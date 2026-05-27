import { useServers } from '../contexts/servers';
import { CirclePlus, SquarePen, RotateCcw, Power, Trash } from 'lucide-react';
import { useOpenServerPanel } from '../contexts/addServerPanel';
import { PageSectionEnum, usePage } from '../contexts/page';
import { useNotification } from '../contexts/notification';
import { useConfirmDialog } from '../contexts/confirmDialog';
import { NotificationType } from '../utils/enums';

export default function Server() {
  const { serverInfo, setCurrentSelectedServerId, setServerInfo } =
    useServers();
  const { setCurrentSection } = usePage();
  const { setIsOpen: setIsOpenAddServerPopUp } = useOpenServerPanel();
  const { addNotification } = useNotification();
  const { showConfirmDialog } = useConfirmDialog();

  return (
    <div className='flex h-full w-full flex-col gap-4 overflow-hidden p-4'>
      <div className='flex items-center justify-end'>
        <button
          className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700 sm:w-auto'
          onClick={() => setIsOpenAddServerPopUp(true)}
        >
          <CirclePlus className='h-4 w-4' /> Add Server
        </button>
      </div>

      <section className='flex-1 overflow-y-auto rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
        <h1 className='mb-6 border-b border-gray-300 pb-3 text-2xl font-bold dark:border-gray-700'>
          Server Management
        </h1>

        {serverInfo.length === 0 ? (
          <div className='text-gray-500 dark:text-gray-400'>
            No servers available.
          </div>
        ) : (
          <div className='space-y-4'>
            {serverInfo.map((server) => (
              <article
                key={server.id}
                className='rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800'
              >
                <div className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 pb-2 dark:border-gray-700'>
                  <div>
                    <div className='text-lg font-semibold'>{server.name}</div>
                    <div className='text-sm text-gray-500 dark:text-gray-400'>
                      {server.address}
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-2 text-xs'>
                    <span className='rounded-full bg-gray-200 px-3 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-200'>
                      Status: {server.status}
                    </span>
                    <span className='rounded-full bg-gray-200 px-3 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-200'>
                      Players: {server.playersOnline}
                    </span>
                    <span className='rounded-full bg-gray-200 px-3 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-200'>
                      ID: {server.id}
                    </span>
                  </div>
                </div>

                <div className='mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4'>
                  <button
                    className='inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700'
                    onClick={() => {
                      setCurrentSelectedServerId?.(server.id);
                      setCurrentSection(PageSectionEnum.ServerManagement);
                    }}
                  >
                    <SquarePen className='h-4 w-4' /> Manage
                  </button>

                  <button
                    className='inline-flex items-center justify-center gap-2 rounded-md bg-yellow-500 px-3 py-2 text-white transition-colors hover:bg-yellow-600'
                    onClick={async () => {
                      const confirmed = await showConfirmDialog({
                        title: 'Restart Server',
                        message: `Are you sure you want to restart "${server.name}"?\n\nThis will temporarily disconnect all players.`,
                        confirmText: 'Restart',
                        cancelText: 'Cancel',
                      });

                      if (!confirmed) return;

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

                        addNotification(
                          response.ok
                            ? `Server "${server.name}" is restarting`
                            : `Failed to restart "${server.name}"`,
                          response.ok
                            ? NotificationType.Success
                            : NotificationType.Error,
                        );
                      } catch (error) {
                        addNotification(
                          `Failed to restart "${server.name}"`,
                          NotificationType.Error,
                        );
                      }
                    }}
                  >
                    <RotateCcw className='h-4 w-4' /> Restart
                  </button>

                  <button
                    className='inline-flex items-center justify-center gap-2 rounded-md bg-red-500 px-3 py-2 text-white transition-colors hover:bg-red-600'
                    onClick={async () => {
                      const confirmed = await showConfirmDialog({
                        title: 'Stop Server',
                        message: `Are you sure you want to stop "${server.name}"?\n\nThe server will be terminated and all players will be disconnected.`,
                        confirmText: 'Stop Server',
                        cancelText: 'Cancel',
                      });

                      if (!confirmed) return;

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

                        addNotification(
                          response.ok
                            ? `Server "${server.name}" is stopping`
                            : `Failed to stop "${server.name}"`,
                          response.ok
                            ? NotificationType.Success
                            : NotificationType.Error,
                        );
                      } catch (error) {
                        addNotification(
                          `Failed to stop "${server.name}"`,
                          NotificationType.Error,
                        );
                      }
                    }}
                  >
                    <Power className='h-4 w-4' /> Terminate
                  </button>

                  <button
                    className='inline-flex items-center justify-center gap-2 rounded-md bg-gray-700 px-3 py-2 text-white transition-colors hover:bg-gray-900 dark:bg-gray-600 dark:hover:bg-gray-500'
                    onClick={async () => {
                      const confirmed = await showConfirmDialog({
                        title: 'Delete Server',
                        message: `Are you sure you want to permanently delete "${server.name}"?\n\nThis will delete all server data, worlds, and configurations.\nThis action CANNOT be undone!`,
                        checkboxLabel:
                          'I understand this will permanently delete all server data',
                        requireCheckbox: true,
                        confirmText: 'Delete Permanently',
                        cancelText: 'Cancel',
                      });

                      if (!confirmed) return;

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
                            prev.filter((s) => s.id !== server.name),
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
                    }}
                  >
                    <Trash className='h-4 w-4' /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
