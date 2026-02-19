import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { generateBrandVoiceAI } from "@/lib/ai/voice";

export const runtime = "nodejs";

type BrandVoiceAi = {
  taglines: [string, string, string];
  voiceSummary: string;
  guidelines: string[];
  do: string[];
  dont: string[];
  sampleLines: [string, string, string];
};

type BrandKitMeta = {
  version: number;
  updatedAt?: string;
  profileUpdatedAt?: string;
  voiceUpdatedAt?: string;
};

function isStringArray(value: unknown, min: number, max: number) {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every((entry) => typeof entry === "string")
  );
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

function readBrandVoiceAi(value: unknown): BrandVoiceAi | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    taglines?: unknown;
    voiceSummary?: unknown;
    guidelines?: unknown;
    do?: unknown;
    dont?: unknown;
    sampleLines?: unknown;
  };

  if (
    !isStringArray(candidate.taglines, 3, 3) ||
    typeof candidate.voiceSummary !== "string" ||
    !isStringArray(candidate.guidelines, 3, 6) ||
    !isStringArray(candidate.do, 3, 6) ||
    !isStringArray(candidate.dont, 3, 6) ||
    !isStringArray(candidate.sampleLines, 3, 3)
  ) {
    return null;
  }

  const taglines = candidate.taglines as string[];
  const guidelines = candidate.guidelines as string[];
  const doList = candidate.do as string[];
  const dontList = candidate.dont as string[];
  const sampleLines = candidate.sampleLines as string[];

  return {
    taglines: [taglines[0], taglines[1], taglines[2]],
    voiceSummary: candidate.voiceSummary,
    guidelines,
    do: doList,
    dont: dontList,
    sampleLines: [sampleLines[0], sampleLines[1], sampleLines[2]],
  };
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
    const record = await prisma.brandKit.findUnique({
      where: { id },
      select: {
        userId: true,
        mode: true,
        business: true,
        vibe: true,
        kitJson: true,
      },
    });

    if (!record || record.userId !== userId) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const existingKitJson =
      record.kitJson &&
      typeof record.kitJson === "object" &&
      !Array.isArray(record.kitJson)
        ? (record.kitJson as Record<string, any>)
        : {};

    const promptInput = {
      mode: record.mode,
      business: record.business,
      vibe: record.vibe,
      profile:
        existingKitJson.profile && typeof existingKitJson.profile === "object"
          ? existingKitJson.profile
          : undefined,
      visual: {
        primary: existingKitJson.primary,
        secondary: existingKitJson.secondary,
        accent: existingKitJson.accent,
        neutrals: Array.isArray(existingKitJson.neutrals)
          ? existingKitJson.neutrals
          : undefined,
        headlineFont: existingKitJson.headlineFont,
        bodyFont: existingKitJson.bodyFont,
      },
    };

    const raw = await generateBrandVoiceAI(promptInput);

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    const voiceAi = readBrandVoiceAi(parsed);
    if (!voiceAi) {
      return Response.json(
        { ok: false, error: "AI returned invalid voice suggestions." },
        { status: 500 }
      );
    }
    const nowIso = new Date().toISOString();
    const currentMeta = readMeta(existingKitJson.meta);
    const nextVersion = (currentMeta.version ?? 1) + 1;

    await prisma.brandKit.update({
      where: { id },
      data: {
        kitJson: {
          ...existingKitJson,
          voiceAi,
          meta: {
            ...currentMeta,
            version: nextVersion,
            updatedAt: nowIso,
            voiceUpdatedAt: nowIso,
          },
        },
      },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "Could not generate voice suggestions." },
      { status: 500 }
    );
  }
}
