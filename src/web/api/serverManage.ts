import { Manager } from '@/manager';
import { ServerManageRequestSchema } from '@/utils/schemas';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const parsed = ServerManageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        status: 'error',
        message: `Invalid request: ${parsed.error.issues[0]?.message}`,
      },
      { status: 400 },
    );
  }
  const { action, serverName } = parsed.data;
  try {
    switch (action) {
      case 'restart':
        await Manager.restartServer(serverName);
        break;
      case 'stop':
        await Manager.stopServer(serverName);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    return Response.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Error managing server:', error);
    return Response.json(
      { status: 'error', message: 'Error managing server' },
      { status: 500 },
    );
  }
}

export default {
  POST,
};
