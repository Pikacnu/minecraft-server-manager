import { file, serve } from 'bun';
import index from '#/entry/index.html';
import serverInfo from './api/serverInfo';
import instanceScanner from './api/instanceScanner';
import serverManage from './api/serverManage';
import { MessageType, type SendMessage } from './websocket/type';
import { rconHandler } from './websocket/rcon';
import serverInstance from './api/serverInstance';
import fileSystem from './api/fileSystem';
import gateManage from './api/gateManage';
import settings from './api/settings';
import { serverInfoHandler } from './websocket/serverinfo';
import serverLogs from './api/serverLogs';
import serverResource from './api/serverResource';
import {
  closeTrackedLogSubscriptions,
  serverLogHandler,
} from './websocket/serverlogs';

export type WebServerArguments = Partial<
  Omit<
    Parameters<typeof serve>[0],
    'routes' | 'development' | 'fetch' | 'websocket'
  >
>;

type WebSocketConnectionData = {
  connectionId: string;
  logSubscriptions: Set<string>;
};

export const webServer = async (args?: WebServerArguments) => {
  const server = serve({
    idleTimeout: 120,
    routes: {
      // Serve index.html for all unmatched routes in development.
      '/': index,
      //'/api/server-info': serverInfo,
      '/api/server-manage': serverManage,
      '/api/server-instance': serverInstance,
      '/api/file-system': fileSystem,
      '/api/server-logs': serverLogs,
      '/api/server-resource': serverResource,
      '/api/gate-manage': gateManage,
      '/api/settings': settings,
      '/api/instance-scanner': instanceScanner,
    },
    fetch: async (request, server) => {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const searchParams = url.searchParams;

      if (pathname === '/api/websocket') {
        const isUpgraded = server.upgrade(request, {
          data: {
            connectionId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            logSubscriptions: new Set<string>(),
          },
        });
        if (isUpgraded) {
          return;
        }
        return new Response(`426 Upgrade Required`, { status: 426 });
      }

      return new Response(`404 Not Found`, { status: 404 });
    },
    websocket: {
      open(ws) {
        //console.log('WebSocket connection opened');
      },
      message(ws, message) {
        try {
          const parsedMessage = JSON.parse(message.toString()) as SendMessage;
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
              rconHandler(
                parsedMessage as SendMessage<MessageType.RCON>,
                (responseMessage) => {
                  ws.send(JSON.stringify(responseMessage));
                },
              );
              break;
            case MessageType.SERVERINFO:
              serverInfoHandler(
                parsedMessage as SendMessage<MessageType.SERVERINFO>,
                (responseMessage) => {
                  ws.send(JSON.stringify(responseMessage));
                },
              );
              break;
            case MessageType.SERVERLOG: {
              const connectionData = ws.data as WebSocketConnectionData;
              void serverLogHandler(
                parsedMessage as SendMessage<MessageType.SERVERLOG>,
                (responseMessage) => {
                  ws.send(JSON.stringify(responseMessage));
                },
                connectionData.connectionId,
                (subscriptionId) => {
                  connectionData.logSubscriptions.add(subscriptionId);
                },
              );
              break;
            }
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
      async close(ws, code, reason) {
        const connectionData = ws.data as WebSocketConnectionData;
        if (connectionData.logSubscriptions?.size) {
          await closeTrackedLogSubscriptions(
            connectionData.logSubscriptions.values(),
          );
        }
        //console.log(`WebSocket connection closed: ${code} - ${reason}`);
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

if (import.meta.main) {
  (async () => {
    try {
      const server = await webServer({
        port: 3000,
        hostname: 'localhost',
      });
      console.log(`Server started at http://${server.hostname}:${server.port}`);
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  })();
}
