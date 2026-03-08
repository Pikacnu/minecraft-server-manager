import { http, HttpResponse } from 'msw';

const mockSystemSettings = {
  readOnly: {
    namespace: 'minecraft',
    appName: 'minecraft-server-manager',
    nfsServer: '10.0.0.10',
    nfsRootPath: '/srv/minecraft',
    isDevelopment: true,
  },
  sensitive: {
    velocitySecret: '***',
    rconPassword: '***',
    cloudflareApiToken: '***',
  },
  network: {
    domainName: 'mc.local',
    proxyIp: '127.0.0.1',
    srvPort: 25565,
    zoneId: 'preview-zone',
    wildcardDomainPrefix: '*',
    isWildcardDomain: false,
  },
};

let mockGateConfig: Record<string, unknown> = {
  config: {
    bind: '0.0.0.0:25565',
    onlineMode: true,
    servers: {
      server1: 'localhost:25566',
      server2: 'localhost:25567',
    },
    try: ['server1', 'server2'],
    status: {
      motd: 'Preview Gate Proxy',
      showMaxPlayers: 1000,
      logPingRequests: false,
      announceForge: false,
    },
    shutdownReason: 'Gate proxy is shutting down...',
    compression: {
      threshold: 256,
      level: -1,
    },
    connectionTimeout: '5s',
    readTimeout: '30s',
    forwarding: {
      mode: 'legacy',
    },
    forcedHosts: {
      'lobby.mc.local': ['server1'],
    },
    query: {
      enabled: false,
      port: 25577,
      showPlugins: false,
    },
    bedrock: {
      enabled: false,
      managed: {
        enabled: false,
      },
    },
  },
  connect: {
    enabled: false,
    allowOfflineModePlayers: true,
  },
  api: {
    enabled: false,
    bind: 'localhost:8080',
  },
};

const mockGateStatus = {
  replicas: 1,
  availableReplicas: 1,
  readyReplicas: 1,
  conditions: [],
};

export const handlers = [
  http.get('/api/settings', () => {
    return HttpResponse.json({
      status: 'ok',
      data: mockSystemSettings,
    });
  }),

  http.get('/api/gate-manage', () => {
    return HttpResponse.json({
      status: 'ok',
      data: mockGateStatus,
    });
  }),

  http.patch('/api/gate-manage', () => {
    return HttpResponse.json({
      status: 'ok',
      data: mockGateConfig,
    });
  }),

  http.post('/api/gate-manage', async ({ request }) => {
    const body = (await request.json()) as {
      action?: 'restart' | 'updateConfig';
      config?: Record<string, unknown>;
    };

    if (body.action === 'restart') {
      return HttpResponse.json({
        status: 'ok',
        message: 'Gate server restart initiated (Mock)',
      });
    }

    if (body.action === 'updateConfig') {
      if (!body.config || typeof body.config !== 'object') {
        return HttpResponse.json(
          {
            status: 'error',
            message: 'Config data required',
          },
          { status: 400 },
        );
      }

      mockGateConfig = body.config;
      return HttpResponse.json({
        status: 'ok',
        message: 'Gate configuration updated successfully (Mock)',
      });
    }

    return HttpResponse.json(
      {
        status: 'error',
        message: 'Invalid action',
      },
      { status: 400 },
    );
  }),

  http.post('/api/server-manage', async ({ request }) => {
    const body = (await request.json()) as any;
    console.log('Mock Server Manage:', body);
    return HttpResponse.json({
      status: 'ok',
      message: `Server ${body.action} successful (Mock)`,
    });
  }),

  http.get('/api/file-system', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');

    if (type === 'structure') {
      return HttpResponse.json({
        success: true,
        data: {
          name: '/',
          type: 'directory',
          children: [
            { name: 'server.properties', type: 'file' },
            {
              name: 'mods',
              type: 'directory',
              children: [{ name: 'Fabric-API.jar', type: 'file' }],
            },
            { name: 'world', type: 'directory', children: [] },
            {
              name: 'logs',
              type: 'directory',
              children: [{ name: 'latest.log', type: 'file' }],
            },
          ],
        },
      });
    }

    if (type === 'file') {
      return HttpResponse.json({
        success: true,
        data: '# Minecraft server properties\n# (Mock Data)\nmotd=A Minecraft Server Preview\nlevel-name=world\nserver-port=25565',
      });
    }

    return HttpResponse.json(
      { success: false, message: 'Invalid type' },
      { status: 400 },
    );
  }),

  http.get('/api/server-instance', () => {
    return HttpResponse.json({
      success: true,
      data: {
        instances: ['my-server', 'demo-server-2'],
      },
    });
  }),
];
