import { Rcon } from 'rcon-client';
import { isDevelopment } from '@/utils/config';

export class RconManager {
  private static rconConnections: Map<string, Rcon>;
  private static rconConnectionTimeout: Map<string, NodeJS.Timeout> = new Map();
  private static readonly TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    RconManager.getInstance();
  }
  private static getInstance() {
    if (!RconManager.rconConnections) {
      RconManager.rconConnections = new Map<string, Rcon>();
    }
    return RconManager;
  }
  private static async startConnection(
    serverName: string,
    host: string,
    port: number,
    password: string,
  ) {
    const rcon = new Rcon({
      host: isDevelopment ? 'localhost' : host,
      port: port,
      password: password,
    });
    RconManager.rconConnections.set(serverName, rcon);
    await rcon.connect();
    return rcon;
  }
  private static closeConnection(serverName: string) {
    if (RconManager.rconConnections.has(serverName)) {
      const rcon = RconManager.rconConnections.get(serverName)!;
      rcon.end();
      RconManager.rconConnections.delete(serverName);
    }
  }
  public static async getConnection(
    serverName: string,
    host: string,
    port: number,
    password: string,
  ): Promise<Rcon> {
    RconManager.getInstance();
    if (RconManager.rconConnectionTimeout.has(serverName)) {
      clearTimeout(RconManager.rconConnectionTimeout.get(serverName));
      RconManager.rconConnectionTimeout.delete(serverName);
    }
    RconManager.rconConnectionTimeout.set(
      serverName,
      setTimeout(() => {
        RconManager.closeConnection(serverName);
        RconManager.rconConnectionTimeout.delete(serverName);
      }, RconManager.TIMEOUT_DURATION),
    );
    if (RconManager.rconConnections.has(serverName)) {
      return RconManager.rconConnections.get(serverName)!;
    }
    return await RconManager.startConnection(serverName, host, port, password);
  }

  public static async disconnect(serverName: string) {
    RconManager.getInstance();
    RconManager.closeConnection(serverName);
  }
}
