import { z } from 'zod';

// ─── Minecraft Server Type ───────────────────────────────────────────────────
export const MinecraftServerTypeSchema = z.enum([
  'vanilla',
  'paper',
  'fabric',
  'forge',
]);
export type MinecraftServerType = z.infer<typeof MinecraftServerTypeSchema>;

// ─── Variables (Minecraft Docker image variables) ────────────────────────────

export const GeneralVariablesSchema = z.object({
  UID: z.union([z.string(), z.number()]).optional(),
  GID: z.union([z.string(), z.number()]).optional(),
  MEMORY: z.string().optional(),
  INIT_MEMORY: z.string().optional(),
  MAX_MEMORY: z.string().optional(),
  TZ: z.string().optional(),
  ENABLE_ROLLING_LOGS: z.union([z.boolean(), z.string()]).optional(),
  ENABLE_JMX: z.union([z.boolean(), z.string()]).optional(),
  JMX_HOST: z.string().optional(),
  USE_AIKAR_FLAGS: z.union([z.boolean(), z.string()]).optional(),
  USE_MEOWICE_FLAGS: z.union([z.boolean(), z.string()]).optional(),
  USE_MEOWICE_GRAALVM_FLAGS: z.union([z.boolean(), z.string()]).optional(),
  JVM_OPTS: z.string().optional(),
  JVM_XX_OPTS: z.string().optional(),
  JVM_DD_OPTS: z.string().optional(),
  EXTRA_ARGS: z.string().optional(),
  LOG_TIMESTAMP: z.union([z.boolean(), z.string()]).optional(),
  ADD_INTO_TRY_HOST: z.union([z.boolean(), z.string()]).optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).optional(),
  LOG_CONSOLE_FORMAT: z.string().optional(),
  LOG_FILE_FORMAT: z.string().optional(),
  LOG_TERMINAL_FORMAT: z.string().optional(),
  ROLLING_LOG_FILE_PATTERN: z.string().optional(),
  ROLLING_LOG_MAX_FILES: z.union([z.number(), z.string()]).optional(),
  SERVER_PORT: z.union([z.number(), z.string()]).optional(),
  ICON: z.string().optional(),
  SETUP_ONLY: z.union([z.boolean(), z.string()]).optional(),
  USE_FLARE_FLAGS: z.union([z.boolean(), z.string()]).optional(),
  USE_SIMD_FLAGS: z.union([z.boolean(), z.string()]).optional(),
  PROXY: z.union([z.string(), z.boolean()]).optional(),
});

export const ServerVariablesSchema = z.object({
  TYPE: z.string().optional(),
  EULA: z.union([z.boolean(), z.string()]).optional(),
  VERSION: z.string().optional(),
  MOTD: z.string().optional(),
  DIFFICULTY: z.string().optional(),
  ICON: z.string().optional(),
  OVERRIDE_ICON: z.union([z.boolean(), z.string()]).optional(),
  MAX_PLAYERS: z.union([z.number(), z.string()]).optional(),
  MAX_WORLD_SIZE: z.union([z.number(), z.string()]).optional(),
  ALLOW_NETHER: z.union([z.boolean(), z.string()]).optional(),
  ANNOUNCE_PLAYER_ACHIEVEMENTS: z.union([z.boolean(), z.string()]).optional(),
  ENABLE_COMMAND_BLOCK: z.union([z.boolean(), z.string()]).optional(),
  FORCE_GAMEMODE: z.union([z.boolean(), z.string()]).optional(),
  GENERATE_STRUCTURES: z.union([z.boolean(), z.string()]).optional(),
  HARDCORE: z.union([z.boolean(), z.string()]).optional(),
  SNOOPER_ENABLED: z.union([z.boolean(), z.string()]).optional(),
  MAX_BUILD_HEIGHT: z.union([z.number(), z.string()]).optional(),
  SPAWN_ANIMALS: z.union([z.boolean(), z.string()]).optional(),
  SPAWN_MONSTERS: z.union([z.boolean(), z.string()]).optional(),
  SPAWN_NPCS: z.union([z.boolean(), z.string()]).optional(),
  SPAWN_PROTECTION: z.union([z.number(), z.string()]).optional(),
  VIEW_DISTANCE: z.union([z.number(), z.string()]).optional(),
  SEED: z.string().optional(),
  MODE: z
    .union([
      z.enum(['creative', 'survival', 'adventure', 'spectator']),
      z.number(),
      z.string(),
    ])
    .optional(),
  PVP: z.union([z.boolean(), z.string()]).optional(),
  LEVEL_TYPE: z.string().optional(),
  GENERATOR_SETTINGS: z.string().optional(),
  LEVEL: z.string().optional(),
  ONLINE_MODE: z.union([z.boolean(), z.string()]).optional(),
  ALLOW_FLIGHT: z.union([z.boolean(), z.string()]).optional(),
  SERVER_NAME: z.string().optional(),
  SERVER_PORT: z.union([z.number(), z.string()]).optional(),
  PLAYER_IDLE_TIMEOUT: z.union([z.number(), z.string()]).optional(),
  SYNC_CHUNK_WRITES: z.union([z.boolean(), z.string()]).optional(),
  ENABLE_STATUS: z.union([z.boolean(), z.string()]).optional(),
  ENTITY_BROADCAST_RANGE_PERCENTAGE: z
    .union([z.number(), z.string()])
    .optional(),
  FUNCTION_PERMISSION_LEVEL: z.union([z.number(), z.string()]).optional(),
  NETWORK_COMPRESSION_THRESHOLD: z.union([z.number(), z.string()]).optional(),
  OP_PERMISSION_LEVEL: z.union([z.number(), z.string()]).optional(),
  PREVENT_PROXY_CONNECTIONS: z.union([z.boolean(), z.string()]).optional(),
  USE_NATIVE_TRANSPORT: z.union([z.boolean(), z.string()]).optional(),
  SIMULATION_DISTANCE: z.union([z.number(), z.string()]).optional(),
  EXEC_DIRECTLY: z.union([z.boolean(), z.string()]).optional(),
  STOP_SERVER_ANNOUNCE_DELAY: z.union([z.number(), z.string()]).optional(),
  CONSOLE: z.union([z.boolean(), z.string()]).optional(),
  GUI: z.union([z.boolean(), z.string()]).optional(),
  STOP_DURATION: z.union([z.number(), z.string()]).optional(),
});

export const ResourcePackVariablesSchema = z.object({
  RESOURCE_PACK: z.string().optional(),
  RESOURCE_PACK_SHA1: z.string().optional(),
  RESOURCE_PACK_ENFORCE: z.union([z.boolean(), z.string()]).optional(),
  RESOURCE_PACK_PROMPT: z.string().optional(),
  RESOURCE_PACK_ID: z.string().optional(),
});

export const WhitelistVariablesSchema = z.object({
  ENABLE_WHITELIST: z.union([z.boolean(), z.string()]).optional(),
  WHITELIST: z.string().optional(),
  WHITELIST_FILE: z.string().optional(),
  OVERRIDE_WHITELIST: z.union([z.boolean(), z.string()]).optional(),
});

export const RconVariablesSchema = z.object({
  ENABLE_RCON: z.union([z.boolean(), z.string()]).optional(),
  RCON_PASSWORD: z.string().optional(),
  RCON_PORT: z.union([z.number(), z.string()]).optional(),
  BROADCAST_RCON_TO_OPS: z.union([z.boolean(), z.string()]).optional(),
  RCON_CMDS_STARTUP: z.string().optional(),
  RCON_CMDS_ON_CONNECT: z.string().optional(),
  RCON_CMDS_FIRST_CONNECT: z.string().optional(),
  RCON_CMDS_ON_DISCONNECT: z.string().optional(),
  RCON_CMDS_LAST_DISCONNECT: z.string().optional(),
});

export const AutoPauseVariablesSchema = z.object({
  ENABLE_AUTOPAUSE: z.union([z.boolean(), z.string()]).optional(),
  AUTOPAUSE_TIMEOUT_EST: z.union([z.number(), z.string()]).optional(),
  AUTOPAUSE_TIMEOUT_INIT: z.union([z.number(), z.string()]).optional(),
  AUTOPAUSE_TIMEOUT_KN: z.union([z.number(), z.string()]).optional(),
  AUTOPAUSE_PERIOD: z.union([z.number(), z.string()]).optional(),
  AUTOPAUSE_KNOCK_INTERFACE: z.string().optional(),
  DEBUG_AUTOPAUSE: z.union([z.boolean(), z.string()]).optional(),
});

export const CurseForgeVariablesSchema = z.object({
  CF_API_KEY: z.string().optional(),
  CF_API_KEY_FILE: z.string().optional(),
  CF_PAGE_URL: z.string().optional(),
  CF_SLUG: z.string().optional(),
  CF_FILE_ID: z.union([z.string(), z.number()]).optional(),
  CF_FILENAME_MATCHER: z.string().optional(),
  CF_EXCLUDE_INCLUDE_FILE: z.string().optional(),
  CF_EXCLUDE_MODS: z.string().optional(),
  CF_FORCE_INCLUDE_MODS: z.string().optional(),
  CF_FORCE_SYNCHRONIZE: z.union([z.string(), z.boolean()]).optional(),
  CF_SET_LEVEL_FROM: z.enum(['WORLD_FILE', 'OVERRIDES']).optional(),
  CF_PARALLEL_DOWNLOADS: z.union([z.number(), z.string()]).optional(),
  CF_OVERRIDES_SKIP_EXISTING: z.union([z.boolean(), z.string()]).optional(),
  CF_MOD_LOADER_VERSION: z.string().optional(),
  CF_DOWNLOADS_REPO: z.string().optional(),
  CF_MODPACK_ZIP: z.string().optional(),
  CF_MODPACK_MANIFEST: z.string().optional(),
  CF_EXCLUDE_ALL_MODS: z.union([z.boolean(), z.string()]).optional(),
  CF_OVERRIDES_EXCLUSIONS: z.string().optional(),
  CF_IGNORE_MISSING_FILES: z.string().optional(),
  CF_FORCE_REINSTALL_MODLOADER: z.union([z.boolean(), z.string()]).optional(),
});

export const ModrinthVariablesSchema = z.object({
  MODRINTH_MODPACK: z.string().optional(),
  MODRINTH_VERSION: z.string().optional(),
  MODRINTH_MODPACK_VERSION_TYPE: z
    .union([z.enum(['release', 'beta', 'alpha']), z.string()])
    .optional(),
  MODRINTH_LOADER: z
    .union([z.enum(['forge', 'fabric', 'quilt']), z.string()])
    .optional(),
  MODRINTH_IGNORE_MISSING_FILES: z.string().optional(),
  MODRINTH_EXCLUDE_FILES: z.string().optional(),
  MODRINTH_FORCE_INCLUDE_FILES: z.string().optional(),
  MODRINTH_FORCE_SYNCHRONIZE: z.union([z.boolean(), z.string()]).optional(),
  MODRINTH_DEFAULT_EXCLUDE_INCLUDES: z.string().optional(),
  MODRINTH_OVERRIDES_EXCLUSIONS: z.string().optional(),
  MODRINTH_PROJECTS: z.string().optional(),
});

export const VariablesSchema = GeneralVariablesSchema.merge(
  ServerVariablesSchema,
)
  .merge(ResourcePackVariablesSchema)
  .merge(WhitelistVariablesSchema)
  .merge(RconVariablesSchema)
  .merge(AutoPauseVariablesSchema)
  .merge(CurseForgeVariablesSchema)
  .merge(ModrinthVariablesSchema);

export type Variables = z.infer<typeof VariablesSchema>;

// ─── Field Definitions ────────────────────────────────────────────────────────

export const FieldTypeSchema = z.enum(['string', 'number', 'boolean', 'enum']);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldDefinitionSchema = z.object({
  key: z.string(),
  type: FieldTypeSchema,
  example: z.any(),
  defaultValue: z.any().optional(),
  category: z.string(),
  options: z.array(z.string()).optional(),
  description: z.string().optional(),
  readonly: z.boolean().optional(),
});
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

// ─── Services Deployments ────────────────────────────────────────────────────

export const ServicesDeploymentsSchema = z.object({
  Services: z.array(z.any()).optional(),
  Deployments: z.array(z.any()).optional(),
  ConfigMaps: z.array(z.any()).optional(),
  Secrets: z.array(z.any()).optional(),
  PVs: z.array(z.any()).optional(),
  PVCs: z.array(z.any()).optional(),
  Namespace: z.array(z.any()).optional(),
});
export type ServicesDeployments = z.infer<typeof ServicesDeploymentsSchema>;

// ─── Minecraft Server Deployments Generator Arguments ────────────────────────

export const MinecraftServerDeploymentsGeneratorArgumentsSchema = z.object({
  memoryLimit: z.number().optional(),
  cpuLimit: z.number().optional(),
  type: MinecraftServerTypeSchema.optional(),
  version: z.string().optional(),
  domain: z.string().optional(),
  Variables: VariablesSchema.optional(),
});
export type MinecraftServerDeploymentsGeneratorArguments = z.infer<
  typeof MinecraftServerDeploymentsGeneratorArgumentsSchema
>;

// ─── Gate Configuration (Nested) ─────────────────────────────────────────────

export const GateStatusConfigSchema = z.object({
  motd: z.string().optional(),
  showMaxPlayers: z.number().optional(),
  favicon: z.string().optional(),
  logPingRequests: z.boolean().optional(),
  announceForge: z.boolean().optional(),
});

export const GateCompressionConfigSchema = z.object({
  threshold: z.number().optional(),
  level: z.number().optional(),
});

export const GateQuotaConnectionsSchema = z.object({
  enabled: z.boolean(),
  ops: z.number(),
  burst: z.number(),
  maxEntries: z.number(),
});

export const GateQuotaLoginsSchema = z.object({
  enabled: z.boolean(),
  burst: z.number(),
  ops: z.number(),
  maxEntries: z.number(),
});

export const GateQuotaConfigSchema = z.object({
  connections: GateQuotaConnectionsSchema.optional(),
  logins: GateQuotaLoginsSchema.optional(),
});

export const GateQueryConfigSchema = z.object({
  enabled: z.boolean(),
  port: z.number().optional(),
  showPlugins: z.boolean().optional(),
});

export const GateAuthConfigSchema = z.object({
  sessionServerUrl: z.string().optional(),
});

export const GateForwardingModeSchema = z.enum([
  'legacy',
  'none',
  'bungeeguard',
  'velocity',
]);

export const GateForwardingConfigSchema = z.object({
  mode: GateForwardingModeSchema,
  velocitySecret: z.string().optional(),
  bungeeGuardSecret: z.string().optional(),
});

export const GateLiteConfigSchema = z.object({
  enabled: z.boolean(),
  routes: z.array(z.any()).optional(),
});

export const GeyseBedrockSchema = z.object({
  port: z.number().optional(),
  motd1: z.string().optional(),
  motd2: z.string().optional(),
  'server-name': z.string().optional(),
  'compression-level': z.number().optional(),
});

export const GeyseConfigOverridesSchema = z
  .object({
    bedrock: GeyseBedrockSchema.optional(),
    'debug-mode': z.boolean().optional(),
    'forward-player-ping': z.boolean().optional(),
    'show-cooldown': z.string().optional(),
    'show-coordinates': z.boolean().optional(),
    'allow-custom-skulls': z.boolean().optional(),
    'max-visible-custom-skulls': z.number().optional(),
    'xbox-achievements-enabled': z.boolean().optional(),
    'add-non-bedrock-items': z.boolean().optional(),
    mtu: z.number().optional(),
    'use-direct-connection': z.boolean().optional(),
    'force-resource-packs': z.boolean().optional(),
    'enable-proxy-connections': z.boolean().optional(),
    'floodgate-key-file': z.string().optional(),
    'command-suggestions': z.boolean().optional(),
    'passthrough-motd': z.boolean().optional(),
    'passthrough-protocol-name': z.boolean().optional(),
    'passthrough-player-counts': z.boolean().optional(),
    'legacy-ping-passthrough': z.boolean().optional(),
    'ping-passthrough-interval': z.number().optional(),
    'max-players': z.number().optional(),
    'allow-third-party-capes': z.boolean().optional(),
    'allow-third-party-ears': z.boolean().optional(),
    'emote-offhand-workaround': z.string().optional(),
    'default-locale': z.string().optional(),
    'cache-chunks': z.boolean().optional(),
    'cache-images': z.number().optional(),
    'above-bedrock-nether-building': z.boolean().optional(),
    'scoreboard-packet-threshold': z.number().optional(),
  })
  .catchall(z.any());

export const GeysManagedConfigSchema = z.object({
  enabled: z.boolean(),
  jarUrl: z.string().optional(),
  dataDir: z.string().optional(),
  javaPath: z.string().optional(),
  autoUpdate: z.boolean().optional(),
  extraArgs: z.array(z.string()).optional(),
  configOverrides: GeyseConfigOverridesSchema.optional(),
});

export const GateBedrockConfigSchema = z.object({
  enabled: z.boolean(),
  geyserListenAddr: z.string().optional(),
  usernameFormat: z.string().optional(),
  floodgateKeyPath: z.string().optional(),
  managed: GeysManagedConfigSchema.optional(),
});

export const GateConnectConfigSchema = z.object({
  enabled: z.boolean(),
  name: z.string().optional(),
  allowOfflineModePlayers: z.boolean().optional(),
});

export const GateApiConfigSchema = z
  .object({
    enabled: z.boolean(),
    bind: z.string(),
  })
  .catchall(z.any());

export const GateConfigCoreSchema = z
  .object({
    // Required fields
    bind: z.string(),
    onlineMode: z.boolean(),
    servers: z.record(z.string(), z.string()),
    try: z.array(z.string()),
    shutdownReason: z.string(),
    forwarding: GateForwardingConfigSchema,
    forcedHosts: z.record(z.string(), z.array(z.string())),

    // Optional fields
    status: GateStatusConfigSchema.optional(),
    acceptTransfers: z.boolean().optional(),
    bungeePluginChannelEnabled: z.boolean().optional(),
    builtinCommands: z.boolean().optional(),
    requireBuiltinCommandPermissions: z.boolean().optional(),
    announceProxyCommands: z.boolean().optional(),
    forceKeyAuthentication: z.boolean().optional(),
    compression: GateCompressionConfigSchema.optional(),
    connectionTimeout: z.string().optional(),
    readTimeout: z.string().optional(),
    failoverOnUnexpectedServerDisconnect: z.boolean().optional(),
    onlineModeKickExistingPlayers: z.boolean().optional(),
    debug: z.boolean().optional(),
    proxyProtocol: z.boolean().optional(),
    quota: GateQuotaConfigSchema.optional(),
    query: GateQueryConfigSchema.optional(),
    auth: GateAuthConfigSchema.optional(),
    lite: GateLiteConfigSchema.optional(),
    bedrock: GateBedrockConfigSchema.optional(),
  })
  .catchall(z.any());

export const GateConfigSchema = z
  .object({
    config: GateConfigCoreSchema,
    connect: GateConnectConfigSchema.optional(),
    api: GateApiConfigSchema,
  })
  .catchall(z.any());

export type GateConfigCore = z.infer<typeof GateConfigCoreSchema>;
export type GateConfig = z.infer<typeof GateConfigSchema>;
export type GateForwardingConfig = z.infer<typeof GateForwardingConfigSchema>;
export type GateStatusConfig = z.infer<typeof GateStatusConfigSchema>;
export type GateCompressionConfig = z.infer<typeof GateCompressionConfigSchema>;
export type GateQuotaConfig = z.infer<typeof GateQuotaConfigSchema>;
export type GateQueryConfig = z.infer<typeof GateQueryConfigSchema>;
export type GateAuthConfig = z.infer<typeof GateAuthConfigSchema>;
export type GateLiteConfig = z.infer<typeof GateLiteConfigSchema>;
export type GateBedrockConfig = z.infer<typeof GateBedrockConfigSchema>;
export type GateConnectConfig = z.infer<typeof GateConnectConfigSchema>;
export type GateApiConfig = z.infer<typeof GateApiConfigSchema>;
export type GeysManagedConfig = z.infer<typeof GeysManagedConfigSchema>;
export type GeyseConfigOverrides = z.infer<typeof GeyseConfigOverridesSchema>;

// ─── Server Info ─────────────────────────────────────────────────────────────

export const ServerInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  domain: z.string().optional(),
  address: z.string(),
  playersOnline: z.number(),
});
export type ServerInfo = z.infer<typeof ServerInfoSchema>;

// ─── Server Status Enum ──────────────────────────────────────────────────────

export const ServerStatusEnumSchema = z.enum([
  'running',
  'restarting',
  'terminating',
  'unknown',
]);
export type ServerStatusEnum = z.infer<typeof ServerStatusEnumSchema>;

// ─── Directory Types ─────────────────────────────────────────────────────────

export const DirectoryTypeSchema = z.enum(['file', 'directory']);
export type DirectoryType = z.infer<typeof DirectoryTypeSchema>;

export const DirectoryFileTypeSchema = z.enum(['compressed', 'textFile']);
export type DirectoryFileType = z.infer<typeof DirectoryFileTypeSchema>;

export const DirectoryFileSchema = z.object({
  name: z.string(),
  format: z.literal('file'),
  size: z.number(),
  content: z.string().optional(),
  fileType: DirectoryFileTypeSchema,
});

export const DirectoryStructureSchema: z.ZodType<DirectoryStructure> = z.lazy(
  () =>
    z.object({
      children: z.array(DirectoryStructureSchema).optional(),
      name: z.string(),
      type: DirectoryTypeSchema,
      file: DirectoryFileSchema.optional(),
    }),
);
export type DirectoryStructure = {
  children?: DirectoryStructure[];
  name: string;
  type: DirectoryType;
  file?: {
    name: string;
    format: 'file';
    size: number;
    content?: string;
    fileType: DirectoryFileType;
  };
};

// ─── System Settings (from API) ──────────────────────────────────────────────

export const SystemSettingsSchema = z.object({
  readOnly: z.object({
    namespace: z.string(),
    appName: z.string(),
    nfsServer: z.string(),
    nfsRootPath: z.string(),
    isDevelopment: z.boolean(),
  }),
  sensitive: z.object({
    velocitySecret: z.string(),
    rconPassword: z.string(),
    cloudflareApiToken: z.string(),
  }),
  network: z.object({
    domainName: z.string(),
    proxyIp: z.string(),
    srvPort: z.number(),
    zoneId: z.string(),
    wildcardDomainPrefix: z.string(),
    isWildcardDomain: z.boolean(),
  }),
});
export type SystemSettings = z.infer<typeof SystemSettingsSchema>;

// ─── UIPreferences ───────────────────────────────────────────────────────────

export const ThemeModeSchema = z.enum(['light', 'dark', 'auto']);

export const NotificationPositionSchema = z.enum([
  'top-center',
  'top-right',
  'top-left',
  'bottom-center',
  'bottom-right',
  'bottom-left',
]);

export const UIPreferencesSchema = z.object({
  theme: ThemeModeSchema,
  notificationDuration: z.number(),
  notificationPosition: NotificationPositionSchema,
  autoRefreshInterval: z.number(),
  compactMode: z.boolean(),
});
export type UIPreferences = z.infer<typeof UIPreferencesSchema>;

// ─── Instance Scanner ────────────────────────────────────────────────────────

export const InstanceInfoSchema = z.object({
  name: z.string(),
  managed: z.boolean(),
  hasServerProperties: z.boolean(),
  hasServerConf: z.boolean(),
  modsCount: z.number(),
  serverProperties: z.record(z.string(), z.string()).nullable(),
});
export type InstanceInfo = z.infer<typeof InstanceInfoSchema>;

// ─── Gate Status (from API) ──────────────────────────────────────────────────

export const GateStatusConditionSchema = z.object({
  type: z.string(),
  status: z.string(),
  message: z.string().optional(),
});

export const GateStatusSchema = z.object({
  replicas: z.number(),
  availableReplicas: z.number(),
  readyReplicas: z.number(),
  conditions: z.array(GateStatusConditionSchema),
});
export type GateStatus = z.infer<typeof GateStatusSchema>;

// ─── Server Management Actions ───────────────────────────────────────────────

export const ServerActionSchema = z.enum(['restart', 'stop', 'delete']);

export const ServerManageRequestSchema = z.object({
  action: ServerActionSchema,
  serverName: z.string(),
});
export type ServerManageRequest = z.infer<typeof ServerManageRequestSchema>;

// ─── Server Logs Query ───────────────────────────────────────────────────────

export const ServerLogsQuerySchema = z.object({
  serverName: z.string(),
  lines: z.number().min(1).max(1000).default(120),
});

// ─── Instance Scanner Actions ────────────────────────────────────────────────

export const InstanceScannerDeleteSchema = z.object({
  action: z.literal('delete'),
  name: z.string(),
});

export const InstanceScannerCreateServerSchema = z.object({
  action: z.literal('create-server'),
  name: z.string(),
  defaults: z.record(z.string(), z.any()).optional(),
});

export const InstanceScannerActionSchema = z.discriminatedUnion('action', [
  InstanceScannerDeleteSchema,
  InstanceScannerCreateServerSchema,
]);

// ─── Server Instance POST create body ────────────────────────────────────────

export const CreateServerRequestSchema = z.object({
  SERVER_NAME: z.string().optional(),
  version: z.string(),
  type: MinecraftServerTypeSchema,
  memoryLimit: z.number(),
  cpuLimit: z.number().optional(),
  domain: z.string().optional(),
  serverSettingId: z.string().optional(),
});
export type CreateServerRequest = z.infer<typeof CreateServerRequestSchema>;

// ─── Server Instance PATCH body ──────────────────────────────────────────────

export const PatchServerRequestSchema = z.object({
  serverName: z.string(),
  variables: VariablesSchema.partial(),
});

// ─── Server Instance DELETE body ─────────────────────────────────────────────

export const DeleteServerRequestSchema = z.object({
  serverName: z.string(),
});

// ─── API Response wrappers ───────────────────────────────────────────────────

export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
) =>
  z.object({
    status: z.literal('ok'),
    data: dataSchema.optional(),
    message: z.string().optional(),
  });

export const ApiErrorResponseSchema = z.object({
  status: z.literal('error'),
  message: z.string(),
});
