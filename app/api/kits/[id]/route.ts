import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type ToneKey = "bold" | "playful" | "formal" | "emotional";

type BrandProfile = {
  name: string;
  description: string;
  audience: string;
  tone: Record<ToneKey, number>;
};

type BrandConstraints = {
  formality: number;
  humor: number;
  intensity: number;
  allowWords: string[];
  avoidWords: string[];
};

type BrandKitMeta = {
  version: number;
  updatedAt?: string;
  profileUpdatedAt?: string;
  voiceUpdatedAt?: string;
};

const DEFAULT_PROFILE: BrandProfile = {
  name: "",
  description: "",
  audience: "",
  tone: {
    bold: 50,
    playful: 50,
    formal: 50,
    emotional: 50,
  },
};

const DEFAULT_CONSTRAINTS: BrandConstraints = {
  formality: 50,
  humor: 20,
  intensity: 50,
  allowWords: [],
  avoidWords: [],
};

function clampTone(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clampConstraint(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeProfile(value: unknown): BrandProfile | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    name?: unknown;
    description?: unknown;
    audience?: unknown;
    tone?: Partial<Record<ToneKey, unknown>>;
  };

  return {
    name: typeof candidate.name === "string" ? candidate.name : "",
    description: typeof candidate.description === "string" ? candidate.description : "",
    audience: typeof candidate.audience === "string" ? candidate.audience : "",
    tone: {
      bold: clampTone(candidate.tone?.bold, DEFAULT_PROFILE.tone.bold),
      playful: clampTone(candidate.tone?.playful, DEFAULT_PROFILE.tone.playful),
      formal: clampTone(candidate.tone?.formal, DEFAULT_PROFILE.tone.formal),
      emotional: clampTone(candidate.tone?.emotional, DEFAULT_PROFILE.tone.emotional),
    },
  };
}

function normalizeWordArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 6);
}

function normalizeConstraints(value: unknown): BrandConstraints | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    formality?: unknown;
    humor?: unknown;
    intensity?: unknown;
    allowWords?: unknown;
    avoidWords?: unknown;
  };

  return {
    formality: clampConstraint(candidate.formality, DEFAULT_CONSTRAINTS.formality),
    humor: clampConstraint(candidate.humor, DEFAULT_CONSTRAINTS.humor),
    intensity: clampConstraint(candidate.intensity, DEFAULT_CONSTRAINTS.intensity),
    allowWords: normalizeWordArray(candidate.allowWords),
    avoidWords: normalizeWordArray(candidate.avoidWords),
  };
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

export async function PATCH(
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
    const hasProfile = Boolean(body && typeof body === "object" && "profile" in body);
    const hasConstraints = Boolean(
      body && typeof body === "object" && "constraints" in body
    );

    if (!hasProfile && !hasConstraints) {
      return Response.json(
        { ok: false, error: "Missing profile or constraints" },
        { status: 400 }
      );
    }

    const profile = hasProfile ? normalizeProfile(body?.profile) : null;
    if (hasProfile && !profile) {
      return Response.json({ ok: false, error: "Invalid profile" }, { status: 400 });
    }

    const constraints = hasConstraints ? normalizeConstraints(body?.constraints) : null;
    if (hasConstraints && !constraints) {
      return Response.json({ ok: false, error: "Invalid constraints" }, { status: 400 });
    }

    const record = await prisma.brandKit.findUnique({
      where: { id },
      select: { userId: true, kitJson: true },
    });

    if (!record || record.userId !== userId) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const existingKitJson =
      record.kitJson && typeof record.kitJson === "object" && !Array.isArray(record.kitJson)
        ? (record.kitJson as Record<string, any>)
        : {};
    const nowIso = new Date().toISOString();
    const currentMeta = readMeta(existingKitJson.meta);
    const nextVersion = (currentMeta.version ?? 1) + 1;
    const existingProfile =
      existingKitJson.profile &&
      typeof existingKitJson.profile === "object" &&
      !Array.isArray(existingKitJson.profile)
        ? (existingKitJson.profile as Record<string, unknown>)
        : {};

    const nextProfile: Record<string, unknown> = {
      ...existingProfile,
      ...(profile ? profile : {}),
      ...(constraints ? { constraints } : {}),
    };

    await prisma.brandKit.update({
      where: { id },
      data: {
        kitJson: {
          ...existingKitJson,
          profile: nextProfile,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { ok: false, error: message.slice(0, 180) },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const deleted = await prisma.brandKit.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { ok: false, error: message.slice(0, 180) },
      { status: 500 }
    );
  }
}
