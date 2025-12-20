# Minecraft Server Manager

A management system for Minecraft servers, built with Bun and React.

## Getting Started

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

To run for production:

```bash
bun start
```

## Configuration

Create a `.env` file based on `.env.example` and configure the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `development` |
| `NAMESPACE` | Kubernetes namespace | `minecraft-servers` |
| `APP_NAME` | Application name | `minecraft-server-manager` |
| `VELOCITY_SECRET` | Secret for Velocity proxy | `my-secret-123` |
| `RCON_PASSWORD` | RCON password for servers | `rconpassword` |
| `NFS_SERVER` | NFS server address | `nfs-server.local` |
| `NFS_PATH` | NFS path | |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | |
| `DOMAIN_NAME` | Base domain name | |
| `PROXY_IP` | Proxy IP address | |
| `SRVPORT` | Service port | `25565` |
| `ZONE_ID` | Cloudflare Zone ID | |
| `WILDCARD_DOMAIN_PREFIX` | Prefix for wildcard domains | `srv-mc-only` |
| `USE_WILDCARD_DOMAIN` | Enable wildcard domains | `true` |

## Technologies

- [Bun](https://bun.com)
- React
- Tailwind CSS
