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
  private isEnded: boolean = false;
  private isConnected: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 5;
  private shouldReconnect: boolean = true;
  private isConnectionListenerRegistered: boolean = false;

  constructor(host: string, port: number, log = false) {
    this.host = host;
    this.port = port;
    this.rconClient = new Rcon({
      host: this.host,
      port: this.port,
      password: RCONPassword,
    });
    this.registerConnectionListeners();
  }

  private registerConnectionListeners() {
    if (this.isConnectionListenerRegistered) {
      return;
    }

    this.isConnectionListenerRegistered = true;
    this.rconClient.on('end', () => {
      this.isEnded = true;
      this.isConnected = false;
      if (!this.shouldReconnect) {
        return;
      }
      if (this.retryCount >= this.maxRetries) {
        console.error(
          `RCON reconnection aborted after ${this.maxRetries} retries.`,
        );
        this.shouldReconnect = false;
        return;
      }
      this.retryCount++;
      setTimeout(
        () => {
          this.connect().catch((e) =>
            console.error('Failed to reconnect RCON:', (e as Error).message),
          );
        },
        1000 * Math.min(2 ** this.retryCount, 30),
      ); // Exponential backoff with max delay of 30 seconds
    });
    this.rconClient.on('connect', () => {
      this.isConnected = true;
      this.isEnded = false;
      this.retryCount = 0;
    });
  }

  public connect() {
    this.shouldReconnect = true;
    return this.rconClient.connect();
  }

  public disconnect() {
    this.isEnded = true;
    this.shouldReconnect = false;
    return this.rconClient.end();
  }
  public async sendCommand(command: string) {
    if (this.isEnded) {
      throw new Error('RCON connection has ended');
    }
    return await this.rconClient.send(command);
  }
}
