import { file, serve } from 'bun';
import index from '#/entry/index.html';
import serverInfo from './api/serverInfo';
import serverManage from './api/serverManage';
import { MessageType, type Message } from './websocket/type';
import { rconHandler } from './websocket/rcon';
import serverInstance from './api/serverInstance';
import fileSystem from './api/fileSystem';

export type WebServerArguments = Partial<
  Omit<
    Parameters<typeof serve>[0],
    'routes' | 'development' | 'fetch' | 'websocket'
  >
>;

export const webServer = async (args?: WebServerArguments) => {
  const isProduction = process.env.NODE_ENV === 'production';

  const server = serve({
    routes: {
      // Serve index.html for all unmatched routes in development.
      ...(isProduction ? {} : { '/': index }),
      '/api/server-info': serverInfo,
      '/api/server-manage': serverManage,
      '/api/server-instance': serverInstance,
      '/api/file-system': fileSystem,
    },
    fetch: async (request, server) => {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const searchParams = url.searchParams;

      if (pathname === '/api/websocket') {
        const isUpgraded = server.upgrade(request, {
          data: {},
        });
        if (isUpgraded) {
          return;
        }
        return new Response(`426 Upgrade Required`, { status: 426 });
      }

      if (isProduction) {
        // Serve static files from dist
        let filePath = pathname;
        if (filePath === '/') {
          filePath = '/index.html';
        }
        const staticFile = file(`dist${filePath}`);
        if (await staticFile.exists()) {
          return new Response(staticFile);
        }

        // SPA fallback for non-API routes
        if (!pathname.startsWith('/api/')) {
          return new Response(file('dist/index.html'));
        }
      }

      return new Response(`404 Not Found`, { status: 404 });
    },
    websocket: {
      open(ws) {
        console.log('WebSocket connection opened');
      },
      message(ws, message) {
        try {
          const parsedMessage = JSON.parse(message.toString()) as Message;
          if (
            !Object.keys(parsedMessage).length ||
            ['type', 'payload'].some((key) => !(key in parsedMessage))
          ) {
            console.error(
              'Invalid WebSocket message format:',
              message.toString(),
            );
            return;
          }

          switch (parsedMessage.type) {
            case MessageType.HEARTBEAT:
              ws.send(
                JSON.stringify({
                  type: MessageType.HEARTBEAT,
                  payload: { timestamp: Date.now() },
                }),
              );
              break;
            case MessageType.RCON:
              rconHandler(parsedMessage, (responseMessage) => {
                ws.send(JSON.stringify(responseMessage));
              });
              break;
            default:
              console.error(
                'Unknown WebSocket message type:',
                parsedMessage.type,
              );
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      },
      close(ws, code, reason) {
        console.log(`WebSocket connection closed: ${code} - ${reason}`);
      },
    },
    development: process.env.NODE_ENV !== 'production' && {
      // Enable browser hot reloading in development
      hmr: true,

      // Echo console logs from the browser to the server
      console: false,
    },
    ...args,
  } as Parameters<typeof serve>[0]);
  return server;
};
