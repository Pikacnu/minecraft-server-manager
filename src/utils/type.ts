import { appsV1Api, coreV1Api } from './k8s';
import { getMinecraftVersions } from './minecraft';
import type {
  GeneralVariables,
  ServerVariables,
  ResourcePackVariables,
  WhitelistVariables,
  RconVariables,
  AutoPauseVariables,
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
  defaultValue?: any;
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
  // REMOVED: map_url and map_source_folder (replaced by docker image's WORLD environment variable)
  // Use WORLD and WORLD_INDEX from Server category instead

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
  {
    key: 'INIT_MEMORY',
    type: FieldType.String,
    example: '1G',
    category: 'General',
    description: 'JVM initial heap size',
  },
  {
    key: 'MAX_MEMORY',
    type: FieldType.String,
    example: '2G',
    category: 'General',
    description: 'JVM maximum heap size',
  },
  {
    key: 'ICON',
    type: FieldType.String,
    example: 'https://example.com/icon.png',
    category: 'General',
    description: 'Server icon URL or path',
  },
  {
    key: 'SERVER_PORT',
    type: FieldType.Number,
    example: 25565,
    category: 'General',
    description: 'Server port (default 25565)',
  },
  // COMMENTED: Handled by docker image internally
  // {
  //   key: 'STOP_SERVER_ANNOUNCE_DELAY',
  //   type: FieldType.Number,
  //   example: 60,
  //   category: 'General',
  //   description: 'Delay before shutdown (seconds)'
  // },
  {
    key: 'PROXY',
    type: FieldType.String,
    example: 'http://proxy.example.com:8080',
    category: 'General',
    description: 'HTTP/HTTPS proxy URL',
  },
  // COMMENTED: Docker container console setting - always enabled inside container
  // {
  //   key: 'CONSOLE',
  //   type: FieldType.Boolean,
  //   example: false,
  //   category: 'General',
  //   description: 'Enable console (TRUE/FALSE)'
  // },
  // COMMENTED: Not applicable in containerized environment (no GUI in docker)
  // {
  //   key: 'GUI',
  //   type: FieldType.Boolean,
  //   example: false,
  //   category: 'General',
  //   description: 'GUI interface setting'
  // },
  // COMMENTED: Handled by docker image's graceful shutdown mechanism
  // {
  //   key: 'STOP_DURATION',
  //   type: FieldType.Number,
  //   example: 60,
  //   category: 'General',
  //   description: 'Graceful shutdown timeout (seconds)'
  // },
  {
    key: 'SETUP_ONLY',
    type: FieldType.Boolean,
    example: false,
    category: 'General',
    description: 'Setup and stop before launching',
  },
  {
    key: 'USE_FLARE_FLAGS',
    type: FieldType.Boolean,
    example: false,
    category: 'General',
    description: 'Enable Flare profiling JVM flags',
  },
  {
    key: 'USE_SIMD_FLAGS',
    type: FieldType.Boolean,
    example: false,
    category: 'General',
    description: 'Enable SIMD optimization',
  },

  // Container Runtime
  {
    key: 'LOG_LEVEL',
    type: FieldType.Enum,
    example: 'info',
    options: ['trace', 'debug', 'info', 'warn', 'error'],
    category: 'Container Runtime',
    description: 'Log level',
  },
  {
    key: 'ENABLE_ROLLING_LOGS',
    type: FieldType.Boolean,
    example: true,
    category: 'Container Runtime',
    description: 'Enable log rotation',
  },
  {
    key: 'LOG_CONSOLE_FORMAT',
    type: FieldType.String,
    example: '[%d{HH:mm:ss}] [%t/%level]: %msg%n',
    category: 'Container Runtime',
    description: 'Log4j2 pattern for console',
  },
  {
    key: 'LOG_FILE_FORMAT',
    type: FieldType.String,
    example: '[%d{HH:mm:ss}] [%t/%level]: %msg%n',
    category: 'Container Runtime',
    description: 'Log4j2 pattern for file logs',
  },
  {
    key: 'LOG_TERMINAL_FORMAT',
    type: FieldType.String,
    example: '[%d{HH:mm:ss} %level]: %msg%n',
    category: 'Container Runtime',
    description: 'Log4j2 pattern for terminal',
  },
  {
    key: 'ROLLING_LOG_FILE_PATTERN',
    type: FieldType.String,
    example: 'logs/%d{yyyy-MM-dd}-%i.log.gz',
    category: 'Container Runtime',
    description: 'Rolled log file pattern',
  },
  {
    key: 'ROLLING_LOG_MAX_FILES',
    type: FieldType.Number,
    example: 1000,
    category: 'Container Runtime',
    description: 'Max archived log files',
  },
  {
    key: 'LOG_TIMESTAMP',
    type: FieldType.Boolean,
    example: false,
    category: 'Container Runtime',
    description: 'Include timestamp with logs',
  },

  // Server
  {
    key: 'DIFFICULTY',
    type: FieldType.Enum,
    example: 'normal',
    options: ['peaceful', 'easy', 'normal', 'hard'],
    category: 'Server',
    description: 'Difficulty level',
  },
  {
    key: 'MAX_PLAYERS',
    type: FieldType.Number,
    example: 20,
    category: 'Server',
    description: 'Max players allowed',
  },
  {
    key: 'PVP',
    type: FieldType.Boolean,
    example: true,
    category: 'Server',
    description: 'Enable PvP',
  },
  {
    key: 'LEVEL_TYPE',
    type: FieldType.String,
    example: 'DEFAULT',
    category: 'Server',
    description: 'World generator type',
  },
  {
    key: 'SERVER_NAME',
    type: FieldType.String,
    example: 'My Server',
    category: 'Deployment',
    description: 'Server display name',
  },
  {
    key: 'ADD_INTO_TRY_HOST',
    type: FieldType.Boolean,
    example: 'true',
    defaultValue: 'true',
    category: 'Deployment',
    description: 'Add this server into the fallback try list for Gate',
  },
  {
    key: 'VIEW_DISTANCE',
    type: FieldType.Number,
    example: 10,
    category: 'Server',
    description: 'Render distance in chunks',
  },
  {
    key: 'MODE',
    type: FieldType.Enum,
    example: 'survival',
    options: ['creative', 'survival', 'adventure', 'spectator'],
    category: 'Server',
    description: 'Game mode',
  },
  {
    key: 'ICON',
    type: FieldType.String,
    example: 'https://example.com/icon.png',
    category: 'Server',
    description: 'Server icon URL or path',
  },
  {
    key: 'OVERRIDE_ICON',
    type: FieldType.Boolean,
    example: false,
    category: 'Server',
    description: 'Force override existing icon',
  },
  {
    key: 'MAX_WORLD_SIZE',
    type: FieldType.Number,
    example: 29999984,
    category: 'Server',
    description: 'Maximum world size',
  },
  {
    key: 'ALLOW_NETHER',
    type: FieldType.Boolean,
    example: true,
    category: 'Server',
    description: 'Enable Nether dimension',
  },
  {
    key: 'ENABLE_COMMAND_BLOCK',
    type: FieldType.Boolean,
    example: true,
    defaultValue: true,
    category: 'Server',
    description: 'Enable command blocks',
  },
  {
    key: 'HARDCORE',
    type: FieldType.Boolean,
    example: false,
    defaultValue: false,
    category: 'Server',
    description: 'Hardcore mode',
  },
  {
    key: 'SPAWN_ANIMALS',
    type: FieldType.Boolean,
    example: true,
    defaultValue: true,
    category: 'Server',
    description: 'Spawn animals',
  },
  {
    key: 'SPAWN_MONSTERS',
    type: FieldType.Boolean,
    example: true,
    defaultValue: true,
    category: 'Server',
    description: 'Spawn mobs',
  },
  {
    key: 'SPAWN_NPCS',
    type: FieldType.Boolean,
    example: true,
    category: 'Server',
    description: 'Spawn villagers',
  },
  {
    key: 'GENERATE_STRUCTURES',
    type: FieldType.Boolean,
    example: true,
    category: 'Server',
    description: 'Generate villages and structures',
  },
  {
    key: 'SEED',
    type: FieldType.String,
    example: '123456789',
    category: 'Server',
    description: 'World seed',
  },
  {
    key: 'ALLOW_FLIGHT',
    type: FieldType.Boolean,
    example: false,
    category: 'Server',
    description: 'Allow flying in survival mode',
  },
  {
    key: 'MOTD',
    type: FieldType.String,
    example: 'A Minecraft Server',
    category: 'Server',
    description: 'Message of the day',
  },
  {
    key: 'LEVEL',
    type: FieldType.String,
    example: 'world',
    category: 'Server',
    description: 'World/level name',
  },
  {
    key: 'WORLD',
    type: FieldType.String,
    example: 'https://example.com/world.zip',
    category: 'Server',
    description: 'Downloadable world URL or local path',
  },
  {
    key: 'WORLD_INDEX',
    type: FieldType.Number,
    example: 1,
    category: 'Server',
    description: 'Select level.dat if archive has multiple',
  },
  {
    key: 'FORCE_WORLD_COPY',
    type: FieldType.Boolean,
    example: false,
    category: 'Server',
    description: 'Force overwrite world on every start',
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
    description: 'Enable whitelist',
  },
  {
    key: 'WHITELIST',
    type: FieldType.String,
    example: 'player1,player2',
    category: 'Whitelist',
    description: 'Comma-separated list of players',
  },
  {
    key: 'WHITELIST_FILE',
    type: FieldType.String,
    example: '/config/whitelist.json',
    category: 'Whitelist',
    description: 'Whitelist JSON file path',
  },
  {
    key: 'OVERRIDE_WHITELIST',
    type: FieldType.Boolean,
    example: false,
    category: 'Whitelist',
    description: 'Force regenerate whitelist',
  },

  // RCON
  {
    key: 'ENABLE_RCON',
    type: FieldType.Boolean,
    example: true,
    category: 'RCON',
    description: 'Enable remote console',
  },
  {
    key: 'RCON_PORT',
    type: FieldType.Number,
    example: 25575,
    category: 'RCON',
    description: 'RCON port',
  },
  {
    key: 'RCON_PASSWORD',
    type: FieldType.String,
    example: 'password',
    category: 'RCON',
    description: 'RCON password',
  },
  {
    key: 'BROADCAST_RCON_TO_OPS',
    type: FieldType.Boolean,
    example: false,
    category: 'RCON',
    description: 'Broadcast RCON to ops',
  },
  {
    key: 'RCON_CMDS_STARTUP',
    type: FieldType.String,
    example: 'say Server started',
    category: 'RCON',
    description: 'Commands at server start',
  },
  {
    key: 'RCON_CMDS_ON_CONNECT',
    type: FieldType.String,
    example: 'say Player joined',
    category: 'RCON',
    description: 'Commands on player join',
  },
  {
    key: 'RCON_CMDS_FIRST_CONNECT',
    type: FieldType.String,
    example: 'say First player joined',
    category: 'RCON',
    description: 'Commands on first player join',
  },
  {
    key: 'RCON_CMDS_ON_DISCONNECT',
    type: FieldType.String,
    example: 'say Player left',
    category: 'RCON',
    description: 'Commands on player leave',
  },
  {
    key: 'RCON_CMDS_LAST_DISCONNECT',
    type: FieldType.String,
    example: 'say Last player left',
    category: 'RCON',
    description: 'Commands on last player leave',
  },

  // Auto Pause
  {
    key: 'ENABLE_AUTOPAUSE',
    type: FieldType.Boolean,
    example: true,
    category: 'Auto Pause',
    description: 'Enable auto-pause',
  },
  {
    key: 'AUTOPAUSE_TIMEOUT_EST',
    type: FieldType.Number,
    example: 3600,
    category: 'Auto Pause',
    description: 'Timeout when empty (seconds)',
  },
  {
    key: 'AUTOPAUSE_TIMEOUT_INIT',
    type: FieldType.Number,
    example: 600,
    category: 'Auto Pause',
    description: 'Timeout before first player (seconds)',
  },
  {
    key: 'AUTOPAUSE_TIMEOUT_KN',
    type: FieldType.Number,
    example: 120,
    category: 'Auto Pause',
    description: 'Timeout keepalive (seconds)',
  },
  {
    key: 'AUTOPAUSE_PERIOD',
    type: FieldType.Number,
    example: 10,
    category: 'Auto Pause',
    description: 'State machine period (seconds)',
  },
  {
    key: 'AUTOPAUSE_KNOCK_INTERFACE',
    type: FieldType.String,
    example: 'eth0',
    category: 'Auto Pause',
    description: 'Network interface for knockd',
  },
  {
    key: 'DEBUG_AUTOPAUSE',
    type: FieldType.Boolean,
    example: false,
    category: 'Auto Pause',
    description: 'Enable autopause debug',
  },

  // Datapacks
  {
    key: 'DATAPACKS',
    type: FieldType.String,
    example: 'https://example.com/datapack.zip',
    category: 'Datapacks',
    description: 'Comma-separated datapack URLs or paths',
  },
  {
    key: 'DATAPACKS_FILE',
    type: FieldType.String,
    example: '/config/datapacks.txt',
    category: 'Datapacks',
    description: 'Text file with datapack URLs',
  },
  {
    key: 'REMOVE_OLD_DATAPACKS',
    type: FieldType.Boolean,
    example: false,
    category: 'Datapacks',
    description: 'Remove old datapacks',
  },
  {
    key: 'REMOVE_OLD_DATAPACKS_DEPTH',
    type: FieldType.Number,
    example: 16,
    category: 'Datapacks',
    description: 'Removal depth',
  },
  {
    key: 'REMOVE_OLD_DATAPACKS_INCLUDE',
    type: FieldType.String,
    example: '*.zip',
    category: 'Datapacks',
    description: 'Include pattern',
  },
  {
    key: 'REMOVE_OLD_DATAPACKS_EXCLUDE',
    type: FieldType.String,
    example: '',
    category: 'Datapacks',
    description: 'Exclude pattern',
  },

  // VanillaTweaks
  {
    key: 'VANILLATWEAKS_FILE',
    type: FieldType.String,
    example: '/config/vt.json',
    category: 'VanillaTweaks',
    description: 'VanillaTweaks JSON files',
  },
  {
    key: 'VANILLATWEAKS_SHARECODE',
    type: FieldType.String,
    example: 'MGr52E',
    category: 'VanillaTweaks',
    description: 'VanillaTweaks share codes',
  },

  // JVM Tuning
  {
    key: 'JVM_XX_OPTS',
    type: FieldType.String,
    example: '',
    category: 'JVM Tuning',
    description: 'XX JVM options',
  },
  {
    key: 'JVM_DD_OPTS',
    type: FieldType.String,
    example: '',
    category: 'JVM Tuning',
    description: 'Java system properties',
  },
  {
    key: 'USE_AIKAR_FLAGS',
    type: FieldType.Boolean,
    example: false,
    category: 'JVM Tuning',
    description: 'Enable Aikar GC tuning',
  },
  {
    key: 'USE_MEOWICE_FLAGS',
    type: FieldType.Boolean,
    example: false,
    category: 'JVM Tuning',
    description: 'Enable MeowIce flags (Java 17+)',
  },
  {
    key: 'USE_MEOWICE_GRAALVM_FLAGS',
    type: FieldType.Boolean,
    example: true,
    category: 'JVM Tuning',
    description: 'Enable MeowIce GraalVM flags',
  },
  {
    key: 'ENABLE_JMX',
    type: FieldType.Boolean,
    example: false,
    category: 'JVM Tuning',
    description: 'Enable remote JMX profiling',
  },
  {
    key: 'JMX_HOST',
    type: FieldType.String,
    example: '',
    category: 'JVM Tuning',
    description: 'JMX host IP/hostname',
  },
  {
    key: 'EXTRA_ARGS',
    type: FieldType.String,
    example: '',
    category: 'JVM Tuning',
    description: 'Extra arguments after jar',
  },

  // CurseForge
  {
    key: 'CF_API_KEY',
    type: FieldType.String,
    example: 'key',
    category: 'CurseForge',
    description: 'CurseForge API key',
  },
  {
    key: 'CF_API_KEY_FILE',
    type: FieldType.String,
    example: '/config/cf-api-key',
    category: 'CurseForge',
    description: 'Path to CurseForge API key file',
  },
  {
    key: 'CF_PAGE_URL',
    type: FieldType.String,
    example: 'https://www.curseforge.com/minecraft/modpacks/example',
    category: 'CurseForge',
    description: 'CurseForge modpack page URL',
  },
  {
    key: 'CF_SLUG',
    type: FieldType.String,
    example: 'modpack-slug',
    category: 'CurseForge',
    description: 'CurseForge modpack slug',
  },
  {
    key: 'CF_FILE_ID',
    type: FieldType.Number,
    example: 12345,
    category: 'CurseForge',
    description: 'CurseForge file ID',
  },
  {
    key: 'CF_FILENAME_MATCHER',
    type: FieldType.String,
    example: '',
    category: 'CurseForge',
    description: 'Substring to match filename',
  },
  {
    key: 'CF_EXCLUDE_INCLUDE_FILE',
    type: FieldType.String,
    example: '',
    category: 'CurseForge',
    description: 'JSON file for mod exclusions',
  },
  {
    key: 'CF_EXCLUDE_MODS',
    type: FieldType.String,
    example: 'mod-slug1,mod-slug2',
    category: 'CurseForge',
    description: 'Mods to exclude (slugs/IDs)',
  },
  {
    key: 'CF_FORCE_INCLUDE_MODS',
    type: FieldType.String,
    example: 'mod-slug1,mod-slug2',
    category: 'CurseForge',
    description: 'Mods to force include',
  },
  {
    key: 'CF_FORCE_SYNCHRONIZE',
    type: FieldType.Boolean,
    example: false,
    category: 'CurseForge',
    description: 'Force re-evaluate excludes',
  },
  {
    key: 'CF_SET_LEVEL_FROM',
    type: FieldType.Enum,
    example: 'WORLD_FILE',
    options: ['WORLD_FILE', 'OVERRIDES'],
    category: 'CurseForge',
    description: 'Set LEVEL from',
  },
  {
    key: 'CF_PARALLEL_DOWNLOADS',
    type: FieldType.Number,
    example: 4,
    category: 'CurseForge',
    description: 'Parallel mod downloads',
  },
  {
    key: 'CF_OVERRIDES_SKIP_EXISTING',
    type: FieldType.Boolean,
    example: false,
    category: 'CurseForge',
    description: 'Skip existing override files',
  },
  {
    key: 'CF_MOD_LOADER_VERSION',
    type: FieldType.String,
    example: '',
    category: 'CurseForge',
    description: 'Override mod loader version',
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
