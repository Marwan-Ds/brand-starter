import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateCaptionPackAI } from "@/lib/ai/assets";
import { readAssetCampaigns, type AssetCampaign } from "@/lib/assets-campaigns";

export const runtime = "nodejs";

type AssetType = "caption_pack";

type CaptionPackOutput = {
  hooks: [string, string, string];
  captions: [string, string, string];
  notes?: string;
};

type BrandKitMeta = {
  version: number;
  updatedAt?: string;
  profileUpdatedAt?: string;
  voiceUpdatedAt?: string;
  assetsUpdatedAt?: string;
};

type CampaignContextInput = {
  goal: string;
  platform: string;
  ctaStyle?: string;
  toneOverride?: string;
  notes?: string;
};

function trimAndClamp(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function normalizeOptionalField(value: unknown, max: number) {
  const trimmed = trimAndClamp(value, max);
  return trimmed ? trimmed : undefined;
}

function readCreateCampaignContext(body: Record<string, unknown>) {
  const goal = trimAndClamp(body.goal, 80);
  const platform = trimAndClamp(body.platform, 40);
  const ctaStyle = normalizeOptionalField(body.ctaStyle, 30);
  const toneOverride = normalizeOptionalField(body.toneOverride, 60);
  const notes = normalizeOptionalField(body.notes, 280);

  if (goal.length < 3) {
    return { error: "Goal must be 3-80 characters." } as const;
  }

  if (platform.length < 2) {
    return { error: "Platform must be 2-40 characters." } as const;
  }

  if (body.ctaStyle !== undefined && !ctaStyle) {
    return { error: "CTA style must be 2-30 characters." } as const;
  }

  if (body.toneOverride !== undefined && !toneOverride) {
    return { error: "Tone override must be 2-60 characters." } as const;
  }

  return {
    data: {
      goal,
      platform,
      ...(ctaStyle ? { ctaStyle } : {}),
      ...(toneOverride ? { toneOverride } : {}),
      ...(notes ? { notes } : {}),
    } satisfies CampaignContextInput,
  } as const;
}

function readUpdateCampaignContext(body: Record<string, unknown>) {
  const hasGoal = body.goal !== undefined;
  const hasPlatform = body.platform !== undefined;
  const hasCtaStyle = body.ctaStyle !== undefined;
  const hasToneOverride = body.toneOverride !== undefined;
  const hasNotes = body.notes !== undefined;

  if (!hasGoal && !hasPlatform && !hasCtaStyle && !hasToneOverride && !hasNotes) {
    return { error: "No campaign context fields provided." } as const;
  }

  const patch: {
    goal?: string;
    platform?: string;
    ctaStyle?: string;
    toneOverride?: string;
    notes?: string;
  } = {};

  if (hasGoal) {
    const goal = trimAndClamp(body.goal, 80);
    if (goal.length < 3) {
      return { error: "Goal must be 3-80 characters." } as const;
    }
    patch.goal = goal;
  }

  if (hasPlatform) {
    const platform = trimAndClamp(body.platform, 40);
    if (platform.length < 2) {
      return { error: "Platform must be 2-40 characters." } as const;
    }
    patch.platform = platform;
  }

  if (hasCtaStyle) {
    patch.ctaStyle = trimAndClamp(body.ctaStyle, 30);
    if (patch.ctaStyle.length === 1) {
      return { error: "CTA style must be 2-30 characters." } as const;
    }
  }

  if (hasToneOverride) {
    patch.toneOverride = trimAndClamp(body.toneOverride, 60);
    if (patch.toneOverride.length === 1) {
      return { error: "Tone override must be 2-60 characters." } as const;
    }
  }

  if (hasNotes) {
    patch.notes = trimAndClamp(body.notes, 280);
  }

  return { data: patch } as const;
}

function normalizeWordList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const words: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(trimmed);
    if (words.length >= 6) break;
  }

  return words;
}

function readMeta(value: unknown): BrandKitMeta {
  if (!value || typeof value !== "object") {
    return { version: 1 };
  }

  const candidate = value as {
    version?: unknown;
    updatedAt?: unknown;
    profileUpdatedAt?: unknown;
    voiceUpdatedAt?: unknown;
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
    profileUpdatedAt:
      typeof candidate.profileUpdatedAt === "string"
        ? candidate.profileUpdatedAt
        : undefined,
    voiceUpdatedAt:
      typeof candidate.voiceUpdatedAt === "string" ? candidate.voiceUpdatedAt : undefined,
    assetsUpdatedAt:
      typeof candidate.assetsUpdatedAt === "string"
        ? candidate.assetsUpdatedAt
        : undefined,
  };
}

function normalizeOutputList(value: unknown, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, maxLen))
    .filter((entry) => entry.length > 0)
    .slice(0, 3);
}

function normalizeCaptionPackOutput(value: unknown): CaptionPackOutput | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    hooks?: unknown;
    captions?: unknown;
    notes?: unknown;
  };

  const hooks = normalizeOutputList(candidate.hooks, 90);
  const captions = normalizeOutputList(candidate.captions, 500);
  if (hooks.length !== 3 || captions.length !== 3) {
    return null;
  }

  const notes = trimAndClamp(candidate.notes, 280);

  return {
    hooks: [hooks[0], hooks[1], hooks[2]],
    captions: [captions[0], captions[1], captions[2]],
    ...(notes ? { notes } : {}),
  };
}

function containsAvoidWord(text: string, avoidWords: string[]) {
  const normalized = text.toLowerCase();
  return avoidWords.some((word) => normalized.includes(word.toLowerCase()));
}

function hasAvoidWords(output: CaptionPackOutput, avoidWords: string[]) {
  if (avoidWords.length === 0) return false;
  return [...output.hooks, ...output.captions].some((entry) =>
    containsAvoidWord(entry, avoidWords)
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeEntry(value: string, avoidWords: string[], maxLen: number, fallback: string) {
  let next = value;

  for (const avoidWord of avoidWords) {
    const pattern = new RegExp(escapeRegExp(avoidWord), "gi");
    next = next.replace(pattern, "");
  }

  next = next
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
    .slice(0, maxLen);

  return next || fallback;
}

function sanitizeOutput(output: CaptionPackOutput, avoidWords: string[]): CaptionPackOutput {
  return {
    hooks: [
      sanitizeEntry(
        output.hooks[0],
        avoidWords,
        90,
        "Clear value for the right audience."
      ),
      sanitizeEntry(
        output.hooks[1],
        avoidWords,
        90,
        "Consistent message with stronger impact."
      ),
      sanitizeEntry(
        output.hooks[2],
        avoidWords,
        90,
        "A fresh angle that still fits your brand."
      ),
    ],
    captions: [
      sanitizeEntry(
        output.captions[0],
        avoidWords,
        500,
        "Practical caption aligned with your brand voice and CTA."
      ),
      sanitizeEntry(
        output.captions[1],
        avoidWords,
        500,
        "Audience-focused caption that keeps your message clear."
      ),
      sanitizeEntry(
        output.captions[2],
        avoidWords,
        500,
        "Conversion-ready caption tailored to your brand direction."
      ),
    ],
    ...(output.notes ? { notes: output.notes } : {}),
  };
}

async function generateAndNormalize(promptInput: Record<string, unknown>) {
  const raw = await generateCaptionPackAI(
    promptInput as Parameters<typeof generateCaptionPackAI>[0]
  );

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  return normalizeCaptionPackOutput(parsed);
}

function readKitJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";
  if (!id) {
    return Response.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  try {
    const rawBody = await req.json();
    const body =
      rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
        ? (rawBody as Record<string, unknown>)
        : {};

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

    const nowIso = new Date().toISOString();
    const existingKitJson = readKitJsonObject(record.kitJson);
    const campaigns = readAssetCampaigns(
      existingKitJson.assets,
      record.createdAt.toISOString()
    );

    if (body.action === "create_campaign") {
      const name = trimAndClamp(body.name, 60);
      if (name.length < 2) {
        return Response.json(
          { ok: false, error: "Campaign name must be 2-60 characters." },
          { status: 400 }
        );
      }

      const contextResult = readCreateCampaignContext(body);
      if ("error" in contextResult) {
        return Response.json({ ok: false, error: contextResult.error }, { status: 400 });
      }

      const campaignId = randomUUID();
      const nextCampaigns: AssetCampaign[] = [
        {
          id: campaignId,
          name,
          goal: contextResult.data.goal,
          platform: contextResult.data.platform,
          ...(contextResult.data.ctaStyle ? { ctaStyle: contextResult.data.ctaStyle } : {}),
          ...(contextResult.data.toneOverride
            ? { toneOverride: contextResult.data.toneOverride }
            : {}),
          ...(contextResult.data.notes ? { notes: contextResult.data.notes } : {}),
          createdAt: nowIso,
          updatedAt: nowIso,
          items: [],
        },
        ...campaigns,
      ];

      await prisma.brandKit.update({
        where: { id: record.id },
        data: {
          kitJson: saveCampaigns(existingKitJson, nextCampaigns, nowIso),
        },
      });

      return Response.json({ ok: true, campaignId });
    }

    if (body.action === "update_campaign_context") {
      const campaignId = trimAndClamp(body.campaignId, 120);
      if (!campaignId) {
        return Response.json(
          { ok: false, error: "campaignId is required." },
          { status: 400 }
        );
      }

      const campaignIndex = campaigns.findIndex((campaign) => campaign.id === campaignId);
      if (campaignIndex === -1) {
        return Response.json(
          { ok: false, error: "Invalid campaignId." },
          { status: 400 }
        );
      }

      const patchResult = readUpdateCampaignContext(body);
      if ("error" in patchResult) {
        return Response.json({ ok: false, error: patchResult.error }, { status: 400 });
      }

      const nextCampaigns = campaigns.map((campaign, index) => {
        if (index !== campaignIndex) return campaign;

        const nextCampaign: AssetCampaign = {
          ...campaign,
          updatedAt: nowIso,
        };

        if (patchResult.data.goal !== undefined) {
          nextCampaign.goal = patchResult.data.goal;
        }

        if (patchResult.data.platform !== undefined) {
          nextCampaign.platform = patchResult.data.platform;
        }

        if (patchResult.data.ctaStyle !== undefined) {
          if (patchResult.data.ctaStyle) {
            nextCampaign.ctaStyle = patchResult.data.ctaStyle;
          } else {
            delete nextCampaign.ctaStyle;
          }
        }

        if (patchResult.data.toneOverride !== undefined) {
          if (patchResult.data.toneOverride) {
            nextCampaign.toneOverride = patchResult.data.toneOverride;
          } else {
            delete nextCampaign.toneOverride;
          }
        }

        if (patchResult.data.notes !== undefined) {
          if (patchResult.data.notes) {
            nextCampaign.notes = patchResult.data.notes;
          } else {
            delete nextCampaign.notes;
          }
        }

        return nextCampaign;
      });

      await prisma.brandKit.update({
        where: { id: record.id },
        data: {
          kitJson: saveCampaigns(existingKitJson, nextCampaigns, nowIso),
        },
      });

      return Response.json({ ok: true });
    }

    const type = body.type as AssetType | undefined;
    if (type !== "caption_pack") {
      return Response.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }

    const campaignId = trimAndClamp(body.campaignId, 120);
    if (!campaignId) {
      return Response.json(
        { ok: false, error: "campaignId is required." },
        { status: 400 }
      );
    }

    const campaignIndex = campaigns.findIndex((campaign) => campaign.id === campaignId);
    if (campaignIndex === -1) {
      return Response.json({ ok: false, error: "Invalid campaignId." }, { status: 400 });
    }

    const goal = trimAndClamp(body.goal, 120);
    const cta = trimAndClamp(body.cta, 120);
    const topic = trimAndClamp(body.topic, 280);

    if (!goal || !cta) {
      return Response.json(
        { ok: false, error: "goal and cta are required." },
        { status: 400 }
      );
    }

    const profile = readKitJsonObject(existingKitJson.profile);
    const constraints = readKitJsonObject(profile.constraints);
    const voiceAi = readKitJsonObject(existingKitJson.voiceAi);
    const avoidWords = normalizeWordList(constraints.avoidWords);

    const selectedCampaign = campaigns[campaignIndex];

    const promptInput = {
      mode: record.mode,
      business: record.business,
      vibe: record.vibe,
      campaign: {
        id: selectedCampaign.id,
        name: selectedCampaign.name,
        goal: selectedCampaign.goal,
        platform: selectedCampaign.platform,
        ctaStyle: selectedCampaign.ctaStyle,
        toneOverride: selectedCampaign.toneOverride,
        notes: selectedCampaign.notes,
      },
      goal,
      cta,
      ...(topic ? { topic } : {}),
      visual: {
        primary: typeof existingKitJson.primary === "string" ? existingKitJson.primary : undefined,
        secondary:
          typeof existingKitJson.secondary === "string"
            ? existingKitJson.secondary
            : undefined,
        accent: typeof existingKitJson.accent === "string" ? existingKitJson.accent : undefined,
        neutrals: Array.isArray(existingKitJson.neutrals)
          ? existingKitJson.neutrals.filter((entry: unknown) => typeof entry === "string")
          : undefined,
        headlineFont:
          typeof existingKitJson.headlineFont === "string"
            ? existingKitJson.headlineFont
            : undefined,
        bodyFont:
          typeof existingKitJson.bodyFont === "string" ? existingKitJson.bodyFont : undefined,
      },
      profile: {
        name: typeof profile.name === "string" ? profile.name : undefined,
        audience: typeof profile.audience === "string" ? profile.audience : undefined,
        description:
          typeof profile.description === "string" ? profile.description : undefined,
        tone:
          profile.tone && typeof profile.tone === "object" && !Array.isArray(profile.tone)
            ? profile.tone
            : undefined,
        constraints: {
          formality: constraints.formality,
          humor: constraints.humor,
          intensity: constraints.intensity,
          allowWords: normalizeWordList(constraints.allowWords),
          avoidWords,
        },
      },
      constraints: {
        formality: constraints.formality,
        humor: constraints.humor,
        intensity: constraints.intensity,
        allowWords: normalizeWordList(constraints.allowWords),
        avoidWords,
      },
      voiceAi: {
        voiceSummary:
          typeof voiceAi.voiceSummary === "string" ? voiceAi.voiceSummary : undefined,
        guidelines: Array.isArray(voiceAi.guidelines)
          ? voiceAi.guidelines.filter((entry: unknown) => typeof entry === "string")
          : undefined,
        do: Array.isArray(voiceAi.do)
          ? voiceAi.do.filter((entry: unknown) => typeof entry === "string")
          : undefined,
        dont: Array.isArray(voiceAi.dont)
          ? voiceAi.dont.filter((entry: unknown) => typeof entry === "string")
          : undefined,
      },
    };

    let output = await generateAndNormalize(promptInput);
    if (!output) {
      return Response.json(
        { ok: false, error: "Could not generate valid assets." },
        { status: 500 }
      );
    }

    if (hasAvoidWords(output, avoidWords)) {
      const regenerated = await generateAndNormalize(promptInput);
      if (regenerated) {
        output = regenerated;
      }
      if (hasAvoidWords(output, avoidWords)) {
        output = sanitizeOutput(output, avoidWords);
      }
    }

    const nextItem = {
      id: randomUUID(),
      type: "caption_pack",
      createdAt: nowIso,
      input: {
        type: "caption_pack",
        goal,
        cta,
        ...(topic ? { topic } : {}),
      },
      output,
    };

    const nextCampaigns = campaigns.map((campaign, index) =>
      index === campaignIndex
        ? {
            ...campaign,
            updatedAt: nowIso,
            items: [nextItem, ...campaign.items],
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
      { ok: false, error: "Could not generate assets." },
      { status: 500 }
    );
  }
}
