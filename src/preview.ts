import { file, serve } from 'bun';
import index from '#/entry/index.html';
import { MessageType, sendMessageSchema } from './web/websocket/type';

const execSessions = new Map<string, string>();

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
    '/api/server-instance': async (req: Request) => {
      try {
        const url = new URL(req.url);
        const serverName = url.searchParams.get('serverName');
        if (serverName) {
          return Response.json({
            status: 'ok',
            data: {
              VERSION: '1.20.1',
              memoryLimit: '2048',
              TYPE: 'paper',
              SERVER_NAME: serverName,
              domain: `${serverName}.example.com`,
            },
          });
        }

        return Response.json({
          status: 'ok',
          data: { instances: ['preview-server-1', 'preview-server-2'] },
        });
      } catch (e) {
        return Response.json(
          { status: 'error', message: 'Invalid request' },
          { status: 400 },
        );
      }
    },
    '/api/server-resource': async () =>
      Response.json({
        status: 'ok',
        data: {
          name: 'preview-server-1',
          cpu: '120m',
          memory: '512Mi',
          allocatedCpu: '1',
          allocatedMemory: '2Gi',
        },
      }),
    '/api/server-logs': async () =>
      Response.json({
        status: 'ok',
        data: '[12:00:00] [Server thread/INFO]: Mock preview log line\n[12:00:01] [Server thread/INFO]: Server is running',
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
    open(_ws) {},
    message(ws, message) {
      const parsedResult = sendMessageSchema.safeParse(
        JSON.parse(message.toString()),
      );

      if (!parsedResult.success) {
        return;
      }

      const msg = parsedResult.data;

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
                  msg.payload.command
                }`,
                serverName: msg.payload.serverName,
              },
            }),
          );
          break;
        case MessageType.EXEC: {
          const payload = msg.payload;

          if (payload.action === 'close') {
            if (payload.sessionId) {
              execSessions.delete(payload.sessionId);
            }
            ws.send(
              JSON.stringify({
                type: MessageType.EXEC,
                payload: {
                  status: 'closed',
                  serverName: payload.serverName,
                  sessionId: payload.sessionId || '',
                  output: 'Mock exec session closed.',
                  stream: 'status',
                },
              }),
            );
            break;
          }

          if (payload.action === 'input') {
            ws.send(
              JSON.stringify({
                type: MessageType.EXEC,
                payload: {
                  status: 'ok',
                  serverName: payload.serverName,
                  sessionId: payload.sessionId || '',
                  output: `[Mock exec] ${payload.input ?? ''}`,
                  stream: 'stdout',
                },
              }),
            );
            break;
          }

          const sessionId =
            payload.sessionId ||
            `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          execSessions.set(sessionId, payload.serverName);
          ws.send(
            JSON.stringify({
              type: MessageType.EXEC,
              payload: {
                status: 'ok',
                serverName: payload.serverName,
                sessionId,
                output: 'Mock exec session starting.',
                stream: 'status',
              },
            }),
          );
          break;
        }
      }
      return;
    },
  },
});

console.log(
  `Preview server started at http://${server.hostname}:${server.port}`,
);
