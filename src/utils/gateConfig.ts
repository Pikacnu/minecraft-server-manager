/**
 * Gate Proxy Configuration Type Definition
 * Based on gate-conf.yaml structure
 * Provides type-safe filtering and validation for configuration edits
 */

import { GateConfigSchema } from './schemas';
import { GATE_FIELD_DEFINITIONS } from './gateType';
import type {
  GateConfig,
  GateConfigCore,
  GateForwardingConfig,
  GateStatusConfig,
  GateCompressionConfig,
  GateQuotaConfig,
  GateQueryConfig,
  GateAuthConfig,
  GateLiteConfig,
  GateBedrockConfig,
  GateConnectConfig,
  GateApiConfig,
  GeysManagedConfig,
  GeyseConfigOverrides,
} from './schemas';

// Re-export all Gate config types from schemas
export type {
  GateConfig,
  GateConfigCore,
  GateForwardingConfig,
  GateStatusConfig,
  GateCompressionConfig,
  GateQuotaConfig,
  GateQueryConfig,
  GateAuthConfig,
  GateLiteConfig,
  GateBedrockConfig,
  GateConnectConfig,
  GateApiConfig,
  GeysManagedConfig,
  GeyseConfigOverrides,
};

/**
 * Read-only fields that cannot be modified through the UI
 * These are protected at both the UI and API level
 */
export const READONLY_GATE_PATHS = ['api', 'config.bind', 'config.forwarding'];

/**
 * Field filtering helper
 * Returns only the fields and values that match the YAML structure
 */
export function filterGateConfig(config: unknown): GateConfig {
  const result = GateConfigSchema.safeParse(config);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join('.') || '(root)';
    throw new Error(
      `Gate configuration validation failed at "${path}": ${firstIssue?.message}`,
    );
  }
  return result.data;
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
    description:
      'Kick existing player when online-mode player with same name joins',
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
  'config.bedrock.managed.configOverrides.bedrock.port': {
    type: 'number',
    label: 'Bedrock UDP Port',
    description: 'The UDP port Bedrock clients connect to',
    defaultValue: 19132,
  },
  'config.bedrock.managed.configOverrides.bedrock.motd1': {
    type: 'string',
    label: 'Bedrock MOTD Line 1',
    description: 'First line of the MOTD for Bedrock players',
  },
  'config.bedrock.managed.configOverrides.bedrock.motd2': {
    type: 'string',
    label: 'Bedrock MOTD Line 2',
    description: 'Second line of the MOTD for Bedrock players',
  },
  'config.bedrock.managed.configOverrides.bedrock.server-name': {
    type: 'string',
    label: 'Bedrock Server Name',
    description: 'The world name shown in the Bedrock pause screen',
  },
  'config.bedrock.managed.configOverrides.bedrock.compression-level': {
    type: 'number',
    label: 'Bedrock Compression Level',
    description: 'Compression level for Bedrock traffic (-1 to 9)',
    defaultValue: 6,
  },
  'config.bedrock.managed.configOverrides.debug-mode': {
    type: 'boolean',
    label: 'Geyser Debug Mode',
    description: 'Show debug messages in console',
    defaultValue: false,
  },
  'config.bedrock.managed.configOverrides.forward-player-ping': {
    type: 'boolean',
    label: 'Forward Player Ping',
    description: 'Forward player ping to Gate',
    defaultValue: true,
  },
  'config.bedrock.managed.configOverrides.show-cooldown': {
    type: 'select',
    label: 'Show Cooldown',
    description: 'Show block break cooldown as title or actionbar',
    defaultValue: 'title',
    options: [
      { label: 'Title', value: 'title' },
      { label: 'Actionbar', value: 'actionbar' },
      { label: 'False', value: 'false' },
    ],
  },
  'config.bedrock.managed.configOverrides.show-coordinates': {
    type: 'boolean',
    label: 'Show Coordinates',
    description: 'Show coordinates in debug info',
    defaultValue: true,
  },
  'config.bedrock.managed.configOverrides.allow-custom-skulls': {
    type: 'boolean',
    label: 'Allow Custom Skulls',
    description: 'Allow custom player skulls from Java Edition',
    defaultValue: true,
  },
  'config.bedrock.managed.configOverrides.max-visible-custom-skulls': {
    type: 'number',
    label: 'Max Visible Custom Skulls',
    description: 'Maximum visible custom skulls (performance)',
    defaultValue: 128,
  },
  'config.bedrock.managed.configOverrides.xbox-achievements-enabled': {
    type: 'boolean',
    label: 'Xbox Achievements',
    description: 'Enable Xbox achievements',
    defaultValue: false,
  },
  'config.bedrock.managed.configOverrides.add-non-bedrock-items': {
    type: 'boolean',
    label: 'Add Non-Bedrock Items',
    description: 'Add non-Bedrock items to Creative inventory',
    defaultValue: true,
  },
  'config.bedrock.managed.configOverrides.mtu': {
    type: 'number',
    label: 'MTU Size',
    description: 'MTU size for UDP packets',
    defaultValue: 1400,
  },
  'config.bedrock.managed.configOverrides.use-direct-connection': {
    type: 'boolean',
    label: 'Use Direct Connection',
    description: 'Use direct connections when possible',
    defaultValue: true,
  },
  'config.bedrock.managed.configOverrides.force-resource-packs': {
    type: 'boolean',
    label: 'Force Resource Packs',
    description: 'Force Resource packs to be applied',
    defaultValue: true,
  },
  'config.bedrock.managed.configOverrides.enable-proxy-connections': {
    type: 'boolean',
    label: 'Proxy Connections',
    description: 'Enable proxy connections',
    defaultValue: false,
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
  'config.bedrock.geyserListenAddr': {
    type: 'string',
    label: 'Geyser Listen Address',
    description:
      'TCP address where Gate listens for connections from Geyser Standalone',
    defaultValue: 'localhost:19132',
  },
  'config.bedrock.usernameFormat': {
    type: 'string',
    label: 'Username Format',
    description:
      'Bedrock player username format to avoid conflicts with Java players',
    defaultValue: '.%s',
  },
  'config.bedrock.floodgateKeyPath': {
    type: 'string',
    label: 'Floodgate Key Path',
    description: 'Path to the Floodgate encryption key file',
    defaultValue: 'floodgate.pem',
  },
  'config.bedrock.managed.jarUrl': {
    type: 'string',
    label: 'Geyser Jar URL',
    description: 'Download URL for Geyser Standalone JAR file',
  },
  'config.bedrock.managed.dataDir': {
    type: 'string',
    label: 'Geyser Data Directory',
    description: 'Directory for Geyser data',
    defaultValue: '.geyser',
  },
  'config.bedrock.managed.javaPath': {
    type: 'string',
    label: 'Java Path',
    description: 'Path to Java executable for running Geyser',
    defaultValue: 'java',
  },
};

/**
 * Get metadata for a field by path.
 * Checks static FIELD_METADATA first, then falls back to dynamic GATE_FIELD_DEFINITIONS.
 */
export function getFieldMetadata(path: string): FieldMetadata | undefined {
  if (FIELD_METADATA[path]) return FIELD_METADATA[path];

  // Fallback: derive metadata from auto-generated GATE_FIELD_DEFINITIONS
  const entry = GATE_FIELD_DEFINITIONS.find((f) => f.path === path);
  if (!entry) return undefined;

  const type: FieldMetadata['type'] = (() => {
    switch (entry.type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'array';
      default:
        return 'object';
    }
  })();

  return {
    type,
    label: path.split('.').pop(),
    description: entry.description || undefined,
    defaultValue: entry.defaultValue,
  };
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

function createFallbackObjectMetadata(
  key: string,
  childCount: number,
): FieldMetadata {
  return {
    type: 'object',
    label: key,
    description: `Container field with ${childCount} known configurable sub-field${childCount > 1 ? 's' : ''}`,
    defaultValue: {},
  };
}

/**
 * Return all field suggestions that can be added under a path.
 * Enumerates from both static FIELD_METADATA and dynamic GATE_FIELD_DEFINITIONS.
 */
export function getAvailableFieldSuggestions(path: string): FieldSuggestion[] {
  const normalizedPath = normalizeSuggestionPath(path);
  if (!normalizedPath) return [];

  const prefix = `${normalizedPath}.`;
  const childPaths = new Map<string, string[]>();

  const collectFrom = (keys: string[]) => {
    keys.forEach((fieldPath) => {
      if (!fieldPath.startsWith(prefix)) return;

      const remainder = fieldPath.slice(prefix.length);
      if (!remainder) return;

      const [childKey] = remainder.split('.');
      if (!childKey) return;

      const existing = childPaths.get(childKey) ?? [];
      existing.push(fieldPath);
      childPaths.set(childKey, existing);
    });
  };

  collectFrom(Object.keys(FIELD_METADATA));
  collectFrom(GATE_FIELD_DEFINITIONS.map((f) => f.path));

  const suggestions: FieldSuggestion[] = [];

  childPaths.forEach((paths, key) => {
    const directPath = `${normalizedPath}.${key}`;
    if (isReadOnlyField(directPath)) return;

    const metadata =
      getFieldMetadata(directPath) ??
      createFallbackObjectMetadata(key, paths.length);

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
