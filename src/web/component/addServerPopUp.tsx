import type {
  Variables,
  MinecraftServerDeploymentsGeneratorArguments,
} from '@/utils/type';
import ServerSetting from './serverSetting';
import { useState } from 'react';
import { useOpenServerPanel } from '../contexts/addServerPanel';
import { useNotification } from '../contexts/notification';
import { NotificationType } from '../utils/enums';

export default function AddServerPopUp() {
  const [serverSettingSaver, setServerSettingSaver] = useState<
    Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> & Variables
  >({});
  const { isOpen, setIsOpen } = useOpenServerPanel();
  const { addNotification } = useNotification();
  const handleAddServer = async () => {
    try {
      const response = await fetch('/api/server-instance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverSettingSaver),
      });
      if (response.ok) {
        addNotification(
          `Server \"${serverSettingSaver.SERVER_NAME}\" created successfully`,
          NotificationType.Success,
        );
        setIsOpen(false);
      } else {
        const data = await response.json();
        addNotification(
          data.message || 'Failed to create server',
          NotificationType.Error,
        );
      }
    } catch (error) {
      addNotification('Failed to create server', NotificationType.Error);
    }
  };
  return (
    <div
      className='fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 md:p-8'
      onClick={() => {
        if (!isOpen) return;
        setIsOpen(false);
      }}
    >
      <div
        className='mt-8 flex w-full max-w-6xl flex-col gap-4 rounded-xl border border-gray-300 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800'
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <h2 className='text-xl font-bold'>Add Server</h2>

        <div className='rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800'>
          <ul className='grid w-full grid-cols-1 gap-2 text-sm md:grid-cols-2'>
            {[
              ['ServerName', serverSettingSaver.SERVER_NAME],
              ['Version', serverSettingSaver.version],
              ['Memory Limit', serverSettingSaver.memoryLimit],
              ['Type', serverSettingSaver.type],
            ].map(([name, value], index) => (
              <li
                key={index}
                className='flex flex-row items-center gap-2'
              >
                <span className='rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium dark:border-gray-600'>
                  {name}
                </span>
                <span className='font-mono text-sm text-gray-700 dark:text-gray-300'>
                  {String(value ?? '-')}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className='max-h-[60vh] overflow-y-auto rounded-lg border border-gray-300 bg-white p-2 dark:border-gray-700 dark:bg-gray-800'>
          <ServerSetting
            isToggleAble={false}
            open={true}
            setSetting={setServerSettingSaver}
          />
        </div>

        <div className='flex justify-end gap-2 border-t border-gray-300 pt-4 dark:border-gray-700'>
          <button
            className='rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700'
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </button>
          <button
            className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700'
            onClick={() => handleAddServer()}
          >
            Add Server
          </button>
        </div>
      </div>
    </div>
  );
}
