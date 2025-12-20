import { Namespace } from '@/utils/config';
import gateClient from '@/utils/gate';
import {
  PhaseEnum,
  Watcher,
  applyYamlToConfigMap,
  coreV1Api,
  getConfigMapData,
  k8sApiEndpoint,
  resumeDeploymentRollout,
  resumeGeneratedDeploymentRollout,
  stopDeploymentRollout,
  stopGeneratedDeploymentRollout,
} from '@/utils/k8s';
import type { GateConfig } from '@/utils/type';
import { ServerController } from './server-controller';
import { isDevelopment } from '@/utils/config';

export enum ServerStatusEnum {
  RUNNING = 'running',
  RESTARTING = 'restarting',
  TERMINATING = 'terminating',
  UNKNOWN = 'unknown',
}

export type ServerInfo = {
  name: string;
  address: string;
  domain?: string;
  playersOnline: number;
  nameTemplate: string;
};

export class Manager {
  private static instance: Manager;
  private static isInitialized = false;
  private static serviceWatcher: Watcher;
  //private static podWatcher: Watcher;
  private static deploymentWatcher: Watcher;
  private static gateServerWatcher: NodeJS.Timeout;
  private static servers: Map<string, ServerInfo> = new Map();
  private static serverStatus: Map<string, ServerStatusEnum> = new Map();
  private static serviceNameToServerName: Map<string, string> = new Map();

  private constructor() {
    Manager.init();
  }
  public static getInstance(): Manager {
    if (!Manager.instance) {
      Manager.instance = new Manager();
    }
    return Manager.instance;
  }
  public static init(): void {
    if (this.isInitialized) return;
    gateClient.listServers({}).then((res) => {
      if (res.servers.some((server) => server.name === 'dummy')) {
        gateClient.unregisterServer({ name: 'dummy' });
      }
    });
    this.serviceWatcher = new Watcher();
    this.serviceWatcher.startWatch<k8sApiEndpoint.Services>(
      k8sApiEndpoint.Services,
      { namespace: Namespace, labelSelector: 'category=minecraft-server' },
      async (phase, obj) => {
        const servicesName = obj.metadata!.name!;
        const metadata = obj.metadata!;
        const labels = metadata.labels || {};
        const serverName = labels?.name! || servicesName;

        console.log(`Server Deployment | ${phase}: ${serverName}`);
        const gateConfigMap = (await getConfigMapData(
          Namespace,
          'gate-server-configmap',
          'config.yml',
          'yaml',
        )) as GateConfig;
        if (phase === PhaseEnum.ADDED) {
          const domain = obj.metadata?.labels?.domain?.trim() || '';
          if (
            domain &&
            !Object.keys(gateConfigMap.config.forcedHosts).includes(domain)
          ) {
            gateConfigMap.config.forcedHosts[domain] = [
              ...(gateConfigMap.config.forcedHosts[domain] || []),
              `${servicesName}.${Namespace}.svc.cluster.local:25565`,
            ];
          } else if (!gateConfigMap.config.try.includes(servicesName)) {
            gateConfigMap.config.try.push(servicesName);
          }

          if (
            !Object.keys(gateConfigMap.config.servers).includes(servicesName)
          ) {
            gateConfigMap.config.servers[
              servicesName
            ] = `${servicesName}.${Namespace}.svc.cluster.local:25565`;
          }

          this.servers.set(serverName, {
            name: serverName,
            address: `${servicesName}.${Namespace}.svc.cluster.local:25565`,
            domain: domain || undefined,
            playersOnline: 0,
            nameTemplate: servicesName.replace(/service/g, '@PlaceHolder@'),
          });
          this.serviceNameToServerName.set(servicesName, serverName);

          await applyYamlToConfigMap(
            Namespace,
            gateConfigMap,
            'gate-server-configmap',
            'config.yml',
          );
        }
        if (phase === PhaseEnum.DELETED) {
          const domain = metadata.labels?.domain?.trim() || '';
          if (domain && gateConfigMap.config.forcedHosts[domain]) {
            gateConfigMap.config.forcedHosts[domain] =
              gateConfigMap.config.forcedHosts[domain].filter(
                (address) =>
                  address !==
                  `${servicesName}.${Namespace}.svc.cluster.local:25565`,
              );
            if (gateConfigMap.config.forcedHosts[domain].length === 0) {
              delete gateConfigMap.config.forcedHosts[domain];
            }
          } else {
            gateConfigMap.config.try = gateConfigMap.config.try.filter(
              (name) => name !== servicesName,
            );
          }
          delete gateConfigMap.config.servers[obj.metadata!.name!];

          this.servers.delete(servicesName);

          await applyYamlToConfigMap(
            Namespace,
            gateConfigMap,
            'gate-server-configmap',
            'config.yml',
          );
        }
      },
    );
    //this.podWatcher = new Watcher();
    //this.podWatcher.startWatch<k8sApiEndpoint.Pods>(
    //  k8sApiEndpoint.Pods,
    //  { namespace: Namespace, labelSelector: 'category=minecraft-server' },
    //  async (phase, obj) => {
    //    const podName = obj.metadata!.name!;
    //    const serverName = obj.metadata!.labels?.serverName || podName;
    //    console.log(
    //      `Server Pod | ${phase}: ${serverName}(${podName}) | status : ${
    //        Object.keys(obj.status?.containerStatuses![0]?.state!)[0]
    //      }`,
    //    );
    //  },
    //);
    this.deploymentWatcher = new Watcher();
    this.deploymentWatcher.startWatch<k8sApiEndpoint.Deployments>(
      k8sApiEndpoint.Deployments,
      { namespace: Namespace, labelSelector: 'category=minecraft-server' },
      async (phase, obj) => {
        const deploymentName = obj.metadata!.name!;
        const serverName = obj.metadata!.labels?.name || deploymentName;

        const replicas = obj.spec?.replicas || 0;
        const totalReplicas = obj.status?.replicas || 0;
        switch (true) {
          case totalReplicas === 0:
            this.serverStatus.set(serverName, ServerStatusEnum.TERMINATING);
            break;
          case replicas === totalReplicas &&
            obj.status?.availableReplicas === totalReplicas:
            this.serverStatus.set(serverName, ServerStatusEnum.RUNNING);
            break;
          default:
            this.serverStatus.set(serverName, ServerStatusEnum.RESTARTING);
            break;
        }
        if (phase === PhaseEnum.DELETED) {
          this.serverStatus.delete(serverName);
          this.servers.delete(serverName);
        }

        console.log(
          `Server Deployment | ${phase}: ${serverName}(${deploymentName}) | Replicas : ${
            obj.status?.readyReplicas || 0
          }/${obj.status?.replicas || 0} | Running : ${
            obj.status?.availableReplicas || 0
          } | isStopped : ${obj.status?.replicas === 0 ? 'Yes' : 'No'}`,
        );
      },
    );
    this.gateServerWatcher = setInterval(async () => {
      const servers = ((await gateClient.listServers({})) ?? { servers: [] })
        .servers;
      servers.forEach((server) => {
        const existingServer = this.servers.get(
          this.serviceNameToServerName.get(server.name)!,
        );
        if (existingServer) {
          this.servers.set(existingServer.name, {
            ...existingServer,
            playersOnline: server.players,
          });
        }
      });
    }, 5 * 1_000);

    this.isInitialized = true;
  }

  public static async restartServer(serverName: string): Promise<void> {
    if (!this.servers.has(serverName)) {
      throw new Error(`Server ${serverName} not found.`);
    }
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`Server ${serverName} not found.`);
    }
    const address = server!.address.split(':')[0];
    if (!address) {
      throw new Error(`Server ${serverName} not found.`);
    }
    const status = Manager.serverStatus.get(serverName);
    switch (status) {
      case ServerStatusEnum.RESTARTING:
        return;
      case ServerStatusEnum.TERMINATING:
        resumeDeploymentRollout(
          this.generateName(server, 'deployment'),
          Namespace,
        );
        return;
      default:
        break;
    }
    const controller = new ServerController(
      isDevelopment ? 'localhost' : address,
      25575,
      true,
    );
    if (!controller) {
      throw new Error(`Failed to create ServerController for ${serverName}.`);
    }
    await controller.connect();
    await controller.sendCommand('stop');
    await controller.disconnect();
  }

  private static generateName(server: ServerInfo, target: string): string {
    return server.nameTemplate.replace('@PlaceHolder@', target);
  }

  public static async stopServer(serverName: string): Promise<void> {
    if (!this.servers.has(serverName)) {
      throw new Error(`Server ${serverName} not found.`);
    }
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`Server ${serverName} not found.`);
    }
    const address = server!.address.split(':')[0];
    if (!address) {
      throw new Error(`Server ${serverName} not found.`);
    }
    const status = Manager.serverStatus.get(serverName);
    switch (status) {
      case ServerStatusEnum.TERMINATING:
        return;
      case ServerStatusEnum.RESTARTING:
        await stopDeploymentRollout(
          this.generateName(server, 'deployment'),
          Namespace,
        );
        return;
      default:
        break;
    }

    const controller = new ServerController(
      isDevelopment ? 'localhost' : address,
      25575,
      true,
    );
    if (!controller) {
      throw new Error(`Failed to create ServerController for ${serverName}.`);
    }
    await stopDeploymentRollout(
      this.generateName(server, 'deployment'),
      Namespace,
    );
    await controller.connect();
    await controller.sendCommand('stop');
    await stopDeploymentRollout(
      this.generateName(server, 'deployment'),
      Namespace,
    );
  }

  public static getServers(): Map<string, ServerInfo> {
    return Manager.servers;
  }

  public static getServerList(): ServerInfo[] {
    return Array.from(Manager.servers.values());
  }

  public static getServerStatus(
    serverName: string,
  ): ServerStatusEnum | undefined {
    return Manager.serverStatus.get(serverName);
  }
  public static getAllServerStatus(): Map<string, ServerStatusEnum> {
    return Manager.serverStatus;
  }
  public static getServerInfoWithStatus(): (ServerInfo & {
    status: ServerStatusEnum;
  })[] {
    const serverList: (ServerInfo & { status: ServerStatusEnum })[] = [];
    Manager.servers.forEach((serverInfo) => {
      serverList.push({
        ...serverInfo,
        status:
          Manager.serverStatus.get(serverInfo.name) || ServerStatusEnum.UNKNOWN,
      });
    });
    return serverList;
  }
  public static getServerInfoByName(
    serverName: string,
  ): (ServerInfo & { status: ServerStatusEnum }) | null {
    const serverInfo = Manager.servers.get(serverName);
    if (!serverInfo) {
      return null;
    }
    return {
      ...serverInfo,
      status:
        Manager.serverStatus.get(serverInfo.name) || ServerStatusEnum.UNKNOWN,
    };
  }
}
