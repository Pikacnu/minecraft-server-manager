import { Manager } from '@/manager';

export function getServersInfo() {
  const serverInfo = Manager.getServerInfoWithStatus();
  return serverInfo;
}

export function restartServerByName(serverName: string) {
  if (!Manager.getServers().has(serverName)) {
    throw new Error(`Server ${serverName} not found.`);
  }
  return Manager.restartServer(serverName);
}

export function stopServerByName(serverName: string) {
  if (!Manager.getServers().has(serverName)) {
    throw new Error(`Server ${serverName} not found.`);
  }
  return Manager.stopServer(serverName);
}
