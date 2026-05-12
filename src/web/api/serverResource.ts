import { ResourceMonitor } from '@/manager/resource-monitor';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const serverName = url.searchParams.get('serverName') || '';

  if (!serverName) {
    return Response.json(
      { status: 'error', message: 'Missing serverName' },
      { status: 400 },
    );
  }

  try {
    const resourceData =
      ResourceMonitor.getInstance().getPodDataByName(serverName);
    return Response.json(
      { status: 'ok', data: resourceData ?? null },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to read server resource data:', error);
    return Response.json(
      { status: 'error', message: 'Failed to read server resource data' },
      { status: 500 },
    );
  }
}

export default {
  GET,
};
