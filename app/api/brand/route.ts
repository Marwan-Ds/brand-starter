import { generateBrandKitAI } from "@/lib/ai/brand";

export const runtime = "nodejs";

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

    return Response.json({ text });
  } catch (err: unknown) {
    console.error("API /api/brand error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
