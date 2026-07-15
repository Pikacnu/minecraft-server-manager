import { ResourceMonitor } from '@/manager/resource-monitor';
import { z } from 'zod';

const ResourceQuerySchema = z.object({
  serverName: z.string().min(1, 'Missing serverName'),
});

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const serverName = url.searchParams.get('serverName') || '';

  const parsed = ResourceQuerySchema.safeParse({ serverName });
  if (!parsed.success) {
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
