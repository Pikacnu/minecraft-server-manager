export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isProduction = process.env.NODE_ENV === 'production';
export const Namespace = process.env.NAMESPACE || 'minecraft-servers';
export const AppName = process.env.APP_NAME || 'minecraft-server-manager';
export const VelocitySecret = process.env.VELOCITY_SECRET || 'my-secret-123';
export const RCONPassword = process.env.RCON_PASSWORD || 'rconpassword';
export const NFSServer = process.env.NFS_SERVER || 'nfs-server.local';
export const NFSPath =
  process.env.NFS_PATH && process.env.NFS_PATH !== ''
    ? `${process.env.NFS_PATH}/minecraft-server-manager`
    : './minecraft-data';
export const ManagerMountPath = 'data';
