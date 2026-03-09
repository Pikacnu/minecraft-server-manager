// Variables collected from https://docker-minecraft-server.readthedocs.io/en/latest/variables/
// Note: The upstream page warns these may be out-of-date; we keep types permissive.
export type GeneralVariables = Partial<{
  UID: string | number;
  GID: string | number;
  MEMORY: string;
  INIT_MEMORY: string;
  MAX_MEMORY: string;
  TZ: string;
  ENABLE_ROLLING_LOGS: boolean | string;
  ENABLE_JMX: boolean | string;
  JMX_HOST: string;
  USE_AIKAR_FLAGS: boolean | string;
  USE_MEOWICE_FLAGS: boolean | string;
  USE_MEOWICE_GRAALVM_FLAGS: boolean | string;
  JVM_OPTS: string;
  JVM_XX_OPTS: string;
  JVM_DD_OPTS: string;
  EXTRA_ARGS: string;
  LOG_TIMESTAMP: boolean | string;
}>;

export type ServerVariables = Partial<{
  TYPE: string; // VANILLA/PAPER/etc.
  EULA: boolean | string;
  VERSION: string; // LATEST or specific
  MOTD: string;
  DIFFICULTY: 'peaceful' | 'easy' | 'normal' | 'hard' | string;
  ICON: string;
  OVERRIDE_ICON: boolean | string;
  MAX_PLAYERS: number | string;
  MAX_WORLD_SIZE: number | string;
  ALLOW_NETHER: boolean | string;
  ANNOUNCE_PLAYER_ACHIEVEMENTS: boolean | string;
  ENABLE_COMMAND_BLOCK: boolean | string;
  FORCE_GAMEMODE: boolean | string;
  GENERATE_STRUCTURES: boolean | string;
  HARDCORE: boolean | string;
  SNOOPER_ENABLED: boolean | string;
  MAX_BUILD_HEIGHT: number | string;
  SPAWN_ANIMALS: boolean | string;
  SPAWN_MONSTERS: boolean | string;
  SPAWN_NPCS: boolean | string;
  SPAWN_PROTECTION: number | string;
  VIEW_DISTANCE: number | string;
  SEED: string;
  MODE: 'creative' | 'survival' | 'adventure' | 'spectator' | number | string;
  PVP: boolean | string;
  LEVEL_TYPE: string;
  GENERATOR_SETTINGS: string;
  LEVEL: string;
  ONLINE_MODE: boolean | string;
  ALLOW_FLIGHT: boolean | string;
  SERVER_NAME: string;
  SERVER_PORT: number | string;
  PLAYER_IDLE_TIMEOUT: number | string;
  ENABLE_JMX: boolean | string;
  SYNC_CHUNK_WRITES: boolean | string;
  ENABLE_STATUS: boolean | string;
  ENTITY_BROADCAST_RANGE_PERCENTAGE: number | string;
  FUNCTION_PERMISSION_LEVEL: number | string;
  NETWORK_COMPRESSION_THRESHOLD: number | string;
  OP_PERMISSION_LEVEL: number | string;
  PREVENT_PROXY_CONNECTIONS: boolean | string;
  USE_NATIVE_TRANSPORT: boolean | string;
  SIMULATION_DISTANCE: number | string;
  EXEC_DIRECTLY: boolean | string;
  STOP_SERVER_ANNOUNCE_DELAY: number | string;
  PROXY: string | boolean;
  CONSOLE: boolean | string;
  GUI: boolean | string;
  STOP_DURATION: number | string;
  SETUP_ONLY: boolean | string;
  USE_FLARE_FLAGS: boolean | string;
  USE_SIMD_FLAGS: boolean | string;
}>;

export type ResourcePackVariables = Partial<{
  RESOURCE_PACK: string;
  RESOURCE_PACK_SHA1: string;
  RESOURCE_PACK_ENFORCE: boolean | string;
  RESOURCE_PACK_PROMPT: string;
  RESOURCE_PACK_ID: string;
}>;

export type WhitelistVariables = Partial<{
  ENABLE_WHITELIST: boolean | string;
  WHITELIST: string; // comma separated usernames/UUIDs
  WHITELIST_FILE: string; // url or file path
  OVERRIDE_WHITELIST: boolean | string;
}>;

export type RconVariables = Partial<{
  ENABLE_RCON: boolean | string;
  RCON_PASSWORD: string;
  RCON_PORT: number | string;
  BROADCAST_RCON_TO_OPS: boolean | string;
  RCON_CMDS_STARTUP: string;
  RCON_CMDS_ON_CONNECT: string;
  RCON_CMDS_FIRST_CONNECT: string;
  RCON_CMDS_ON_DISCONNECT: string;
  RCON_CMDS_LAST_DISCONNECT: string;
}>;

export type AutoPauseVariables = Partial<{
  ENABLE_AUTOPAUSE: boolean | string;
  AUTOPAUSE_TIMEOUT_EST: number | string;
  AUTOPAUSE_TIMEOUT_INIT: number | string;
  AUTOPAUSE_TIMEOUT_KN: number | string;
  AUTOPAUSE_PERIOD: number | string;
  AUTOPAUSE_KNOCK_INTERFACE: string;
  DEBUG_AUTOPAUSE: boolean | string;
}>;

export type CurseForgeVariables = Partial<{
  CF_API_KEY: string;
  CF_API_KEY_FILE: string;
  CF_PAGE_URL: string;
  CF_SLUG: string;
  CF_FILE_ID: string | number;
  CF_FILENAME_MATCHER: string;
  CF_EXCLUDE_INCLUDE_FILE: string;
  CF_EXCLUDE_MODS: string;
  CF_FORCE_INCLUDE_MODS: string;
  CF_FORCE_SYNCHRONIZE: string | boolean;
  CF_SET_LEVEL_FROM: 'WORLD_FILE' | 'OVERRIDES';
  CF_PARALLEL_DOWNLOADS: number | string;
  CF_OVERRIDES_SKIP_EXISTING: boolean | string;
  CF_MOD_LOADER_VERSION: string;
  CF_DOWNLOADS_REPO: string;
  CF_MODPACK_ZIP: string;
  CF_MODPACK_MANIFEST: string;
  CF_EXCLUDE_ALL_MODS: boolean | string;
  CF_OVERRIDES_EXCLUSIONS: string; // comma/newline delimited ant-style paths
  CF_IGNORE_MISSING_FILES: string; // comma/newline/glob list
  CF_FORCE_REINSTALL_MODLOADER: boolean | string;
}>;

// Modrinth Modpacks variables based on
// https://docker-minecraft-server.readthedocs.io/en/latest/types-and-platforms/mod-platforms/modrinth-modpacks/
export type ModrinthVariables = Partial<{
  MODRINTH_MODPACK: string; // slug|id|project URL|version URL|custom URL|container path
  MODRINTH_VERSION: string; // version id or number
  MODRINTH_MODPACK_VERSION_TYPE: 'release' | 'beta' | 'alpha' | string;
  MODRINTH_LOADER: 'forge' | 'fabric' | 'quilt' | string;
  MODRINTH_IGNORE_MISSING_FILES: string; // comma/newline/glob list
  MODRINTH_EXCLUDE_FILES: string; // comma/newline list of partial filenames
  MODRINTH_FORCE_INCLUDE_FILES: string; // comma/newline list of partial filenames
  MODRINTH_FORCE_SYNCHRONIZE: boolean | string;
  MODRINTH_DEFAULT_EXCLUDE_INCLUDES: string; // empty string to disable defaults
  MODRINTH_OVERRIDES_EXCLUSIONS: string; // comma/newline ant-style paths
  MODRINTH_PROJECTS: string; // comma/newline/glob list of project slugs or ids
}>;
