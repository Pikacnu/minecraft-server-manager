import { ws } from 'msw';
import { MessageType } from '../websocket/type';

const chat = ws.link('*/api/websocket');

export const wsHandlers = [
  chat.addEventListener('connection', ({ client }: { client: any }) => {
    console.log('Mock WebSocket connected');

    client.addEventListener('message', (event: any) => {
      const message = JSON.parse(event.data as string);

      if (message.type === MessageType.SERVERINFO) {
        client.send(
          JSON.stringify({
            type: MessageType.SERVERINFO,
            payload: {
              servers: [
                {
                  id: 'my-server',
                  name: 'test-server (Running)',
                  status: 'running',
                  address: 'play.example.com',
                  playersOnline: 5,
                },
                {
                  id: 'demo-server-2',
                  name: 'backup-server (Stopped)',
                  status: 'stopped',
                  address: 'backup.example.com',
                  playersOnline: 0,
                },
              ],
            },
          }),
        );
      }

      if (message.type === MessageType.RCON) {
        client.send(
          JSON.stringify({
            type: MessageType.RCON,
            payload: {
              status: 'success',
              response: `[Mock] Executed command: ${message.payload.command}\nUnknown command. Type "help" for help.`,
              serverName: message.payload.serverName,
            },
          }),
        );
      }

      if (message.type === MessageType.HEARTBEAT) {
        client.send(
          JSON.stringify({
            type: MessageType.HEARTBEAT,
            payload: { timestamp: Date.now() },
          }),
        );
      }

      if (message.type === MessageType.SERVERLOG) {
        if (message.payload.action === 'subscribe') {
          client.send(
            JSON.stringify({
              type: MessageType.SERVERLOG,
              payload: {
                status: 'ok',
                serverName: message.payload.serverName,
              },
            }),
          );
        }
      }
    });

    const interval = setInterval(() => {
      client.send(
        JSON.stringify({
          type: MessageType.SERVERINFO,
          payload: {
            servers: [
              {
                id: 'my-server',
                name: 'test-server (Running)',
                status: 'running',
                address: 'play.example.com',
                playersOnline: Math.floor(Math.random() * 10),
              },
              {
                id: 'demo-server-2',
                name: 'backup-server (Stopped)',
                status: 'stopped',
                address: 'backup.example.com',
                playersOnline: 0,
              },
            ],
          },
        }),
      );

      client.send(
        JSON.stringify({
          type: MessageType.SERVERLOG,
          payload: {
            status: 'ok',
            serverName: 'my-server',
            chunk: `[${new Date().toISOString()}] [Server thread/INFO]: Mock log line`,
          },
        }),
      );
    }, 10000);

    client.addEventListener('close', () => clearInterval(interval));
  }),
];
