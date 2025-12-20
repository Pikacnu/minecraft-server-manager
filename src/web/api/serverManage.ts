import { Manager } from '@/manager';

export async function POST(request: Request): Promise<Response> {
  const {
    action,
    serverName,
  }: {
    action: 'restart' | 'stop' | 'delete';
    serverName: string;
  } = await request.json();
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
