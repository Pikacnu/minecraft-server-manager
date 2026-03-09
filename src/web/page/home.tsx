import { useServers } from '../contexts/servers';

export default function Home() {
  const { serverInfo } = useServers();
  const TotalServers = serverInfo.length;
  const RunningServers = serverInfo.filter(
    (server) => server.status === 'running',
  ).length;
  const TotalPlayers = serverInfo.reduce(
    (total, server) => total + server.playersOnline,
    0,
  );

  return (
    <div className='flex h-full w-full flex-col overflow-y-auto p-4'>
      <div className='rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
        <div className='mb-4 text-2xl font-bold'>Overview</div>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {[
            ['Total Servers', TotalServers],
            ['Running Servers', RunningServers],
            ['Total Players Online', TotalPlayers],
          ].map(([title, value]) => (
            <div
              className='rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800'
              key={title}
            >
              <div className='text-lg font-semibold'>{title}</div>
              <div className='text-3xl'>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className='mt-4 rounded-xl border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800'>
        <div className='mb-4 text-2xl font-bold'>Server Status</div>
          {serverInfo.length === 0 ? (
            <div className='text-gray-500 dark:text-gray-400'>No servers available.</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='min-w-180 table-auto border-collapse border border-gray-300 dark:border-gray-700'>
                <thead>
                  <tr>
                    {[
                      'Name',
                      'Status',
                      'Domain',
                      'Address',
                      'Players Online',
                    ].map((header) => (
                      <th
                        key={header}
                        className='border border-gray-300 bg-gray-200 px-4 py-2 text-left dark:border-gray-700 dark:bg-gray-700'
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='dark:text-white'>
                  {serverInfo.map((server) => (
                    <tr key={server.id}>
                      <td className='border border-gray-300 px-4 py-2 dark:border-gray-700'>
                        {server.name}
                      </td>
                      <td className='border border-gray-300 px-4 py-2 dark:border-gray-700'>
                        {server.status}
                      </td>
                      <td className='border border-gray-300 px-4 py-2 dark:border-gray-700'>
                        {server.domain || 'N/A'}
                      </td>
                      <td className='border border-gray-300 px-4 py-2 dark:border-gray-700'>
                        {server.address}
                      </td>
                      <td className='border border-gray-300 px-4 py-2 dark:border-gray-700'>
                        {server.playersOnline}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
