import { Manager } from '@/manager';
import { RconManager } from '../utils/rconManager';
import { MessageType, type Message } from './type';
import { RCONPassword } from '@/utils/config';

export async function rconHandler(
  message: Message,
  send: (message: Message) => void,
) {
  const rconData = message.payload as { command: string; serverName: string };
  const serverData = Manager.getServerInfoByName(rconData.serverName);
  if (!serverData) {
    send({
      type: MessageType.RCON,
      payload: {
        status: 'error',
        message: `Server ${rconData.serverName} not found.`,
        serverName: rconData.serverName,
      },
    });
    return;
  }
  try {
    const connection = await RconManager.getConnection(
      rconData.serverName,
      serverData.address.split(':')[0]!,
      25575,
      RCONPassword,
    );
    const result = await connection.send(rconData.command);
    send({
      type: MessageType.RCON,
      payload: {
        status: 'ok',
        response: result,
        serverName: rconData.serverName,
      },
    });
  } catch (error) {
    console.error(
      `RCON command execution failed for server ${rconData.serverName}:`,
      error,
    );
    send({
      type: MessageType.RCON,
      payload: {
        status: 'error',
        message: `Failed to execute RCON command`,
        serverName: rconData.serverName,
      },
    });
  }
}
