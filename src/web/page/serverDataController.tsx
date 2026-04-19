import { useEffect, useState } from 'react';
import { useServers } from '../contexts/servers';
import { useNotification } from '../contexts/notification';
import { useConfirmDialog } from '../contexts/confirmDialog';
import { NotificationType } from '../utils/enums';
import { useOpenServerPanel } from '../contexts/addServerPanel';
import { usePage, PageSectionEnum } from '../contexts/page';

export default function ServerDataController() {
  const [instances, setInstances] = useState<any[]>([]);
  const { setCurrentSelectedServerId } = useServers();
  const { addNotification } = useNotification();
  const { showConfirmDialog } = useConfirmDialog();
  const { setIsOpen, setDefaultSetting } = useOpenServerPanel();
  const { setCurrentSection } = usePage();

  const fetchInstances = async () => {
    try {
      const response = await fetch('/api/instance-scanner');
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      if (data.status === 'ok') {
        setInstances(data.data || []);
      } else {
        setInstances([]);
      }
    } catch (e) {
      console.error('Failed to fetch instances', e);
      setInstances([]);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleBackup = async (name: string) => {
    try {
      await fetch('/api/file-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compress',
          name,
          files: [''],
          outputPath: 'backup.zip',
        }),
      });
      addNotification(`Backup for ${name} created.`, NotificationType.Success);
      fetchInstances();
    } catch (e) {
      console.error(e);
      addNotification(`Backup failed for ${name}.`, NotificationType.Error);
    }
  };

  const handleDelete = async (name: string) => {
    const confirmed = await showConfirmDialog({
      title: 'Delete Folder',
      message: `Are you sure you want to delete folder ${name}? This action cannot be undone.`,
      requireCheckbox: true,
      checkboxLabel: 'I understand this will be permanently deleted',
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      const response = await fetch('/api/instance-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', name }),
      });
      if (response.ok) {
        addNotification(`Deleted ${name}`, NotificationType.Success);
        fetchInstances();
      } else {
        addNotification(`Failed to delete ${name}`, NotificationType.Error);
      }
    } catch (e) {
      console.error(e);
      addNotification(`Failed to delete ${name}`, NotificationType.Error);
    }
  };

  const openFolder = (name: string) => {
    try {
      setCurrentSelectedServerId(name);
      setCurrentSection(PageSectionEnum.ServerManagement);
    } catch (e) {
      console.error(e);
    }
  };

  const openCreatePanel = (name: string, props: Record<string, any> | null) => {
    // Prefill Add Server panel and open it
    const defaults = props || {};

    const normalizeProps = (p: Record<string, any>) => {
      const n: Record<string, any> = {};
      for (const [k, v] of Object.entries(p || {})) {
        const nk = String(k)
          .toLowerCase()
          .replace(/\./g, '_')
          .replace(/-/g, '_')
          .replace(/\s+/g, '');
        n[nk] = v;
      }
      return n;
    };

    const mapServerPropertiesToVariables = (
      p: Record<string, any>,
      fallbackName: string,
    ) => {
      const n = normalizeProps(p || {});
      const out: Record<string, any> = {};

      const parseBool = (v: any) => {
        if (v === undefined || v === null) return undefined;
        if (typeof v === 'boolean') return v;
        const s = String(v).toLowerCase().trim();
        if (['1', 'true', 'yes', 'on'].includes(s)) return true;
        if (['0', 'false', 'no', 'off'].includes(s)) return false;
        return undefined;
      };

      const parseIntSafe = (v: any) => {
        if (v === undefined || v === null) return undefined;
        const num = parseInt(String(v).replace(/[^0-9-]/g, ''));
        return isNaN(num) ? undefined : num;
      };

      // Basic mappings
      if (n.version) out.version = n.version;
      if (n.type) out.type = n.type;

      // Memory mappings
      if (n.max_memory) {
        const num = parseInt(String(n.max_memory).replace(/[^0-9]/g, ''));
        if (!isNaN(num)) out.memoryLimit = num;
      }
      if (n.memorylimit) {
        const num = parseInt(String(n.memorylimit).replace(/[^0-9]/g, ''));
        if (!isNaN(num)) out.memoryLimit = num;
      }

      // Players
      const maxPlayers = parseIntSafe(n.max_players || n.maxplayers);
      if (maxPlayers !== undefined) out.MAX_PLAYERS = maxPlayers;

      // MOTD and online mode
      if (n.motd) out.MOTD = n.motd;
      const onlineMode = parseBool(
        n.online_mode || n.onlinemode || n['online-mode'],
      );
      if (onlineMode !== undefined) out.ONLINE_MODE = String(onlineMode);

      // Level and seed
      if (n.level_name || n.levelname) out.LEVEL = n.level_name || n.levelname;
      if (n.level_type || n.leveltype)
        out.LEVEL_TYPE = n.level_type || n.leveltype;
      if (n.level_seed || n.seed) out.SEED = n.level_seed || n.seed;

      // View distance
      const viewDistance = parseIntSafe(n.view_distance || n.viewdistance);
      if (viewDistance !== undefined) out.VIEW_DISTANCE = viewDistance;

      // PvP
      const pvp = parseBool(n.pvp);
      if (pvp !== undefined) out.PVP = String(pvp);

      // Difficulty
      if (n.difficulty) {
        const d = parseInt(String(n.difficulty).replace(/[^0-9]/g, ''));
        const dmap: Record<number, string> = {
          0: 'peaceful',
          1: 'easy',
          2: 'normal',
          3: 'hard',
        };
        out.DIFFICULTY = !isNaN(d) ? dmap[d] || n.difficulty : n.difficulty;
      }

      // Nether, command blocks, spawn settings, flight
      const allowNether = parseBool(
        n.allow_nether || n.allownether || n['allow-nether'],
      );
      if (allowNether !== undefined) out.ALLOW_NETHER = String(allowNether);
      const cmdBlock = parseBool(
        n.enable_command_block || n['enable-command-block'],
      );
      if (cmdBlock !== undefined) out.ENABLE_COMMAND_BLOCK = String(cmdBlock);
      const spawnAnimals = parseBool(n.spawn_animals || n.spawnanimals);
      if (spawnAnimals !== undefined) out.SPAWN_ANIMALS = String(spawnAnimals);
      const spawnMonsters = parseBool(n.spawn_monsters || n.spawnmonsters);
      if (spawnMonsters !== undefined)
        out.SPAWN_MONSTERS = String(spawnMonsters);
      const spawnNpcs = parseBool(n.spawn_npcs || n.spawnnpcs);
      if (spawnNpcs !== undefined) out.SPAWN_NPCS = String(spawnNpcs);
      const allowFlight = parseBool(n.allow_flight || n.allowflight);
      if (allowFlight !== undefined) out.ALLOW_FLIGHT = String(allowFlight);

      // Resource pack
      if (n.resource_pack || n['resource-pack'])
        out.RESOURCE_PACK = n.resource_pack || n['resource-pack'];

      // Server port
      const serverPort = parseIntSafe(
        n.server_port || n.serverport || n.serverport,
      );
      if (serverPort !== undefined) out.SERVER_PORT = serverPort;

      // RCON
      const enableRcon = parseBool(
        n.enable_rcon || n.enablercon || n['enable-rcon'],
      );
      if (enableRcon !== undefined) out.ENABLE_RCON = String(enableRcon);
      if (n.rcon_password || n['rcon.password'] || n.rconpassword)
        out.RCON_PASSWORD =
          n.rcon_password || n['rcon.password'] || n.rconpassword;
      const rconPort = parseIntSafe(n.rcon_port || n.rconport);
      if (rconPort !== undefined) out.RCON_PORT = rconPort;

      // World / size
      const maxWorldSize = parseIntSafe(
        n.max_world_size || n.maxworldsize || n.max_worldsize,
      );
      if (maxWorldSize !== undefined) out.MAX_WORLD_SIZE = maxWorldSize;

      // Game mode mapping
      if (n.gamemode || n['game-mode'] || n['game_mode']) {
        const gm = n.gamemode || n['game-mode'] || n['game_mode'];
        const gmNum = parseInt(String(gm).replace(/[^0-9]/g, ''));
        const gmMap: Record<number, string> = {
          0: 'survival',
          1: 'creative',
          2: 'adventure',
          3: 'spectator',
        };
        out.MODE = !isNaN(gmNum) ? gmMap[gmNum] || gm : gm;
      }

      // Whitelist toggle
      const wl = parseBool(n.white_list || n.whitelist || n['white-list']);
      if (wl !== undefined) out.ENABLE_WHITELIST = String(wl);

      // Finalize name
      out.SERVER_NAME =
        n.server_name || n.servername || n.server || fallbackName;
      return out;
    };

    const mapped = mapServerPropertiesToVariables(defaults || {}, name);

    const prefill = {
      version: defaults.VERSION || defaults.version || mapped.version,
      memoryLimit:
        defaults.MAX_MEMORY &&
        String(defaults.MAX_MEMORY).replace(/[^0-9]/g, '')
          ? parseInt(String(defaults.MAX_MEMORY).replace(/[^0-9]/g, ''))
          : mapped.memoryLimit || defaults.memoryLimit || undefined,
      type: defaults.TYPE || defaults.type || mapped.type,
      SERVER_NAME: defaults.SERVER_NAME || mapped.SERVER_NAME || name,
      ...mapped,
      ...defaults,
      serverSettingId: name,
    } as Record<string, any>;

    setDefaultSetting(prefill);
    setIsOpen(true);
  };

  return (
    <div className='flex h-full w-full flex-col overflow-hidden p-4'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>Server Data Controller</h2>
        <div className='flex gap-2'>
          <button
            className='rounded bg-blue-600 px-3 py-1 text-white'
            onClick={() => fetchInstances()}
          >
            Refresh
          </button>
        </div>
      </div>
      <div className='overflow-auto rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800'>
        <table className='w-full table-auto'>
          <thead>
            <tr className='text-left'>
              <th>Name</th>
              <th>Managed</th>
              <th>Config Status</th>
              <th>Mods</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((inst) => (
              <tr
                key={inst.name}
                className='align-top border-t'
              >
                <td className='py-2'>{inst.name}</td>
                <td className='py-2'>
                  {inst.managed ? (
                    <span className='inline-block rounded bg-green-100 text-green-800 px-2 py-0.5 text-xs'>
                      Yes
                    </span>
                  ) : (
                    <span className='inline-block rounded bg-gray-100 text-gray-700 px-2 py-0.5 text-xs'>
                      No
                    </span>
                  )}
                </td>
                <td className='py-2'>
                  {inst.hasServerProperties ? (
                    <span className='inline-block rounded bg-blue-100 text-blue-800 px-2 py-0.5 text-xs mr-1'>
                      Has server.properties
                    </span>
                  ) : null}
                  {inst.hasServerConf ? (
                    <span className='inline-block rounded bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs'>
                      Has server.conf
                    </span>
                  ) : null}
                  {!inst.hasServerProperties && !inst.hasServerConf ? (
                    <span className='text-gray-500'>-</span>
                  ) : null}
                </td>
                <td className='py-2'>{inst.modsCount || 0}</td>
                <td className='py-2'>
                  <div className='flex gap-2'>
                    <button
                      className='rounded border px-2 py-1'
                      onClick={() => openFolder(inst.name)}
                    >
                      Open
                    </button>
                    <button
                      className='rounded border px-2 py-1'
                      onClick={() =>
                        openCreatePanel(inst.name, inst.serverProperties)
                      }
                    >
                      Create From Folder
                    </button>
                    <button
                      className='rounded border px-2 py-1'
                      onClick={() => handleBackup(inst.name)}
                    >
                      Backup
                    </button>
                    <button
                      className='rounded border px-2 py-1 text-red-600'
                      onClick={() => handleDelete(inst.name)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
