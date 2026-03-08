import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { ThemeMode, NotificationPosition } from '../utils/enums';

// Re-export for convenience
export { ThemeMode, NotificationPosition };

interface SystemSettings {
  readOnly: {
    namespace: string;
    appName: string;
    nfsServer: string;
    nfsRootPath: string;
    isDevelopment: boolean;
  };
  sensitive: {
    velocitySecret: string;
    rconPassword: string;
    cloudflareApiToken: string;
  };
  network: {
    domainName: string;
    proxyIp: string;
    srvPort: number;
    zoneId: string;
    wildcardDomainPrefix: string;
    isWildcardDomain: boolean;
  };
}

interface UIPreferences {
  theme: ThemeMode;
  notificationDuration: number;
  notificationPosition: NotificationPosition;
  autoRefreshInterval: number;
  compactMode: boolean;
}

interface SettingsContextType {
  systemSettings: SystemSettings | null;
  uiPreferences: UIPreferences;
  updateUIPreference: <K extends keyof UIPreferences>(
    key: K,
    value: UIPreferences[K],
  ) => void;
  refreshSystemSettings: () => Promise<void>;
}

const defaultUIPreferences: UIPreferences = {
  theme: ThemeMode.Auto,
  notificationDuration: 2000,
  notificationPosition: NotificationPosition.TopCenter,
  autoRefreshInterval: 15000,
  compactMode: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
}) => {
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(
    null,
  );
  const [uiPreferences, setUIPreferences] = useState<UIPreferences>(() => {
    // Load from localStorage
    const stored = localStorage.getItem('uiPreferences');
    return stored ? JSON.parse(stored) : defaultUIPreferences;
  });

  // Save UI preferences to localStorage
  useEffect(() => {
    localStorage.setItem('uiPreferences', JSON.stringify(uiPreferences));
  }, [uiPreferences]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (uiPreferences.theme === ThemeMode.Dark) {
      root.classList.add('dark');
    } else if (uiPreferences.theme === ThemeMode.Light) {
      root.classList.remove('dark');
    } else {
      // Auto mode - use system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [uiPreferences.theme]);

  const refreshSystemSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSystemSettings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    }
  }, []);

  const updateUIPreference = useCallback(
    <K extends keyof UIPreferences>(key: K, value: UIPreferences[K]) => {
      setUIPreferences((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Load system settings on mount
  useEffect(() => {
    refreshSystemSettings();
  }, [refreshSystemSettings]);

  return (
    <SettingsContext.Provider
      value={{
        systemSettings,
        uiPreferences,
        updateUIPreference,
        refreshSystemSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
