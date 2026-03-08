import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useSettings } from './settings';
import { NotificationType } from '../utils/enums';

// Re-export for convenience
export { NotificationType };

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    message: string,
    type: NotificationType,
    duration?: number,
  ) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotification must be used within a NotificationProvider',
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { uiPreferences } = useSettings();

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const addNotification = useCallback(
    (message: string, type: NotificationType, duration?: number) => {
      const id = Math.random().toString(36).substring(2, 9);
      // Use default duration from settings if not provided
      const notificationDuration =
        duration || uiPreferences.notificationDuration;
      const notification: Notification = {
        id,
        message,
        type,
        duration: notificationDuration,
      };

      setNotifications((prev) => [...prev, notification]);

      // Auto remove after duration
      setTimeout(() => {
        removeNotification(id);
      }, notificationDuration);
    },
    [removeNotification, uiPreferences.notificationDuration],
  );

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
