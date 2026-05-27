import { Manager } from '@/manager';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const serverName = url.searchParams.get('serverName') || '';
  const requestedLines = Number(url.searchParams.get('lines') || '120');
  const lines = Number.isFinite(requestedLines)
    ? Math.min(1000, Math.max(1, Math.floor(requestedLines)))
    : 120;

  if (!serverName) {
    return Response.json(
      { status: 'error', message: 'Missing serverName' },
      { status: 400 },
    );
  }

  try {
    const data = await Manager.readServerLogs(serverName, lines);
    return Response.json({ status: 'ok', data }, { status: 200 });
  } catch (error) {
    console.error('Failed to read server logs:', error);
    return Response.json(
      { status: 'error', message: 'Failed to read server logs' },
      { status: 500 },
    );
  }
}

export default {
  GET,
};
