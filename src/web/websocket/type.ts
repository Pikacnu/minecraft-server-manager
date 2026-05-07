export enum MessageType {
  RCON = 'rcon',
  SYSTEM = 'system',
  SERVERINFO = 'serverinfo',
  SERVERLOG = 'serverlog',
  HEARTBEAT = 'heartbeat',
}

export type SendMessage<T extends MessageType = MessageType> = {
  type: T;
  payload: SendMessagePayload[T];
};

interface SendMessagePayload {
  [MessageType.RCON]: { command: string; serverName: string };
  [MessageType.SYSTEM]: { command: string };
  [MessageType.SERVERINFO]: {};
  [MessageType.SERVERLOG]: {
    serverName: string;
    action: 'subscribe' | 'unsubscribe';
  };
  [MessageType.HEARTBEAT]: { timestamp: number };
}

export type ReceiveMessage<T extends MessageType = MessageType> = {
  type: T;
  payload: ReceiveMessagePayload[T] & { message?: string };
};

interface ReceiveMessagePayload {
  [MessageType.RCON]: {
    status: string;
    response: string;
    serverName: string;
  };
  [MessageType.SYSTEM]: {
    status: string;
    info: string;
  };
  [MessageType.SERVERINFO]: {
    servers: ServerInfo[];
  };
  [MessageType.SERVERLOG]: {
    status: 'ok' | 'error';
    serverName: string;
    chunk?: string;
  };
  [MessageType.HEARTBEAT]: {
    timestamp: number;
  };
}

type ServerInfo = {
  id: string;
  name: string;
  status: string;
  domain?: string;
  address: string;
  playersOnline: number;
};
