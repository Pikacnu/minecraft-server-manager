import { getServersInfo } from '../utils/serverUtilits';
import { type ServerInfo } from '../contexts/servers';

export async function GET(request: Request): Promise<Response> {
  const servers = getServersInfo();

  if (!servers) {
    return Response.json(
      { status: 'error', message: 'No servers found' },
      { status: 404 },
    );
  }

  const responseServer: ServerInfo[] = servers.map((server) => ({
    id: server.name,
    name: server.name,
    status: server.status,
    domain: server.domain,
    address: server.address,
    playersOnline: server.playersOnline || 0,
  }));

  return Response.json({ status: 'ok', data: responseServer }, { status: 200 });
}

export default {
  GET,
};
