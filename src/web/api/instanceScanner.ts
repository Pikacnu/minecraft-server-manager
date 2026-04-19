import { FileControllerManager, FileController } from '@/manager/file-manager';
import { Manager } from '@/manager';
import { LocalMountPath, ManagerMountPath } from '@/utils/config';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { checkResourceExists, k8sApiEndpoint } from '@/utils/k8s';
import { Namespace } from '@/utils/config';

function parseProperties(content: string) {
  const lines = content.split(/\r?\n/);
  const result: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    result[key] = val;
  }
  return result;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const controllers = FileControllerManager.listControllers();
    const findFilePath = (
      struct: Record<string, any>,
      fileName: string,
    ): string | null => {
      for (const [key, val] of Object.entries(struct)) {
        if (typeof val === 'string') {
          if (key.toLowerCase() === fileName.toLowerCase()) return val;
        } else if (typeof val === 'object' && val !== null) {
          const res = findFilePath(val as Record<string, any>, fileName);
          if (res) return res;
        }
      }
      return null;
    };

    const list = await Promise.all(
      controllers.map(async (name) => {
        let managed = false;
        try {
          // First try to detect via Manager (in-memory state)
          managed = Manager.getServerInfoByName(name) !== null;
        } catch (e) {
          managed = false;
        }

        // If Manager doesn't know, check k8s resources directly (ConfigMap or Deployment)
        if (!managed) {
          try {
            const cfgExists = await checkResourceExists(
              Namespace,
              k8sApiEndpoint.ConfigMaps,
              `minecraft-server-env-configmap-${name}`,
            );
            const deployExists = await checkResourceExists(
              Namespace,
              k8sApiEndpoint.Deployments,
              `minecraft-server-deployment-${name}`,
            );
            managed = !!cfgExists || !!deployExists;
          } catch (e) {
            // ignore errors and leave managed as false
          }
        }

        let serverProperties: Record<string, string> | null = null;
        let hasServerProperties = false;
        let hasServerConf = false;
        let modsCount = 0;

        try {
          const controller = FileControllerManager.getController(name);
          try {
            const rootStruct = controller.getFileStructure();
            const propPath = findFilePath(rootStruct, 'server.properties');
            if (propPath) {
              const content = await controller.readFile(propPath);
              serverProperties = parseProperties(content);
              hasServerProperties = true;
            }
            const confPath = findFilePath(rootStruct, 'server.conf');
            if (confPath) {
              const conf = await controller.readFile(confPath);
              try {
                const parsed = JSON.parse(conf);
                serverProperties = { ...(serverProperties || {}), ...parsed };
              } catch (e) {
                serverProperties = {
                  ...(serverProperties || {}),
                  ...parseProperties(conf),
                };
              }
              hasServerConf = true;
            }

            try {
              const mods = controller.getFileStructure('mods');
              if (mods && typeof mods === 'object') {
                modsCount = Object.keys(mods).length;
              }
            } catch (e) {
              modsCount = 0;
            }
          } catch (e) {
            // ignore per-controller failures
          }
        } catch (e) {
          // controller not available
        }

        return {
          name,
          managed,
          hasServerProperties,
          hasServerConf,
          modsCount,
          serverProperties,
        };
      }),
    );
    return Response.json({ status: 'ok', data: list }, { status: 200 });
  } catch (error) {
    console.error('Error in instance scanner GET:', error);
    return Response.json(
      { status: 'error', message: 'Failed to list instances' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as any;
    const action = body.action as string;
    if (!action) {
      return Response.json(
        { status: 'error', message: 'Missing action' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'delete': {
        const { name } = body as { name: string };
        if (!name) {
          return Response.json(
            { status: 'error', message: 'Missing name' },
            { status: 400 },
          );
        }
        try {
          if (FileControllerManager.hasController(name)) {
            try {
              FileControllerManager.unregisterController(name);
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore
        }

        const target = join(LocalMountPath, ManagerMountPath, name);
        await rm(target, { recursive: true, force: true });
        return Response.json({ status: 'ok' }, { status: 200 });
      }
      case 'create-server': {
        const { name, defaults } = body as {
          name: string;
          defaults?: Record<string, any>;
        };
        if (!name) {
          return Response.json(
            { status: 'error', message: 'Missing name' },
            { status: 400 },
          );
        }
        const s = defaults || {};
        const serverName = (s.SERVER_NAME || name)
          .replaceAll(' ', '-')
          .toLowerCase();
        const version = s.VERSION || s.version || '1.20.5';
        const type = (s.TYPE || s.type || 'fabric') as any;
        const memoryRaw =
          s.MAX_MEMORY || s.MAX_MEMORY || s.MAX
            ? String(s.MAX_MEMORY || s.MAX || '')
            : '';
        let memoryLimit = 2048;
        if (typeof memoryRaw === 'string' && memoryRaw !== '') {
          const num = parseInt(memoryRaw.replace(/[^0-9]/g, ''));
          if (!isNaN(num)) memoryLimit = num;
        } else if (typeof s.memoryLimit === 'number') {
          memoryLimit = s.memoryLimit;
        }

        await Manager.createServer({
          memoryLimit,
          version,
          type,
          domain: s.domain || undefined,
          name: serverName,
          Variables: s,
        } as any);

        // Attempt to write a server.conf into the source folder so it is marked as configured
        try {
          let controller;
          if (FileControllerManager.hasController(name)) {
            controller = FileControllerManager.getController(name);
          } else {
            try {
              const newController = new FileController(name, {});
              FileControllerManager.registerController(name, newController);
              controller = newController;
            } catch (e) {
              if (FileControllerManager.hasController(name)) {
                controller = FileControllerManager.getController(name);
              }
            }
          }
          if (controller) {
            await controller.writeFile(
              'server.conf',
              JSON.stringify(s || {}, null, 2),
            );
            await controller.rescan();
          }
        } catch (e) {
          console.error('Failed to write server.conf for', name, e);
        }

        return Response.json({ status: 'ok' }, { status: 200 });
      }
      default:
        return Response.json(
          { status: 'error', message: 'Unknown action' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Error in instance scanner POST:', error);
    return Response.json(
      { status: 'error', message: 'Request failed' },
      { status: 500 },
    );
  }
}

export default { GET, POST };
