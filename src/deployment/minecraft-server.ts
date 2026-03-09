import {
  Namespace,
  NFSRootPath,
  NFSServer,
  RCONPassword,
  VelocitySecret,
  ManagerMountPath,
} from '@/utils/config';
import type {
  MinecraftServerDeploymentsGeneratorArguments,
  ServicesDeployments,
  ServicesDeplymentsGenerator,
  Variables,
} from '@/utils/type';
import type { CoreV1ApiCreateNamespacedConfigMapRequest } from '@kubernetes/client-node';
import { isDevelopment } from '@/utils/config';

export const minecraftServerDeployment: ServicesDeplymentsGenerator<
  MinecraftServerDeploymentsGeneratorArguments
> = ({
  name = 'minecraft-server',
  type = 'VANILLA',
  cpuLimit = 1,
  memoryLimit = 2048,
  version,
  domain,
  Variables,
}) => {
  if (cpuLimit < 1000) {
    if (cpuLimit < 50) {
      cpuLimit = cpuLimit * 1000;
      if (cpuLimit < 1000) {
        throw new Error('CPU limit must be at least 1000 millicores (1 core)');
      }
    } else {
      throw new Error('CPU limit must be at least 1000 millicores (1 core)');
    }
  }
  if (memoryLimit < 2048) {
    throw new Error('Memory limit must be at least 2048 Mi (2 Gi)');
  }

  return {
    Services: [
      {
        namespace: Namespace,
        body: {
          apiVersion: 'v1',
          kind: 'Service',
          metadata: {
            name: `minecraft-server-service-${name}`,
            labels: {
              app: 'minecraft-server',
              name: name,
              category: 'minecraft-server',
              ...(domain ? { domain } : {}),
            },
          },
          spec: {
            selector: {
              app: 'minecraft-server',
              category: 'minecraft-server',
              name: name,
            },
            ports: [
              {
                name: 'minecraft-port',
                protocol: 'TCP',
                port: 25565,
                targetPort: 25565,
              },
              {
                name: 'rcon-port',
                protocol: 'TCP',
                port: 25575,
                targetPort: 25575,
                //...(isDevelopment && { nodePort: 30075 }),
              },
            ],
            type: isDevelopment ? 'NodePort' : 'ClusterIP',
          },
        },
      },
    ],
    Deployments: [
      {
        namespace: Namespace,
        body: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: {
            name: `minecraft-server-deployment-${name}`,
            labels: {
              app: 'minecraft-server',
              category: 'minecraft-server',
              name: name,
            },
          },
          spec: {
            replicas: 1,
            selector: {
              matchLabels: {
                app: 'minecraft-server',
                category: 'minecraft-server',
                name: name,
              },
            },
            strategy: {
              type: 'Recreate',
            },
            template: {
              metadata: {
                labels: {
                  app: 'minecraft-server',
                  category: 'minecraft-server',
                  name: name,
                },
              },
              spec: {
                initContainers: [
                  {
                    name: 'setup',
                    image: 'alpine:latest',
                    command: [
                      '/bin/sh',
                      '-c',
                      `
        # Config Setup: Copy server-type specific configs to /data directory
        if [ -d "/tmp/config" ] && [ "$(ls -A /tmp/config)" ]; then
          echo "Copying server configuration files..."
          mkdir -p /data/config
          cp /tmp/config/* /data/config/
          chmod -R 777 /data/config
          echo "Configuration setup complete."
        else
          echo "No additional configuration files provided."
        fi
        `,
                    ],
                    env: [],
                    volumeMounts: [
                      {
                        name: 'minecraft-data',
                        mountPath: '/data',
                      },
                      {
                        name: 'minecraft-server-config-volume',
                        mountPath: '/tmp/config',
                      },
                    ],
                  },
                ],
                terminationGracePeriodSeconds: 120,
                containers: [
                  {
                    name: 'minecraft-server',
                    image: 'itzg/minecraft-server:latest',
                    ports: [
                      {
                        containerPort: 25565,
                        name: 'minecraft-port',
                      },
                      {
                        containerPort: 25575,
                        name: 'rcon-port',
                      },
                    ],
                    envFrom: [
                      {
                        configMapRef: {
                          name: `minecraft-server-env-configmap-${name}`,
                        },
                      },
                    ],
                    resources: {
                      limits: {
                        cpu: cpuLimit ? `${cpuLimit}m` : '500m',
                        memory: memoryLimit
                          ? `${(memoryLimit * 1.15).toFixed()}Mi`
                          : '2Gi',
                      },
                      requests: {
                        cpu: '500m',
                        memory: '512Mi',
                      },
                    },
                    startupProbe: {
                      exec: {
                        command: ['mc-health'],
                      },
                      initialDelaySeconds: 30,
                      periodSeconds: 10,
                      timeoutSeconds: 5,
                      failureThreshold: 30, // 30 * 10 = 300 seconds (5 minutes)
                    },
                    // Liveness Probe: Check if server is still responsive
                    livenessProbe: {
                      exec: {
                        command: ['mc-health'],
                      },
                      initialDelaySeconds: 120,
                      periodSeconds: 30,
                      timeoutSeconds: 5,
                      failureThreshold: 5,
                    },
                    // Readiness Probe: Check if server is accepting connections
                    readinessProbe: {
                      exec: {
                        command: ['mc-health', '--ready'],
                      },
                      initialDelaySeconds: 45,
                      periodSeconds: 15,
                      timeoutSeconds: 5,
                      failureThreshold: 2,
                    },
                    volumeMounts: [
                      {
                        name: 'minecraft-data',
                        mountPath: '/data',
                      },
                      ((type: string) => {
                        switch (type.toUpperCase()) {
                          case 'PAPER':
                            return {
                              name: 'minecraft-server-config-volume',
                              mountPath: '/tmp/config/paper-global.yml',
                              subPath: 'paper-global.yml',
                            };
                          case 'FABRIC':
                            return {
                              name: 'minecraft-server-config-volume',
                              mountPath: '/tmp/config/FabricProxy-Lite.toml',
                              subPath: 'FabricProxy-Lite.toml',
                            };
                        }
                      })(type),
                    ],
                  },
                ],
                volumes: [
                  {
                    name: 'minecraft-data',
                    persistentVolumeClaim: {
                      claimName: `minecraft-server-pvc-${name}`,
                    },
                  },
                  ((type: string) => {
                    switch (type.toUpperCase()) {
                      case 'PAPER':
                        return {
                          name: 'minecraft-server-config-volume',
                          configMap: {
                            name: `minecraft-server-paper-configmap-${name}`,
                          },
                        };
                      case 'FABRIC':
                        return {
                          name: 'minecraft-server-config-volume',
                          configMap: {
                            name: `minecraft-server-fabric-configmap-${name}`,
                          },
                        };
                    }
                  })(type),
                  {
                    name: 'minecraft-server-mods-config',
                    configMap: {
                      name: `minecraft-server-mods-configmap-${name}`,
                      optional: true,
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ],
    ConfigMaps: [
      ((
        type: string,
      ): CoreV1ApiCreateNamespacedConfigMapRequest | undefined => {
        switch (type.toUpperCase()) {
          case 'PAPER':
            return {
              namespace: Namespace,
              body: {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                  name: `minecraft-server-paper-configmap-${name}`,
                  labels: {
                    app: 'minecraft-server',
                    category: 'minecraft-server',
                    name: name,
                  },
                },
                data: {
                  'paper-global.yml': `
proxies:
  bungee-cord:
    online-mode: true
  proxy-protocol: false
  velocity:
    enabled: true
    online-mode: true
    secret: "${VelocitySecret}"
                `,
                },
              },
            };

          case 'FABRIC':
            return {
              namespace: Namespace,
              body: {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                  name: `minecraft-server-fabric-configmap-${name}`,
                  labels: {
                    app: 'minecraft-server',
                    category: 'minecraft-server',
                  },
                },
                data: {
                  'FabricProxy-Lite.toml': `
hackOnlineMode = true
secret = "${VelocitySecret}"
                `,
                },
              },
            };
        }
        return;
      })(type) as CoreV1ApiCreateNamespacedConfigMapRequest,
      {
        namespace: Namespace,
        body: {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: {
            name: `minecraft-server-env-configmap-${name}`,
            labels: {
              app: 'minecraft-server',
              category: 'minecraft-server',
              name: name,
            },
          },
          data: Object.fromEntries(
            (
              [
                {
                  name: 'EULA',
                  value: 'TRUE',
                },
                { name: 'ONLINE_MODE', value: 'FALSE' },
                { name: 'TYPE', value: type.toUpperCase() },
                {
                  name: 'ENABLE_RCON',
                  value: 'true',
                },
                {
                  name: 'RCON_PASSWORD',
                  value: RCONPassword,
                },
                {
                  name: 'MAX_MEMORY',
                  value: `${memoryLimit}M`,
                },
                {
                  name: 'RCON_PORT',
                  value: '25575',
                },
                {
                  name: 'VERSION',
                  value: version || 'latest',
                },
                {
                  name: 'SERVER_NAME',
                  value: name,
                },
                ...(Variables
                  ? Object.entries(Variables)
                      .filter(
                        ([key]) =>
                          ![
                            'RCON_PASSWORD',
                            'RCON_PORT',
                            'RCON_PASSWORD',
                            'EULA',
                            'ONLINE_MODE',
                            'modrinthProjects',
                            'ENABLE_AUTOSTOP',
                            'AUTOSTOP_TIMEOUT_EST',
                            'AUTOSTOP_TIMEOUT_INIT',
                            'AUTOSTOP_PERIOD',
                            'DEBUG_AUTOSTOP',
                          ].includes(key),
                      )
                      .map(([key, value]) => ({
                        name: key,
                        value: String(value),
                      }))
                  : []),
                {
                  name: 'MODRINTH_PROJECTS',
                  value: [
                    type.toLowerCase() === 'fabric'
                      ? ['fabric-api', 'fabricproxy-lite']
                      : null,
                    ...(Variables?.MODRINTH_PROJECTS || []),
                  ]
                    .flat()
                    .join('\n'),
                },
              ] as {
                name: keyof Variables;
                value: Variables[keyof Variables];
              }[]
            ).map(({ name, value }) => [name, String(value)]),
          ),
        },
      },
    ],
    //Secrets: [],
    PVCs: [
      {
        namespace: Namespace,
        body: {
          apiVersion: 'v1',
          kind: 'PersistentVolumeClaim',
          metadata: {
            name: `minecraft-server-pvc-${name}`,
            labels: {
              app: 'minecraft-server',
              category: 'minecraft-server',
              name: name,
            },
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            storageClassName: 'minecraft-server-storage-class',
            resources: {
              requests: {
                storage: '10Gi',
              },
            },
          },
        },
      },
    ],
    PVs: [
      isDevelopment
        ? {
            body: {
              apiVersion: 'v1',
              kind: 'PersistentVolume',
              metadata: {
                name: `minecraft-server-pv-${name}`,
                labels: {
                  app: 'minecraft-server',
                  category: 'minecraft-server',
                },
              },
              spec: {
                capacity: {
                  storage: '10Gi',
                },
                accessModes: ['ReadWriteOnce'],
                hostPath: {
                  path: '/var/minecraft/data/' + name,
                },
                storageClassName: 'minecraft-server-storage-class',
              },
            },
          }
        : {
            body: {
              apiVersion: 'v1',
              kind: 'PersistentVolume',
              metadata: {
                name: `minecraft-server-pv-${name}`,
                labels: {
                  app: 'minecraft-server',
                  category: 'minecraft-server',
                },
              },
              spec: {
                capacity: {
                  storage: '10Gi',
                },
                accessModes: ['ReadWriteOnce'],
                persistentVolumeReclaimPolicy: 'Retain',
                storageClassName: 'minecraft-server-storage-class',
                nfs: {
                  path: `${NFSRootPath}/${ManagerMountPath}/${name}`,
                  server: NFSServer,
                },
              },
            },
          },
    ],
  } as ServicesDeployments;
};
