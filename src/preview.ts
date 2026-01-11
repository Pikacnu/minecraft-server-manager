import { file, serve } from 'bun';
import index from '#/entry/index.html';
import { MessageType } from './web/websocket/type';

process.env.PREVIEW_MODE = 'true';

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const host = process.env.HOST || 'localhost';

console.log('Starting Minecraft Server Manager in PREVIEW mode...');
const server = serve({
  port,
  hostname: host,
  routes: {
    '/': index,
    '/mockServiceWorker.js': file(
      import.meta.resolveSync('#/entry/mockServiceWorker.js'),
    ),
    '/api/server-manage': async () =>
      Response.json({ status: 'ok', message: 'Mocked action successful' }),
    '/api/server-instance': async () =>
      Response.json({
        success: true,
        data: { instances: ['preview-server-1', 'preview-server-2'] },
      }),
    '/api/file-system': async (req: Request) => {
      const url = new URL(req.url);
      const type = url.searchParams.get('type');
      if (type === 'structure') {
        return Response.json({
          success: true,
          data: {
            name: '/',
            type: 'directory',
            children: [
              { name: 'server.properties', type: 'file' },
              { name: 'world', type: 'directory', children: [] },
            ],
          },
        });
      }
      return Response.json({
        success: true,
        data: '# Mock Content\nmotd=A Minecraft Server Preview',
      });
    },
  },
  websocket: {
    open(ws) {},
    message(ws, message) {
      const msg = JSON.parse(message.toString());

      switch (msg.type) {
        case MessageType.HEARTBEAT:
          ws.send(
            JSON.stringify({
              type: MessageType.HEARTBEAT,
              payload: { timestamp: Date.now() },
            }),
          );
          break;
        case MessageType.SERVERINFO:
          ws.send(
            JSON.stringify({
              type: MessageType.SERVERINFO,
              payload: {
                servers: [
                  {
                    id: 'preview-server-1',
                    name: 'Preview Server 1',
                    status: 'running',
                    address: 'preview1.example.com',
                    playersOnline: 5,
                  },
                  {
                    id: 'preview-server-2',
                    name: 'Preview Server 2',
                    status: 'stopped',
                    address: 'preview2.example.com',
                    playersOnline: 0,
                  },
                ],
              },
            }),
          );
          break;
        case MessageType.RCON:
          ws.send(
            JSON.stringify({
              type: MessageType.RCON,
              payload: {
                status: 'success',
                response: `[Mock] Executed command: ${
                  (msg.payload as any).command
                }`,
                serverName: (msg.payload as any).serverName,
              },
            }),
          );
          break;
      }
      return;
    },
  },
});

console.log(
  `Preview server started at http://${server.hostname}:${server.port}`,
);
