export async function getMinecraftVersions(): Promise<string[]> {
  const response = await fetch('https://meta.fabricmc.net/v2/versions/game');
  const data = await response.json();
  return data.map((version: { version: string }) => version.version);
}
