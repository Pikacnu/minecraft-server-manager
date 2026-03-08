import {
  Namespace,
  AppName,
  VelocitySecret,
  RCONPassword,
  NFSServer,
  NFSRootPath,
  CloudflareAPIToken,
  DomainName,
  ProxyIp,
  SRVPort,
  ZoneID,
  WildCardDomainPrefix,
  isWildcardDomain,
  isDevelopment,
} from '@/utils/config';

// Return current system settings
async function GET(request: Request): Promise<Response> {
  try {
    const settings = {
      // Read-only ENV settings (require restart to change)
      readOnly: {
        namespace: Namespace,
        appName: AppName,
        nfsServer: NFSServer,
        nfsRootPath: NFSRootPath,
        isDevelopment,
      },
      // Sensitive settings (show masked values)
      sensitive: {
        velocitySecret: VelocitySecret ? '***' : '',
        rconPassword: RCONPassword ? '***' : '',
        cloudflareApiToken: CloudflareAPIToken ? '***' : '',
      },
      // Network settings
      network: {
        domainName: DomainName || '',
        proxyIp: ProxyIp || '',
        srvPort: SRVPort,
        zoneId: ZoneID || '',
        wildcardDomainPrefix: WildCardDomainPrefix,
        isWildcardDomain,
      },
    };

    return Response.json({ status: 'ok', data: settings });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return Response.json(
      { status: 'error', message: 'Failed to retrieve settings' },
      { status: 500 },
    );
  }
}

export default {
  GET,
};
