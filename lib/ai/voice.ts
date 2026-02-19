import OpenAI from "openai";

type Tone = {
  bold: number;
  playful: number;
  formal: number;
  emotional: number;
};

type GenerateBrandVoiceAIInput = {
  mode: string;
  business: string;
  vibe: string;
  profile?: {
    name?: string;
    description?: string;
    audience?: string;
    tone?: Partial<Tone>;
  };
  visual?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    neutrals?: string[];
    headlineFont?: string;
    bodyFont?: string;
  };
};

export async function generateBrandVoiceAI(
  input: GenerateBrandVoiceAIInput
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
          "You are a senior brand strategist for modern marketing teams.\n" +
          "Generate short, clear, marketing-friendly copy.\n" +
          "No profanity, no edgy/offensive language, no unsafe claims.\n" +
          "Return ONLY valid JSON (no markdown, no commentary).\n" +
          "JSON schema keys EXACTLY:\n" +
          "{\n" +
          '  "taglines": string[3],\n' +
          '  "voiceSummary": string,\n' +
          '  "guidelines": string[3..6],\n' +
          '  "do": string[3..6],\n' +
          '  "dont": string[3..6],\n' +
          '  "sampleLines": string[3]\n' +
          "}\n" +
          "Keep each line concise and usable in social and landing-page copy.",
      },
      {
        role: "user",
        content: JSON.stringify(input, null, 2),
      },
    ],
  });

  return response.output_text ?? "";
}
