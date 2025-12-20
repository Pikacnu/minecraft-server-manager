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
    <div className='flex flex-col w-full relative '>
      <div className='flex flex-col m-4 border-2 border-gray-300 rounded-lg p-4'>
        <div className='text-2xl font-bold mb-4'>Overview</div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {[
            ['Total Servers', TotalServers],
            ['Running Servers', RunningServers],
            ['Total Players Online', TotalPlayers],
          ].map(([title, value]) => (
            <div
              className='bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md'
              key={title}
            >
              <div className='text-lg font-semibold'>{title}</div>
              <div className='text-3xl'>{value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className='flex flex-row'>
        <div className='flex flex-col m-4 border-2 border-gray-300 rounded-lg p-4 w-full'>
          <div className='text-2xl font-bold mb-4'>Recent Activity</div>
          <div className=''>No recent activity to display.</div>
        </div>
      </div>
      <div>
        <div className='flex flex-col m-4 border-2 border-gray-300 rounded-lg p-4'>
          <div className='text-2xl font-bold mb-4'>Server Status</div>
          {serverInfo.length === 0 ? (
            <div className=''>No servers available.</div>
          ) : (
            <table className='min-w-full table-auto border-collapse border border-gray-300'>
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
                      className='border border-gray-300 px-4 py-2 bg-gray-200'
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className=' dark:text-white '>
                {serverInfo.map((server) => (
                  <tr key={server.id}>
                    <td className='border border-gray-300 px-4 py-2'>
                      {server.name}
                    </td>
                    <td className='border border-gray-300 px-4 py-2'>
                      {server.status}
                    </td>
                    <td className='border border-gray-300 px-4 py-2'>
                      {server.domain || 'N/A'}
                    </td>
                    <td className='border border-gray-300 px-4 py-2'>
                      {server.address}
                    </td>
                    <td className='border border-gray-300 px-4 py-2'>
                      {server.playersOnline}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
