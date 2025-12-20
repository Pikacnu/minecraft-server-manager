import { minecraftServerDeployment } from '@/deployment/minecraft-server';
import { Namespace } from '@/utils/config';
import {
  deleteService,
  deployService,
  getConfigMapData,
  updateConfigMap,
  updateEnvConfigMap,
  updateYamlConfigMap,
} from '@/utils/k8s';
import {
  MinecraftServerType,
  type MinecraftServerDeploymentsGeneratorArguments,
  type Variables,
} from '@/utils/type';

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
    await deployService(
      minecraftServerDeployment({
        memoryLimit: variable.memoryLimit!,
        version: variable.version!,
        type: variable.type!,
        domain: variable.domain,
        name: variable.SERVER_NAME!.replaceAll(' ', '-').toLowerCase(),
        Variables: Object.fromEntries(
          Object.entries(variable).filter(
            ([, value]) =>
              value !== undefined && value !== null && value !== '',
          ),
        ),
      }),
    );
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
    const configMapData = await getConfigMapData(
      Namespace,
      `minecraft-server-env-configmap-${serverName}`,
      'data',
    );

    await deleteService(
      minecraftServerDeployment({
        name: serverName,
        type: ((configMapData?.data as Variables)?.TYPE ??
          MinecraftServerType.Fabric) as MinecraftServerType,
      }),
    );
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
  'ENABLE_AUTOSTOP',
  'AUTOSTOP_TIMEOUT_EST',
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
          !ShouldntBeChanged.includes(key),
      ),
    );

    const modProjects = variables.MODRINTH_PROJECTS
      ? variables.MODRINTH_PROJECTS.split(',')
          .map((s) => s.trim())
          .filter((s) => s !== '')
      : [];
    console.log(Object.keys(filteredVariables));

    const updatedVariables = {
      ...(configMapData?.data as Variables),
      ...filteredVariables,
      TYPE: filteredVariables.type,
      VERSION: filteredVariables.version,
      MAX_MEMORY: `${
        filteredVariables.memoryLimit
          ? String(filteredVariables.memoryLimit)
          : (2048 * 1.15).toFixed()
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
      RESOURCE_PACK: `"${filteredVariables.RESOURCE_PACK || ''}"`,
    };
    await updateEnvConfigMap(
      Namespace,
      `minecraft-server-env-configmap-${serverName}`,
      updatedVariables,
    );
  } catch (error) {
    console.error('Failed to update server variables:', error);
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
