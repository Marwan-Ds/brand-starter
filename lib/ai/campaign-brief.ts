import OpenAI from "openai";

export type CampaignBrief = {
  angle: string;
  promise: string;
  proofPoints: [string, string, string];
  objections: Array<{ objection: string; response: string }>;
  pillars: [string, string, string];
  do: string[];
  dont: string[];
};

type GenerateCampaignBriefAIInput = {
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
    tone?: {
      bold?: number;
      playful?: number;
      formal?: number;
      emotional?: number;
    };
  };
  constraints?: {
    formality?: number;
    humor?: number;
    intensity?: number;
    allowWords?: string[];
    avoidWords?: string[];
  };
  campaign: {
    name?: string;
    goal: string;
    platform: string;
    ctaStyle?: string;
    notes?: string;
    toneOverride?: string;
  };
};

function trimAndClamp(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function readStringList(
  value: unknown,
  min: number,
  max: number,
  itemMax: number,
  exact?: number
) {
  if (!Array.isArray(value)) return null;
  const list = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, itemMax))
    .filter((entry) => entry.length > 0);

  if (exact !== undefined) {
    if (list.length !== exact) return null;
  } else if (list.length < min || list.length > max) {
    return null;
  }

  return list;
}

function normalizeCampaignBrief(value: unknown): CampaignBrief | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as {
    angle?: unknown;
    promise?: unknown;
    proofPoints?: unknown;
    objections?: unknown;
    pillars?: unknown;
    do?: unknown;
    dont?: unknown;
  };

  const angle = trimAndClamp(candidate.angle, 180);
  const promise = trimAndClamp(candidate.promise, 200);
  const proofPoints = readStringList(candidate.proofPoints, 3, 3, 180, 3);
  const pillars = readStringList(candidate.pillars, 3, 3, 140, 3);
  const doList = readStringList(candidate.do, 3, 6, 120);
  const dontList = readStringList(candidate.dont, 3, 6, 120);

  if (!angle || !promise || !proofPoints || !pillars || !doList || !dontList) {
    return null;
  }

  if (!Array.isArray(candidate.objections)) return null;
  const objections = candidate.objections
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const pair = entry as { objection?: unknown; response?: unknown };
      const objection = trimAndClamp(pair.objection, 180);
      const response = trimAndClamp(pair.response, 220);
      if (!objection || !response) return null;
      return { objection, response };
    })
    .filter((entry): entry is { objection: string; response: string } => entry !== null);

  if (objections.length < 2 || objections.length > 3) return null;

  return {
    angle,
    promise,
    proofPoints: [proofPoints[0], proofPoints[1], proofPoints[2]],
    objections,
    pillars: [pillars[0], pillars[1], pillars[2]],
    do: doList,
    dont: dontList,
  };
}

export async function generateCampaignBriefAI(
  input: GenerateCampaignBriefAIInput
): Promise<CampaignBrief> {
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
          "You are a senior campaign strategist producing a concise campaign brief.\n" +
          "Return ONLY valid JSON, no markdown and no extra prose.\n" +
          "Use non-generic language and align tightly with the provided brand + campaign context.\n" +
          "Respect avoidWords strictly and prefer allowWords naturally.\n" +
          "Keep copy concise and practical for execution.\n" +
          "JSON schema keys EXACTLY:\n" +
          "{\n" +
          '  "angle": string,\n' +
          '  "promise": string,\n' +
          '  "proofPoints": [string, string, string],\n' +
          '  "objections": [\n' +
          '    { "objection": string, "response": string },\n' +
          '    { "objection": string, "response": string }\n' +
          "  ],\n" +
          '  "pillars": [string, string, string],\n' +
          '  "do": string[],\n' +
          '  "dont": string[]\n' +
          "}\n" +
          "Rules:\n" +
          "- proofPoints must be exactly 3.\n" +
          "- pillars must be exactly 3.\n" +
          "- objections must be 2 to 3 items.\n" +
          "- do and dont must be 3 to 6 items each.\n" +
          "- keep each line short and execution-ready.",
      },
      {
        role: "user",
        content: JSON.stringify(input, null, 2),
      },
    ],
  });

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(response.output_text ?? "");
  } catch {
    parsed = null;
  }

  const normalized = normalizeCampaignBrief(parsed);
  if (!normalized) {
    throw new Error("Invalid campaign brief output");
  }

  return normalized;
}
