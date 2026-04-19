import { minecraftServerDeployment } from '@/deployment/minecraft-server';
import { Manager } from '@/manager';
import { FileControllerManager, FileController } from '@/manager/file-manager';
import { Namespace } from '@/utils/config';
import {
  getConfigMapData,
  patchDeployment,
  patchService,
  patchENVConfigMap,
  updateEnvConfigMap,
} from '@/utils/k8s';
import {
  MinecraftServerType,
  type MinecraftServerDeploymentsGeneratorArguments,
  type Variables,
} from '@/utils/type';

const AutoStopKeys = [
  'ENABLE_AUTOSTOP',
  'AUTOSTOP_TIMEOUT_EST',
  'AUTOSTOP_TIMEOUT_INIT',
  'AUTOSTOP_PERIOD',
  'DEBUG_AUTOSTOP',
] as const;

export async function POST(request: Request): Promise<Response> {
  const variable = (await request.json()) as Omit<
    MinecraftServerDeploymentsGeneratorArguments,
    'Variables'
  > &
    Variables;

  const requiredFields = ['SERVER_NAME', 'version', 'type', 'memoryLimit'];
  for (const field of requiredFields) {
    if (!(field in variable) || !variable[field as keyof typeof variable]) {
      return Response.json(
        { status: 'error', message: `Missing required field: ${field}` },
        { status: 400 },
      );
    }
  }
  try {
    const variablesForCreate = Object.fromEntries(
      Object.entries(variable).filter(
        ([key, value]) =>
          value !== undefined &&
          value !== null &&
          value !== '' &&
          !AutoStopKeys.includes(key as (typeof AutoStopKeys)[number]),
      ),
    );

    const serverK8sName = variable
      .SERVER_NAME!.replaceAll(' ', '-')
      .toLowerCase();

    await Manager.createServer({
      memoryLimit: variable.memoryLimit!,
      version: variable.version!,
      type: variable.type!,
      domain: variable.domain,
      name: serverK8sName,
      Variables: variablesForCreate as any,
    });

    // If the request provided a source folder id (serverSettingId), write a server.conf there
    try {
      const srcFolder = (variable as any).serverSettingId as string | undefined;
      if (srcFolder) {
        let controller;
        if (FileControllerManager.hasController(srcFolder)) {
          controller = FileControllerManager.getController(srcFolder);
        } else {
          try {
            const newController = new FileController(srcFolder, {});
            FileControllerManager.registerController(srcFolder, newController);
            controller = newController;
          } catch (e) {
            if (FileControllerManager.hasController(srcFolder)) {
              controller = FileControllerManager.getController(srcFolder);
            }
          }
        }
        if (controller) {
          await controller.writeFile(
            'server.conf',
            JSON.stringify(variablesForCreate, null, 2),
          );
          await controller.rescan();
        }
      }
    } catch (e) {
      console.error('Failed to persist server.conf to source folder:', e);
    }
  } catch (error) {
    console.error('Failed to deploy server:', error);
    return Response.json(
      { status: 'error', message: `Failed to deploy server` },
      { status: 500 },
    );
  }
  return Response.json({ status: 'ok' }, { status: 200 });
}

export async function DELETE(request: Request): Promise<Response> {
  const { serverName } = (await request.json()) as {
    serverName: string;
  };
  if (!serverName) {
    return Response.json(
      { status: 'error', message: 'Missing required field: serverName' },
      { status: 400 },
    );
  }
  try {
    await Manager.deleteServer(serverName);
  } catch (error) {
    console.error('Failed to delete server:', error);
    return Response.json(
      { status: 'error', message: `Failed to delete server` },
      { status: 500 },
    );
  }
  return Response.json({ status: 'ok' }, { status: 200 });
}

const ShouldntBeChanged = [
  'SERVER_PORT',
  'RCON_PORT',
  'MOTD',
  'SERVER_NAME',
  'ONLINE_MODE',
  'ENABLE_RCON',
  'RCON_PASSWORD',
  'EULA',
];

export async function PATCH(request: Request): Promise<Response> {
  const { serverName, variables } = (await request.json()) as {
    serverName: string;
    variables: Partial<Variables>;
  };
  if (!serverName) {
    return Response.json(
      { status: 'error', message: 'Missing required field: serverName' },
      { status: 400 },
    );
  }
  try {
    const configMapData = await getConfigMapData(
      Namespace,
      `minecraft-server-env-configmap-${serverName}`,
      'data',
    );

    const filteredVariables = Object.fromEntries(
      Object.entries(variables).filter(
        ([key, value]) =>
          value !== undefined &&
          value !== null &&
          value !== '' &&
          !ShouldntBeChanged.includes(key) &&
          !AutoStopKeys.includes(key as (typeof AutoStopKeys)[number]),
      ),
    ) as Partial<Variables & MinecraftServerDeploymentsGeneratorArguments>;

    const modProjects = variables.MODRINTH_PROJECTS
      ? variables.MODRINTH_PROJECTS.split(',')
          .map((s) => s.trim())
          .filter((s) => s !== '')
      : [];

    const updatedVariables = {
      ...(configMapData?.data as Variables),
      ...filteredVariables,
      TYPE: filteredVariables.type,
      VERSION: filteredVariables.version,
      MAX_MEMORY: `${
        filteredVariables.memoryLimit
          ? `${String(filteredVariables.memoryLimit)}`
          : '2048'
      }M`,
      MODRINTH_PROJECTS:
        variables.TYPE === MinecraftServerType.Fabric &&
        ['fabric-api', 'fabric-proxy-lite'].some((proj) =>
          modProjects.includes(proj),
        )
          ? [
              'fabric-api',
              'fabric-proxy-lite',
              ...modProjects.filter(
                (proj) => !['fabric-api', 'fabric-proxy-lite'].includes(proj),
              ),
            ].join('\n')
          : modProjects.join('\n'),
      RESOURCE_PACK: `${
        filteredVariables.RESOURCE_PACK &&
        filteredVariables.RESOURCE_PACK !== ''
          ? filteredVariables.RESOURCE_PACK
          : ''
      }`,
    };

    // Remove legacy auto-stop settings from existing ConfigMap data.
    for (const key of AutoStopKeys) {
      delete (updatedVariables as Record<string, unknown>)[key];
    }

    await patchENVConfigMap(
      Namespace,
      `minecraft-server-env-configmap-${serverName}`,
      updatedVariables,
    );

    // Always trigger rollout when config changes by adding annotation
    const patchOperations: Array<{
      op: 'add' | 'replace';
      path: string;
      value: any;
    }> = [
      {
        op: 'add',
        path: '/spec/template/metadata/annotations',
        value: { configUpdatedAt: new Date().toISOString() },
      },
    ];

    // update deployment if memoryLimit or cpu changed
    if (filteredVariables.memoryLimit) {
      patchOperations.push(
        {
          op: 'add',
          path: '/spec/template/spec/containers/0/resources/limits/memory',
          value: `${Math.floor(
            Number(filteredVariables.memoryLimit) * 1.15,
          )}Mi`,
        },
        {
          op: 'add',
          path: '/spec/template/spec/containers/0/resources/requests/memory',
          value: `${Math.floor(Number(filteredVariables.memoryLimit))}Mi`,
        },
      );
      if (filteredVariables.cpuLimit !== undefined) {
        patchOperations.push(
          {
            op: 'add',
            path: '/spec/template/spec/containers/0/resources/limits/cpu',
            value: `${Math.floor(filteredVariables.cpuLimit * 1000)}m`,
          },
          {
            op: 'add',
            path: '/spec/template/spec/containers/0/resources/requests/cpu',
            value: `${Math.floor((filteredVariables.cpuLimit as number) * 0.5 * 1000)}m`,
          },
        );
      }
    }

    console.log('Patch operations for deployment:', patchOperations);

    if (patchOperations.length > 1) {
      await patchDeployment(
        Namespace,
        `minecraft-server-deployment-${serverName}`,
        patchOperations,
      );
    }

    const hasDomainChange = 'domain' in variables;
    const hasAddTryHostChange = 'ADD_INTO_TRY_HOST' in variables;

    if (hasDomainChange || hasAddTryHostChange) {
      const labelsToPatch = {
        ...(hasDomainChange
          ? { domain: variables.domain === '' ? null : variables.domain }
          : {}),
        ...(hasAddTryHostChange
          ? {
              'add-into-try-host':
                variables.ADD_INTO_TRY_HOST === ''
                  ? null
                  : String(variables.ADD_INTO_TRY_HOST),
            }
          : {}),
      };
      await patchService(Namespace, `minecraft-server-service-${serverName}`, {
        metadata: {
          labels: labelsToPatch,
        },
      });
    }
    // Persist updated variables to source folder if client provided serverSettingId
    try {
      const srcFolder = (variables as any).serverSettingId as
        | string
        | undefined;
      if (srcFolder) {
        let controller;
        if (FileControllerManager.hasController(srcFolder)) {
          controller = FileControllerManager.getController(srcFolder);
        } else {
          try {
            const newController = new FileController(srcFolder, {});
            FileControllerManager.registerController(srcFolder, newController);
            controller = newController;
          } catch (e) {
            if (FileControllerManager.hasController(srcFolder)) {
              controller = FileControllerManager.getController(srcFolder);
            }
          }
        }
        if (controller) {
          try {
            await controller.writeFile(
              'server.conf',
              JSON.stringify(updatedVariables, null, 2),
            );
            await controller.rescan();
          } catch (e) {
            console.error('Failed to persist server.conf on update:', e);
          }
        }
      }
    } catch (e) {
      console.error('Failed to persist server.conf metadata on update:', e);
    }
  } catch (error: any) {
    console.error('Failed to update server variables: \n', error);
    return Response.json(
      { status: 'error', message: `Failed to update server variables` },
      { status: 500 },
    );
  }

  return Response.json({ status: 'ok' }, { status: 200 });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const serverName = url.searchParams.get('serverName');
  if (!serverName) {
    return Response.json(
      { status: 'error', message: 'Missing required field: serverName' },
      { status: 400 },
    );
  }
  try {
    const configMapData = (await getConfigMapData(
      Namespace,
      `minecraft-server-env-configmap-${serverName}`,
      'data',
    )) as Variables | null;
    if (!configMapData) {
      return Response.json(
        { status: 'error', message: `Server ${serverName} not found` },
        { status: 404 },
      );
    }
    return Response.json(
      {
        status: 'ok',
        data: {
          ...configMapData,
          domain: Manager.getServerInfoByName(serverName)?.domain,
          ...(configMapData.MODRINTH_PROJECTS
            ? {
                MODRINTH_PROJECTS: configMapData.MODRINTH_PROJECTS.replaceAll(
                  '\n',
                  ',',
                ),
              }
            : {}),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to get server variables:', error);
    return Response.json(
      { status: 'error', message: `Failed to get server variables` },
      { status: 500 },
    );
  }
}

export default {
  GET,
  POST,
  DELETE,
  PATCH,
};
