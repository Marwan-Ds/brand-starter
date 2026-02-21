import OpenAI from "openai";

type GenerateCaptionPackAIInput = {
  mode: string;
  business: string;
  vibe: string;
  campaign?: {
    id?: string;
    name?: string;
    goal?: string;
    platform?: string;
    ctaStyle?: string;
    toneOverride?: string;
    notes?: string;
  };
  goal: string;
  cta: string;
  topic?: string;
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
    tone?: {
      bold?: number;
      playful?: number;
      formal?: number;
      emotional?: number;
    };
    constraints?: {
      formality?: number;
      humor?: number;
      intensity?: number;
      allowWords?: string[];
      avoidWords?: string[];
    };
  };
  constraints?: {
    formality?: number;
    humor?: number;
    intensity?: number;
    allowWords?: string[];
    avoidWords?: string[];
  };
  voiceAi?: {
    voiceSummary?: string;
    guidelines?: string[];
    do?: string[];
    dont?: string[];
  };
};

export async function generateCaptionPackAI(
  input: GenerateCaptionPackAIInput
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
          "You are a senior social copywriter creating brand-aware caption assets.\n" +
          "Return ONLY valid JSON with no markdown or prose.\n" +
          "Write concise, practical hooks and captions aligned to the brand input.\n" +
          "Respect brand constraints and avoid prohibited language.\n" +
          "JSON schema keys EXACTLY:\n" +
          "{\n" +
          '  "angle": string,\n' +
          '  "hooks": [\n' +
          '    { "style": "Curiosity"|"Pain"|"Proof", "text": string },\n' +
          '    { "style": "Curiosity"|"Pain"|"Proof", "text": string },\n' +
          '    { "style": "Curiosity"|"Pain"|"Proof", "text": string }\n' +
          "  ],\n" +
          '  "captions": [\n' +
          '    { "text": string, "ctaLine": string },\n' +
          '    { "text": string, "ctaLine": string },\n' +
          '    { "text": string, "ctaLine": string }\n' +
          "  ]\n" +
          "}\n" +
          "Rules:\n" +
          "- angle: 1 concise sentence, <= 140 chars.\n" +
          "- hooks: exactly 3, each style must be one of Curiosity/Pain/Proof and text <= 120 chars.\n" +
          "- captions: exactly 3, each text <= 500 chars and ctaLine <= 90 chars.\n" +
          "- captions should be CTA-ready and platform-safe.\n" +
          "- respect avoidWords strictly: never include any avoidWords terms.\n" +
          "- use allowWords naturally when it fits; do not force repetition.\n" +
          "- adapt structure and length to platform context (shorter lines for fast-scroll platforms, more context for professional channels).\n" +
          "- adjust energy and punch based on goal and campaign.toneOverride when provided.\n" +
          "- avoid generic filler copy and repetition.",
      },
      {
        role: "user",
        content: JSON.stringify(input, null, 2),
      },
    ],
  });

  return response.output_text ?? "";
}
