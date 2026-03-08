import { appsV1Api, coreV1Api } from './k8s';
import { getMinecraftVersions } from './minecraft';
import type {
  GeneralVariables,
  ServerVariables,
  ResourcePackVariables,
  WhitelistVariables,
  RconVariables,
  AutoPauseVariables,
  AutoStopVariables,
  CurseForgeVariables,
  ModrinthVariables,
} from './minecraft-image-variable';

export type ServicesDeployments = {
  Services?: Array<Parameters<typeof coreV1Api.createNamespacedService>[0]>;
  Deployments?: Array<
    Parameters<typeof appsV1Api.createNamespacedDeployment>[0]
  >;
  ConfigMaps?: Array<Parameters<typeof coreV1Api.createNamespacedConfigMap>[0]>;
  Secrets?: Array<Parameters<typeof coreV1Api.createNamespacedSecret>[0]>;
  PVs?: Array<Parameters<typeof coreV1Api.createPersistentVolume>[0]>;
  PVCs?: Array<
    Parameters<typeof coreV1Api.createNamespacedPersistentVolumeClaim>[0]
  >;
  Namespace?: Array<Parameters<typeof coreV1Api.createNamespace>[0]>;
};

export type ServicesDeplymentsGeneratorArguments = {
  name: string;
};

export type ServicesDeplymentsGenerator<T = unknown> = (
  args: ServicesDeplymentsGeneratorArguments & T,
) => ServicesDeployments;

export type Variables = GeneralVariables &
  ServerVariables &
  ResourcePackVariables &
  WhitelistVariables &
  RconVariables &
  AutoPauseVariables &
  AutoStopVariables &
  CurseForgeVariables &
  ModrinthVariables;

export enum MinecraftServerType {
  Vanilla = 'vanilla',
  Paper = 'paper',
  Fabric = 'fabric',
  Forge = 'forge',
}

export type MinecraftServerDeploymentsGeneratorArguments = {
  memoryLimit?: number;
  cpuLimit?: number;
  type?: MinecraftServerType;
  version?: string;
  domain?: string;
  map_url?: string;
  map_source_folder?: string;
  Variables?: Variables;
};

export interface GateConfig {
  config: {
    bind: string;
    onlineMode: boolean;
    servers: Record<string, string>;
    try: string[];
    status?: {
      motd?: string;
      showMaxPlayers?: number;
      favicon?: string;
      logPingRequests?: boolean;
      announceForge?: boolean;
    };
    acceptTransfers?: boolean;
    bungeePluginChannelEnabled?: boolean;
    builtinCommands?: boolean;
    requireBuiltinCommandPermissions?: boolean;
    announceProxyCommands?: boolean;
    forceKeyAuthentication?: boolean;
    shutdownReason: string;
    compression?: {
      threshold?: number;
      level?: number;
    };
    connectionTimeout?: string;
    readTimeout?: string;
    failoverOnUnexpectedServerDisconnect?: boolean;
    onlineModeKickExistingPlayers?: boolean;
    debug?: boolean;
    forwarding: {
      mode: string;
      velocitySecret?: string;
      bungeeGuardSecret?: string;
    };
    proxyProtocol?: boolean;
    forcedHosts: Record<string, string[]>;
    quota?: {
      connections?: {
        enabled: boolean;
        ops: number;
        burst: number;
        maxEntries: number;
      };
      logins?: {
        enabled: boolean;
        burst: number;
        ops: number;
        maxEntries: number;
      };
    };
    query?: {
      enabled: boolean;
      port?: number;
      showPlugins?: boolean;
    };
    auth?: {
      sessionServerUrl?: string;
    };
    lite?: {
      enabled: boolean;
      routes?: Array<any>;
    };
    bedrock?: {
      enabled: boolean;
      geyserListenAddr?: string;
      usernameFormat?: string;
      floodgateKeyPath?: string;
      managed?: {
        enabled: boolean;
        jarUrl?: string;
        dataDir?: string;
        javaPath?: string;
        autoUpdate?: boolean;
        extraArgs?: string[];
        configOverrides?: Record<string, any>;
      };
    };
    [key: string]: any;
  };
  connect?: {
    enabled: boolean;
    name?: string;
    allowOfflineModePlayers?: boolean;
  };
  api: {
    enabled: boolean;
    bind: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export enum FieldType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Enum = 'enum',
}

export interface FieldDefinition {
  key: string;
  type: FieldType;
  example: any;
  category: string;
  options?: string[];
  description?: string;
  readonly?: boolean;
}

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Deployment
  {
    key: 'memoryLimit',
    type: FieldType.Number,
    example: 2048,
    category: 'Deployment',
  },
  {
    key: 'cpuLimit',
    type: FieldType.Number,
    example: 2,
    category: 'Deployment',
  },
  {
    key: 'type',
    type: FieldType.Enum,
    example: 'fabric',
    options: Object.values(MinecraftServerType),
    category: 'Deployment',
  },
  {
    key: 'version',
    type: FieldType.Enum,
    example: '1.20.5',
    options: await getMinecraftVersions(),
    category: 'Deployment',
  },
  {
    key: 'domain',
    type: FieldType.String,
    example: 'mc.example.com',
    category: 'Deployment',
    readonly: true,
  },
  {
    key: 'map_url',
    type: FieldType.String,
    example: 'https://example.com/map.zip',
    category: 'Deployment',
  },
  {
    key: 'map_source_folder',
    type: FieldType.String,
    example: '/data/map',
    category: 'Deployment',
  },

  // General
  { key: 'UID', type: FieldType.String, example: '1000', category: 'General' },
  { key: 'GID', type: FieldType.String, example: '1000', category: 'General' },
  { key: 'MEMORY', type: FieldType.String, example: '2G', category: 'General' },
  {
    key: 'TZ',
    type: FieldType.String,
    example: 'Asia/Taipei',
    category: 'General',
  },
  {
    key: 'JVM_OPTS',
    type: FieldType.String,
    example: '-Xms512M -Xmx2G',
    category: 'General',
  },

  // Server
  // {
  //   key: 'MOTD',
  //   type: FieldType.String,
  //   example: 'A Minecraft Server',
  //   category: 'Server',
  // },
  {
    key: 'DIFFICULTY',
    type: FieldType.Enum,
    example: 'normal',
    options: ['peaceful', 'easy', 'normal', 'hard'],
    category: 'Server',
  },
  {
    key: 'MAX_PLAYERS',
    type: FieldType.Number,
    example: 20,
    category: 'Server',
  },
  // {
  //   key: 'ONLINE_MODE',
  //   type: FieldType.Boolean,
  //   example: true,
  //   category: 'Server',
  // },
  { key: 'PVP', type: FieldType.Boolean, example: true, category: 'Server' },
  {
    key: 'LEVEL_TYPE',
    type: FieldType.String,
    example: 'DEFAULT',
    category: 'Server',
  },
  {
    key: 'SERVER_NAME',
    type: FieldType.String,
    example: 'My Server',
    category: 'Server',
  },
  // {
  //   key: 'SERVER_PORT',
  //   type: FieldType.Number,
  //   example: 25565,
  //   category: 'Server',
  // },
  {
    key: 'VIEW_DISTANCE',
    type: FieldType.Number,
    example: 10,
    category: 'Server',
  },
  {
    key: 'MODE',
    type: FieldType.Enum,
    example: 'survival',
    options: ['creative', 'survival', 'adventure', 'spectator'],
    category: 'Server',
  },
  // { key: 'EULA', type: FieldType.Boolean, example: true, category: 'Server' },
  {
    key: 'ICON',
    type: FieldType.String,
    example: 'https://example.com/icon.png',
    category: 'Server',
  },
  {
    key: 'MAX_WORLD_SIZE',
    type: FieldType.Number,
    example: 29999984,
    category: 'Server',
  },
  {
    key: 'ALLOW_NETHER',
    type: FieldType.Boolean,
    example: true,
    category: 'Server',
  },
  {
    key: 'ENABLE_COMMAND_BLOCK',
    type: FieldType.Boolean,
    example: true,
    category: 'Server',
  },
  {
    key: 'HARDCORE',
    type: FieldType.Boolean,
    example: false,
    category: 'Server',
  },
  {
    key: 'SPAWN_ANIMALS',
    type: FieldType.Boolean,
    example: true,
    category: 'Server',
  },
  {
    key: 'SPAWN_MONSTERS',
    type: FieldType.Boolean,
    example: true,
    category: 'Server',
  },
  {
    key: 'SPAWN_NPCS',
    type: FieldType.Boolean,
    example: true,
    category: 'Server',
  },
  {
    key: 'GENERATE_STRUCTURES',
    type: FieldType.Boolean,
    example: true,
    category: 'Server',
  },
  {
    key: 'SEED',
    type: FieldType.String,
    example: '123456789',
    category: 'Server',
  },
  {
    key: 'ALLOW_FLIGHT',
    type: FieldType.Boolean,
    example: false,
    category: 'Server',
  },

  // Resource Pack
  {
    key: 'RESOURCE_PACK',
    type: FieldType.String,
    example: 'https://example.com/pack.zip',
    category: 'Resource Pack',
  },
  {
    key: 'RESOURCE_PACK_SHA1',
    type: FieldType.String,
    example: 'sha1hash',
    category: 'Resource Pack',
  },
  {
    key: 'RESOURCE_PACK_ENFORCE',
    type: FieldType.Boolean,
    example: true,
    category: 'Resource Pack',
  },
  {
    key: 'RESOURCE_PACK_PROMPT',
    type: FieldType.String,
    example: 'Please download the resource pack',
    category: 'Resource Pack',
  },
  {
    key: 'RESOURCE_PACK_ID',
    type: FieldType.String,
    example: 'uuid',
    category: 'Resource Pack',
  },

  // Whitelist
  {
    key: 'ENABLE_WHITELIST',
    type: FieldType.Boolean,
    example: true,
    category: 'Whitelist',
  },
  {
    key: 'WHITELIST',
    type: FieldType.String,
    example: 'player1,player2',
    category: 'Whitelist',
  },

  // RCON
  // {
  // key: 'ENABLE_RCON',
  // type: FieldType.Boolean,
  // example: false,
  // category: 'RCON',
  // },
  // {
  // key: 'RCON_PASSWORD',
  // type: FieldType.String,
  // example: 'password',
  // category: 'RCON',
  // },
  // {
  //   key: 'RCON_PORT',
  //   type: FieldType.Number,
  //   example: 25575,
  //   category: 'RCON',
  // },

  // Auto Pause
  {
    key: 'ENABLE_AUTOPAUSE',
    type: FieldType.Boolean,
    example: true,
    category: 'Auto Pause',
  },
  {
    key: 'AUTOPAUSE_TIMEOUT_EST',
    type: FieldType.Number,
    example: 3600,
    category: 'Auto Pause',
  },

  // Auto Stop
  // {
  //   key: 'ENABLE_AUTOSTOP',
  //   type: FieldType.Boolean,
  //   example: false,
  //   category: 'Auto Stop',
  // },
  // {
  //   key: 'AUTOSTOP_TIMEOUT_EST',
  //   type: FieldType.Number,
  //   example: 3600,
  //   category: 'Auto Stop',
  // },

  // CurseForge
  {
    key: 'CF_API_KEY',
    type: FieldType.String,
    example: 'key',
    category: 'CurseForge',
  },
  {
    key: 'CF_PAGE_URL',
    type: FieldType.String,
    example: 'https://www.curseforge.com/minecraft/modpacks/example',
    category: 'CurseForge',
  },
  {
    key: 'CF_SLUG',
    type: FieldType.String,
    example: 'modpack-slug',
    category: 'CurseForge',
  },
  {
    key: 'CF_FILE_ID',
    type: FieldType.Number,
    example: 12345,
    category: 'CurseForge',
  },

  // Modrinth
  {
    key: 'MODRINTH_MODPACK',
    type: FieldType.String,
    example: 'slug',
    category: 'Modrinth',
  },
  {
    key: 'MODRINTH_VERSION',
    type: FieldType.String,
    example: 'version',
    category: 'Modrinth',
  },
  {
    key: 'MODRINTH_LOADER',
    type: FieldType.Enum,
    example: 'fabric',
    options: ['forge', 'fabric', 'quilt'],
    category: 'Modrinth',
  },
  {
    key: 'MODRINTH_PROJECTS',
    type: FieldType.String,
    example: 'project1,project2',
    category: 'Modrinth',
  },
];

export const FIELD_TYPE_MAP: Record<string, FieldType> =
  FIELD_DEFINITIONS.reduce(
    (acc, field) => {
      acc[field.key] = field.type;
      return acc;
    },
    {} as Record<string, FieldType>,
  );

export const FIELDS_BY_CATEGORY: [string, FieldDefinition[]][] = Object.entries(
  FIELD_DEFINITIONS.reduce(
    (acc, field) => {
      const category = field.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(field);
      return acc;
    },
    {} as Record<string, FieldDefinition[]>,
  ),
);

export enum DirectoryType {
  File = 'file',
  Directory = 'directory',
}

export enum DirectoryFileType {
  Compressed = 'compressed',
  TextFile = 'textFile',
}

export type DirectoryFile = {
  name: string;
  format: DirectoryType.File;
  size: number;
  content?: string;

  fileType: DirectoryFileType;
};

export type DirectoryStructure = {
  //parent?: DirectoryStructure;
  children?: DirectoryStructure[];
  name: string;
  type: DirectoryType;
  file?: DirectoryFile;
};
