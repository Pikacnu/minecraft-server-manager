import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/server-manage', async ({ request }) => {
    const body = (await request.json()) as any;
    console.log('Mock Server Manage:', body);
    return HttpResponse.json({
      status: 'ok',
      message: `Server ${body.action} successful (Mock)`,
    });
  }),

  http.get('/api/file-system', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (type === 'structure') {
      return HttpResponse.json({
        success: true,
        data: {
          name: '/',
          type: 'directory',
          children: [
            { name: 'server.properties', type: 'file' },
            {
              name: 'mods',
              type: 'directory',
              children: [{ name: 'Fabric-API.jar', type: 'file' }],
            },
            { name: 'world', type: 'directory', children: [] },
            {
              name: 'logs',
              type: 'directory',
              children: [{ name: 'latest.log', type: 'file' }],
            },
          ],
        },
      });
    }

    if (type === 'file') {
      return HttpResponse.json({
        success: true,
        data: '# Minecraft server properties\n# (Mock Data)\nmotd=A Minecraft Server Preview\nlevel-name=world\nserver-port=25565',
      });
    }

    return HttpResponse.json(
      { success: false, message: 'Invalid type' },
      { status: 400 },
    );
  }),

  http.get('/api/server-instance', () => {
    return HttpResponse.json({
      success: true,
      data: {
        instances: ['my-server', 'demo-server-2'],
      },
    });
  }),
];
