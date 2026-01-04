let cacheMinecraftVersions: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
export async function getMinecraftVersions(): Promise<string[]> {
  const now = Date.now();
  if (cacheMinecraftVersions && now - cacheTimestamp < CACHE_DURATION) {
    return cacheMinecraftVersions;
  }
  try {
    const response = await fetch('https://meta.fabricmc.net/v2/versions/game');
    const data = await response.json();
    return data.map((version: { version: string }) => version.version);
  } catch (error) {
    return [];
  }
}
