import {
  isWildcardDomain,
  Namespace,
  WildCardDomainPrefix,
} from '@/utils/config';
import gateClient from '@/utils/gate';
import {
  PhaseEnum,
  Watcher,
  deleteService,
  deployService,
  getConfigMapData,
  getDeploymentData,
  k8sApiEndpoint,
  patchConfigMap,
  patchDeployment,
  stopDeploymentRollout,
} from '@/utils/k8s';
import {
  MinecraftServerType,
  type GateConfig,
  type Variables,
} from '@/utils/type';
import { ServerController } from './server-controller';
import { isDevelopment } from '@/utils/config';
import { minecraftServerDeployment } from '@/deployment/minecraft-server';
import { FileController, FileControllerManager } from './file-manager';
import { DomainManager, getTopLevelDomain } from './domain-manager';
import { TaskQueue } from '@/utils/taskQueue';

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
  private static deploymentWatcher: Watcher;
  private static gateServerWatcher: NodeJS.Timeout;

  private static servers: Map<string, ServerInfo> = new Map();
  private static serverStatus: Map<string, ServerStatusEnum> = new Map();
  private static serviceNameToServerName: Map<string, string> = new Map();

  private static configMapTaskQueue: TaskQueue = new TaskQueue(1);

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
    this.isInitialized = true;
    // gateClient.listServers({}).then((res) => {
    //   if (res.servers.some((server) => server.name === 'dummy')) {
    //     gateClient.unregisterServer({ name: 'dummy' });
    //   }
    // });
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

        if (phase === PhaseEnum.ADDED || phase === PhaseEnum.MODIFIED) {
          const domain = obj.metadata?.labels?.domain?.trim() || '';
          const existingServer = this.servers.get(serverName);
          this.servers.set(serverName, {
            ...existingServer,
            name: serverName,
            address: `${servicesName}.${Namespace}.svc.cluster.local:25565`,
            domain: domain || undefined,
            playersOnline: existingServer?.playersOnline || 0,
            nameTemplate: servicesName.replace(/service/g, '@PlaceHolder@'),
          });
          this.serviceNameToServerName.set(servicesName, serverName);
        }

        if (phase === PhaseEnum.DELETED) {
          const serverNameFromService =
            this.serviceNameToServerName.get(servicesName);
          if (serverNameFromService) {
            this.servers.delete(serverNameFromService);
            this.serviceNameToServerName.delete(servicesName);
          } else {
            this.servers.delete(servicesName);
          }
        }

        this.configMapTaskQueue.addTask(async () => {
          const gateConfigMap = (await getConfigMapData(
            Namespace,
            'gate-server-configmap',
            'config.yml',
            'yaml',
          )) as GateConfig;

          if (
            phase === PhaseEnum.ADDED ||
            phase === PhaseEnum.MODIFIED ||
            phase === PhaseEnum.DELETED
          ) {
            // Ensure clean state before applying current values
            Object.keys(gateConfigMap.config.forcedHosts).forEach((key) => {
              gateConfigMap.config.forcedHosts[key] =
                gateConfigMap.config.forcedHosts[key]!.filter(
                  (name) => name !== servicesName,
                );
              if (gateConfigMap.config.forcedHosts[key]!.length === 0) {
                delete gateConfigMap.config.forcedHosts[key];
              }
            });

            gateConfigMap.config.try = gateConfigMap.config.try.filter(
              (name) => name !== servicesName,
            );

            if (phase === PhaseEnum.ADDED || phase === PhaseEnum.MODIFIED) {
              const domain = obj.metadata?.labels?.domain?.trim() || '';
              const addIntoTryHost =
                obj.metadata?.labels?.['add-into-try-host']?.trim() !== 'false';

              if (domain) {
                const url = new URL(`http://${domain}`);
                const topDomain = url.hostname.split('.').slice(-2).join('.');
                const baseHostName = url.hostname
                  .split('.')
                  .slice(0, -2)
                  .join('.');
                const domainObjName = isWildcardDomain
                  ? `${baseHostName}.${WildCardDomainPrefix}.${topDomain}.`
                  : `${domain}.`;

                gateConfigMap.config.forcedHosts[domainObjName] = [
                  ...(gateConfigMap.config.forcedHosts[domainObjName] || []),
                  servicesName,
                ];
              }

              if (addIntoTryHost) {
                gateConfigMap.config.try.push(servicesName);
              }

              gateConfigMap.config.servers[servicesName] =
                `${servicesName}.${Namespace}.svc.cluster.local:25565`;
            } else if (phase === PhaseEnum.DELETED) {
              delete gateConfigMap.config.servers[obj.metadata!.name!];
            }
          }

          await patchConfigMap(
            Namespace,
            gateConfigMap,
            'gate-server-configmap',
            'config.yml',
          );
        });
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
        const currentReplicas = obj.status?.replicas || 0;
        const onlineReplicas = obj.status?.availableReplicas || 0;
        switch (true) {
          case replicas === 0: {
            this.serverStatus.set(serverName, ServerStatusEnum.TERMINATING);
            break;
          }
          case replicas === currentReplicas &&
            onlineReplicas === currentReplicas: {
            this.serverStatus.set(serverName, ServerStatusEnum.RUNNING);
            break;
          }
          case replicas > currentReplicas: {
            this.serverStatus.set(serverName, ServerStatusEnum.RESTARTING);
            break;
          }
          default: {
            this.serverStatus.set(serverName, ServerStatusEnum.UNKNOWN);
            break;
          }
        }
        if (phase === PhaseEnum.DELETED) {
          this.serverStatus.delete(serverName);
          this.servers.delete(serverName);
        }
        if (phase === PhaseEnum.ADDED) {
          if (!FileControllerManager.hasController(serverName))
            try {
              FileControllerManager.registerController(
                serverName,
                new FileController(serverName, {}),
              );
            } catch (error) {
              console.error(
                `Failed to register file controller for ${serverName}:`,
                error,
              );
            }
        }
        if (phase === PhaseEnum.ADDED) {
          const serverStatus = this.serverStatus.get(serverName);
          if (serverStatus === ServerStatusEnum.RUNNING) {
            if (!FileControllerManager.hasController(serverName)) {
              try {
                FileControllerManager.registerController(
                  serverName,
                  new FileController(serverName, {}),
                );
              } catch (error) {
                console.error(
                  `Failed to register file controller for ${serverName}:`,
                  error,
                );
              }
            } else {
              const controller =
                FileControllerManager.getController(serverName);
              await controller.rescan();
            }
          }
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
    const gateWatcherFunction = async () => {
      try {
        const servers = ((await gateClient.listServers({})) ?? { servers: [] })
          .servers;
        if (servers.some((server) => server.name === 'dummy')) {
          await gateClient.unregisterServer({ name: 'dummy' });
        }
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
      } catch (error) {
        console.error('Error updating server player counts:', error);
      } finally {
        return setTimeout(gateWatcherFunction, 15000);
      }
    };

    this.gateServerWatcher = setTimeout(gateWatcherFunction, 15000);
  }

  public static async cleanup(): Promise<void> {
    if (this.serviceWatcher) {
      this.serviceWatcher.stopWatch();
    }
    //if (this.podWatcher) {
    //  this.podWatcher.stopWatch();
    //}
    if (this.deploymentWatcher) {
      this.deploymentWatcher.stopWatch();
    }
    if (this.gateServerWatcher) {
      clearInterval(this.gateServerWatcher);
    }
    this.isInitialized = false;
  }

  public static async createServer(
    ...serverInfo: Parameters<typeof minecraftServerDeployment>
  ): Promise<void> {
    const deploymentManifest = minecraftServerDeployment(serverInfo[0]);
    const serverName = serverInfo[0].name;
    const domain = serverInfo[0].domain;
    await deployService(deploymentManifest);
    if (domain) {
      try {
        DomainManager.addRecordToDomain(
          getTopLevelDomain(domain),
          domain
            .trim()
            .split('.')
            .filter((t) => !!t)
            .slice(0, -2)
            .join('.'),
        );
      } catch (error) {
        console.error(
          `Failed to add SRV record for ${serverName} with domain ${domain}:`,
          error,
        );
      }
    }

    console.log(`Server ${serverName} deployment initiated.`);
  }

  public static async deleteServer(serverName: string): Promise<void> {
    if (!this.servers.has(serverName)) {
      throw new Error(`Server ${serverName} not found.`);
    }
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`Server ${serverName} not found.`);
    }
    const configMapData = (await getConfigMapData(
      Namespace,
      `minecraft-server-env-configmap-${serverName}`,
      'data',
    )) as {
      data: Variables;
    } | null;

    const deployment = await getDeploymentData(
      this.generateName(server, 'deployment'),
      Namespace,
    );

    const domain = deployment?.metadata?.labels?.domain?.trim() || '';

    if (domain && domain !== '') {
      try {
        DomainManager.deleteSRVRecord(
          getTopLevelDomain(domain),
          domain
            .trim()
            .split('.')
            .filter((t) => !!t)
            .slice(0, -2)
            .join('.'),
        );
      } catch (error) {
        console.error(
          `Failed to delete SRV record for ${serverName} with domain ${domain}:`,
          error,
        );
      }
    }

    await deleteService(
      // This won't throw error even if the deployment doesn't exist
      minecraftServerDeployment({
        name: serverName,
        type: (configMapData?.data?.TYPE ??
          MinecraftServerType.Fabric) as MinecraftServerType,
      }),
    );

    try {
      FileControllerManager.unregisterController(serverName);
    } catch (error) {
      console.error(
        `Failed to unregister file controller for ${serverName}:`,
        error,
      );
    }

    console.log(`Server ${serverName} deletion initiated.`);
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
        // Server is stopped, start it by setting replicas to 1
        await patchDeployment(
          Namespace,
          this.generateName(server, 'deployment'),
          [
            {
              op: 'replace',
              path: '/spec/replicas',
              value: 1,
            },
          ],
        );
        return;
      default:
        break;
    }

    // Try graceful shutdown via RCON if server is running
    try {
      const controller = new ServerController(
        isDevelopment ? 'localhost' : address,
        25575,
        true,
      );
      if (controller) {
        await controller.connect();
        await controller.sendCommand('stop');
        await controller.disconnect();
      }
    } catch (error) {
      console.log(
        `RCON connection failed for ${serverName}, will force restart via annotation:`,
        error,
      );
    }

    // Add annotation to trigger rollout (works even if RCON failed)
    await patchDeployment(Namespace, this.generateName(server, 'deployment'), [
      {
        op: 'add',
        path: '/spec/template/metadata/annotations/restartedAt',
        value: new Date().toISOString(),
      },
    ]);
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
      console.error(`Failed to create ServerController for ${serverName}.`);
    } else {
      await controller.connect();
      await controller.sendCommand('stop');
    }
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
