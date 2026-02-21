export type AssetItem = {
  id: string;
  type: string;
  createdAt: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
};

export type CampaignBrief = {
  angle: string;
  promise: string;
  proofPoints: [string, string, string];
  objections: Array<{ objection: string; response: string }>;
  pillars: [string, string, string];
  do: string[];
  dont: string[];
};

export type CampaignIntelligence = {
  brief?: CampaignBrief;
  updatedAt?: string;
  source?: "ai" | "user";
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
  intelligence?: CampaignIntelligence;
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

function readStringArrayWithBounds(
  value: unknown,
  min: number,
  max: number,
  clamp: number,
  itemMax: number
) {
  if (!Array.isArray(value)) return null;

  const values = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, itemMax))
    .filter((item) => item.length > 0)
    .slice(0, clamp);

  if (values.length < min || values.length > max) return null;
  return values;
}

function readStringArrayExact(value: unknown, count: number, itemMax: number) {
  if (!Array.isArray(value) || value.length !== count) return null;

  const values = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, itemMax))
    .filter((item) => item.length > 0);

  if (values.length !== count) return null;
  return values;
}

function readBrief(value: unknown): CampaignBrief | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as {
    angle?: unknown;
    promise?: unknown;
    proofPoints?: unknown;
    objections?: unknown;
    pillars?: unknown;
    do?: unknown;
    dont?: unknown;
  };

  const angle = trimAndClamp(candidate.angle, 180);
  const promise = trimAndClamp(candidate.promise, 180);
  const proofPoints = readStringArrayExact(candidate.proofPoints, 3, 180);
  const pillars = readStringArrayExact(candidate.pillars, 3, 140);
  const doList = readStringArrayWithBounds(candidate.do, 3, 6, 6, 120);
  const dontList = readStringArrayWithBounds(candidate.dont, 3, 6, 6, 120);

  if (!angle || !promise || !proofPoints || !pillars || !doList || !dontList) {
    return undefined;
  }

  if (!Array.isArray(candidate.objections)) return undefined;
  const objections = candidate.objections
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const pair = entry as { objection?: unknown; response?: unknown };
      const objection = trimAndClamp(pair.objection, 180);
      const response = trimAndClamp(pair.response, 220);
      if (!objection || !response) return null;
      return { objection, response };
    })
    .filter((entry): entry is { objection: string; response: string } => entry !== null)
    .slice(0, 3);

  if (objections.length < 2 || objections.length > 3) return undefined;

  return {
    angle,
    promise,
    proofPoints: [proofPoints[0], proofPoints[1], proofPoints[2]],
    objections,
    pillars: [pillars[0], pillars[1], pillars[2]],
    do: doList,
    dont: dontList,
  };
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
        ...(() => {
          const intelligenceObj =
            entry.intelligence &&
            typeof entry.intelligence === "object" &&
            !Array.isArray(entry.intelligence)
              ? (entry.intelligence as Record<string, unknown>)
              : null;
          if (!intelligenceObj) return {};

          const brief = readBrief(intelligenceObj.brief);
          const updatedAt =
            typeof intelligenceObj.updatedAt === "string"
              ? safeDate(intelligenceObj.updatedAt, fallbackCreatedAt)
              : undefined;
          const source =
            intelligenceObj.source === "ai" || intelligenceObj.source === "user"
              ? intelligenceObj.source
              : undefined;

          if (!brief && !updatedAt && !source) return {};
          return {
            intelligence: {
              ...(brief ? { brief } : {}),
              ...(updatedAt ? { updatedAt } : {}),
              ...(source ? { source } : {}),
            } as CampaignIntelligence,
          };
        })(),
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
