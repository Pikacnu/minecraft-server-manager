import { deployService } from './utils/k8s';
import { webServer } from '@/web/index';
import { Manager } from './manager';
import { SystemRequiredDeployments } from './deployment/system';
import { defaultFilter, FileControllerManager } from './manager/file-manager';
import { DomainManager } from './manager/domain-manager';
import {
  CloudflareAPIToken,
  DomainName,
  isWildcardDomain,
  ProxyIp,
  SRVPort,
  WildCardDomainPrefix,
  ZoneID,
} from './utils/config';
import { gateClient } from './utils/gate';
import { gateDeployment } from './deployment/gate';
const env = process.env;
const port = env.PORT ? parseInt(env.PORT) : 3000;
const host = env.HOST || 'localhost';

try {
  // Ensure system required deployments are in place

  await deployService(SystemRequiredDeployments);
  console.log('System required deployments are ensured.');

  // Initialize the Server Manager
  Manager.getInstance();

  // Initialize the File Controller Manager
  await FileControllerManager.initialize('', {
    filter: defaultFilter,
  });

  // Initialize the Domain Manager
  DomainManager.getInstance();
  if (CloudflareAPIToken && ZoneID && DomainName && SRVPort && ProxyIp) {
    await DomainManager.setupDNSController(
      DomainName,
      CloudflareAPIToken,
      ZoneID,
      SRVPort,
    );
    DomainManager.proxyIP = ProxyIp;
    if (isWildcardDomain) {
      DomainManager.useWildcard = true;
      DomainManager.wildcardDomainPrefix = WildCardDomainPrefix;
      console.log('Domain Manager is set up with wildcard domain support.');
    } else {
      console.log('Domain Manager is set up with specific proxy IP.');
    }
  } else {
    console.log(
      'Domain Manager setup skipped due to missing environment variables.',
    );
  }

  // Initialize Gate Client
  deployService(gateDeployment, { log: true })
    .then(() => console.log('Gate client initialization process finished.'))
    .catch((error) => console.error('Failed to initialize gate client:', error));
  console.log('Gate client initialization started in background.');

  // Start the web server
  const server = await webServer({
    port,
    hostname: host,
  });
  console.log(`Server started at http://${server.hostname}:${server.port}`);
} catch (error) {
  console.error('Failed to start server:', error);
}

function exitHandler() {
  console.log('Shutting down server manager...');
  Manager.cleanup();
  process.exit();
}

process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
  Manager.cleanup();
});

process.on('unhandledRejection', (reason, promise) => {
  if (reason instanceof Error) {
    if (reason.name !== 'TimeoutError') {
      console.error(
        'Unhandled Rejection at:',
        promise,
        'reason:',
        reason.stack,
      );
    }
  } else {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
});

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
