import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { readBrandKit } from "@/lib/read-brand-kit";
import { DeleteKitButton } from "./delete-kit-button";
import { BrandIdentityCard, type BrandProfile } from "./brand-identity-card";
import { BrandCoreAutofillButton } from "./brand-core-autofill-button";
import { BrandRulesCard, type BrandConstraints } from "./brand-rules-card";
import { BrandVoiceCard, type BrandVoiceAi } from "./brand-voice-card";
import { ColorSwatch } from "./color-swatch";
import { AppNav } from "@/components/app-nav";

const GOOGLE_FONT_NAMES = new Set([
  "Inter",
  "Poppins",
  "Montserrat",
  "Roboto",
  "Open Sans",
  "Lato",
  "Raleway",
  "Nunito",
  "Playfair Display",
  "Merriweather",
  "Oswald",
]);

function getGoogleFontUrl(fontName: string): string | null {
  if (!GOOGLE_FONT_NAMES.has(fontName)) return null;
  return `https://fonts.google.com/specimen/${fontName.replace(/ /g, "+")}`;
}

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

function readConstraintWords(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 6);
}

function readProfile(value: unknown): BrandProfile {
  if (!value || typeof value !== "object") return DEFAULT_PROFILE;
  const candidate = value as Partial<BrandProfile> & {
    tone?: Partial<BrandProfile["tone"]>;
  };

  return {
    name: typeof candidate.name === "string" ? candidate.name : "",
    description:
      typeof candidate.description === "string" ? candidate.description : "",
    audience: typeof candidate.audience === "string" ? candidate.audience : "",
    tone: {
      bold: clampTone(candidate.tone?.bold, DEFAULT_PROFILE.tone.bold),
      playful: clampTone(candidate.tone?.playful, DEFAULT_PROFILE.tone.playful),
      formal: clampTone(candidate.tone?.formal, DEFAULT_PROFILE.tone.formal),
      emotional: clampTone(
        candidate.tone?.emotional,
        DEFAULT_PROFILE.tone.emotional
      ),
    },
  };
}

function readConstraints(value: unknown): BrandConstraints {
  if (!value || typeof value !== "object") return DEFAULT_CONSTRAINTS;
  const candidate = value as Partial<BrandConstraints>;

  return {
    formality: clampConstraint(candidate.formality, DEFAULT_CONSTRAINTS.formality),
    humor: clampConstraint(candidate.humor, DEFAULT_CONSTRAINTS.humor),
    intensity: clampConstraint(candidate.intensity, DEFAULT_CONSTRAINTS.intensity),
    allowWords: readConstraintWords(candidate.allowWords),
    avoidWords: readConstraintWords(candidate.avoidWords),
  };
}

function isStringArray(value: unknown, min: number, max: number) {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    value.every((entry) => typeof entry === "string")
  );
}

function readVoiceAi(value: unknown): BrandVoiceAi | null {
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

export default async function KitDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";
  if (!id) notFound();

  const record = await prisma.brandKit.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      mode: true,
      business: true,
      vibe: true,
      kitJson: true,
    },
  });

  if (!record) {
    notFound();
  }

  if (record.userId !== userId) {
    notFound();
  }

  const kit = readBrandKit(record.kitJson);
  if (!kit) {
    notFound();
  }

  const headlineFontUrl = getGoogleFontUrl(kit.headlineFont);
  const bodyFontUrl = getGoogleFontUrl(kit.bodyFont);
  const profile = readProfile(
    (record.kitJson as { profile?: unknown } | null | undefined)?.profile
  );
  const constraints = readConstraints(
    ((record.kitJson as { profile?: { constraints?: unknown } } | null | undefined)
      ?.profile?.constraints)
  );
  const voiceAi = readVoiceAi(
    (record.kitJson as { voiceAi?: unknown } | null | undefined)?.voiceAi
  );
  const kitMeta = (record.kitJson as { meta?: { version?: unknown; updatedAt?: unknown } } | null | undefined)?.meta;
  const version =
    typeof kitMeta?.version === "number" && Number.isFinite(kitMeta.version) && kitMeta.version > 0
      ? Math.floor(kitMeta.version)
      : 1;
  const updatedAt =
    typeof kitMeta?.updatedAt === "string"
      ? kitMeta.updatedAt
      : record.createdAt.toISOString();

  return (
    <>
      <AppNav />
      <main className="min-h-screen bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/kits"
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                ← Back to saved kits
              </Link>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Brand kit</h1>
              <p className="mt-2 text-sm text-zinc-400 capitalize">
                {record.mode} • {record.business} • {record.vibe}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Version v{version} • Last updated {new Date(updatedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="text-sm text-zinc-400">
                {new Date(record.createdAt).toLocaleString()}
              </p>
              <Link
                href={`/kits/${record.id}/assets`}
                className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
              >
                Assets
              </Link>
              <DeleteKitButton id={record.id} />
            </div>
          </div>

          <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-lg font-semibold">Palette</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <ColorSwatch label="Primary" hex={kit.primary} />
              <ColorSwatch label="Secondary" hex={kit.secondary} />
              <ColorSwatch label="Accent" hex={kit.accent} />
            </div>

          <h2 className="mt-8 text-lg font-semibold">Neutrals</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            {kit.neutrals.map((hex) => (
              <ColorSwatch key={hex} label="Neutral" hex={hex} />
            ))}
          </div>

          <h2 className="mt-8 text-lg font-semibold">Fonts</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-sm text-zinc-400">Headline</p>
              {headlineFontUrl ? (
                <a
                  href={headlineFontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${kit.headlineFont} on Google Fonts`}
                  className="mt-2 inline-block text-lg font-semibold text-zinc-100 underline-offset-4 hover:text-white hover:underline"
                >
                  {kit.headlineFont}
                </a>
              ) : (
                <p className="mt-2 text-lg font-semibold">{kit.headlineFont}</p>
              )}
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-sm text-zinc-400">Body</p>
              {bodyFontUrl ? (
                <a
                  href={bodyFontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${kit.bodyFont} on Google Fonts`}
                  className="mt-2 inline-block text-lg font-semibold text-zinc-100 underline-offset-4 hover:text-white hover:underline"
                >
                  {kit.bodyFont}
                </a>
              ) : (
                <p className="mt-2 text-lg font-semibold">{kit.bodyFont}</p>
              )}
            </div>
            </div>
          </section>

          <div className="mt-8">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Auto-fill Brand Core (AI)</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Generates identity + rules you can edit.
                  </p>
                </div>
                <BrandCoreAutofillButton id={record.id} />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <BrandIdentityCard id={record.id} initialProfile={profile} />
          </div>

          <div className="mt-8">
            <BrandRulesCard id={record.id} initialConstraints={constraints} />
          </div>

          <div className="mt-8">
            <BrandVoiceCard id={record.id} initialVoiceAi={voiceAi} />
          </div>
        </div>
      </main>
    </>
  );
}
