import { PassThrough } from 'node:stream';
import { Manager } from '@/manager';
import { Namespace } from '@/utils/config';
import { k8sExec } from '@/utils/k8s';
import { MessageType, type ReceiveMessage, type SendMessage } from './type';

type ExecSocket = Awaited<ReturnType<typeof k8sExec.exec>>;

type ExecSession = {
  sessionId: string;
  serverName: string;
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  socket?: ExecSocket;
  closed: boolean;
  send: (message: ReceiveMessage<MessageType.EXEC>) => void;
};

const execSessions = new Map<string, ExecSession>();

function createSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sendSessionMessage(
  session: ExecSession,
  payload: Omit<ReceiveMessage<MessageType.EXEC>['payload'], 'serverName'>,
) {
  session.send({
    type: MessageType.EXEC,
    payload: {
      ...payload,
      serverName: session.serverName,
    },
  });
}

async function closeSession(sessionId: string, exitCode?: number) {
  const session = execSessions.get(sessionId);
  if (!session || session.closed) {
    return;
  }

  session.closed = true;
  execSessions.delete(sessionId);

  session.stdout.removeAllListeners();
  session.stderr.removeAllListeners();

  try {
    session.stdin.end();
  } catch {
    // ignore close errors
  }

  try {
    session.socket?.close();
  } catch {
    // ignore close errors
  }

  sendSessionMessage(session, {
    status: 'closed',
    sessionId,
    exitCode,
    stream: 'status',
    output:
      exitCode === undefined
        ? 'Exec session closed.'
        : `Exec session closed with exit code ${exitCode}.`,
  });
}

export async function execHandler(
  message: SendMessage<MessageType.EXEC>,
  send: (message: ReceiveMessage<MessageType.EXEC>) => void,
  wsConnectionId: string,
  trackSessionId: (sessionId: string) => void,
) {
  const payload = message.payload;

  if (payload.action === 'close') {
    if (payload.sessionId) {
      await closeSession(payload.sessionId);
    }
    return;
  }

  if (payload.action === 'input') {
    if (!payload.sessionId) {
      send({
        type: MessageType.EXEC,
        payload: {
          status: 'error',
          serverName: payload.serverName,
          sessionId: '',
          output: 'Missing exec session id.',
          stream: 'status',
        },
      });
      return;
    }

    const session = execSessions.get(payload.sessionId);
    if (!session || session.closed) {
      send({
        type: MessageType.EXEC,
        payload: {
          status: 'error',
          serverName: payload.serverName,
          sessionId: payload.sessionId,
          output: 'Exec session not found or already closed.',
          stream: 'status',
        },
      });
      return;
    }

    const input = payload.input ?? '';
    if (input.length > 0) {
      session.stdin.write(input.endsWith('\n') ? input : `${input}\n`);
    }
    return;
  }

  const serverData = Manager.getServerInfoByName(payload.serverName);
  if (!serverData) {
    send({
      type: MessageType.EXEC,
      payload: {
        status: 'error',
        serverName: payload.serverName,
        sessionId: '',
        output: `Server ${payload.serverName} not found.`,
        stream: 'status',
      },
    });
    return;
  }

  const sessionId = payload.sessionId || createSessionId();
  const existingSession = execSessions.get(sessionId);
  if (existingSession) {
    await closeSession(sessionId);
  }

  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();

  const session: ExecSession = {
    sessionId,
    serverName: payload.serverName,
    stdin,
    stdout,
    stderr,
    closed: false,
    send,
  };

  execSessions.set(sessionId, session);
  trackSessionId(sessionId);

  stdout.on('data', (chunk: Buffer) => {
    if (session.closed) return;
    sendSessionMessage(session, {
      status: 'ok',
      sessionId,
      output: chunk.toString(),
      stream: 'stdout',
    });
  });

  stderr.on('data', (chunk: Buffer) => {
    if (session.closed) return;
    sendSessionMessage(session, {
      status: 'ok',
      sessionId,
      output: chunk.toString(),
      stream: 'stderr',
    });
  });

  send({
    type: MessageType.EXEC,
    payload: {
      status: 'ok',
      serverName: payload.serverName,
      sessionId,
      output: 'Exec session starting.',
      stream: 'status',
    },
  });

  try {
    const podName = await Manager.getServerPodNameByServerName(
      payload.serverName,
    );
    if (!podName) {
      throw new Error(`Pod for server ${payload.serverName} not found.`);
    }
    const command = payload.command || ['/bin/sh'];
    const tty = payload.tty ?? true;
    const containerName = payload.containerName || 'minecraft-server';

    const socket = await k8sExec.exec(
      Namespace,
      podName,
      containerName,
      command,
      stdout,
      stderr,
      stdin,
      tty,
      (status) => {
        if (session.closed) return;

        const exitCode =
          status.details?.causes?.[0]?.message !== undefined
            ? Number(status.details.causes[0].message)
            : undefined;

        if (status.status && status.status !== 'Success') {
          sendSessionMessage(session, {
            status: 'error',
            sessionId,
            output: status.message || 'Exec session failed.',
            stream: 'status',
            exitCode,
          });
          void closeSession(sessionId, exitCode);
          return;
        }

        void closeSession(sessionId, exitCode);
      },
    );

    session.socket = socket;
  } catch (error) {
    console.error(
      `Failed to start exec session for server ${payload.serverName}:`,
      error,
    );

    sendSessionMessage(session, {
      status: 'error',
      sessionId,
      output: 'Failed to start exec session.',
      stream: 'status',
    });
    await closeSession(sessionId);
  }
}

export async function closeTrackedExecSessions(sessionIds: Iterable<string>) {
  for (const sessionId of sessionIds) {
    await closeSession(sessionId);
  }
}
