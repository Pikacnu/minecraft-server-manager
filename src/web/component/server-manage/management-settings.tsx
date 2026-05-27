import { Send, SlidersHorizontal } from 'lucide-react';
import ServerSetting from '../serverSetting';
import { type Dispatch, type SetStateAction } from 'react';
import {
  type MinecraftServerDeploymentsGeneratorArguments,
  type Variables,
} from '@/utils/type';

export default function ManagementSettings({
  defaultValue,
  setSetting,
  onSubmit,
}: {
  defaultValue: Partial<
    Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> &
      Variables & { serverSettingId: string }
  >;
  setSetting: Dispatch<
    SetStateAction<
      Omit<MinecraftServerDeploymentsGeneratorArguments, 'Variables'> &
        Variables
    >
  >;
  onSubmit: () => void;
}) {
  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden p-4'>
      <div className='mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-200'>
        <SlidersHorizontal className='h-4 w-4' />
        <h3 className='text-lg font-semibold'>Server Settings</h3>
      </div>
      <div className='grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_auto]'>
        <div className='min-h-0 min-w-0 rounded-lg p-2 dark:border-gray-700 relative'>
          <ServerSetting
            isToggleAble={false}
            open={true}
            defaultValue={defaultValue}
            setSetting={setSetting}
          />
        </div>
        <div className='shrink-0 rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40 xl:w-72'>
          <div className='mb-3 text-sm text-gray-600 dark:text-gray-300'>
            Saving these values will patch the server deployment and apply the
            new configuration.
          </div>
          <button
            className='inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
            onClick={onSubmit}
          >
            <Send className='h-4 w-4' />
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
