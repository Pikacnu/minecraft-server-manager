/**
 * Gate Proxy Configuration Type Definition
 * Based on gate-conf.yaml structure
 * Provides type-safe filtering and validation for configuration edits
 */

// Bedrock Geyser Configuration
export interface GeyseBedrock {
  port: number;
  motd1: string;
  motd2: string;
  'server-name': string;
  'compression-level': number;
}

export interface GeyseConfigOverrides {
  bedrock?: GeyseBedrock;
  'debug-mode'?: boolean;
  'forward-player-ping'?: boolean;
  'show-cooldown'?: string;
  'show-coordinates'?: boolean;
  'allow-custom-skulls'?: boolean;
  'max-visible-custom-skulls'?: number;
  'xbox-achievements-enabled'?: boolean;
  'add-non-bedrock-items'?: boolean;
  mtu?: number;
  'use-direct-connection'?: boolean;
  'force-resource-packs'?: boolean;
  'enable-proxy-connections'?: boolean;
  [key: string]: any;
}

export interface GeysManagedConfig {
  enabled: boolean;
  jarUrl?: string;
  dataDir?: string;
  javaPath?: string;
  autoUpdate?: boolean;
  extraArgs?: string[];
  configOverrides?: GeyseConfigOverrides;
}

export interface GateBedrockConfig {
  enabled: boolean;
  geyserListenAddr?: string;
  usernameFormat?: string;
  floodgateKeyPath?: string;
  managed?: GeysManagedConfig;
}

// Status Configuration
export interface GateStatusConfig {
  motd?: string;
  showMaxPlayers?: number;
  favicon?: string;
  logPingRequests?: boolean;
  announceForge?: boolean;
}

// Compression Configuration
export interface GateCompressionConfig {
  threshold?: number;
  level?: number;
}

// Quota Configuration
export interface GateQuotaConnections {
  enabled: boolean;
  ops: number;
  burst: number;
  maxEntries: number;
}

export interface GateQuotaLogins {
  enabled: boolean;
  burst: number;
  ops: number;
  maxEntries: number;
}

export interface GateQuotaConfig {
  connections?: GateQuotaConnections;
  logins?: GateQuotaLogins;
}

// Query Configuration
export interface GateQueryConfig {
  enabled: boolean;
  port?: number;
  showPlugins?: boolean;
}

// Auth Configuration
export interface GateAuthConfig {
  sessionServerUrl?: string;
}

// Forwarding Configuration
export interface GateForwardingConfig {
  mode: 'legacy' | 'none' | 'bungeeguard' | 'velocity';
  velocitySecret?: string;
  bungeeGuardSecret?: string;
}

// Lite Configuration
export interface GateLiteConfig {
  enabled: boolean;
  routes?: Array<any>;
}

// Connect Configuration
export interface GateConnectConfig {
  enabled: boolean;
  name?: string;
  allowOfflineModePlayers?: boolean;
}

// API Configuration
export interface GateApiConfig {
  enabled: boolean;
  bind: string;
  [key: string]: any;
}

// Main Config Structure
export interface GateConfigCore {
  // Required fields
  bind: string;
  onlineMode: boolean;
  servers: Record<string, string>;
  try: string[];
  shutdownReason: string;
  forwarding: GateForwardingConfig;
  forcedHosts: Record<string, string[]>;

  // Optional fields
  status?: GateStatusConfig;
  acceptTransfers?: boolean;
  bungeePluginChannelEnabled?: boolean;
  builtinCommands?: boolean;
  requireBuiltinCommandPermissions?: boolean;
  announceProxyCommands?: boolean;
  forceKeyAuthentication?: boolean;
  compression?: GateCompressionConfig;
  connectionTimeout?: string;
  readTimeout?: string;
  failoverOnUnexpectedServerDisconnect?: boolean;
  onlineModeKickExistingPlayers?: boolean;
  debug?: boolean;
  proxyProtocol?: boolean;
  quota?: GateQuotaConfig;
  query?: GateQueryConfig;
  auth?: GateAuthConfig;
  lite?: GateLiteConfig;
  bedrock?: GateBedrockConfig;

  [key: string]: any;
}

export interface GateConfig {
  config: GateConfigCore;
  connect?: GateConnectConfig;
  api: GateApiConfig;
  [key: string]: any;
}

/**
 * Read-only fields that cannot be modified through the UI
 * These are protected at both the UI and API level
 */
export const READONLY_GATE_PATHS = ['api', 'config.bind', 'config.forwarding'];

/**
 * Field filtering helper
 * Returns only the fields and values that match the YAML structure
 */
export function filterGateConfig(config: any): GateConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid Gate configuration: must be an object');
  }

  // Validate required top-level keys
  if (!config.config || typeof config.config !== 'object') {
    throw new Error('Gate configuration must have a "config" object');
  }

  if (!config.api || typeof config.api !== 'object') {
    throw new Error('Gate configuration must have an "api" object');
  }

  // Validate required config fields
  const gateConfig = config.config as any;
  const requiredFields = [
    'bind',
    'onlineMode',
    'servers',
    'try',
    'shutdownReason',
    'forwarding',
    'forcedHosts',
  ];

  for (const field of requiredFields) {
    if (!(field in gateConfig)) {
      throw new Error(`Gate config missing required field: ${field}`);
    }
  }

  // Validate field types
  if (typeof gateConfig.bind !== 'string') {
    throw new Error('config.bind must be a string');
  }

  if (typeof gateConfig.onlineMode !== 'boolean') {
    throw new Error('config.onlineMode must be a boolean');
  }

  if (
    typeof gateConfig.servers !== 'object' ||
    Array.isArray(gateConfig.servers)
  ) {
    throw new Error('config.servers must be an object (key-value pairs)');
  }

  if (!Array.isArray(gateConfig.try)) {
    throw new Error('config.try must be an array');
  }

  if (typeof gateConfig.shutdownReason !== 'string') {
    throw new Error('config.shutdownReason must be a string');
  }

  if (
    typeof gateConfig.forwarding !== 'object' ||
    Array.isArray(gateConfig.forwarding)
  ) {
    throw new Error('config.forwarding must be an object');
  }

  if (
    typeof gateConfig.forcedHosts !== 'object' ||
    Array.isArray(gateConfig.forcedHosts)
  ) {
    throw new Error('config.forcedHosts must be an object');
  }

  // Validate API fields
  const apiConfig = config.api as any;
  if (typeof apiConfig.enabled !== 'boolean') {
    throw new Error('api.enabled must be a boolean');
  }

  if (typeof apiConfig.bind !== 'string') {
    throw new Error('api.bind must be a string (host:port format)');
  }

  return config as GateConfig;
}

/**
 * Validate field against readonly paths
 */
export function isReadOnlyField(path: string): boolean {
  return READONLY_GATE_PATHS.some(
    (readonlyPath) =>
      path === readonlyPath || path.startsWith(readonlyPath + '.'),
  );
}

/**
 * Deep equality check for Gate config
 */
export function isGateConfigEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Extract path value from Gate config
 */
export function getGateConfigValue(config: GateConfig, path: string): any {
  const parts = path.split('.');
  let current = config as any;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Set value in Gate config by path
 * Returns a new config object without mutating the original
 */
export function setGateConfigValue(
  config: GateConfig,
  path: string,
  value: any,
): GateConfig {
  if (isReadOnlyField(path)) {
    throw new Error(`Cannot modify read-only field: ${path}`);
  }

  const parts = path.split('.');
  const newConfig = JSON.parse(JSON.stringify(config));
  let current = newConfig as any;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]!] = value;
  return newConfig as GateConfig;
}

/**
 * Field metadata for UI rendering
 * Defines options, defaults, and UI hints for configuration fields
 */
export interface FieldMetadata {
  type: 'string' | 'number' | 'boolean' | 'select' | 'object' | 'array';
  label?: string;
  description?: string;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  placeholder?: string;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface FieldSuggestion {
  key: string;
  path: string;
  metadata: FieldMetadata;
}

/**
 * Field option constants for select fields
 */
export const FORWARDING_MODE_OPTIONS = [
  { label: 'Legacy', value: 'legacy' },
  { label: 'None', value: 'none' },
  { label: 'BungeeGuard', value: 'bungeeguard' },
  { label: 'Velocity', value: 'velocity' },
];

export const SHOW_COOLDOWN_OPTIONS = [
  { label: 'Title', value: 'title' },
  { label: 'ActionBar', value: 'actionbar' },
  { label: 'Disabled', value: false },
];

/**
 * Metadata for commonly edited fields
 * Maps field path to UI metadata
 */
export const FIELD_METADATA: Record<string, FieldMetadata> = {
  'config.onlineMode': {
    type: 'boolean',
    label: 'Online Mode',
    description: 'Authenticate players with Mojang API',
    defaultValue: true,
  },
  'config.forwarding.mode': {
    type: 'select',
    label: 'Forwarding Mode',
    description: 'How to forward player information to backend servers',
    defaultValue: 'legacy',
    options: FORWARDING_MODE_OPTIONS,
  },
  'config.status.showMaxPlayers': {
    type: 'number',
    label: 'Max Players Display',
    description: 'Maximum players shown in server list (not the actual limit)',
    defaultValue: 1000,
    min: 0,
  },
  'config.status.logPingRequests': {
    type: 'boolean',
    label: 'Log Ping Requests',
    description: 'Log server list ping requests to console',
    defaultValue: false,
  },
  'config.status.announceForge': {
    type: 'boolean',
    label: 'Announce Forge',
    description: 'Present as Forge/FML-compatible server',
    defaultValue: false,
  },
  'config.acceptTransfers': {
    type: 'boolean',
    label: 'Accept Transfers',
    description:
      'Allow players transferred from other hosts via Transfer packet (1.20.5+)',
    defaultValue: false,
  },
  'config.bungeePluginChannelEnabled': {
    type: 'boolean',
    label: 'BungeePluginChannel',
    description:
      'Support bungee plugin channels (disable if backend servers are untrusted)',
    defaultValue: true,
  },
  'config.builtinCommands': {
    type: 'boolean',
    label: 'Builtin Commands',
    description: 'Register builtin commands on proxy start',
    defaultValue: true,
  },
  'config.requireBuiltinCommandPermissions': {
    type: 'boolean',
    label: 'Require Command Permissions',
    description: 'Players need permissions to execute builtin proxy commands',
    defaultValue: false,
  },
  'config.announceProxyCommands': {
    type: 'boolean',
    label: 'Announce Proxy Commands',
    description: 'Declare proxy commands to 1.13+ clients',
    defaultValue: true,
  },
  'config.forceKeyAuthentication': {
    type: 'boolean',
    label: 'Force Key Authentication',
    description: 'Enforce public key security standard (Minecraft 1.19+)',
    defaultValue: true,
  },
  'config.compression.threshold': {
    type: 'number',
    label: 'Compression Threshold',
    description: 'Minimum packet size (bytes) before compression',
    defaultValue: 256,
    min: 0,
  },
  'config.compression.level': {
    type: 'number',
    label: 'Compression Level',
    description: 'Zlib compression level (-1 to 9, -1 is default)',
    defaultValue: -1,
    min: -1,
    max: 9,
  },
  'config.connectionTimeout': {
    type: 'string',
    label: 'Connection Timeout',
    description: 'Time to wait for server connection (e.g., 5s)',
    defaultValue: '5s',
    placeholder: '5s',
  },
  'config.readTimeout': {
    type: 'string',
    label: 'Read Timeout',
    description: 'Time to wait for data from server (e.g., 30s)',
    defaultValue: '30s',
    placeholder: '30s',
  },
  'config.failoverOnUnexpectedServerDisconnect': {
    type: 'boolean',
    label: 'Failover on Disconnect',
    description: 'Reconnect player when unexpectedly disconnected from server',
    defaultValue: true,
  },
  'config.onlineModeKickExistingPlayers': {
    type: 'boolean',
    label: 'Kick Existing Online Players',
    description: 'Kick existing player when online-mode player with same name joins',
    defaultValue: false,
  },
  'config.debug': {
    type: 'boolean',
    label: 'Debug Mode',
    description: 'Enable extra debug logging',
    defaultValue: false,
  },
  'config.proxyProtocol': {
    type: 'boolean',
    label: 'Proxy Protocol',
    description: 'Support HA-Proxy protocol for player connections',
    defaultValue: false,
  },
  'config.query.enabled': {
    type: 'boolean',
    label: 'Query Enabled',
    description: 'Enable GameSpy 4 query protocol (UDP)',
    defaultValue: false,
  },
  'config.query.port': {
    type: 'number',
    label: 'Query Port',
    description: 'UDP port for query protocol',
    defaultValue: 25577,
    min: 1,
    max: 65535,
  },
  'config.query.showPlugins': {
    type: 'boolean',
    label: 'Show Plugins in Query',
    description: 'Show plugin list in query response',
    defaultValue: false,
  },
  'config.bedrock.enabled': {
    type: 'boolean',
    label: 'Bedrock Support',
    description: 'Enable Bedrock Edition cross-play support',
    defaultValue: false,
  },
  'config.bedrock.managed.enabled': {
    type: 'boolean',
    label: 'Managed Geyser',
    description: 'Let Gate automatically manage Geyser Standalone',
    defaultValue: false,
  },
  'config.bedrock.managed.autoUpdate': {
    type: 'boolean',
    label: 'Auto Update Geyser',
    description: 'Automatically download Geyser JAR updates',
    defaultValue: true,
  },
  'connect.enabled': {
    type: 'boolean',
    label: 'Connect Service',
    description: 'Register this proxy to Minekube Connect network',
    defaultValue: false,
  },
  'connect.allowOfflineModePlayers': {
    type: 'boolean',
    label: 'Allow Offline Mode',
    description: 'Allow offline mode players to join via Connect',
    defaultValue: true,
  },
  'api.enabled': {
    type: 'boolean',
    label: 'API Enabled',
    description: 'Enable HTTP API for Gate',
    defaultValue: false,
  },
};

/**
 * Get metadata for a field by path
 */
export function getFieldMetadata(path: string): FieldMetadata | undefined {
  return FIELD_METADATA[path];
}

/**
 * Get options for a select field
 */
export function getFieldOptions(
  path: string,
): { label: string; value: any }[] | undefined {
  const metadata = getFieldMetadata(path);
  return metadata?.options;
}

/**
 * Get default value for a field
 */
export function getFieldDefault(path: string): any {
  const metadata = getFieldMetadata(path);
  return metadata?.defaultValue;
}

/**
 * Check if a field should be rendered as a specific type
 */
export function getFieldType(path: string): string {
  const metadata = getFieldMetadata(path);
  return metadata?.type || 'string';
}

function normalizeSuggestionPath(path: string): string {
  return path.replace(/\.+$/g, '').trim();
}

function createFallbackObjectMetadata(key: string, childCount: number): FieldMetadata {
  return {
    type: 'object',
    label: key,
    description: `Container field with ${childCount} known configurable sub-field${childCount > 1 ? 's' : ''}`,
    defaultValue: {},
  };
}

/**
 * Return all field suggestions that can be added under a path.
 * Suggestions are inferred from FIELD_METADATA descendants and grouped by direct child key.
 */
export function getAvailableFieldSuggestions(path: string): FieldSuggestion[] {
  const normalizedPath = normalizeSuggestionPath(path);
  if (!normalizedPath) return [];

  const prefix = `${normalizedPath}.`;
  const childPaths = new Map<string, string[]>();

  Object.keys(FIELD_METADATA).forEach((fieldPath) => {
    if (!fieldPath.startsWith(prefix)) return;

    const remainder = fieldPath.slice(prefix.length);
    if (!remainder) return;

    const [childKey] = remainder.split('.');
    if (!childKey) return;

    const existing = childPaths.get(childKey) ?? [];
    existing.push(fieldPath);
    childPaths.set(childKey, existing);
  });

  const suggestions: FieldSuggestion[] = [];

  childPaths.forEach((paths, key) => {
    const directPath = `${normalizedPath}.${key}`;
    if (isReadOnlyField(directPath)) return;

    const metadata =
      FIELD_METADATA[directPath] ?? createFallbackObjectMetadata(key, paths.length);

    suggestions.push({
      key,
      path: directPath,
      metadata,
    });
  });

  return suggestions.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Return only field names for autocomplete under a path.
 */
export function getFieldNameSuggestions(path: string): string[] {
  return getAvailableFieldSuggestions(path).map((item) => item.key);
}
