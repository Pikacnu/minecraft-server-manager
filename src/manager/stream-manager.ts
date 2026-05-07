import { PassThrough } from 'node:stream';
import { Manager } from './server-mamager';

export class LogStreamManager {
  private static instance: LogStreamManager | null = null;
  private logStreams: Map<string, PassThrough> = new Map();
  private sendFn: ((subscriptionId: string, data: string) => void) | null =
    null;

  private constructor(sendFn: (subscriptionId: string, data: string) => void) {
    this.sendFn = sendFn;
  }

  public static getInstance(
    sendFn?: (subscriptionId: string, data: string) => void,
  ) {
    if (!this.instance) {
      if (!sendFn) {
        throw new Error(
          'sendFn is required for the first initialization of LogStreamManager',
        );
      }
      this.instance = new LogStreamManager(sendFn);
    }
    return this.instance;
  }

  private registerLogStream(serverName: string, logStream: PassThrough) {
    this.logStreams.set(serverName, logStream);
  }

  private unregisterLogStream(serverName: string) {
    this.logStreams.delete(serverName);
  }

  public async createLogStream(serverName: string, subscribtionId: string) {
    const logStream = await Manager.getFollowedServerLogs(serverName);
    this.registerLogStream(subscribtionId, logStream);

    logStream.on('data', (chunk) => {
      const data = chunk.toString();
      if (this.sendFn) {
        this.sendFn(subscribtionId, data);
      }
    });

    logStream.on('error', (error) => {
      console.error(`Error in log stream for server ${serverName}:`, error);
      if (this.sendFn) {
        this.sendFn(subscribtionId, `Error: ${error.message}`);
      }
      this.unregisterLogStream(subscribtionId);
    });

    logStream.on('end', () => {
      console.log(`Log stream for server ${serverName} ended.`);
      if (this.sendFn) {
        this.sendFn(subscribtionId, 'Log stream ended.');
      }
      this.unregisterLogStream(subscribtionId);
    });
  }

  public async closeLogStream(subscribtionId: string) {
    const logStream = this.logStreams.get(subscribtionId);
    if (logStream) {
      logStream.end();
      this.unregisterLogStream(subscribtionId);
    }
  }
}
