export enum MessageType {
  RCON = 'rcon',
  SYSTEM = 'system',
  SERVERINFO = 'serverinfo',
  HEARTBEAT = 'heartbeat',
}

export type Message = {
  type: MessageType;
  payload: object;
};
