import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateCampaignBriefAI, type CampaignBrief as AiCampaignBrief } from "@/lib/ai/campaign-brief";
import { readAssetCampaigns, type AssetCampaign, type CampaignBrief } from "@/lib/assets-campaigns";

export const runtime = "nodejs";

type BrandKitMeta = {
  version: number;
  updatedAt?: string;
  assetsUpdatedAt?: string;
};

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function trimAndClamp(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function normalizeWords(value: unknown, maxLen: number, maxCount: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, maxLen))
    .filter((entry) => entry.length > 0)
    .slice(0, maxCount);
}

function readMeta(value: unknown): BrandKitMeta {
  if (!value || typeof value !== "object") {
    return { version: 1 };
  }

  const candidate = value as {
    version?: unknown;
    updatedAt?: unknown;
    assetsUpdatedAt?: unknown;
  };

  const version =
    typeof candidate.version === "number" &&
    Number.isFinite(candidate.version) &&
    candidate.version > 0
      ? Math.floor(candidate.version)
      : 1;

  return {
    version,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : undefined,
    assetsUpdatedAt:
      typeof candidate.assetsUpdatedAt === "string"
        ? candidate.assetsUpdatedAt
        : undefined,
  };
}

function readKitJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readStringArrayExact(
  value: unknown,
  count: number,
  maxLen: number
): string[] | null {
  if (!Array.isArray(value) || value.length !== count) return null;

  const values = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, maxLen))
    .filter((entry) => entry.length > 0);

  if (values.length !== count) return null;
  return values;
}

function validateCompleteBrief(value: Partial<CampaignBrief>): CampaignBrief | null {
  const angle = trimAndClamp(value.angle, 180);
  const promise = trimAndClamp(value.promise, 200);
  const proofPoints = readStringArrayExact(value.proofPoints, 3, 180);
  const pillars = readStringArrayExact(value.pillars, 3, 140);
  const doList = normalizeWords(value.do, 120, 6);
  const dontList = normalizeWords(value.dont, 120, 6);

  if (!angle || !promise || !proofPoints || !pillars) return null;
  if (doList.length < 3 || doList.length > 6) return null;
  if (dontList.length < 3 || dontList.length > 6) return null;

  if (!Array.isArray(value.objections)) return null;
  const objections = value.objections
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

  if (objections.length < 2 || objections.length > 3) return null;

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

function readBriefPatch(value: unknown): { patch: Partial<CampaignBrief> } | { error: string } {
  const briefObj = readObject(value);
  if (!briefObj) return { error: "brief is required." };

  const patch: Partial<CampaignBrief> = {};
  let touched = false;

  if (Object.prototype.hasOwnProperty.call(briefObj, "angle")) {
    const angle = trimAndClamp(briefObj.angle, 180);
    if (!angle) return { error: "angle is required." };
    patch.angle = angle;
    touched = true;
  }

  if (Object.prototype.hasOwnProperty.call(briefObj, "promise")) {
    const promise = trimAndClamp(briefObj.promise, 200);
    if (!promise) return { error: "promise is required." };
    patch.promise = promise;
    touched = true;
  }

  if (Object.prototype.hasOwnProperty.call(briefObj, "proofPoints")) {
    const proofPoints = readStringArrayExact(briefObj.proofPoints, 3, 180);
    if (!proofPoints) return { error: "proofPoints must contain exactly 3 items." };
    patch.proofPoints = [proofPoints[0], proofPoints[1], proofPoints[2]];
    touched = true;
  }

  if (Object.prototype.hasOwnProperty.call(briefObj, "pillars")) {
    const pillars = readStringArrayExact(briefObj.pillars, 3, 140);
    if (!pillars) return { error: "pillars must contain exactly 3 items." };
    patch.pillars = [pillars[0], pillars[1], pillars[2]];
    touched = true;
  }

  if (Object.prototype.hasOwnProperty.call(briefObj, "objections")) {
    if (!Array.isArray(briefObj.objections)) {
      return { error: "objections must be an array." };
    }

    const objections = briefObj.objections
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

    if (objections.length < 2 || objections.length > 3) {
      return { error: "objections must contain 2 to 3 rows." };
    }

    patch.objections = objections;
    touched = true;
  }

  if (Object.prototype.hasOwnProperty.call(briefObj, "do")) {
    const doList = normalizeWords(briefObj.do, 120, 6);
    if (doList.length < 3) return { error: "do must contain at least 3 items." };
    patch.do = doList;
    touched = true;
  }

  if (Object.prototype.hasOwnProperty.call(briefObj, "dont")) {
    const dontList = normalizeWords(briefObj.dont, 120, 6);
    if (dontList.length < 3) return { error: "dont must contain at least 3 items." };
    patch.dont = dontList;
    touched = true;
  }

  if (!touched) return { error: "brief patch is empty." };
  return { patch };
}

function updateMeta(existingKitJson: Record<string, any>, nowIso: string) {
  const currentMeta = readMeta(existingKitJson.meta);
  const nextVersion = (currentMeta.version ?? 1) + 1;

  return {
    ...currentMeta,
    version: nextVersion,
    updatedAt: nowIso,
    assetsUpdatedAt: nowIso,
  };
}

function saveCampaigns(
  existingKitJson: Record<string, any>,
  campaigns: AssetCampaign[],
  nowIso: string
) {
  return {
    ...existingKitJson,
    assets: {
      campaigns,
    },
    meta: updateMeta(existingKitJson, nowIso),
  } as Prisma.InputJsonValue;
}

function toAiBrief(brief: AiCampaignBrief): CampaignBrief {
  return {
    angle: brief.angle,
    promise: brief.promise,
    proofPoints: [brief.proofPoints[0], brief.proofPoints[1], brief.proofPoints[2]],
    objections: brief.objections,
    pillars: [brief.pillars[0], brief.pillars[1], brief.pillars[2]],
    do: brief.do,
    dont: brief.dont,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";
  const campaignId = resolvedParams?.campaignId ?? "";
  if (!id || !campaignId) {
    return Response.json({ ok: false, error: "Missing params" }, { status: 400 });
  }

  try {
    const rawBody = await req.json();
    const body =
      rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
        ? (rawBody as Record<string, unknown>)
        : {};

    const action = trimAndClamp(body.action, 40);
    if (action !== "generate_brief" && action !== "update_brief") {
      return Response.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    const record = await prisma.brandKit.findFirst({
      where: { id, userId },
      select: {
        id: true,
        createdAt: true,
        mode: true,
        business: true,
        vibe: true,
        kitJson: true,
      },
    });

    if (!record) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const existingKitJson = readKitJsonObject(record.kitJson);
    const campaigns = readAssetCampaigns(
      existingKitJson.assets,
      record.createdAt.toISOString()
    );
    const campaignIndex = campaigns.findIndex((entry) => entry.id === campaignId);
    if (campaignIndex === -1) {
      return Response.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    }

    const selectedCampaign = campaigns[campaignIndex];
    const nowIso = new Date().toISOString();

    if (action === "generate_brief") {
      const profile = readKitJsonObject(existingKitJson.profile);
      const constraints = readKitJsonObject(profile.constraints);
      const brief = toAiBrief(
        await generateCampaignBriefAI({
          mode: record.mode,
          business: record.business,
          vibe: record.vibe,
          visual: {
            primary:
              typeof existingKitJson.primary === "string"
                ? existingKitJson.primary
                : undefined,
            secondary:
              typeof existingKitJson.secondary === "string"
                ? existingKitJson.secondary
                : undefined,
            accent:
              typeof existingKitJson.accent === "string"
                ? existingKitJson.accent
                : undefined,
            neutrals: Array.isArray(existingKitJson.neutrals)
              ? existingKitJson.neutrals.filter((entry: unknown) => typeof entry === "string")
              : undefined,
            headlineFont:
              typeof existingKitJson.headlineFont === "string"
                ? existingKitJson.headlineFont
                : undefined,
            bodyFont:
              typeof existingKitJson.bodyFont === "string"
                ? existingKitJson.bodyFont
                : undefined,
          },
          profile: {
            name: trimAndClamp(profile.name, 120) || undefined,
            audience: trimAndClamp(profile.audience, 160) || undefined,
            description: trimAndClamp(profile.description, 280) || undefined,
            tone:
              profile.tone && typeof profile.tone === "object" && !Array.isArray(profile.tone)
                ? profile.tone
                : undefined,
          },
          constraints: {
            formality: constraints.formality,
            humor: constraints.humor,
            intensity: constraints.intensity,
            allowWords: normalizeWords(constraints.allowWords, 120, 6),
            avoidWords: normalizeWords(constraints.avoidWords, 120, 6),
          },
          campaign: {
            name: selectedCampaign.name,
            goal: selectedCampaign.goal,
            platform: selectedCampaign.platform,
            ctaStyle: selectedCampaign.ctaStyle,
            notes: selectedCampaign.notes,
            toneOverride: selectedCampaign.toneOverride,
          },
        })
      );

      const nextCampaigns = campaigns.map((campaign, index) =>
        index === campaignIndex
          ? {
              ...campaign,
              updatedAt: nowIso,
              intelligence: {
                brief,
                updatedAt: nowIso,
                source: "ai" as const,
              },
            }
          : campaign
      );

      await prisma.brandKit.update({
        where: { id: record.id },
        data: {
          kitJson: saveCampaigns(existingKitJson, nextCampaigns, nowIso),
        },
      });

      return Response.json({ ok: true });
    }

    const patchResult = readBriefPatch(body.brief);
    if ("error" in patchResult) {
      return Response.json({ ok: false, error: patchResult.error }, { status: 400 });
    }

    const mergedBrief = validateCompleteBrief({
      ...(selectedCampaign.intelligence?.brief ?? {}),
      ...patchResult.patch,
    });
    if (!mergedBrief) {
      return Response.json(
        { ok: false, error: "Brief is incomplete or invalid." },
        { status: 400 }
      );
    }

    const nextCampaigns = campaigns.map((campaign, index) =>
      index === campaignIndex
        ? {
            ...campaign,
            updatedAt: nowIso,
            intelligence: {
              brief: mergedBrief,
              updatedAt: nowIso,
              source: "user" as const,
            },
          }
        : campaign
    );

    await prisma.brandKit.update({
      where: { id: record.id },
      data: {
        kitJson: saveCampaigns(existingKitJson, nextCampaigns, nowIso),
      },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "Could not update campaign intelligence." },
      { status: 500 }
    );
  }
}
