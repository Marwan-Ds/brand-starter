import OpenAI from "openai";

type Tone = {
  bold: number;
  playful: number;
  formal: number;
  emotional: number;
};

type Constraints = {
  formality: number;
  humor: number;
  intensity: number;
  allowWords: string[];
  avoidWords: string[];
};

type GenerateBrandCoreAIInput = {
  mode: string;
  business: string;
  vibe: string;
  visual?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    neutrals?: string[];
    headlineFont?: string;
    bodyFont?: string;
  };
  profile?: {
    name?: string;
    audience?: string;
    description?: string;
    tone?: Partial<Tone>;
  };
  constraints?: Partial<Constraints>;
};

export async function generateBrandCoreAI(
  input: GenerateBrandCoreAIInput
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
          "You are a senior brand strategist creating practical, specific brand operating rules.\n" +
          "Return ONLY valid JSON (no markdown, no commentary).\n" +
          "Keep outputs concise and non-generic.\n" +
          "Rules:\n" +
          "1) name: short and brandable.\n" +
          "2) audience: specific and concrete.\n" +
          "3) description: 1-2 sentences.\n" +
          "4) tone and constraints sliders: integers 0..100.\n" +
          "5) allowWords length must be 3..6.\n" +
          "6) avoidWords length must be 0..6.\n" +
          "7) Avoid profanity and unsafe/offensive language.\n" +
          "JSON schema keys EXACTLY:\n" +
          "{\n" +
          '  "profile": {\n' +
          '    "name": string,\n' +
          '    "audience": string,\n' +
          '    "description": string,\n' +
          '    "tone": { "bold": number, "playful": number, "formal": number, "emotional": number }\n' +
          "  },\n" +
          '  "constraints": {\n' +
          '    "formality": number,\n' +
          '    "humor": number,\n' +
          '    "intensity": number,\n' +
          '    "allowWords": string[],\n' +
          '    "avoidWords": string[]\n' +
          "  }\n" +
          "}",
      },
      {
        role: "user",
        content: JSON.stringify(input, null, 2),
      },
    ],
  });

  return response.output_text ?? "";
}
