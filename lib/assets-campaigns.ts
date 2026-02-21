export type AssetItem = {
  id: string;
  type: string;
  outputVersion?: number;
  createdAt: string;
  parentId?: string;
  variant?: {
    mode: "hooks_only" | "captions_only" | "ctas_only";
    tone: "softer" | "default" | "bolder";
  };
  input: Record<string, unknown>;
  output: Record<string, unknown>;
};

export type AssetCampaign = {
  id: string;
  name: string;
  goal: string;
  platform: string;
  ctaStyle?: string;
  toneOverride?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  items: AssetItem[];
};

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function trimAndClamp(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function safeDate(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? value : fallback;
}

function sortCampaigns(campaigns: AssetCampaign[]) {
  return [...campaigns].sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.createdAt).getTime() -
      new Date(a.updatedAt ?? a.createdAt).getTime()
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
  const variantModes = new Set(["hooks_only", "captions_only", "ctas_only"]);
  const variantTones = new Set(["softer", "default", "bolder"]);

  for (const item of value) {
    const entry = readObject(item);
    if (!entry) continue;

    const id = typeof entry.id === "string" ? entry.id : "";
    const type = typeof entry.type === "string" ? entry.type : "";
    if (!id || !type) continue;

    const input = readObject(entry.input);
    const output = readObject(entry.output);
    if (!input || !output) continue;

    const outputVersion =
      typeof entry.outputVersion === "number" &&
      Number.isFinite(entry.outputVersion) &&
      entry.outputVersion > 0
        ? Math.floor(entry.outputVersion)
        : undefined;
    const parentId = trimAndClamp(entry.parentId, 120);
    const variantObj = readObject(entry.variant);
    const variantMode = trimAndClamp(variantObj?.mode, 30);
    const variantTone = trimAndClamp(variantObj?.tone, 20);

    const parsed: AssetItem = {
      id,
      type,
      createdAt: safeDate(entry.createdAt, fallbackCreatedAt),
      ...(outputVersion ? { outputVersion } : {}),
      ...(parentId ? { parentId } : {}),
      ...(variantObj &&
      variantModes.has(variantMode) &&
      variantTones.has(variantTone)
        ? {
            variant: {
              mode: variantMode as "hooks_only" | "captions_only" | "ctas_only",
              tone: variantTone as "softer" | "default" | "bolder",
            },
          }
        : {}),
      input,
      output,
    };

    items.push(parsed);
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
        goal: trimAndClamp(entry.goal, 80),
        platform: trimAndClamp(entry.platform, 40),
        ...(trimAndClamp(entry.ctaStyle, 30)
          ? { ctaStyle: trimAndClamp(entry.ctaStyle, 30) }
          : {}),
        ...(trimAndClamp(entry.toneOverride, 60)
          ? { toneOverride: trimAndClamp(entry.toneOverride, 60) }
          : {}),
        ...(trimAndClamp(entry.notes, 280)
          ? { notes: trimAndClamp(entry.notes, 280) }
          : {}),
        createdAt: safeDate(entry.createdAt, fallbackCreatedAt),
        ...(typeof entry.updatedAt === "string"
          ? { updatedAt: safeDate(entry.updatedAt, fallbackCreatedAt) }
          : {}),
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
      goal: "",
      platform: "",
      createdAt: fallbackCreatedAt,
      updatedAt: fallbackCreatedAt,
      items: legacyItems,
    },
  ];
}
