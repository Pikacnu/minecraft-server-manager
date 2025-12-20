import Cloudflare from 'cloudflare';

export class DNSController {
  private cf: Cloudflare;
  private zoneID: string;
  private srvPort: number;
  private existingRecords: Cloudflare.DNS.Records.RecordResponse[] = [];

  constructor(apiToken: string, zoneID: string, srvPort: number) {
    this.cf = new Cloudflare({
      apiToken: apiToken,
    });
    this.zoneID = zoneID;
    this.srvPort = srvPort;
    this.init();
  }

  private async init() {
    const { result } = await this.cf.dns.records.list({
      zone_id: this.zoneID || '',
    });
    this.existingRecords = result.filter((record) =>
      ['SRV', 'A'].includes(record.type),
    );
  }

  async createSRVRecord(name: string, target: string) {
    try {
      await this.cf.dns.records.create({
        zone_id: this.zoneID || '',
        type: 'SRV',
        name,
        data: {
          priority: 0,
          weight: 0,
          port: this.srvPort,
          target,
        },
        ttl: 1,
      });
    } catch {}
  }

  async createARecord(name: string, ip: string) {
    try {
      await this.cf.dns.records.create({
        zone_id: this.zoneID || '',
        type: 'A',
        name,
        content: ip,
        ttl: 1,
      });
    } catch {}
  }

  async deleteSRVRecord(name: string) {
    const record = this.existingRecords.find((rec) => rec.name === name);

    if (record) {
      try {
        await this.cf.dns.records.delete(record.id, {
          zone_id: this.zoneID || '',
        });
      } catch {}
    }
  }

  async deleteARecord(name: string) {
    const record = this.existingRecords.find(
      (rec) => rec.name === name && rec.type === 'A',
    );
    if (record) {
      try {
        await this.cf.dns.records.delete(record.id, {
          zone_id: this.zoneID || '',
        });
      } catch {}
    }
  }

  isSRVRecordExists(name: string) {
    return this.existingRecords.some(
      (record) => record.name === name && record.type === 'SRV',
    );
  }

  isARecordExists(name: string) {
    return this.existingRecords.some(
      (record) => record.name === name && record.type === 'A',
    );
  }
}
export function generateMinecraftSRVName(target: string) {
  return `_minecraft._tcp.${target}`;
}

export class DomainManager {
  private static domainControllerMap = new Map<string, DNSController>();
  private static instance: DomainManager;
  private static proxyServerIP: string;
  private static isWildcardDomain: boolean = true;
  private static wildcardPrefix: string = '*.srv-mc-only';

  public static getInstance() {
    if (!DomainManager.instance) {
      DomainManager.instance = new DomainManager();
    }
    return DomainManager.instance;
  }

  static set proxyIP(ip: string) {
    DomainManager.proxyServerIP = ip;
  }

  static set useWildcard(use: boolean) {
    DomainManager.isWildcardDomain = use;
  }

  static set wildcardDomainPrefix(prefix: string) {
    DomainManager.wildcardPrefix = prefix;
  }

  public static async setupDNSController(
    domainName: string,
    ...args: ConstructorParameters<typeof DNSController>
  ) {
    const dnsController = new DNSController(...args);
    DomainManager.domainControllerMap.set(domainName, dnsController);
  }

  public static async addRecordToDomain(domainName: string, name: string) {
    if (!DomainManager.isWildcardDomain && !DomainManager.proxyServerIP) {
      throw new Error(
        'Proxy Server IP is not set. Cannot create DNS records without it.',
      );
    }
    const dnsController = DomainManager.domainControllerMap.get(domainName);
    if (!dnsController) {
      throw new Error(
        `DNS Controller for domain ${domainName} not found. Make sure to set it up first.`,
      );
    }

    if (this.isWildcardDomain) {
      if (!dnsController.isARecordExists(DomainManager.wildcardPrefix)) {
        await dnsController.createARecord(
          `*.${DomainManager.wildcardPrefix}`,
          DomainManager.proxyServerIP,
        );
      }
    } else {
      await dnsController.createARecord(name, DomainManager.proxyServerIP);
    }

    const srvName = generateMinecraftSRVName(name);
    if (this.isWildcardDomain) {
      if (!dnsController.isSRVRecordExists(srvName))
        await dnsController.createSRVRecord(
          srvName,
          `${name}.${this.wildcardPrefix}.${domainName}`,
        );
    } else {
      if (!dnsController.isSRVRecordExists(srvName))
        await dnsController.createSRVRecord(srvName, `${name}.${domainName}`);
    }

    return;
  }

  public static deleteSRVRecord(domainName: string, name: string) {
    const dnsController = DomainManager.domainControllerMap.get(domainName);
    if (!dnsController) {
      throw new Error(
        `DNS Controller for domain ${domainName} not found. Make sure to set it up first.`,
      );
    }
    if (this.isWildcardDomain) {
      const srvName = generateMinecraftSRVName(
        `${name}.${this.wildcardPrefix}`,
      );
      if (dnsController.isSRVRecordExists(srvName))
        dnsController.deleteSRVRecord(srvName);
    } else {
      const srvName = generateMinecraftSRVName(name);
      if (dnsController.isSRVRecordExists(srvName))
        dnsController.deleteSRVRecord(srvName);
    }
    if (!this.isWildcardDomain && dnsController.isARecordExists(name)) {
      dnsController.deleteARecord(name);
    }
    return;
  }
}

export function getTopLevelDomain(domain: string): string {
  try {
    const url = new URL(`http://${domain}`);
    return url.hostname.split('.').slice(-2).join('.');
  } catch {
    return domain;
  }
}
