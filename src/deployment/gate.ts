import { Namespace, VelocitySecret } from '@/utils/config';
import type { ServicesDeployments } from '@/utils/type';
import { isDevelopment } from '@/utils/config';

export const gateDeployment: ServicesDeployments = {
  Namespace: [
    {
      body: {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: Namespace,
        },
      },
    },
  ],
  Services: [
    {
      namespace: Namespace,
      body: {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: 'gate-server-service',
          labels: {
            app: 'gate-server',
            category: 'proxy-server',
          },
        },
        spec: {
          selector: {
            app: 'gate-server',
          },
          ports: [
            {
              name: 'minecraft-port',
              protocol: 'TCP',
              port: 25565,
              targetPort: 25565,
              ...(isDevelopment && { nodePort: 30065 }),
            },
            {
              name: 'api-port',
              protocol: 'TCP',
              port: 8080,
              targetPort: 8080,
              ...(isDevelopment && { nodePort: 30080 }),
            },
          ],
          type: isDevelopment ? 'NodePort' : 'LoadBalancer',
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
          name: 'gate-server-deployment',
          labels: {
            app: 'gate-server',
            category: 'proxy-server',
          },
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              app: 'gate-server',
              category: 'proxy-server',
            },
          },
          template: {
            metadata: {
              labels: {
                app: 'gate-server',
                category: 'proxy-server',
              },
            },
            spec: {
              containers: [
                {
                  name: 'gate-server-container',
                  image: 'ghcr.io/minekube/gate:latest',
                  args: ['--config=/config/config.yml'],
                  ports: [{ containerPort: 25565 }, { containerPort: 8080 }],
                  volumeMounts: [
                    {
                      name: 'gate-server-config-volume',
                      mountPath: '/config',
                    },
                  ],
                },
              ],
              volumes: [
                {
                  name: 'gate-server-config-volume',
                  configMap: {
                    name: 'gate-server-configmap',
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
    {
      namespace: Namespace,
      body: {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: 'gate-server-configmap',
          labels: {
            app: 'gate-server',
            category: 'proxy-server',
          },
        },
        data: {
          'config.yml': `
config:
  bind: 0.0.0.0:25565
  onlineMode: true
  servers: {}
  try: {}
  forwarding:
    mode: velocity
    velocitySecret: "${VelocitySecret}"
  shutdownReason: |
    Server is restarting, please try again later.
  status: 
    motd: |
      '&aWelcome to the Mine8s! &bEnjoy your stay!'
    favicon: 'data:image/png;base64,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'
    logPingRequests: false
    announceForge: false
  proxyProtocol: true
  forcedHosts: {}
  builtinCommands: true
  requireBuiltinCommandPermissions: true

api:
  enabled: true
  bind: 0.0.0.0:8080`,
        },
      },
    },
  ],
};
