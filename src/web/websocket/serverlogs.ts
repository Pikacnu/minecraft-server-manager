import { LogStreamManager } from '@/manager/stream-manager';
import { MessageType, type ReceiveMessage, type SendMessage } from './type';

const subscriberSenders = new Map<
  string,
  (message: ReceiveMessage<MessageType.SERVERLOG>) => void
>();

const streamManager = LogStreamManager.getInstance((subscriptionId, data) => {
  const sender = subscriberSenders.get(subscriptionId);
  if (!sender) return;

  sender({
    type: MessageType.SERVERLOG,
    payload: {
      status: 'ok',
      serverName: subscriptionId.split('::')[1] || '',
      chunk: data,
    },
  });
});

export async function serverLogHandler(
  message: SendMessage<MessageType.SERVERLOG>,
  send: (message: ReceiveMessage<MessageType.SERVERLOG>) => void,
  wsConnectionId: string,
  trackSubscriptionId: (subscriptionId: string) => void,
) {
  const payload = message.payload;
  const subscriptionId = `${wsConnectionId}::${payload.serverName}`;

  if (payload.action === 'unsubscribe') {
    subscriberSenders.delete(subscriptionId);
    await streamManager.closeLogStream(subscriptionId);
    send({
      type: MessageType.SERVERLOG,
      payload: {
        status: 'ok',
        serverName: payload.serverName,
      },
    });
    return;
  }

  try {
    subscriberSenders.set(subscriptionId, send);
    trackSubscriptionId(subscriptionId);
    await streamManager.createLogStream(payload.serverName, subscriptionId);

    send({
      type: MessageType.SERVERLOG,
      payload: {
        status: 'ok',
        serverName: payload.serverName,
      },
    });
  } catch (error) {
    console.error(
      `Failed to create log stream for server ${payload.serverName}:`,
      error,
    );
    send({
      type: MessageType.SERVERLOG,
      payload: {
        status: 'error',
        serverName: payload.serverName,
      },
    });
  }
}

export async function closeTrackedLogSubscriptions(
  subscriptionIds: Iterable<string>,
) {
  for (const subscriptionId of subscriptionIds) {
    subscriberSenders.delete(subscriptionId);
    await streamManager.closeLogStream(subscriptionId);
  }
}
