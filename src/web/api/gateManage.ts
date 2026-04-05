import { Namespace } from '@/utils/config';
import {
  getConfigMapData,
  getDeploymentData,
  patchConfigMap,
  patchDeployment,
  deleteService,
  deployService,
} from '@/utils/k8s';
import { gateDeployment } from '@/deployment/gate';
import type { GateConfig } from '@/utils/type';
import {
  filterGateConfig,
  isReadOnlyField,
  isGateConfigEqual,
} from '@/utils/gateConfig';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDeepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Get Gate deployment status
async function GET(request: Request): Promise<Response> {
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
async function POST(request: Request): Promise<Response> {
  try {
    const { action, config } = (await request.json()) as {
      action: 'restart' | 'redeploy' | 'updateConfig';
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

      case 'redeploy': {
        // We only want to delete the Service and Deployment, not ConfigMap or Namespace
        const targetResources = {
          Services: gateDeployment.Services,
          Deployments: gateDeployment.Deployments,
        };
        try {
          await deleteService(targetResources);
        } catch (e) {
          console.error(
            'Failed to delete old gate deployment, proceeding to deploy anyway:',
            e,
          );
        }

        // Let K8s clean up resources before recreating
        await new Promise((resolve) => setTimeout(resolve, 3000));

        await deployService(targetResources, { log: true });

        return Response.json({
          status: 'ok',
          message: 'Gate server redeployment initiated',
        });
      }

      case 'updateConfig': {
        if (!config) {
          return Response.json(
            { status: 'error', message: 'Config data required' },
            { status: 400 },
          );
        }

        if (!isPlainObject(config)) {
          return Response.json(
            { status: 'error', message: 'Invalid config payload' },
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

        // Validate config structure against YAML schema
        let validatedConfig: GateConfig;
        try {
          validatedConfig = filterGateConfig(config as any);
        } catch (validationError) {
          return Response.json(
            {
              status: 'error',
              message: `Configuration validation failed: ${(validationError as Error).message}`,
            },
            { status: 400 },
          );
        }

        // Server-side protection against malicious API requests.
        // Check all read-only fields for any modifications
        const readOnlyPaths = ['api', 'config.bind', 'config.forwarding'];
        for (const readonlyPath of readOnlyPaths) {
          if (isReadOnlyField(readonlyPath)) {
            // Extract value by path
            const pathParts = readonlyPath.split('.');
            let currentValue: any = currentConfig;
            let newValue: any = validatedConfig;

            for (const part of pathParts) {
              currentValue = currentValue?.[part];
              newValue = newValue?.[part];
            }

            // Compare the values
            if (!isGateConfigEqual(currentValue, newValue)) {
              return Response.json(
                {
                  status: 'error',
                  message: `Field "${readonlyPath}" is read-only and cannot be modified`,
                },
                { status: 403 },
              );
            }
          }
        }

        // Merge with new config while enforcing immutable fields.
        const updatedConfig = {
          ...validatedConfig,
          api: currentConfig.api,
          config: {
            ...validatedConfig.config,
            bind: currentConfig.config.bind,
            forwarding: currentConfig.config.forwarding,
          },
        };

        // Update ConfigMap
        await patchConfigMap(
          Namespace,
          updatedConfig,
          'gate-server-configmap',
          'config.yml',
        );

        return Response.json({
          status: 'ok',
          message: 'Gate configuration updated successfully',
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
async function PATCH(request: Request): Promise<Response> {
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

export default {
  GET,
  POST,
  PATCH,
};
