import { Manager } from '@/manager';
import { MessageType, type ReceiveMessage, type SendMessage } from './type';
import { getServersInfo } from '../utils/serverUtilits';

export async function serverInfoHandler(
  message: SendMessage<MessageType.SERVERINFO>,
  send: (message: ReceiveMessage<MessageType.SERVERINFO>) => void,
) {
  const servers = getServersInfo();

  if (!servers) {
    send({
      type: MessageType.SERVERINFO,
      payload: { servers: [] },
    });
    return;
  }

  const responseServer = servers.map((server) => ({
    id: server.name,
    name: server.name,
    status: server.status,
    domain: server.domain,
    address: server.address,
    playersOnline: server.playersOnline || 0,
  }));
  send({
    type: MessageType.SERVERINFO,
    payload: { servers: responseServer },
  });
}
