import { webServer } from '@/web/index';
import { Manager, ServerController } from './manager';
import { deleteService, deployService } from './utils/k8s';
import { SystemRequiredDeployments } from './deployment/system';
import { minecraftServerDeployment } from './deployment/minecraft-server';
import { gateClient } from './utils/gate';
import { color, serve } from 'bun';
import {
  defaultFilter,
  FileController,
  FileControllerManager,
  Filter,
} from './manager/file-manager';
const env = process.env;
const port = env.PORT ? parseInt(env.PORT) : 3000;
const host = env.HOST || 'localhost';

try {
  // Ensure system required deployments are in place
  await deployService(SystemRequiredDeployments);
  console.log('System required deployments are ensured.');
  // Start the web server
  const server = await webServer({
    port,
    hostname: host,
  });
  Manager.getInstance();

  console.log(`Server started at http://${server.hostname}:${server.port}`);
  await FileControllerManager.initialize('', {
    filter: defaultFilter,
  });
} catch (error) {
  console.error('Failed to start server:', error);
}

//await deployService(
//  minecraftServerDeployment({
//    memoryLimit: 2048,
//    cpuLimit: 1,
//    type: 'fabric',
//    version: '1.21.1',
//    Variables: {
//      SERVER_NAME: 'My Minecraft Server',
//      MOTD: 'Welcome to my server!',
//      MAX_PLAYERS: '20',
//      ONLINE_MODE: 'true',
//    },
//    name: 'minecraft-server',
//  }),
//);
//console.log('Minecraft server deployment initiated.');
//const servers = (await gateClient.listServers({})).servers;
// setTimeout(async () => {
//   console.log('Cleaning up test Minecraft server deployment...');
//   await deleteService(
//     minecraftServerDeployment({
//       name: 'minecraft-server',
//       type: 'fabric',
//     }),
//   );
// }, 4 * 60 * 1_000);
