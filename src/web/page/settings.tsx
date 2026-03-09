import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Bell,
  Server,
  Info,
} from 'lucide-react';
import { useSettings } from '../contexts/settings';
import GateManagement from '../component/gateManagement';
import { ThemeMode, NotificationPosition } from '../utils/enums';
import { DeviceType, useDevice } from '../hooks/useDevice';

enum SettingsTab {
  UI = 'ui',
  Notifications = 'notifications',
  System = 'system',
  Gate = 'gate',
  About = 'about',
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>(SettingsTab.UI);
  const { systemSettings, uiPreferences, updateUIPreference } = useSettings();
  const device = useDevice();

  const tabs: Array<{ id: SettingsTab; label: string; icon: any }> = [
    { id: SettingsTab.UI, label: 'UI Preferences', icon: Palette },
    {
      id: SettingsTab.Notifications,
      label: 'Notifications',
      icon: Bell,
    },
    { id: SettingsTab.System, label: 'System', icon: SettingsIcon },
    { id: SettingsTab.Gate, label: 'Gate Proxy', icon: Server },
    { id: SettingsTab.About, label: 'About', icon: Info },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case SettingsTab.UI:
        return (
          <div className='space-y-4'>
            <h2 className='text-xl font-bold mb-4'>UI Preferences</h2>

            {/* Theme Mode */}
            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>Theme Mode</label>
              <select
                value={uiPreferences.theme}
                onChange={(e) =>
                  updateUIPreference('theme', e.target.value as ThemeMode)
                }
                className='border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800'
              >
                <option value={ThemeMode.Auto}>Auto (System)</option>
                <option value={ThemeMode.Light}>Light</option>
                <option value={ThemeMode.Dark}>Dark</option>
              </select>
            </div>

            {/* Auto Refresh Interval */}
            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>
                Auto Refresh Interval (ms)
              </label>
              <input
                type='number'
                value={uiPreferences.autoRefreshInterval}
                onChange={(e) =>
                  updateUIPreference(
                    'autoRefreshInterval',
                    parseInt(e.target.value),
                  )
                }
                className='border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800'
                min='5000'
                max='60000'
                step='1000'
              />
              <span className='text-xs text-gray-500'>
                Current: {uiPreferences.autoRefreshInterval / 1000} seconds
              </span>
            </div>

            {/* Compact Mode */}
            <div className='flex flex-row items-center justify-between'>
              <label className='text-sm font-medium'>Compact Mode</label>
              <input
                type='checkbox'
                checked={uiPreferences.compactMode}
                onChange={(e) =>
                  updateUIPreference('compactMode', e.target.checked)
                }
                className='w-5 h-5 cursor-pointer'
              />
            </div>
          </div>
        );

      case SettingsTab.Notifications:
        return (
          <div className='space-y-4'>
            <h2 className='text-xl font-bold mb-4'>Notification Settings</h2>

            {/* Notification Duration */}
            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>
                Notification Duration (ms)
              </label>
              <input
                type='number'
                value={uiPreferences.notificationDuration}
                onChange={(e) =>
                  updateUIPreference(
                    'notificationDuration',
                    parseInt(e.target.value),
                  )
                }
                className='border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800'
                min='1000'
                max='10000'
                step='500'
              />
              <span className='text-xs text-gray-500'>
                Current: {uiPreferences.notificationDuration / 1000} seconds
              </span>
            </div>

            {/* Notification Position */}
            <div className='flex flex-col gap-2'>
              <label className='text-sm font-medium'>
                Notification Position
              </label>
              <select
                value={uiPreferences.notificationPosition}
                onChange={(e) =>
                  updateUIPreference(
                    'notificationPosition',
                    e.target.value as NotificationPosition,
                  )
                }
                className='border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800'
              >
                <option value={NotificationPosition.TopCenter}>
                  Top Center
                </option>
                <option value={NotificationPosition.TopRight}>Top Right</option>
                <option value={NotificationPosition.TopLeft}>Top Left</option>
                <option value={NotificationPosition.BottomCenter}>
                  Bottom Center
                </option>
                <option value={NotificationPosition.BottomRight}>
                  Bottom Right
                </option>
                <option value={NotificationPosition.BottomLeft}>
                  Bottom Left
                </option>
              </select>
            </div>
          </div>
        );

      case SettingsTab.System:
        return (
          <div className='space-y-4'>
            <h2 className='text-xl font-bold mb-4'>System Configuration</h2>

            {systemSettings && (
              <>
                {/* Read-only Settings */}
                <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800'>
                  <h3 className='text-sm font-semibold mb-2'>
                    Environment Settings (Read-only)
                  </h3>
                  <div className='space-y-2 text-sm'>
                    <div className='flex flex-row justify-between'>
                      <span>Namespace:</span>
                      <span className='font-mono'>
                        {systemSettings.readOnly.namespace}
                      </span>
                    </div>
                    <div className='flex flex-row justify-between'>
                      <span>App Name:</span>
                      <span className='font-mono'>
                        {systemSettings.readOnly.appName}
                      </span>
                    </div>
                    <div className='flex flex-row justify-between'>
                      <span>NFS Server:</span>
                      <span className='font-mono'>
                        {systemSettings.readOnly.nfsServer}
                      </span>
                    </div>
                    <div className='flex flex-row justify-between'>
                      <span>Environment:</span>
                      <span
                        className={`font-mono px-2 py-1 rounded ${systemSettings.readOnly.isDevelopment ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200'}`}
                      >
                        {systemSettings.readOnly.isDevelopment
                          ? 'Development'
                          : 'Production'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Network Settings */}
                <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800'>
                  <h3 className='text-sm font-semibold mb-2'>Network</h3>
                  <div className='space-y-2 text-sm'>
                    <div className='flex flex-row justify-between'>
                      <span>Domain Name:</span>
                      <span className='font-mono'>
                        {systemSettings.network.domainName || 'Not configured'}
                      </span>
                    </div>
                    <div className='flex flex-row justify-between'>
                      <span>Proxy IP:</span>
                      <span className='font-mono'>
                        {systemSettings.network.proxyIp || 'Not configured'}
                      </span>
                    </div>
                    <div className='flex flex-row justify-between'>
                      <span>SRV Port:</span>
                      <span className='font-mono'>
                        {systemSettings.network.srvPort}
                      </span>
                    </div>
                    <div className='flex flex-row justify-between'>
                      <span>Wildcard Domain:</span>
                      <span className='font-mono'>
                        {systemSettings.network.isWildcardDomain
                          ? 'Enabled'
                          : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sensitive Settings */}
                <div className='border border-yellow-300 dark:border-yellow-600 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20'>
                  <h3 className='text-sm font-semibold mb-2'>
                    Sensitive Configuration
                  </h3>
                  <div className='space-y-2 text-sm'>
                    <div className='flex flex-row justify-between'>
                      <span>RCON Password:</span>
                      <span className='font-mono'>
                        {systemSettings.sensitive.rconPassword || 'Not set'}
                      </span>
                    </div>
                    <div className='flex flex-row justify-between'>
                      <span>Velocity Secret:</span>
                      <span className='font-mono'>
                        {systemSettings.sensitive.velocitySecret || 'Not set'}
                      </span>
                    </div>
                    <div className='flex flex-row justify-between'>
                      <span>Cloudflare API Token:</span>
                      <span className='font-mono'>
                        {systemSettings.sensitive.cloudflareApiToken ||
                          'Not set'}
                      </span>
                    </div>
                  </div>
                  <p className='text-xs text-yellow-700 dark:text-yellow-300 mt-2'>
                    These values are masked for security. Modify them via
                    environment variables.
                  </p>
                </div>
              </>
            )}
          </div>
        );

      case SettingsTab.Gate:
        return (
          <div className='space-y-4'>
            <h2 className='text-xl font-bold mb-4'>Gate Proxy Management</h2>
            <GateManagement />
          </div>
        );

      case SettingsTab.About:
        return (
          <div className='space-y-4'>
            <h2 className='text-xl font-bold mb-4'>About</h2>
            <div className='border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800'>
              <h3 className='text-lg font-semibold mb-2'>
                Minecraft Server Manager
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
                A management system for Minecraft servers and Kubernetes
                Cluster, built with Bun and React.
              </p>

              <div className='space-y-2 text-sm'>
                <div className='flex flex-row justify-between'>
                  <span>Version:</span>
                  <span className='font-mono'>0.0.2</span>
                </div>
                <div className='flex flex-row justify-between'>
                  <span>Runtime:</span>
                  <span className='font-mono'>Bun</span>
                </div>
                <div className='flex flex-row justify-between'>
                  <span>Framework:</span>
                  <span className='font-mono'>
                    React + TypeScript + Tailwindcss
                  </span>
                </div>
              </div>

              <div className='mt-4 pt-4 border-t border-gray-300 dark:border-gray-600'>
                <a
                  href='https://github.com/Pikacnu/minecraft-server-manager'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm'
                >
                  View on GitHub →
                </a>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className='flex h-full w-full flex-col gap-4 overflow-hidden p-4 md:flex-row'>
      {/* Sidebar */}
      <div className='w-full rounded-xl border border-gray-300 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:w-64 md:p-4'>
        <h1 className='text-xl font-bold mb-4 flex flex-row items-center gap-2'>
          <SettingsIcon className='w-5 h-5' />
          {device !== DeviceType.Mobile && <span>'Settings'</span>}
        </h1>
        <nav className='flex gap-1 overflow-x-auto md:block md:space-y-1 md:overflow-visible'>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-lg p-2 text-left transition-colors md:flex md:w-full md:flex-row md:items-center md:gap-2 ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className='w-4 h-4' />
              {device !== DeviceType.Mobile && (
                <span className='ml-2 md:ml-0'>{tab.label}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:p-6'>
        {renderTabContent()}
      </div>
    </div>
  );
}
