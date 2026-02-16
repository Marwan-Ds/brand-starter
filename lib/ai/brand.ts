import OpenAI from "openai";

type GenerateBrandKitAIInput = {
  mode: string;
  business: string;
  vibe: string;
  primary?: string;
  secondary?: string;
};

export async function generateBrandKitAI(
  input: GenerateBrandKitAIInput
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY server environment variable.");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "system",
        content:
          "You are a senior brand designer for modern SaaS marketing.\n" +
          "Return ONLY valid JSON (no markdown, no commentary).\n" +
          "Rules:\n" +
          "1) Avoid generic default palettes. DO NOT use these hexes unless the user explicitly provided them: " +
          "#3B82F6, #2563EB, #1D4ED8, #10B981, #22C55E, #F59E0B, #111827, #0F172A.\n" +
          "2) Palette must feel specific to the requested vibe + business.\n" +
          "3) Ensure good contrast: secondary must be much darker or much lighter than primary.\n" +
          "4) Neutrals must be 4 values from light→dark or dark→light, consistent with the vibe.\n" +
          "Output schema keys EXACTLY: primary, secondary, accent, neutrals (array of 4 hex), headlineFont, bodyFont.\n" +
          "Fonts: pick headlineFont and bodyFont from modern web-safe Google fonts (e.g., Inter, Manrope, Plus Jakarta Sans, Space Grotesk, Sora, DM Sans, IBM Plex Sans).",
      },
      {
        role: "user",
        content: JSON.stringify(input, null, 2),
      },
    ],
  });

  return response.output_text ?? "";
}
