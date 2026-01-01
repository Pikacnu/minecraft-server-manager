import { Manager } from '@/manager';
import { RconManager } from '../utils/rconManager';
import { MessageType, type ReceiveMessage, type SendMessage } from './type';
import { RCONPassword } from '@/utils/config';

export async function rconHandler(
  message: SendMessage<MessageType.RCON>,
  send: (message: ReceiveMessage<MessageType.RCON>) => void,
) {
  const rconData = (message as SendMessage<MessageType.RCON>).payload;
  const serverData = Manager.getServerInfoByName(rconData.serverName);
  if (!serverData) {
    send({
      type: MessageType.RCON,
      payload: {
        status: 'error',
        message: `Server ${rconData.serverName} not found.`,
        serverName: rconData.serverName,
      },
    } as ReceiveMessage<MessageType.RCON>);
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
    } as ReceiveMessage<MessageType.RCON>);
  }
}
