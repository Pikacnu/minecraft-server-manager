import { FolderOpen, LayoutDashboard, SlidersHorizontal } from 'lucide-react';
import { type PodData } from '@/utils/k8s';
import { ManagementSection } from './types';

type ServerSummary = {
  name: string;
  address: string;
  status: string;
  playersOnline: number;
};

type ServerOption = {
  id: string;
  name: string;
};

export default function ManagementSidebar({
  server,
  serverOptions,
  selectedServerId,
  onSelectServer,
  activeSection,
  setActiveSection,
  resourceData,
  isRefreshingDiagnostics,
}: {
  server: ServerSummary;
  serverOptions: ServerOption[];
  selectedServerId: string;
  onSelectServer: (serverId: string) => void;
  activeSection: ManagementSection;
  setActiveSection: (section: ManagementSection) => void;
  resourceData: PodData | null;
  isRefreshingDiagnostics: boolean;
}) {
  const sectionButtonClass = (section: ManagementSection) =>
    `flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
      activeSection === section
        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-200'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
    }`;

  return (
    <aside className='flex min-h-0 flex-col gap-4 overflow-hidden rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
      <div className='flex flex-col gap-3 border-b pb-4 dark:border-gray-700'>
        <div className='text-xs font-bold text-gray-500 dark:text-gray-400'>
          Selected Server
        </div>
        <select
          className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900'
          value={selectedServerId}
          onChange={(event) => onSelectServer(event.target.value)}
        >
          <option value=''>Choose a server</option>
          {serverOptions.map((serverOption) => (
            <option
              key={serverOption.id}
              value={serverOption.id}
            >
              {serverOption.name}
            </option>
          ))}
        </select>
      </div>

      <nav className='grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1'>
        <button
          className={sectionButtonClass(ManagementSection.Overview)}
          onClick={() => setActiveSection(ManagementSection.Overview)}
        >
          <LayoutDashboard className='h-4 w-4' />
          <span className='block font-medium'>Manage</span>
        </button>

        <button
          className={sectionButtonClass(ManagementSection.Files)}
          onClick={() => setActiveSection(ManagementSection.Files)}
        >
          <FolderOpen className='h-4 w-4' />
          <span className='block font-medium'>Files</span>
        </button>

        <button
          className={sectionButtonClass(ManagementSection.Settings)}
          onClick={() => setActiveSection(ManagementSection.Settings)}
        >
          <SlidersHorizontal className='h-4 w-4' />
          <span className='block font-medium'>Settings</span>
        </button>
      </nav>
    </aside>
  );
}
