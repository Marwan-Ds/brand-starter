export type AssetItem = {
  id: string;
  type: string;
  createdAt: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
};

export type AssetCampaign = {
  id: string;
  name: string;
  createdAt: string;
  items: AssetItem[];
};

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function safeDate(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? value : fallback;
}

function sortCampaigns(campaigns: AssetCampaign[]) {
  return [...campaigns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function sortItems(items: AssetItem[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function readItems(value: unknown, fallbackCreatedAt: string): AssetItem[] {
  if (!Array.isArray(value)) return [];

  const items: AssetItem[] = [];

  for (const item of value) {
    const entry = readObject(item);
    if (!entry) continue;

    const id = typeof entry.id === "string" ? entry.id : "";
    const type = typeof entry.type === "string" ? entry.type : "";
    if (!id || !type) continue;

    const input = readObject(entry.input);
    const output = readObject(entry.output);
    if (!input || !output) continue;

    items.push({
      id,
      type,
      createdAt: safeDate(entry.createdAt, fallbackCreatedAt),
      input,
      output,
    });
  }

  return sortItems(items);
}

export function readAssetCampaigns(
  assets: unknown,
  fallbackCreatedAt: string
): AssetCampaign[] {
  const assetsObj = readObject(assets);
  if (!assetsObj) return [];

  const campaignsValue = assetsObj.campaigns;
  if (Array.isArray(campaignsValue)) {
    const campaigns: AssetCampaign[] = [];

    for (const campaign of campaignsValue) {
      const entry = readObject(campaign);
      if (!entry) continue;

      const id = typeof entry.id === "string" ? entry.id : "";
      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      if (!id || !name) continue;

      campaigns.push({
        id,
        name: name.slice(0, 60),
        createdAt: safeDate(entry.createdAt, fallbackCreatedAt),
        items: readItems(entry.items, fallbackCreatedAt),
      });
    }

    return sortCampaigns(campaigns);
  }

  const legacyItems = readItems(assetsObj.items, fallbackCreatedAt);
  if (legacyItems.length === 0) return [];

  return [
    {
      id: "general",
      name: "General",
      createdAt: fallbackCreatedAt,
      items: legacyItems,
    },
  ];
}
