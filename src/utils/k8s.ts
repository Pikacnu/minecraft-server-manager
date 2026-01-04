import {
  AppsV1Api,
  CoreV1Api,
  KubeConfig,
  V1ConfigMap,
  V1Deployment,
  V1Pod,
  V1Service,
  Watch,
} from '@kubernetes/client-node';
import type { ServicesDeployments } from './type';
import { Namespace } from './config';
import { spawn } from 'child_process';
import * as yaml from 'js-yaml';
import { fetch } from 'bun';

const kubeConfig = new KubeConfig();

// Check if running in cluster or locally
if (process.env.KUBERNETES_SERVICE_HOST) {
  // Running in K8s cluster - use in-cluster config
  console.log('Using in-cluster Kubernetes configuration');
  kubeConfig.loadFromCluster();
} else {
  kubeConfig.loadFromDefault();

  // (global as any).fetch = (
  //   ...args: Parameters<typeof fetch>
  // ): ReturnType<typeof fetch> =>
  //   fetch(args[0], {
  //     ...args[1],
  //     tls: {
  //       ca: kubeConfig.getCurrentCluster()?.caData,
  //       cert: kubeConfig.getCurrentUser()?.certData,
  //       key: kubeConfig.getCurrentUser()?.keyData,
  //       rejectUnauthorized: false,
  //     },
  //   } as RequestInit);
  // Running locally - use local kubeconfig with kubectl proxy fallback
  console.log('Using local kubeconfig with kubectl proxy');

  //Try to use kubectl proxy if available
  try {
    // Start kubectl proxy to bypass Bun mTLS issues (development only)
    const tempProxyPort = Math.floor(Math.random() * (20000 - 10000) + 10000);
    console.log(`Starting kubectl proxy on port ${tempProxyPort}...`);
    const proxy = spawn('kubectl', ['proxy', `--port=${tempProxyPort}`]);

    proxy.stdout.on('data', (data) => console.log(`[kubectl]: ${data}`));
    proxy.stderr.on('data', (data) =>
      console.error(`[kubectl error]: ${data}`),
    );
    proxy.on('close', (code) =>
      console.log(`[kubectl] exited with code ${code}`),
    );

    // Ensure processes are killed on exit
    const cleanup = () => {
      proxy.kill();
    };
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit();
    });

    // Wait for proxy to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Configure to use proxy
    kubeConfig.loadFromOptions({
      clusters: [
        {
          name: 'proxy',
          server: `http://127.0.0.1:${tempProxyPort}`,
          skipTLSVerify: true,
        },
      ],
      users: [
        {
          name: 'proxy-user',
        },
      ],
      contexts: [
        {
          name: 'proxy-context',
          cluster: 'proxy',
          user: 'proxy-user',
        },
      ],
      currentContext: 'proxy-context',
    });
  } catch (e) {
    // Fallback to kubeconfig if kubectl proxy fails
    console.log('kubectl proxy not available, using kubeconfig directly:', e);
    kubeConfig.loadFromDefault();
  }
}

export const coreV1Api = kubeConfig.makeApiClient(CoreV1Api);
export const appsV1Api = kubeConfig.makeApiClient(AppsV1Api);
export default kubeConfig;

export enum k8sApiEndpoint {
  Pods = '/api/v1/pods',
  Deployments = '/apis/apps/v1/deployments',
  Services = '/api/v1/services',
  ConfigMaps = '/api/v1/configmaps',
  Namespaces = '/api/v1/namespaces',
  PVs = '/api/v1/persistentvolumes',
  PVCs = '/api/v1/persistentvolumeclaims',
}

export type PhaseType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK' | 'ERROR';

export enum PhaseEnum {
  ADDED = 'ADDED',
  MODIFIED = 'MODIFIED',
  DELETED = 'DELETED',
  BOOKMARK = 'BOOKMARK',
  ERROR = 'ERROR',
}

interface WatchCallbackType {
  [k8sApiEndpoint.Services]: V1Service;
  [k8sApiEndpoint.ConfigMaps]: V1ConfigMap;
  [k8sApiEndpoint.Deployments]: V1Deployment;
  [k8sApiEndpoint.Pods]: V1Pod;
  [k8sApiEndpoint.PVs]: any;
  [k8sApiEndpoint.PVCs]: any;
}

type WatchCallback<T extends keyof WatchCallbackType> = (
  phase: PhaseType,
  obj: WatchCallbackType[T],
) => void;

export class Watcher {
  private watch: Watch;
  private isWatching: boolean = false;
  private intervalMs: number = 1_000 * 0.25;
  private callbackFn!: WatchCallback<keyof WatchCallbackType>;
  private doneFn!: Parameters<Watch['watch']>[3];

  constructor() {
    this.watch = new Watch(kubeConfig);
  }

  set interval(ms: number) {
    this.intervalMs = ms;
  }

  set onCallback(fn: typeof this.callbackFn) {
    this.callbackFn = fn;
  }

  set onDone(fn: typeof this.doneFn) {
    this.doneFn = fn;
  }

  private async buildwatch<T extends keyof WatchCallbackType>(
    path: T extends k8sApiEndpoint ? T : never,
    queryParams: Parameters<Watch['watch']>[1],
    callback: WatchCallback<T>,
    done?: typeof this.doneFn,
  ) {
    if (!this.isWatching) return;
    this.watch.watch(
      path as string,
      queryParams,
      (phase: string, obj: any) => {
        if (!this.isWatching) return;
        callback(phase as PhaseType, obj);
      },
      (err) => {
        if (!this.isWatching) return;
        setTimeout(() => {
          this.buildwatch(path, queryParams, callback, done);
        }, this.intervalMs);
        this.doneFn && this.doneFn(err);
      },
    );
  }

  public startWatch<T extends keyof WatchCallbackType>(
    ...args: Parameters<typeof this.buildwatch<T>>
  ) {
    if (this.isWatching) return;
    this.isWatching = true;
    this.buildwatch<T>(...args);
  }
  public stopWatch() {
    this.isWatching = false;
  }
}

function k8sErrorHandler(error: any, fields?: string[]) {
  const { code, body } = error;
  if (body && typeof body === 'string') {
    try {
      const bodyObj = JSON.parse(body);
      console.error(
        `Kubernetes API Error - Code: ${code},\n${Object.entries(bodyObj)
          .filter(([key, value]) => value !== undefined && value !== null)
          .filter(([key]) => (fields ? fields.includes(key) : true))
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')}`,
      );
    } catch (parseError) {}
  } else if (code && !body) {
    console.error(`Kubernetes API Error - Code: ${code}`);
  } else if (!code && !body) {
    console.error('Unknown Kubernetes API Error:', error);
  }
}

export async function checkResourceExists(
  namespace = Namespace,
  resourceType: k8sApiEndpoint,
  resourceName: string,
  resourceLabel?: [string, string][],
) {
  const searchObject = {
    namespace,
    name: resourceName,
    labelSelector: `metadata.name=${resourceName}
    ${
      resourceLabel
        ? resourceLabel.map(([key, value]) => `,${key}=${value}`).join('')
        : ''
    }`,
  };
  let searchFn;
  try {
    switch (resourceType) {
      case k8sApiEndpoint.ConfigMaps:
        searchFn = coreV1Api.readNamespacedConfigMap(searchObject);
        break;
      case k8sApiEndpoint.Services:
        searchFn = coreV1Api.readNamespacedService(searchObject);
        break;
      case k8sApiEndpoint.Deployments:
        searchFn = appsV1Api.readNamespacedDeployment(searchObject);
        break;
      case k8sApiEndpoint.PVs:
        searchFn = coreV1Api.readPersistentVolume({
          name: resourceName,
        });
        break;
      case k8sApiEndpoint.PVCs:
        searchFn = coreV1Api.readNamespacedPersistentVolumeClaim(searchObject);
        break;
      case k8sApiEndpoint.Namespaces:
        searchFn = coreV1Api.readNamespace({
          name: resourceName,
        });
        break;
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
    await searchFn;
  } catch (error: any) {
    k8sErrorHandler(error);
    if (error.code === 404) return false;
  }
  return true;
}

export async function checkGeneratedResourceExtsts(
  namespace = Namespace,
  resourceType: k8sApiEndpoint,
  resourcePrefix: string,
  resourceLabel?: [string, string][],
) {
  const labelSelector = resourceLabel
    ? resourceLabel.map(([key, value]) => `${key}=${value}`).join(',')
    : '';
  let resources;
  try {
    switch (resourceType) {
      case k8sApiEndpoint.ConfigMaps:
        resources = await coreV1Api.listNamespacedConfigMap({
          namespace,
        });
        break;
      case k8sApiEndpoint.Services:
        resources = await coreV1Api.listNamespacedService({
          namespace,
        });
        break;
      case k8sApiEndpoint.Deployments:
        resources = await appsV1Api.listNamespacedDeployment({
          namespace,
        });
        break;
      case k8sApiEndpoint.PVs:
        resources = await coreV1Api.listPersistentVolume();
        break;
      case k8sApiEndpoint.PVCs:
        resources = await coreV1Api.listNamespacedPersistentVolumeClaim({
          namespace,
        });
        break;
      case k8sApiEndpoint.Namespaces:
        resources = await coreV1Api.listNamespace();
        break;
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  } catch (error: any) {
    if (error.code === 404) return false;
    k8sErrorHandler(error);
  }
  const isItemExists = resources!.items.some((item) =>
    item.metadata!.name!.startsWith(resourcePrefix),
  );
  if (!isItemExists) return false;
  return true;
}

async function PromiseResolver(
  promiseArray: Promise<unknown>[],
): Promise<[boolean, Error | unknown][]> {
  return await Promise.all(
    promiseArray.map(async (p) => {
      try {
        return [true, await p];
      } catch (error: unknown) {
        return [false, error];
      }
    }),
  );
}

export async function deployService(
  deploymentData: ServicesDeployments,
  options?: { log?: boolean; replaceIfExists?: boolean },
) {
  const { log = false, replaceIfExists = false } = options || {};
  const PVsPromises = deploymentData.PVs?.map(async (pv) => {
    const resource = await checkResourceExists(
      undefined,
      k8sApiEndpoint.PVs,
      pv.body.metadata!.name!,
    );
    if (resource) {
      if (!replaceIfExists) {
        if (log)
          return console.log(
            `PV ${pv.body.metadata!.name!} already exists, skipping...`,
          );
        return;
      }
      return coreV1Api.replacePersistentVolume({
        name: pv.body.metadata!.name!,
        ...pv,
      });
    }
    return coreV1Api.createPersistentVolume(pv);
  });
  const PVCsPromises = deploymentData.PVCs?.map(async (pvc) => {
    const resource = await checkResourceExists(
      pvc.namespace!,
      k8sApiEndpoint.PVCs,
      pvc.body.metadata!.name!,
    );
    if (resource) {
      if (!replaceIfExists) {
        if (log)
          console.log(
            `PVC ${pvc.body.metadata!.name!} already exists, skipping...`,
          );
        return;
      }
      return coreV1Api.replaceNamespacedPersistentVolumeClaim({
        name: pvc.body.metadata!.name!,
        ...pvc,
      });
    }
    return coreV1Api.createNamespacedPersistentVolumeClaim(pvc);
  });

  const ConfigMapsPromises = deploymentData.ConfigMaps?.map(
    async (configMap) => {
      const resource = await checkResourceExists(
        configMap.namespace!,
        k8sApiEndpoint.ConfigMaps,
        configMap.body.metadata!.name!,
      );
      if (resource) {
        if (!replaceIfExists) {
          if (log)
            console.log(
              `ConfigMap ${configMap.body.metadata!
                .name!} already exists, skipping...`,
            );
          return;
        }
        return coreV1Api.replaceNamespacedConfigMap({
          name: configMap.body.metadata!.name!,
          ...configMap,
        });
      }
      return coreV1Api.createNamespacedConfigMap(configMap);
    },
  );
  const ServicesPromises = deploymentData.Services?.map(async (service) => {
    console.log('Deploying service:', service.body.metadata!.name!);
    const resource = await checkResourceExists(
      service.namespace!,
      k8sApiEndpoint.Services,
      service.body.metadata!.name!,
    );
    if (resource) {
      if (!replaceIfExists) {
        if (log)
          console.log(
            `Service ${service.body.metadata!
              .name!} already exists, skipping...`,
          );
        return;
      }
      return coreV1Api.replaceNamespacedService({
        name: service.body.metadata!.name!,
        ...service,
      });
    }
    return coreV1Api.createNamespacedService(service);
  });
  const DeploymentsPromises = deploymentData.Deployments?.map(
    async (deployment) => {
      const resource = await checkResourceExists(
        deployment.namespace!,
        k8sApiEndpoint.Deployments,
        deployment.body.metadata!.name!,
      );
      if (resource) {
        if (!replaceIfExists) {
          if (log)
            console.log(
              `Deployment ${deployment.body.metadata!
                .name!} already exists, skipping...`,
            );
          return;
        }
        return appsV1Api.replaceNamespacedDeployment({
          name: deployment.body.metadata!.name!,
          ...deployment,
        });
      }
      return appsV1Api.createNamespacedDeployment(deployment);
    },
  );
  const SecretsPromises = deploymentData.Secrets?.map(async (secret) => {
    const resource = await checkResourceExists(
      secret.namespace!,
      k8sApiEndpoint.ConfigMaps,
      secret.body.metadata!.name!,
    );
    if (resource) {
      if (!replaceIfExists) {
        if (log)
          console.log(
            `Secret ${secret.body.metadata!.name!} already exists, skipping...`,
          );
        return;
      }
      return coreV1Api.replaceNamespacedSecret({
        name: secret.body.metadata!.name!,
        ...secret,
      });
    }
    return coreV1Api.createNamespacedSecret(secret);
  });
  const NamespacePromise = deploymentData.Namespace?.map(async (ns) => {
    const resource = await checkResourceExists(
      undefined,
      k8sApiEndpoint.Namespaces,
      ns.body.metadata!.name!,
    );
    if (resource) {
      if (!replaceIfExists) {
        if (log)
          console.log(
            `Namespace ${ns.body.metadata!.name!} already exists, skipping...`,
          );
        return;
      }
      return coreV1Api.replaceNamespace({
        name: ns.body.metadata!.name!,
        ...ns,
      });
    }
    return coreV1Api.createNamespace(ns);
  });

  try {
    const result = await PromiseResolver([
      ...(NamespacePromise || []),
      ...(PVsPromises || []),
      ...(PVCsPromises || []),
      ...(ConfigMapsPromises || []),
      ...(SecretsPromises || []),
      ...(ServicesPromises || []),
      ...(DeploymentsPromises || []),
    ]);
    if (log) {
      result.forEach(([success, res]) => {
        if (success) return;
        console.error('Failed to deploy resource:', res);
      });
    }
  } catch (error: any) {
    k8sErrorHandler(error, ['message', 'details']);
  }
  return;
}

export async function deleteService(deploymentData: ServicesDeployments) {
  const ServicesPromises = deploymentData.Services?.map(async (service) => {
    return coreV1Api.deleteNamespacedService({
      name: service.body.metadata!.name!,
      namespace: service.namespace!,
    });
  });
  const DeploymentsPromises = deploymentData.Deployments?.map(
    async (deployment) => {
      return appsV1Api.deleteNamespacedDeployment({
        name: deployment.body.metadata!.name!,
        namespace: deployment.namespace!,
      });
    },
  );
  const PVsPromises = deploymentData.PVs?.map(async (pv) => {
    return coreV1Api.deletePersistentVolume({
      name: pv.body.metadata!.name!,
    });
  });
  const PVCsPromises = deploymentData.PVCs?.map(async (pvc) => {
    return coreV1Api.deleteNamespacedPersistentVolumeClaim({
      name: pvc.body.metadata!.name!,
      namespace: pvc.namespace!,
    });
  });
  const ConfigMapsPromises = deploymentData.ConfigMaps?.map(
    async (configMap) => {
      if (!configMap) return;
      return coreV1Api.deleteNamespacedConfigMap({
        name: configMap.body.metadata!.name!,
        namespace: configMap.namespace!,
      });
    },
  );
  const SecretsPromises = deploymentData.Secrets?.map(async (secret) => {
    return coreV1Api.deleteNamespacedSecret({
      name: secret.body.metadata!.name!,
      namespace: secret.namespace!,
    });
  });
  const NamespacePromises = deploymentData.Namespace?.map(async (ns) => {
    return coreV1Api.deleteNamespace({
      name: ns.body.metadata!.name!,
    });
  });

  try {
    const result = await PromiseResolver([
      ...(DeploymentsPromises || []),
      ...(PVCsPromises || []),
      ...(PVsPromises || []),
      ...(ConfigMapsPromises || []),
      ...(SecretsPromises || []),
      ...(ServicesPromises || []),
      ...(NamespacePromises || []),
    ]);
    result.forEach(([success, res]) => {
      if (success) return;
      console.error('Failed to delete resource:', res);
    });
  } catch (error: any) {
    k8sErrorHandler(error, ['message', 'details']);
  }
}

// Not used
export async function updateConfigMap(
  namespace: string,
  configMapName: string,
  configName: string,
  data: { [key: string]: string },
  fileType?: 'yaml' | 'json',
) {
  try {
    const existingConfigMapResponse = await coreV1Api.readNamespacedConfigMap({
      name: configMapName,
      namespace,
    });
    let existingConfigMap;
    if (fileType === 'yaml') {
      existingConfigMap = yaml.load(
        existingConfigMapResponse.data![configName] || '',
      ) as V1ConfigMap;
    } else if (fileType === 'json') {
      existingConfigMap = JSON.parse(
        existingConfigMapResponse.data![configName] || '{}',
      ) as V1ConfigMap;
    }
    let modifiedConfigMap = { ...existingConfigMap, ...data };
    if (fileType === 'yaml') {
      existingConfigMapResponse.data![configName] =
        yaml.dump(modifiedConfigMap);
    } else if (fileType === 'json') {
      existingConfigMapResponse.data![configName] = JSON.stringify(
        modifiedConfigMap,
        null,
        2,
      );
    } else {
      existingConfigMapResponse.data = {
        ...existingConfigMapResponse.data,
        ...data,
      };
    }

    await coreV1Api.replaceNamespacedConfigMap({
      name: configMapName,
      namespace,
      body: modifiedConfigMap,
    });
    console.log(
      `ConfigMap ${configMapName} updated successfully in namespace ${namespace}`,
    );
  } catch (error) {
    console.error(
      `Failed to update ConfigMap ${configMapName} in namespace ${namespace}:`,
      error,
    );
  }
}

export async function updateYamlConfigMap(
  namespace: string,
  configMapName: string,
  configName: string,
  data: { [key: string]: any },
) {
  return updateConfigMap(namespace, configMapName, configName, data);
}

export async function updateEnvConfigMap(
  namespace: string,
  configMapName: string,
  data: { [key: string]: string | number | undefined | boolean },
) {
  try {
    const existingConfigMapResponse = await coreV1Api.readNamespacedConfigMap({
      name: configMapName,
      namespace,
    });
    let existingConfigMap;
    existingConfigMap = existingConfigMapResponse.data || {};
    let modifiedConfigMap = {
      ...existingConfigMap,
      ...Object.fromEntries(
        Object.entries(data)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)]),
      ),
    };

    await coreV1Api.replaceNamespacedConfigMap({
      name: existingConfigMapResponse.metadata!.name!,
      namespace,
      body: {
        ...existingConfigMapResponse,
        data: modifiedConfigMap,
      },
    });
    console.log(
      `ConfigMap ${configMapName} updated successfully in namespace ${namespace}`,
    );
  } catch (error) {
    console.error(
      `Failed to update ConfigMap ${configMapName} in namespace ${namespace}:`,
      error,
    );
  }
}

export async function patchENVConfigMap(
  namespace: string,
  configMapName: string,
  data: { [key: string]: any },
) {
  try {
    const patch = Object.entries(data)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => ({
        op: 'replace',
        path: `/data/${key.replace(/\//g, '~1')}`, // Escape slashes in keys
        value: String(value),
      }));

    const options = {
      headers: { 'Content-type': 'application/json-patch+json' },
    };

    await coreV1Api.patchNamespacedConfigMap({
      name: configMapName,
      namespace,
      body: patch,
      ...options,
    });

    console.log(
      `ConfigMap ${configMapName} patched successfully in namespace ${namespace}`,
    );
  } catch (error) {
    console.error(
      `Failed to patch ConfigMap ${configMapName} in namespace ${namespace}:`,
      error,
    );
  }
}

export async function getConfigMapData(
  namespace: string,
  configMapName: string,
  configName: string,
  fileType?: 'yaml' | 'json',
): Promise<Record<string, unknown> | null> {
  try {
    const existingConfigMapResponse = await coreV1Api.readNamespacedConfigMap({
      name: configMapName,
      namespace,
    });
    if (fileType === 'yaml') {
      return yaml.load(
        existingConfigMapResponse.data![configName] || '',
      ) as Record<string, unknown>;
    }
    if (fileType === 'json') {
      return JSON.parse(
        existingConfigMapResponse.data![configName] || '{}',
      ) as Record<string, unknown>;
    }
    return existingConfigMapResponse.data as Record<string, unknown>;
  } catch (error) {
    console.error(
      `Failed to get ConfigMap ${configMapName} in namespace ${namespace}:`,
      error,
    );
    return null;
  }
}

export async function applyYamlToConfigMap(
  namespace: string,
  yamlContent: object,
  configMapName: string,
  configName: string,
) {
  try {
    const yamlString = yaml.dump(yamlContent);
    const existingConfigMapResponse = await coreV1Api.readNamespacedConfigMap({
      name: configMapName,
      namespace,
    });
    existingConfigMapResponse.data = {
      ...existingConfigMapResponse.data,
      [configName]: yamlString,
    };
    await coreV1Api.replaceNamespacedConfigMap({
      name: configMapName,
      namespace,
      body: existingConfigMapResponse,
    });
    console.log(
      `Applied YAML content to ConfigMap ${configMapName} in namespace ${namespace}`,
    );
  } catch (error) {
    const { code, body } = error as { code: number; body: string };
    if (body) {
      const bodyObj = JSON.parse(body);
      console.error(
        `Kubernetes API Error - Code: ${code},\nmessage: ${
          bodyObj.message
        },\ndetails: ${
          typeof bodyObj.details === 'object'
            ? JSON.stringify(bodyObj.details)
            : `${bodyObj.details}`
        }`,
      );
    } else {
      console.error(
        `Failed to apply YAML content to ConfigMap ${configMapName} in namespace ${namespace}:`,
        error,
      );
    }
  }
}

export function stopDeploymentRollout(
  deploymentName: string,
  namespace = Namespace,
) {
  return appsV1Api.patchNamespacedDeploymentScale({
    name: deploymentName,
    namespace,
    body: [
      {
        op: 'replace',
        path: '/spec/replicas',
        value: 0,
      },
    ],
  });
}

export async function stopGeneratedDeploymentRollout(
  deploymentLabelName: string,
  namespace = Namespace,
) {
  const deployments = await appsV1Api.listNamespacedDeployment({
    namespace,
    labelSelector: `name=${deploymentLabelName}`,
  });
  if (deployments.items.length === 0) {
    throw new Error(
      `No deployments found with label name: ${deploymentLabelName}`,
    );
  }
  await Promise.all(
    deployments.items.map((deployment) =>
      appsV1Api.patchNamespacedDeploymentScale({
        name: deployment.metadata!.name!,
        namespace,
        body: [
          {
            op: 'replace',
            path: '/spec/replicas',
            value: 0,
          },
        ],
      }),
    ),
  );
}

export function resumeDeploymentRollout(
  deploymentName: string,
  namespace = Namespace,
  replicas = 1,
) {
  return appsV1Api.patchNamespacedDeploymentScale({
    name: deploymentName,
    namespace,
    body: [
      {
        op: 'replace',
        path: '/spec/replicas',
        value: replicas,
      },
    ],
  });
}

export async function resumeGeneratedDeploymentRollout(
  deploymentLabelName: string,
  namespace = Namespace,
  replicas = 1,
) {
  const deployments = await appsV1Api.listNamespacedDeployment({
    namespace,
    labelSelector: `name=${deploymentLabelName}`,
  });
  if (deployments.items.length === 0) {
    throw new Error(
      `No deployments found with label name: ${deploymentLabelName}`,
    );
  }
  await Promise.all(
    deployments.items.map((deployment) =>
      appsV1Api.patchNamespacedDeploymentScale({
        name: deployment.metadata!.name!,
        namespace,
        body: [
          {
            op: 'replace',
            path: '/spec/replicas',
            value: replicas,
          },
        ],
      }),
    ),
  );
}

export function restartDeploymentRollout(
  deploymentName: string,
  namespace = Namespace,
) {
  return appsV1Api.patchNamespacedDeployment({
    name: deploymentName,
    namespace,
    body: {
      spec: {
        template: {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
            },
          },
        },
      },
    },
  });
}

export async function restartGeneratedDeploymentRollout(
  deploymentLabelName: string,
  namespace = Namespace,
) {
  const deployments = await appsV1Api.listNamespacedDeployment({
    namespace,
    labelSelector: `name=${deploymentLabelName}`,
  });
  if (deployments.items.length === 0) {
    throw new Error(
      `No deployments found with label name: ${deploymentLabelName}`,
    );
  }
  await Promise.all(
    deployments.items.map((deployment) =>
      appsV1Api.patchNamespacedDeployment({
        name: deployment.metadata!.name!,
        namespace,
        body: {
          spec: {
            template: {
              metadata: {
                annotations: {
                  'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
                },
              },
            },
          },
        },
      }),
    ),
  );
}

export async function getDeploymentData(
  deploymentName: string,
  namespace = Namespace,
) {
  const deployment = await appsV1Api.readNamespacedDeployment({
    name: deploymentName,
    namespace,
  });
  return deployment;
}

export async function patchConfigMap(
  namespace: string,
  newData: any,
  name: string,
  key: string,
) {
  // Convert your object back to a YAML string for the ConfigMap field
  const yamlString = yaml.dump(newData);

  const patch = [
    {
      op: 'replace',
      path: `/data/${key.replace(/\//g, '~1')}`, // Escape slashes in keys
      value: yamlString,
    },
  ];

  const options = {
    headers: { 'Content-type': 'application/json-patch+json' },
  };

  try {
    await coreV1Api.patchNamespacedConfigMap({
      name,
      namespace,
      body: patch,
      ...options,
    });
  } catch (err) {
    console.error('Patch failed:', err);
    throw err;
  }
}

export async function patchDeployment(
  namespace: string,
  deploymentName: string,
  patchData: {
    op: 'replace' | 'add' | 'remove';
    path: string;
    value: any;
  }[],
) {
  const options = {
    headers: { 'Content-type': 'application/merge-patch+json' },
  };
  try {
    await appsV1Api.patchNamespacedDeployment({
      name: deploymentName,
      namespace,
      body: patchData,
      ...options,
    });
  } catch (err) {
    console.error('Patch deployment failed:', err);
    throw err;
  }
}
