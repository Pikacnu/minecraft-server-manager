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
try {
  gateClient = createClient(GateService, transport);
} catch (error) {
  console.error('Failed to initialize Gate client:', error);
  console.log('Attempting to redeploy Gate service...');
  await deployService(gateDeployment, { log: true });
  await new Promise((resolve) => setTimeout(resolve, 20 * 1000)); // wait for 20 seconds
  gateClient = createClient(GateService, transport);
  console.log('Gate client initialized after redeployment.');
} finally {
  gateClientWarped = Object.fromEntries(
    Object.entries(gateClient!).map(([methodName, method], index) => {
      return [
        methodName,
        async (...args: any[]) => {
          try {
            return await (method as any)(...args);
          } catch (error: any) {
            const isTimeout =
              error.name === 'TimeoutError' ||
              error.message?.includes('timed out');
            if (isTimeout) {
              console.warn(`Method ${methodName} 逾時，正在檢查服務狀態...`);
              return;
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
}

export { gateClientWarped as gateClient };
export type GateClient = typeof gateClientWarped;
export default gateClientWarped;
