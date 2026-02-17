import { auth } from "@clerk/nextjs/server";
import { generateBrandKitAI } from "@/lib/ai/brand";
import { prisma } from "@/lib/db/prisma";
import type { BrandKit } from "@/lib/types";

export const runtime = "nodejs";

function isBrandKit(value: unknown): value is BrandKit {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BrandKit>;

  return (
    typeof candidate.primary === "string" &&
    typeof candidate.secondary === "string" &&
    typeof candidate.accent === "string" &&
    Array.isArray(candidate.neutrals) &&
    candidate.neutrals.length === 4 &&
    candidate.neutrals.every((entry) => typeof entry === "string") &&
    typeof candidate.headlineFont === "string" &&
    typeof candidate.bodyFont === "string"
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = typeof body?.mode === "string" ? body.mode : "";
    const business = typeof body?.business === "string" ? body.business : "";
    const vibe = typeof body?.vibe === "string" ? body.vibe : "";
    const primary = typeof body?.primary === "string" ? body.primary : undefined;
    const secondary =
      typeof body?.secondary === "string" ? body.secondary : undefined;

    if (!mode || !business || !vibe) {
      return Response.json(
        { error: "Invalid request body. mode, business, and vibe are required." },
        { status: 400 }
      );
    }

    const text = await generateBrandKitAI({
      mode,
      business,
      vibe,
      primary,
      secondary,
    });

    let savedId: string | undefined;
    let parsedKit: BrandKit | null = null;

    try {
      const parsed = JSON.parse(text);
      if (isBrandKit(parsed)) {
        parsedKit = parsed;
      }
    } catch {
      parsedKit = null;
    }

    const { userId } = await auth();
    if (userId && parsedKit) {
      const saved = await prisma.brandKit.create({
        data: {
          userId,
          mode,
          business,
          vibe,
          kitJson: parsedKit,
        },
        select: { id: true },
      });
      savedId = saved.id;
    }

    return Response.json({ text, savedId });
  } catch (err: unknown) {
    console.error("API /api/brand error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
