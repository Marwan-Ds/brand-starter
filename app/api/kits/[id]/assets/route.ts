import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateCaptionPackAI } from "@/lib/ai/assets";
import { readAssetCampaigns, type AssetCampaign } from "@/lib/assets-campaigns";

export const runtime = "nodejs";

type AssetType = "caption_pack";
type CaptionPackVariantMode = "hooks_only" | "captions_only" | "ctas_only";
type CaptionPackVariantTone = "softer" | "default" | "bolder";

const HOOK_STYLES = ["Curiosity", "Pain", "Proof"] as const;
const VARIANT_MODES = ["hooks_only", "captions_only", "ctas_only"] as const;
const VARIANT_TONES = ["softer", "default", "bolder"] as const;
type CaptionPackHookStyle = (typeof HOOK_STYLES)[number];
type CaptionPackHook = {
  style: CaptionPackHookStyle;
  text: string;
};
type CaptionPackCaption = {
  text: string;
  ctaLine: string;
};
type CaptionPackOutput = {
  angle: string;
  hooks: [CaptionPackHook, CaptionPackHook, CaptionPackHook];
  captions: [CaptionPackCaption, CaptionPackCaption, CaptionPackCaption];
};

type CaptionPackVariantInfo = {
  mode: CaptionPackVariantMode;
  tone: CaptionPackVariantTone;
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

function isHookStyle(value: unknown): value is CaptionPackHookStyle {
  return (
    typeof value === "string" &&
    (HOOK_STYLES as readonly string[]).includes(value)
  );
}

function isVariantMode(value: unknown): value is CaptionPackVariantMode {
  return (
    typeof value === "string" &&
    (VARIANT_MODES as readonly string[]).includes(value)
  );
}

function isVariantTone(value: unknown): value is CaptionPackVariantTone {
  return (
    typeof value === "string" &&
    (VARIANT_TONES as readonly string[]).includes(value)
  );
}

function toTuple3<T>(items: T[]): [T, T, T] | null {
  if (items.length < 3) return null;
  return [items[0], items[1], items[2]];
}

function normalizeHookEntry(
  value: unknown,
  fallbackStyle: CaptionPackHookStyle
): CaptionPackHook | null {
  if (typeof value === "string") {
    const text = trimAndClamp(value, 120);
    if (!text) return null;
    return { style: fallbackStyle, text };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as { style?: unknown; text?: unknown };
  if (!isHookStyle(candidate.style)) return null;

  const text = trimAndClamp(candidate.text, 120);
  if (!text) return null;

  return {
    style: candidate.style,
    text,
  };
}

function normalizeCaptionEntry(value: unknown): CaptionPackCaption | null {
  if (typeof value === "string") {
    const text = trimAndClamp(value, 500);
    if (!text) return null;
    return { text, ctaLine: "" };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as { text?: unknown; ctaLine?: unknown };
  const text = trimAndClamp(candidate.text, 500);
  if (!text) return null;

  return {
    text,
    ctaLine: trimAndClamp(candidate.ctaLine, 90),
  };
}

function normalizeCaptionPackOutput(
  value: unknown,
  goal: string
): CaptionPackOutput | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    angle?: unknown;
    hooks?: unknown;
    captions?: unknown;
  };

  if (!Array.isArray(candidate.hooks) || !Array.isArray(candidate.captions)) {
    return null;
  }

  const hooks: CaptionPackHook[] = [];
  for (const hook of candidate.hooks) {
    const normalized = normalizeHookEntry(hook, "Curiosity");
    if (!normalized) continue;
    hooks.push(normalized);
    if (hooks.length === 3) break;
  }

  const captions: CaptionPackCaption[] = [];
  for (const caption of candidate.captions) {
    const normalized = normalizeCaptionEntry(caption);
    if (!normalized) continue;
    captions.push(normalized);
    if (captions.length === 3) break;
  }

  const hooksTuple = toTuple3(hooks);
  const captionsTuple = toTuple3(captions);
  if (!hooksTuple || !captionsTuple) return null;

  const angle =
    trimAndClamp(candidate.angle, 140) ||
    trimAndClamp(`Brand-aligned captions for ${goal}`, 140);

  return {
    angle,
    hooks: hooksTuple,
    captions: captionsTuple,
  };
}

function containsAvoidWord(text: string, avoidWords: string[]) {
  const normalized = text.toLowerCase();
  return avoidWords.some((word) => normalized.includes(word.toLowerCase()));
}

function hasAvoidWords(output: CaptionPackOutput, avoidWords: string[]) {
  if (avoidWords.length === 0) return false;
  return [
    output.angle,
    ...output.hooks.map((entry) => entry.text),
    ...output.captions.map((entry) => entry.text),
    ...output.captions.map((entry) => entry.ctaLine),
  ].some((entry) =>
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

function sanitizeOptionalEntry(value: string, avoidWords: string[], maxLen: number) {
  let next = value;

  for (const avoidWord of avoidWords) {
    const pattern = new RegExp(escapeRegExp(avoidWord), "gi");
    next = next.replace(pattern, "");
  }

  return next
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
    .slice(0, maxLen);
}

function sanitizeOutput(output: CaptionPackOutput, avoidWords: string[]): CaptionPackOutput {
  return {
    angle: sanitizeEntry(
      output.angle,
      avoidWords,
      140,
      "Brand-aligned captions for the selected goal."
    ),
    hooks: [
      {
        style: output.hooks[0].style,
        text: sanitizeEntry(
          output.hooks[0].text,
          avoidWords,
          120,
          "Clear value for the right audience."
        ),
      },
      {
        style: output.hooks[1].style,
        text: sanitizeEntry(
          output.hooks[1].text,
          avoidWords,
          120,
          "Consistent message with stronger impact."
        ),
      },
      {
        style: output.hooks[2].style,
        text: sanitizeEntry(
          output.hooks[2].text,
          avoidWords,
          120,
          "A fresh angle that still fits your brand."
        ),
      },
    ],
    captions: [
      {
        text: sanitizeEntry(
          output.captions[0].text,
          avoidWords,
          500,
          "Practical caption aligned with your brand voice and CTA."
        ),
        ctaLine: sanitizeOptionalEntry(output.captions[0].ctaLine, avoidWords, 90),
      },
      {
        text: sanitizeEntry(
          output.captions[1].text,
          avoidWords,
          500,
          "Audience-focused caption that keeps your message clear."
        ),
        ctaLine: sanitizeOptionalEntry(output.captions[1].ctaLine, avoidWords, 90),
      },
      {
        text: sanitizeEntry(
          output.captions[2].text,
          avoidWords,
          500,
          "Conversion-ready caption tailored to your brand direction."
        ),
        ctaLine: sanitizeOptionalEntry(output.captions[2].ctaLine, avoidWords, 90),
      },
    ],
  };
}

function mergeVariantOutput(
  parent: CaptionPackOutput,
  generated: CaptionPackOutput,
  mode: CaptionPackVariantMode
): CaptionPackOutput {
  if (mode === "hooks_only") {
    return {
      angle: parent.angle,
      hooks: generated.hooks,
      captions: parent.captions,
    };
  }

  if (mode === "captions_only") {
    return {
      angle: parent.angle,
      hooks: parent.hooks,
      captions: generated.captions,
    };
  }

  return {
    angle: parent.angle,
    hooks: parent.hooks,
    captions: [
      { text: parent.captions[0].text, ctaLine: generated.captions[0].ctaLine },
      { text: parent.captions[1].text, ctaLine: generated.captions[1].ctaLine },
      { text: parent.captions[2].text, ctaLine: generated.captions[2].ctaLine },
    ],
  };
}

function sanitizeVariantOutput(
  output: CaptionPackOutput,
  parent: CaptionPackOutput,
  mode: CaptionPackVariantMode,
  avoidWords: string[]
): CaptionPackOutput {
  if (mode === "hooks_only") {
    return {
      angle: parent.angle,
      hooks: [
        {
          style: output.hooks[0].style,
          text: sanitizeEntry(
            output.hooks[0].text,
            avoidWords,
            120,
            "Clear value for the right audience."
          ),
        },
        {
          style: output.hooks[1].style,
          text: sanitizeEntry(
            output.hooks[1].text,
            avoidWords,
            120,
            "Consistent message with stronger impact."
          ),
        },
        {
          style: output.hooks[2].style,
          text: sanitizeEntry(
            output.hooks[2].text,
            avoidWords,
            120,
            "A fresh angle that still fits your brand."
          ),
        },
      ],
      captions: parent.captions,
    };
  }

  if (mode === "captions_only") {
    return {
      angle: parent.angle,
      hooks: parent.hooks,
      captions: [
        {
          text: sanitizeEntry(
            output.captions[0].text,
            avoidWords,
            500,
            "Practical caption aligned with your brand voice and CTA."
          ),
          ctaLine: sanitizeOptionalEntry(output.captions[0].ctaLine, avoidWords, 90),
        },
        {
          text: sanitizeEntry(
            output.captions[1].text,
            avoidWords,
            500,
            "Audience-focused caption that keeps your message clear."
          ),
          ctaLine: sanitizeOptionalEntry(output.captions[1].ctaLine, avoidWords, 90),
        },
        {
          text: sanitizeEntry(
            output.captions[2].text,
            avoidWords,
            500,
            "Conversion-ready caption tailored to your brand direction."
          ),
          ctaLine: sanitizeOptionalEntry(output.captions[2].ctaLine, avoidWords, 90),
        },
      ],
    };
  }

  return {
    angle: parent.angle,
    hooks: parent.hooks,
    captions: [
      {
        text: parent.captions[0].text,
        ctaLine: sanitizeOptionalEntry(output.captions[0].ctaLine, avoidWords, 90),
      },
      {
        text: parent.captions[1].text,
        ctaLine: sanitizeOptionalEntry(output.captions[1].ctaLine, avoidWords, 90),
      },
      {
        text: parent.captions[2].text,
        ctaLine: sanitizeOptionalEntry(output.captions[2].ctaLine, avoidWords, 90),
      },
    ],
  };
}

async function generateAndNormalize(promptInput: Record<string, unknown>, goal: string) {
  const raw = await generateCaptionPackAI(
    promptInput as Parameters<typeof generateCaptionPackAI>[0]
  );

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  return normalizeCaptionPackOutput(parsed, goal);
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

    if (body.action === "variant_caption_pack") {
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

      const parentItemId = trimAndClamp(body.parentItemId, 120);
      if (!parentItemId) {
        return Response.json(
          { ok: false, error: "parentItemId is required." },
          { status: 400 }
        );
      }

      if (!isVariantMode(body.mode)) {
        return Response.json({ ok: false, error: "Invalid mode." }, { status: 400 });
      }
      if (!isVariantTone(body.tone)) {
        return Response.json({ ok: false, error: "Invalid tone." }, { status: 400 });
      }

      const mode = body.mode;
      const tone = body.tone;
      const selectedCampaign = campaigns[campaignIndex];
      const parentItem = selectedCampaign.items.find((item) => item.id === parentItemId);
      if (!parentItem) {
        return Response.json({ ok: false, error: "Parent item not found." }, { status: 400 });
      }

      if (parentItem.type !== "caption_pack" || parentItem.outputVersion !== 2) {
        return Response.json(
          { ok: false, error: "Parent must be a caption pack V2 item." },
          { status: 400 }
        );
      }
      if (parentItem.parentId) {
        return Response.json(
          { ok: false, error: "Parent item must be a top-level caption pack." },
          { status: 400 }
        );
      }

      const goal = trimAndClamp(parentItem.input.goal, 120);
      const cta = trimAndClamp(parentItem.input.cta, 120);
      const topic = trimAndClamp(parentItem.input.topic, 280);
      if (!goal || !cta) {
        return Response.json(
          { ok: false, error: "Parent input is missing goal/cta." },
          { status: 400 }
        );
      }

      const parentOutput = normalizeCaptionPackOutput(parentItem.output, goal);
      if (!parentOutput) {
        return Response.json(
          { ok: false, error: "Parent output is invalid." },
          { status: 400 }
        );
      }

      const profile = readKitJsonObject(existingKitJson.profile);
      const constraints = readKitJsonObject(profile.constraints);
      const voiceAi = readKitJsonObject(existingKitJson.voiceAi);
      const avoidWords = normalizeWordList(constraints.avoidWords);

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
        variantRequest: {
          mode,
          tone,
        },
        reference: {
          parentItemId,
          parentOutput,
          keepUnchanged:
            mode === "hooks_only"
              ? "Keep angle and captions unchanged."
              : mode === "captions_only"
                ? "Keep angle and hooks unchanged."
                : "Keep angle, hooks, and caption text unchanged. Update ctaLine only.",
        },
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

      let generated = await generateAndNormalize(promptInput, goal);
      if (!generated) {
        return Response.json(
          { ok: false, error: "Could not generate valid assets." },
          { status: 500 }
        );
      }

      let mergedOutput = mergeVariantOutput(parentOutput, generated, mode);
      if (hasAvoidWords(mergedOutput, avoidWords)) {
        const regenerated = await generateAndNormalize(promptInput, goal);
        if (regenerated) {
          generated = regenerated;
          mergedOutput = mergeVariantOutput(parentOutput, regenerated, mode);
        }
      }

      const nextOutput = sanitizeVariantOutput(
        mergedOutput,
        parentOutput,
        mode,
        avoidWords
      );

      const nextItem = {
        id: randomUUID(),
        type: "caption_pack",
        outputVersion: 2,
        createdAt: nowIso,
        parentId: parentItemId,
        variant: {
          mode,
          tone,
        } satisfies CaptionPackVariantInfo,
        input: {
          ...parentItem.input,
          mode,
          tone,
        },
        output: nextOutput,
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

    let output = await generateAndNormalize(promptInput, goal);
    if (!output) {
      return Response.json(
        { ok: false, error: "Could not generate valid assets." },
        { status: 500 }
      );
    }

    if (hasAvoidWords(output, avoidWords)) {
      const regenerated = await generateAndNormalize(promptInput, goal);
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
      outputVersion: 2,
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
