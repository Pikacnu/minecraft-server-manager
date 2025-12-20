import { Rcon } from 'rcon-client';

import { RCONPassword } from '@/utils/config';

enum MessageTypeEnum {
  AUTH = 'auth',
  END = 'end',
  RESPONSE = 'response',
  SERVER = 'server',
  ERROR = 'error',
}

type MessageType = MessageTypeEnum[keyof MessageTypeEnum];

type Message = {
  timestamp: number;
  content: string;
  type: MessageType;
};

export class ServerController {
  private rconClient: Rcon;
  private host: string;
  private port: number;

  constructor(host: string, port: number, log = false) {
    this.host = host;
    this.port = port;
    this.rconClient = new Rcon({
      host: this.host,
      port: this.port,
      password: RCONPassword,
    });
  }

  public connect() {
    return this.rconClient.connect();
  }
  public disconnect() {
    return this.rconClient.end();
  }
  public async sendCommand(command: string) {
    return await this.rconClient.send(command);
  }
}
