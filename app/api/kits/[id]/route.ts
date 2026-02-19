import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type ToneKey = "bold" | "playful" | "formal" | "emotional";

type BrandProfile = {
  name: string;
  description: string;
  audience: string;
  tone: Record<ToneKey, number>;
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

function clampTone(value: unknown, fallback: number) {
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
    const profile = normalizeProfile(body?.profile);
    if (!profile) {
      return Response.json({ ok: false, error: "Invalid profile" }, { status: 400 });
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

    await prisma.brandKit.update({
      where: { id },
      data: {
        kitJson: {
          ...existingKitJson,
          profile,
          meta: {
            ...currentMeta,
            version: nextVersion,
            updatedAt: nowIso,
            profileUpdatedAt: nowIso,
          },
        },
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
