import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateBrandCoreAI } from "@/lib/ai/brand-core";

export const runtime = "nodejs";

type ToneKey = "bold" | "playful" | "formal" | "emotional";

type BrandProfile = {
  name: string;
  audience: string;
  description: string;
  tone: Record<ToneKey, number>;
};

type BrandConstraints = {
  formality: number;
  humor: number;
  intensity: number;
  allowWords: string[];
  avoidWords: string[];
};

type BrandCoreResult = {
  profile: BrandProfile;
  constraints: BrandConstraints;
};

type BrandKitMeta = {
  version: number;
  updatedAt?: string;
  profileUpdatedAt?: string;
  voiceUpdatedAt?: string;
};

function clampPercent(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function trimText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWordList(value: unknown) {
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
  };
}

function readExistingProfile(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeCore(value: unknown): BrandCoreResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    profile?: unknown;
    constraints?: unknown;
  };
  if (!candidate.profile || typeof candidate.profile !== "object") return null;
  if (!candidate.constraints || typeof candidate.constraints !== "object") return null;

  const profileCandidate = candidate.profile as {
    name?: unknown;
    audience?: unknown;
    description?: unknown;
    tone?: Partial<Record<ToneKey, unknown>>;
  };
  const constraintsCandidate = candidate.constraints as {
    formality?: unknown;
    humor?: unknown;
    intensity?: unknown;
    allowWords?: unknown;
    avoidWords?: unknown;
  };

  const normalized: BrandCoreResult = {
    profile: {
      name: trimText(profileCandidate.name),
      audience: trimText(profileCandidate.audience),
      description: trimText(profileCandidate.description),
      tone: {
        bold: clampPercent(profileCandidate.tone?.bold, 50),
        playful: clampPercent(profileCandidate.tone?.playful, 50),
        formal: clampPercent(profileCandidate.tone?.formal, 50),
        emotional: clampPercent(profileCandidate.tone?.emotional, 50),
      },
    },
    constraints: {
      formality: clampPercent(constraintsCandidate.formality, 50),
      humor: clampPercent(constraintsCandidate.humor, 20),
      intensity: clampPercent(constraintsCandidate.intensity, 50),
      allowWords: normalizeWordList(constraintsCandidate.allowWords),
      avoidWords: normalizeWordList(constraintsCandidate.avoidWords),
    },
  };

  if (normalized.constraints.allowWords.length < 3) {
    return null;
  }

  return normalized;
}

export async function POST(
  _req: Request,
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
    const record = await prisma.brandKit.findFirst({
      where: { id, userId },
      select: {
        id: true,
        userId: true,
        mode: true,
        business: true,
        vibe: true,
        createdAt: true,
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

    const existingProfile = readExistingProfile(existingKitJson.profile);
    const existingConstraints = readExistingProfile(existingProfile.constraints);

    const raw = await generateBrandCoreAI({
      mode: record.mode,
      business: record.business,
      vibe: record.vibe,
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
        name: trimText(existingProfile.name),
        audience: trimText(existingProfile.audience),
        description: trimText(existingProfile.description),
      },
      constraints: {
        formality: clampPercent(existingConstraints.formality, 50),
        humor: clampPercent(existingConstraints.humor, 20),
        intensity: clampPercent(existingConstraints.intensity, 50),
        allowWords: normalizeWordList(existingConstraints.allowWords),
        avoidWords: normalizeWordList(existingConstraints.avoidWords),
      },
    });

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    const core = normalizeCore(parsed);
    if (!core) {
      return Response.json(
        { ok: false, error: "Could not generate valid brand core." },
        { status: 500 }
      );
    }

    const existingName = trimText(existingProfile.name);
    const existingAudience = trimText(existingProfile.audience);
    const existingDescription = trimText(existingProfile.description);
    const existingAllowWords = normalizeWordList(existingConstraints.allowWords);

    const nextConstraints: BrandConstraints = {
      ...core.constraints,
      allowWords:
        existingAllowWords.length >= 3
          ? existingAllowWords
          : core.constraints.allowWords,
    };

    if (nextConstraints.allowWords.length < 3) {
      return Response.json(
        { ok: false, error: "Could not generate valid brand core." },
        { status: 500 }
      );
    }

    const nowIso = new Date().toISOString();
    const currentMeta = readMeta(existingKitJson.meta);
    const nextVersion = (currentMeta.version ?? 1) + 1;

    await prisma.brandKit.update({
      where: { id: record.id },
      data: {
        kitJson: {
          ...existingKitJson,
          profile: {
            ...existingProfile,
            name: existingName || core.profile.name,
            audience: existingAudience || core.profile.audience,
            description: existingDescription || core.profile.description,
            tone: core.profile.tone,
            constraints: nextConstraints,
          },
          meta: {
            ...currentMeta,
            version: nextVersion,
            updatedAt: nowIso,
            profileUpdatedAt: nowIso,
          },
        } as Prisma.InputJsonValue,
      },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "Could not generate brand core." },
      { status: 500 }
    );
  }
}
