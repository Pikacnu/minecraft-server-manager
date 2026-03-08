import { useState, useEffect } from 'react';
import { RefreshCw, Server, Activity } from 'lucide-react';
import { useNotification } from '../contexts/notification';
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
  const { addNotification } = useNotification();

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

  const handleRestart = async () => {
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

  useEffect(() => {
    fetchGateStatus();
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
          disabled={isLoading}
          className='flex flex-row items-center gap-2 p-2 bg-yellow-500 hover:bg-yellow-700 text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Restart Gate Server
        </button>
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
    </div>
  );
}
