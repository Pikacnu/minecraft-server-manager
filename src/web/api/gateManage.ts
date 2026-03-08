import { Namespace } from '@/utils/config';
import {
  getConfigMapData,
  getDeploymentData,
  patchConfigMap,
  patchDeployment,
} from '@/utils/k8s';
import type { GateConfig } from '@/utils/type';

// Get Gate deployment status
export async function GET(request: Request): Promise<Response> {
  try {
    const deployment = await getDeploymentData(
      'gate-server-deployment',
      Namespace,
    );

    if (!deployment) {
      return Response.json(
        { status: 'error', message: 'Gate deployment not found' },
        { status: 404 },
      );
    }

    const status = {
      replicas: deployment.spec?.replicas || 0,
      availableReplicas: deployment.status?.availableReplicas || 0,
      readyReplicas: deployment.status?.readyReplicas || 0,
      conditions: deployment.status?.conditions || [],
    };

    return Response.json({ status: 'ok', data: status });
  } catch (error) {
    console.error('Failed to get Gate status:', error);
    return Response.json(
      { status: 'error', message: 'Failed to retrieve Gate status' },
      { status: 500 },
    );
  }
}

// Manage Gate deployment
export async function POST(request: Request): Promise<Response> {
  try {
    const { action, config } = (await request.json()) as {
      action: 'restart' | 'updateConfig';
      config?: Partial<GateConfig>;
    };

    switch (action) {
      case 'restart': {
        // Add annotation to trigger rollout
        await patchDeployment(Namespace, 'gate-server-deployment', [
          {
            op: 'add',
            path: '/spec/template/metadata/annotations/restartedAt',
            value: new Date().toISOString(),
          },
        ]);
        return Response.json({
          status: 'ok',
          message: 'Gate server restart initiated',
        });
      }

      case 'updateConfig': {
        if (!config) {
          return Response.json(
            { status: 'error', message: 'Config data required' },
            { status: 400 },
          );
        }

        // Get current config
        const currentConfig = (await getConfigMapData(
          Namespace,
          'gate-server-configmap',
          'config.yml',
          'yaml',
        )) as GateConfig;

        // Merge with new config
        const updatedConfig = {
          ...currentConfig,
          config: {
            ...currentConfig.config,
            ...config.config,
          },
        };

        // Update ConfigMap
        await patchConfigMap(
          Namespace,
          updatedConfig,
          'gate-server-configmap',
          'config.yml',
        );

        // Trigger restart to apply config
        await patchDeployment(Namespace, 'gate-server-deployment', [
          {
            op: 'add',
            path: '/spec/template/metadata/annotations/configUpdatedAt',
            value: new Date().toISOString(),
          },
        ]);

        return Response.json({
          status: 'ok',
          message: 'Gate configuration updated and restart initiated',
        });
      }

      default:
        return Response.json(
          { status: 'error', message: 'Invalid action' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Failed to manage Gate:', error);
    return Response.json(
      { status: 'error', message: 'Failed to manage Gate deployment' },
      { status: 500 },
    );
  }
}

// Get Gate configuration
export async function PATCH(request: Request): Promise<Response> {
  try {
    const gateConfig = (await getConfigMapData(
      Namespace,
      'gate-server-configmap',
      'config.yml',
      'yaml',
    )) as GateConfig;

    return Response.json({ status: 'ok', data: gateConfig });
  } catch (error) {
    console.error('Failed to get Gate config:', error);
    return Response.json(
      { status: 'error', message: 'Failed to retrieve Gate configuration' },
      { status: 500 },
    );
  }
}
