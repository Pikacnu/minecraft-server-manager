import { useState, useEffect } from 'react';
import { RefreshCw, Server, Activity, Edit3, Save } from 'lucide-react';
import { useNotification } from '../contexts/notification';
import { useConfirmDialog } from '../contexts/confirmDialog';
import { NotificationType } from '../utils/enums';

interface GateStatus {
  replicas: number;
  availableReplicas: number;
  readyReplicas: number;
  conditions: Array<{
    type: string;
    status: string;
    message?: string;
  }>;
}

export default function GateManagement() {
  const [gateStatus, setGateStatus] = useState<GateStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gateConfig, setGateConfig] = useState<string>('');
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { addNotification } = useNotification();
  const { showConfirmDialog } = useConfirmDialog();

  const fetchGateStatus = async () => {
    try {
      const response = await fetch('/api/gate-manage');
      if (response.ok) {
        const data = await response.json();
        setGateStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch Gate status:', error);
    }
  };

  const fetchGateConfig = async () => {
    try {
      const response = await fetch('/api/gate-manage', {
        method: 'PATCH',
      });
      if (response.ok) {
        const data = await response.json();
        // Convert config object to YAML-like string for editing
        setGateConfig(JSON.stringify(data.data, null, 2));
      }
    } catch (error) {
      console.error('Failed to fetch Gate config:', error);
      addNotification(
        'Failed to load Gate configuration',
        NotificationType.Error,
      );
    }
  };

  const handleRestart = async () => {
    const confirmed = await showConfirmDialog({
      title: 'Restart Gate Proxy',
      message:
        'Are you sure you want to restart the Gate proxy server?\n\nThis will temporarily disconnect all players from the network.',
      confirmText: 'Restart',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/gate-manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'restart',
        }),
      });

      if (response.ok) {
        addNotification(
          'Gate server restart initiated',
          NotificationType.Success,
        );
        setTimeout(fetchGateStatus, 2000);
      } else {
        addNotification(
          'Failed to restart Gate server',
          NotificationType.Error,
        );
      }
    } catch (error) {
      addNotification('Failed to restart Gate server', NotificationType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    const confirmed = await showConfirmDialog({
      title: 'Update Gate Configuration',
      message:
        'Updating the Gate proxy configuration will restart the server and temporarily disconnect all players.\n\nAre you sure you want to continue?',
      checkboxLabel: 'I understand this will restart the Gate proxy',
      requireCheckbox: true,
      confirmText: 'Update & Restart',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;

    setIsSaving(true);
    try {
      // Parse the config back to object
      const configObject = JSON.parse(gateConfig);

      const response = await fetch('/api/gate-manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateConfig',
          config: configObject,
        }),
      });

      if (response.ok) {
        addNotification(
          'Gate configuration updated successfully',
          NotificationType.Success,
        );
        setIsEditingConfig(false);
        setTimeout(fetchGateStatus, 2000);
      } else {
        const data = await response.json();
        addNotification(
          data.message || 'Failed to update Gate configuration',
          NotificationType.Error,
        );
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        addNotification(
          'Invalid JSON format in configuration',
          NotificationType.Error,
        );
      } else {
        addNotification(
          'Failed to update Gate configuration',
          NotificationType.Error,
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchGateStatus();
    fetchGateConfig();
    const interval = setInterval(fetchGateStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!gateStatus) return 'bg-gray-500';
    if (
      gateStatus.availableReplicas === gateStatus.replicas &&
      gateStatus.replicas > 0
    ) {
      return 'bg-green-500';
    }
    if (gateStatus.replicas === 0) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (!gateStatus) return 'Unknown';
    if (
      gateStatus.availableReplicas === gateStatus.replicas &&
      gateStatus.replicas > 0
    ) {
      return 'Running';
    }
    if (gateStatus.replicas === 0) return 'Stopped';
    return 'Starting';
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-row items-center justify-between'>
        <h3 className='text-lg font-semibold flex flex-row items-center gap-2'>
          <Server className='w-5 h-5' />
          Gate Proxy Server
        </h3>
        <button
          onClick={fetchGateStatus}
          className='p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-800 cursor-pointer transition-colors'
          title='Refresh status'
        >
          <RefreshCw className='w-4 h-4' />
        </button>
      </div>

      {gateStatus && (
        <div className='grid grid-cols-2 gap-4'>
          <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800'>
            <div className='flex flex-row items-center gap-2 mb-2'>
              <Activity className='w-4 h-4' />
              <span className='text-sm font-medium'>Status</span>
            </div>
            <div className='flex flex-row items-center gap-2'>
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <span className='text-lg font-semibold'>{getStatusText()}</span>
            </div>
          </div>

          <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800'>
            <div className='text-sm font-medium mb-2'>Replicas</div>
            <div className='text-lg font-semibold'>
              {gateStatus.readyReplicas} / {gateStatus.replicas}
            </div>
          </div>
        </div>
      )}

      <div className='flex flex-row gap-2'>
        <button
          onClick={handleRestart}
          disabled={isLoading || isSaving}
          className='flex flex-row items-center gap-2 p-2 bg-yellow-500 hover:bg-yellow-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Restart Gate Server
        </button>

        {!isEditingConfig ? (
          <button
            onClick={() => setIsEditingConfig(true)}
            disabled={isLoading || isSaving || !gateConfig}
            className='flex flex-row items-center gap-2 p-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            <Edit3 className='w-4 h-4' />
            Edit Configuration
          </button>
        ) : (
          <>
            <button
              onClick={handleSaveConfig}
              disabled={isSaving || isLoading}
              className='flex flex-row items-center gap-2 p-2 bg-green-500 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
              Save Configuration
            </button>
            <button
              onClick={() => {
                setIsEditingConfig(false);
                fetchGateConfig(); // Reset to original config
              }}
              disabled={isSaving || isLoading}
              className='p-2 bg-gray-500 hover:bg-gray-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {gateStatus?.conditions && gateStatus.conditions.length > 0 && (
        <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800'>
          <div className='text-sm font-medium mb-2'>Conditions</div>
          <div className='space-y-1'>
            {gateStatus.conditions.map((condition, index) => (
              <div
                key={index}
                className='text-sm flex flex-row items-center gap-2'
              >
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${condition.status === 'True' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
                >
                  {condition.type}
                </span>
                <span className='text-gray-600 dark:text-gray-400'>
                  {condition.message || condition.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEditingConfig && gateConfig && (
        <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800'>
          <div className='text-sm font-medium mb-2 flex flex-row items-center justify-between'>
            <span>Configuration Editor</span>
            <span className='text-xs text-orange-600 dark:text-orange-400'>
              ⚠️ Editing this will reload the Gate proxy
            </span>
          </div>
          <textarea
            value={gateConfig}
            onChange={(e) => setGateConfig(e.target.value)}
            className='w-full h-96 p-3 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            placeholder='Gate configuration (JSON format)'
            spellCheck={false}
          />
          <div className='mt-2 text-xs text-gray-600 dark:text-gray-400'>
            Note: Configuration is stored in JSON format. Make sure it's valid
            JSON before saving.
          </div>
        </div>
      )}
    </div>
  );
}
