import { ws } from 'msw';
import { MessageType, sendMessageSchema } from '../websocket/type';

const chat = ws.link('*/api/websocket');
const execSessions = new Map<string, string>();

export const wsHandlers = [
  chat.addEventListener('connection', ({ client }: { client: MockClient }) => {
    console.log('Mock WebSocket connected');

    client.addEventListener('message', (event) => {
      const parsedResult = sendMessageSchema.safeParse(JSON.parse(event.data));
      if (!parsedResult.success) {
        return;
      }

      const message = parsedResult.data;

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

      if (message.type === MessageType.EXEC) {
        if (message.payload.action === 'close') {
          if (message.payload.sessionId) {
            execSessions.delete(message.payload.sessionId);
          }
          client.send(
            JSON.stringify({
              type: MessageType.EXEC,
              payload: {
                status: 'closed',
                serverName: message.payload.serverName,
                sessionId: message.payload.sessionId || '',
                output: 'Mock exec session closed.',
                stream: 'status',
              },
            }),
          );
          return;
        }

        if (message.payload.action === 'input') {
          client.send(
            JSON.stringify({
              type: MessageType.EXEC,
              payload: {
                status: 'ok',
                serverName: message.payload.serverName,
                sessionId: message.payload.sessionId || '',
                output: `[Mock exec] ${message.payload.input ?? ''}`,
                stream: 'stdout',
              },
            }),
          );
          return;
        }

        const sessionId =
          message.payload.sessionId || Math.random().toString(36).slice(2, 10);
        execSessions.set(sessionId, message.payload.serverName);
        client.send(
          JSON.stringify({
            type: MessageType.EXEC,
            payload: {
              status: 'ok',
              serverName: message.payload.serverName,
              sessionId,
              output: 'Mock exec session starting.',
              stream: 'status',
            },
          }),
        );
        return;
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

type MockClient = {
  send: (data: string) => void;
  addEventListener: (
    type: 'message' | 'close',
    listener: (event: { data: string }) => void,
  ) => void;
};
