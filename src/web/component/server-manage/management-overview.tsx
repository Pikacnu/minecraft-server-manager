import {
  ChartNoAxesGantt,
  FileText,
  HardDrive,
  RefreshCcw,
} from 'lucide-react';
import { type PodData } from '@/utils/k8s';
import Rcon from '../rcon';

export default function ManagementOverview({
  serverName,
  serverLogs,
  resourceData,
  diagnosticError,
  isRefreshingDiagnostics,
  playerCount,
}: {
  serverName: string;
  serverLogs: string;
  resourceData: PodData | null;
  diagnosticError: string | null;
  isRefreshingDiagnostics: boolean;
  playerCount: number | null;
}) {
  return (
    <div className='flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 lg:overflow-hidden'>
      <div className='rounded-xl grow flex flex-col'>
        <div className='mb-3 flex flex-wrap items-center gap-2 '>
          <ChartNoAxesGantt />
          <h3 className='text-lg font-semibold'>Operations</h3>
        </div>

        <div className='grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] grow'>
          <div className='rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 grow relative flex min-h-0 flex-col'>
            <div className='mb-3 flex items-center justify-between gap-2'>
              <div>
                <h4 className='font-semibold text-gray-800 dark:text-gray-100'>
                  Log Viewer
                </h4>
              </div>
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {isRefreshingDiagnostics ? 'Refreshing...' : 'Live'}
              </span>
            </div>
            <div className='flex flex-col grow relative'>
              {diagnosticError ? (
                <div className='rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'>
                  {diagnosticError}
                </div>
              ) : null}
              <pre className='overflow-auto rounded-md bg-gray-950 p-3 font-mono text-xs leading-5 text-gray-100 grow'>
                {serverLogs || 'No log output available yet.'}
              </pre>
            </div>
          </div>

          <div className='flex min-h-0 flex-col gap-4 overflow-hidden'>
            <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800'>
              <div className='mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-200'>
                <FileText className='h-4 w-4' />
                <h4 className='font-semibold'>RCON</h4>
              </div>
              <Rcon
                serverName={serverName}
                alwaysOpen={true}
              />
            </div>

            <div className='shrink-0 rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800'>
              <div className='mb-3 flex items-center gap-2 text-gray-700 dark:text-gray-200'>
                <HardDrive className='h-4 w-4' />
                <h4 className='font-semibold'>Resource View</h4>
              </div>
              <div className='grid grid-cols-2 gap-3 text-sm'>
                <div className='rounded-md bg-gray-50 p-3 dark:bg-gray-900/40'>
                  <div className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                    CPU
                  </div>
                  <div className='mt-1 text-base font-semibold'>
                    {resourceData?.cpu != null &&
                    resourceData?.allocatedCpu != null
                      ? `${resourceData?.cpu} / ${resourceData?.allocatedCpu}`
                      : '—'}
                  </div>
                </div>
                <div className='rounded-md bg-gray-50 p-3 dark:bg-gray-900/40'>
                  <div className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                    Memory
                  </div>
                  <div className='mt-1 text-base font-semibold'>
                    {resourceData?.memory != null &&
                    resourceData?.allocatedMemory != null
                      ? `${resourceData?.memory} / ${resourceData?.allocatedMemory}`
                      : '—'}
                  </div>
                </div>
                <div className='rounded-md bg-gray-50 p-3 dark:bg-gray-900/40'>
                  <div className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                    Player Count
                  </div>
                  <div className='mt-1 text-base font-semibold'>
                    {playerCount != null ? playerCount : '—'}
                  </div>
                </div>
                <div className='rounded-md bg-gray-50 p-3 dark:bg-gray-900/40'>
                  <div className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                    Pod
                  </div>
                  <div className='mt-1 text-base font-semibold'>
                    {resourceData?.name || serverName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
