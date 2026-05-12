import { useEffect, useRef, useState } from 'react';
import { useServers } from '../contexts/servers';
import {
  MinecraftServerType,
  type MinecraftServerDeploymentsGeneratorArguments,
  type Variables,
} from '@/utils/type';
import { useNotification } from '../contexts/notification';
import { useConfirmDialog } from '../contexts/confirmDialog';
import { NotificationType } from '../utils/enums';
import ManagementSidebar from '../component/server-manage/management-sidebar';
import ManagementOverview from '../component/server-manage/management-overview';
import ManagementFilesPanel from '../component/server-manage/management-files-panel';
import ManagementSettings from '../component/server-manage/management-settings';
import { ManagementSection } from '../component/server-manage/types';
import { type PodData } from '@/utils/k8s';
import { useWebSocket } from '../contexts/websocket';
import { MessageType } from '../websocket/type';
import { ServerManagementFilesProvider } from '../contexts/serverManagementFiles';

export default function ServerManagement() {
  const { serverInfo, currentSelectedServerId, setCurrentSelectedServerId } =
    useServers();
  const { addNotification } = useNotification();
  const { showConfirmDialog } = useConfirmDialog();
  const { sendMessage, message } = useWebSocket();
  const latestHandledLogMessageId = useRef<string>('');
  const [activeSection, setActiveSection] = useState<ManagementSection>(
    ManagementSection.Overview,
  );
  const [currentServerSetting, setCurrentServerSetting] = useState<
    Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> &
      Variables & { serverSettingId?: string }
  >({});
  const [newServerSetting, setNewServerSetting] = useState<
    Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> & Variables
  >({});
  const [resourceData, setResourceData] = useState<PodData | null>(null);
  const [serverLogs, setServerLogs] = useState<string>('');
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [isRefreshingDiagnostics, setIsRefreshingDiagnostics] = useState(false);

  const currentServer = serverInfo.find(
    (server) => server.id === currentSelectedServerId,
  );

  useEffect(() => {
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

    void fetchServerSettings();
  }, [currentSelectedServerId]);

  useEffect(() => {
    setActiveSection(ManagementSection.Overview);
  }, [currentSelectedServerId]);

  useEffect(() => {
    if (currentSelectedServerId === '') {
      setResourceData(null);
      setServerLogs('');
      setDiagnosticError(null);
      return;
    }

    let cancelled = false;

    const refreshResource = async () => {
      setIsRefreshingDiagnostics(true);
      try {
        const resourceResponse = await fetch(
          `/api/server-resource?serverName=${encodeURIComponent(currentSelectedServerId || '')}`,
        );

        if (cancelled) {
          return;
        }

        if (resourceResponse.ok) {
          const resourcePayload = await resourceResponse.json();
          setResourceData(
            resourcePayload.status === 'ok' ? resourcePayload.data : null,
          );
        } else {
          setResourceData(null);
        }

        setDiagnosticError(null);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to refresh diagnostics:', error);
          setDiagnosticError('Failed to refresh diagnostics.');
        }
      } finally {
        if (!cancelled) {
          setIsRefreshingDiagnostics(false);
        }
      }
    };

    const fetchInitialLogs = async () => {
      try {
        const logsResponse = await fetch(
          `/api/server-logs?serverName=${encodeURIComponent(currentSelectedServerId || '')}&lines=120`,
        );
        if (cancelled) {
          return;
        }

        if (logsResponse.ok) {
          const logsPayload = await logsResponse.json();
          setServerLogs(logsPayload.status === 'ok' ? logsPayload.data : '');
        } else {
          setServerLogs('');
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch initial logs:', error);
        }
      }
    };

    void Promise.all([fetchInitialLogs(), refreshResource()]);
    const interval = setInterval(() => {
      void refreshResource();
    }, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentSelectedServerId]);

  useEffect(() => {
    if (!currentSelectedServerId) {
      return;
    }

    sendMessage({
      type: MessageType.SERVERLOG,
      payload: {
        serverName: currentSelectedServerId,
        action: 'subscribe',
      },
    });

    return () => {
      sendMessage({
        type: MessageType.SERVERLOG,
        payload: {
          serverName: currentSelectedServerId,
          action: 'unsubscribe',
        },
      });
    };
  }, [currentSelectedServerId, sendMessage]);

  useEffect(() => {
    if (
      !message ||
      message.id === latestHandledLogMessageId.current ||
      message.type !== MessageType.SERVERLOG
    ) {
      return;
    }

    const payload = message.payload as {
      status: 'ok' | 'error';
      serverName: string;
      chunk?: string;
    };

    if (payload.serverName !== currentSelectedServerId) {
      latestHandledLogMessageId.current = message.id;
      return;
    }

    if (payload.status === 'error') {
      setDiagnosticError('Live log stream failed.');
      latestHandledLogMessageId.current = message.id;
      return;
    }

    if (payload.chunk) {
      const incomingChunk = payload.chunk;
      setServerLogs((previousLogs) => {
        const merged = previousLogs
          ? `${previousLogs}\n${incomingChunk}`
          : incomingChunk;
        const lines = merged.split('\n');
        return lines.slice(-500).join('\n');
      });
    }

    latestHandledLogMessageId.current = message.id;
  }, [message, currentSelectedServerId]);

  const serverSettingDefaultValue =
    Object.keys(currentServerSetting).length > 0
      ? {
          ...currentServerSetting,
          serverSettingId: currentServerSetting.serverSettingId || '',
        }
      : {
          serverSettingId: '',
        };

  return (
    <div className='flex h-full w-full flex-col overflow-hidden p-4 max-xl:overflow-y-auto'>
      <div className='mb-4'>
        <h2 className='text-2xl font-semibold'>Server Management</h2>
      </div>

      {currentSelectedServerId === '' ? (
        <div className='flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white px-4 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'>
          <p>Please select a server to continue.</p>
          {serverInfo.length > 0 && (
            <div className='w-full max-w-sm'>
              <select
                value={currentSelectedServerId}
                onChange={(event) =>
                  setCurrentSelectedServerId(event.target.value)
                }
                className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'
              >
                <option value=''>Choose a server</option>
                {serverInfo.map((server) => (
                  <option
                    key={server.id}
                    value={server.id}
                  >
                    {server.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {serverInfo.length === 0 && (
            <p className='text-sm'>No available server found yet.</p>
          )}
        </div>
      ) : (
        <div className='flex min-h-0 flex-1 flex-col gap-4 lg:grid lg:grid-cols-[260px_minmax(0,1fr)]'>
          <ManagementSidebar
            server={{
              name: currentServer?.name || currentSelectedServerId || '',
              address: currentServer?.address || 'No address available',
              status: currentServer?.status || 'unknown',
              playersOnline: currentServer?.playersOnline || 0,
            }}
            serverOptions={serverInfo.map((server) => ({
              id: server.id,
              name: server.name,
            }))}
            selectedServerId={currentSelectedServerId}
            onSelectServer={setCurrentSelectedServerId}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            resourceData={resourceData}
            isRefreshingDiagnostics={isRefreshingDiagnostics}
          />

          <section className='min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-300 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:overflow-hidden'>
            {activeSection === ManagementSection.Overview && (
              <ManagementOverview
                serverName={
                  currentServer?.name || currentSelectedServerId || ''
                }
                serverLogs={serverLogs}
                resourceData={resourceData}
                diagnosticError={diagnosticError}
                isRefreshingDiagnostics={isRefreshingDiagnostics}
                playerCount={currentServer?.playersOnline ?? null}
              />
            )}

            {activeSection === ManagementSection.Files && (
              <ServerManagementFilesProvider
                serverId={currentSelectedServerId}
                showConfirmDialog={showConfirmDialog}
                addNotification={addNotification}
              >
                <ManagementFilesPanel />
              </ServerManagementFilesProvider>
            )}

            {activeSection === ManagementSection.Settings && (
              <ManagementSettings
                defaultValue={serverSettingDefaultValue}
                setSetting={setNewServerSetting}
                onSubmit={async () => {
                  const confirmed = await showConfirmDialog({
                    title: 'Restart Server',
                    message:
                      'Submitting these changes will restart the server. Are you sure you want to continue?',
                    checkboxLabel: 'I understand that the server will restart',
                    requireCheckbox: true,
                    confirmText: 'Submit Changes',
                    cancelText: 'Cancel',
                  });

                  if (!confirmed) {
                    return;
                  }

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
                        NotificationType.Success,
                      );
                    } else {
                      addNotification(
                        'Failed to update server settings',
                        NotificationType.Error,
                      );
                    }
                  } catch (error) {
                    addNotification(
                      'Failed to update server settings',
                      NotificationType.Error,
                    );
                  }
                }}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
