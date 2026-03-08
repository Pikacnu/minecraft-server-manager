import React, { useEffect, useState } from 'react';
import { useNotification } from '../contexts/notification';
import { useSettings } from '../contexts/settings';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { NotificationPosition, NotificationType } from '../utils/enums';

const NotificationToast: React.FC = () => {
  const { notifications, removeNotification } = useNotification();
  const { uiPreferences } = useSettings();

  if (notifications.length === 0) return null;

  const getPositionClass = () => {
    switch (uiPreferences.notificationPosition) {
      case NotificationPosition.TopLeft:
        return 'fixed top-4 left-4 z-50 flex flex-col gap-2';
      case NotificationPosition.TopRight:
        return 'fixed top-4 right-4 z-50 flex flex-col gap-2';
      case NotificationPosition.BottomLeft:
        return 'fixed bottom-4 left-4 z-50 flex flex-col gap-2';
      case NotificationPosition.BottomRight:
        return 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
      case NotificationPosition.BottomCenter:
        return 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2';
      case NotificationPosition.TopCenter:
      default:
        return 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2';
    }
  };

  return (
    <div className={getPositionClass()}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          duration={uiPreferences.notificationDuration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
  };
  duration: number;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  duration,
  onClose,
}) => {
  const [progress, setProgress] = useState(100);
  const effectiveDuration = notification.duration || duration;

  useEffect(() => {
    const interval = 10; // Update every 10ms
    const decrement = (100 / effectiveDuration) * interval;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - decrement;
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [effectiveDuration]);

  const getIcon = () => {
    switch (notification.type) {
      case NotificationType.Success:
        return <CheckCircle className='w-5 h-5 text-green-500' />;
      case NotificationType.Error:
        return <XCircle className='w-5 h-5 text-red-500' />;
      case NotificationType.Warning:
        return <AlertCircle className='w-5 h-5 text-yellow-500' />;
      case NotificationType.Info:
        return <Info className='w-5 h-5 text-blue-500' />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case NotificationType.Success:
        return 'bg-green-100 dark:bg-green-900 border-green-500';
      case NotificationType.Error:
        return 'bg-red-100 dark:bg-red-900 border-red-500';
      case NotificationType.Warning:
        return 'bg-yellow-100 dark:bg-yellow-900 border-yellow-500';
      case NotificationType.Info:
        return 'bg-blue-100 dark:bg-blue-900 border-blue-500';
    }
  };

  const getProgressColor = () => {
    switch (notification.type) {
      case NotificationType.Success:
        return 'bg-green-500';
      case NotificationType.Error:
        return 'bg-red-500';
      case NotificationType.Warning:
        return 'bg-yellow-500';
      case NotificationType.Info:
        return 'bg-blue-500';
    }
  };

  return (
    <div
      className={`${getBackgroundColor()} border-l-4 rounded-lg shadow-lg min-w-80 max-w-md overflow-hidden`}
    >
      <div className='flex items-center justify-between p-4'>
        <div className='flex items-center gap-3'>
          {getIcon()}
          <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
            {notification.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer'
        >
          <X className='w-4 h-4' />
        </button>
      </div>
      <div className='h-1 bg-gray-200 dark:bg-gray-700'>
        <div
          className={`h-full ${getProgressColor()} transition-all ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default NotificationToast;
