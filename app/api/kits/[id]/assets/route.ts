import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateCaptionPackAI } from "@/lib/ai/assets";

export const runtime = "nodejs";

type AssetType = "caption_pack";

type CaptionPackOutput = {
  hooks: [string, string, string];
  captions: [string, string, string];
  notes?: string;
};

type CaptionPackInput = {
  type: AssetType;
  goal: string;
  cta: string;
  topic?: string;
};

type AssetItem = {
  id: string;
  type: AssetType;
  createdAt: string;
  input: CaptionPackInput;
  output: CaptionPackOutput;
};

type BrandKitMeta = {
  version: number;
  updatedAt?: string;
  profileUpdatedAt?: string;
  voiceUpdatedAt?: string;
  assetsUpdatedAt?: string;
};

function trimAndClamp(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
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
    .filter((entry) => entry.length > 0);
}

function normalizeCaptionPackOutput(value: unknown): CaptionPackOutput | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    hooks?: unknown;
    captions?: unknown;
    notes?: unknown;
  };

  const hooks = normalizeOutputList(candidate.hooks, 90).slice(0, 3);
  const captions = normalizeOutputList(candidate.captions, 500).slice(0, 3);
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

function readExistingItems(value: unknown): AssetItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const candidate = value as { items?: unknown };
  if (!Array.isArray(candidate.items)) return [];

  const parsed: AssetItem[] = [];

  for (const item of candidate.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const entry = item as {
      id?: unknown;
      type?: unknown;
      createdAt?: unknown;
      input?: unknown;
      output?: unknown;
    };

    if (
      typeof entry.id !== "string" ||
      entry.type !== "caption_pack" ||
      typeof entry.createdAt !== "string"
    ) {
      continue;
    }

    const output = normalizeCaptionPackOutput(entry.output);
    if (!output) continue;

    const inputObj =
      entry.input && typeof entry.input === "object" && !Array.isArray(entry.input)
        ? (entry.input as {
            type?: unknown;
            goal?: unknown;
            cta?: unknown;
            topic?: unknown;
          })
        : null;

    const goal = trimAndClamp(inputObj?.goal, 120);
    const cta = trimAndClamp(inputObj?.cta, 120);
    if (!goal || !cta) continue;

    const topic = trimAndClamp(inputObj?.topic, 280);

    parsed.push({
      id: entry.id,
      type: "caption_pack",
      createdAt: entry.createdAt,
      input: {
        type: "caption_pack",
        goal,
        cta,
        ...(topic ? { topic } : {}),
      },
      output,
    });
  }

  return parsed;
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
    const body = await req.json();
    const type = body?.type;
    if (type !== "caption_pack") {
      return Response.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }

    const goal = trimAndClamp(body?.goal, 120);
    const cta = trimAndClamp(body?.cta, 120);
    const topic = trimAndClamp(body?.topic, 280);

    if (!goal || !cta) {
      return Response.json(
        { ok: false, error: "goal and cta are required." },
        { status: 400 }
      );
    }

    const record = await prisma.brandKit.findFirst({
      where: { id, userId },
      select: {
        id: true,
        mode: true,
        business: true,
        vibe: true,
        kitJson: true,
      },
    });

    if (!record) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const existingKitJson =
      record.kitJson &&
      typeof record.kitJson === "object" &&
      !Array.isArray(record.kitJson)
        ? (record.kitJson as Record<string, any>)
        : {};

    const profile =
      existingKitJson.profile &&
      typeof existingKitJson.profile === "object" &&
      !Array.isArray(existingKitJson.profile)
        ? (existingKitJson.profile as Record<string, unknown>)
        : {};
    const constraints =
      profile.constraints &&
      typeof profile.constraints === "object" &&
      !Array.isArray(profile.constraints)
        ? (profile.constraints as Record<string, unknown>)
        : {};
    const voiceAi =
      existingKitJson.voiceAi &&
      typeof existingKitJson.voiceAi === "object" &&
      !Array.isArray(existingKitJson.voiceAi)
        ? (existingKitJson.voiceAi as Record<string, unknown>)
        : undefined;
    const avoidWords = normalizeWordList(constraints.avoidWords);

    const promptInput = {
      mode: record.mode,
      business: record.business,
      vibe: record.vibe,
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
      },
      constraints: {
        formality: constraints.formality,
        humor: constraints.humor,
        intensity: constraints.intensity,
        allowWords: normalizeWordList(constraints.allowWords),
        avoidWords,
      },
      voiceAi: voiceAi
        ? {
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
          }
        : undefined,
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

    const nowIso = new Date().toISOString();
    const currentMeta = readMeta(existingKitJson.meta);
    const nextVersion = (currentMeta.version ?? 1) + 1;
    const existingItems = readExistingItems(existingKitJson.assets);

    const nextItem: AssetItem = {
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

    await prisma.brandKit.update({
      where: { id: record.id },
      data: {
        kitJson: {
          ...existingKitJson,
          assets: {
            items: [...existingItems, nextItem],
          },
          meta: {
            ...currentMeta,
            version: nextVersion,
            updatedAt: nowIso,
            assetsUpdatedAt: nowIso,
          },
        } as Prisma.InputJsonValue,
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
