// Environment variables
export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isProduction = process.env.NODE_ENV === 'production';

// Kubernetes and application configuration
export const Namespace = process.env.NAMESPACE || 'minecraft-servers';
export const AppName = process.env.APP_NAME || 'minecraft-server-manager';

// Gate / Proxy configuration

export const VelocitySecret = process.env.VELOCITY_SECRET || 'my-secret-123';
export const RCONPassword = process.env.RCON_PASSWORD || 'rconpassword';

// NFS Storage settings

export const NFSServer = process.env.NFS_SERVER;
export const NFSRootPath = process.env.NFS_ROOT_PATH;
export const isEnabledNFS =
  !!NFSServer && NFSServer !== '' && !!NFSRootPath && NFSRootPath !== '';
export const StorageClassNameNFS =
  process.env.STORAGE_CLASS_NAME_NFS || 'nfs-client';
export const StorageClassNameLocal =
  process.env.STORAGE_CLASS_NAME_LOCAL || 'local-path';
export const LocalMountPath =
  process.env.LOCAL_MOUNT_PATH && !isDevelopment
    ? process.env.LOCAL_MOUNT_PATH
    : './minecraft-data';
export const ManagerMountPath = 'data';

// Cloudflare and domain configuration

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

// Custom NodePort for Java and Bedrock servers, useful when running in environments like k3d
// where NodePort might not work as expected
export const isEnableCustomNodePort =
  process.env.ENABLE_CUSTOM_NODE_PORT === 'true';
export const JavaNodePort = Number(process.env.JAVA_NODE_PORT || '35565');
export const BedrockNodePort = Number(process.env.BEDROCK_NODE_PORT || '39132');

// Gate proxy Image Source
export const GateProxyImage =
  process.env.GATE_PROXY_IMAGE || 'ghcr.io/minekube/gate/jre:latest';
