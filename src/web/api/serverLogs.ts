import { Manager } from '@/manager';
import { ServerLogsQuerySchema } from '@/utils/schemas';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const serverName = url.searchParams.get('serverName') || '';
  const requestedLines = Number(url.searchParams.get('lines') || '120');

  const parsed = ServerLogsQuerySchema.safeParse({
    serverName,
    lines: Number.isFinite(requestedLines) ? requestedLines : 120,
  });
  if (!parsed.success) {
    return Response.json(
      { status: 'error', message: 'Missing or invalid serverName' },
      { status: 400 },
    );
  }
  const { lines } = parsed.data;

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
