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
  try:[]
  forwarding:
    mode: velocity
    velocitySecret: "${VelocitySecret}"
  shutdownReason: |
    Server is restarting, please try again later.
  motd: |
    '&aWelcome to the Mine8s! &bEnjoy your stay!'
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
