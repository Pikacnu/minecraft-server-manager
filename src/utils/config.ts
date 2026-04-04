export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isProduction = process.env.NODE_ENV === 'production';
export const Namespace = process.env.NAMESPACE || 'minecraft-servers';
export const AppName = process.env.APP_NAME || 'minecraft-server-manager';
export const VelocitySecret = process.env.VELOCITY_SECRET || 'my-secret-123';
export const RCONPassword = process.env.RCON_PASSWORD || 'rconpassword';
export const NFSServer = process.env.NFS_SERVER;
export const NFSRootPath = process.env.NFS_ROOT_PATH;
export const isEnabledNFS =
  !!NFSServer &&
  !!NFSRootPath &&
  NFSServer.length > 0 &&
  NFSRootPath.length > 0;
export const LocalMountPath =
  process.env.LOCAL_MOUNT_PATH && !isDevelopment
    ? process.env.LOCAL_MOUNT_PATH
    : './minecraft-data';
export const ManagerMountPath = 'data';
export const CloudflareAPIToken = process.env.CLOUDFLARE_API_TOKEN || '';
export const DomainName = process.env.DOMAIN_NAME || false;
export const ProxyIp = process.env.PROXY_IP || false;
export const SRVPort = Number(process.env.SRVPORT || '25565');
export const ZoneID = process.env.ZONE_ID || false;
export const WildCardDomainPrefix =
  process.env.WILDCARD_DOMAIN_PREFIX || 'srv-mc-only';
export const isWildcardDomain =
  process.env.USE_WILDCARD_DOMAIN === 'true' || true;
export const isPreviewMode = process.env.PREVIEW_MODE === 'true';
