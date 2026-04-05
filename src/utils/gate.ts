import { GateService } from '@buf/minekube_gate.connectrpc_es/minekube/gate/v1/gate_service_connect';
import { createConnectTransport } from '@connectrpc/connect-node';
import { createClient } from '@connectrpc/connect';
import { checkResourceExists, deployService, k8sApiEndpoint } from './k8s';
import { gateDeployment } from '@/deployment/gate';
import { Namespace } from './config';
import { isDevelopment } from '@/utils/config';

// init Gate Connection
const transport = createConnectTransport({
  httpVersion: '1.1',
  baseUrl: isDevelopment
    ? 'http://localhost:8080' // Development Gate service URL
    : 'http://gate-server-service:8080', // Production Gate service URL
  defaultTimeoutMs: 30 * 1000,
});

console.log('Initializing Gate client...');

let gateClient: ReturnType<typeof createClient<typeof GateService>>;
let gateClientWarped: {
  [K in keyof typeof gateClient]: (
    ...args: Parameters<(typeof gateClient)[K]>
  ) => ReturnType<(typeof gateClient)[K]>;
};

// Just create the client, assuming it might not be reachable immediately.
gateClient = createClient(GateService, transport);

gateClientWarped = Object.fromEntries(
  Object.entries(gateClient!).map(([methodName, method], index) => {
    return [
      methodName,
      async (...args: any[]) => {
        try {
          return await (method as any)(...args);
        } catch (error: any) {
          const errorMessage = error.message?.toLowerCase() || '';
          const isNetworkError =
            error.name === 'TimeoutError' ||
            errorMessage.includes('timed out') ||
            errorMessage.includes('econnrefused') ||
            errorMessage.includes('fetch failed') ||
            errorMessage.includes('network error');

          if (isNetworkError) {
            console.warn(
              `[Gate Client] Method ${methodName} network fail: Gate likely not ready yet.`,
            );

            // Provide a graceful fallback to prevent the application from crashing
            if (methodName === 'listServers') {
              return { servers: [] };
            }
            if (methodName === 'serverInfo') {
              return { server: { status: { players: { online: 0, max: 0 } } } };
            }
            // Add other method fallbacks if necessary here

            // Return null or empty object for others
            return {};
          }

          console.error(`Gate client method ${methodName} failed:`, error);
          const deployment = gateDeployment.Deployments![0]!;
          const isDeployed = await checkResourceExists(
            Namespace,
            k8sApiEndpoint.Deployments,
            deployment.body.metadata!.name!,
          );
          if (!isDeployed) {
            console.log(`Attempting to redeploy Gate service...`);
            await deployService(gateDeployment);
            console.log(`Retrying Gate client method ${methodName}...`);
            return await (method as any)(...args);
          }
          console.error(
            `Gate service is running, but method ${methodName} failed again.`,
          );
          throw error;
        }
      },
    ];
  }),
) as typeof gateClientWarped;

export { gateClientWarped as gateClient };
export type GateClient = typeof gateClientWarped;
export default gateClientWarped;
