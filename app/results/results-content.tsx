"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { type ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as htmlToImage from "html-to-image";

type BrandKit = {
  primary: string;
  secondary: string;
  neutrals: string[];
  accent: string;
  headlineFont: string;
  bodyFont: string;
};

type RevealStage = "colors" | "fonts" | "profile" | "voice" | "done";
type GenerationStatus = "loading" | "success" | "missing" | "error";

type GeneratePayload = {
  mode: string;
  business: string;
  vibe: string;
  primary?: string;
  secondary?: string;
  guidance?: {
    audiencePrimary: string;
    audienceRefinement?: string;
    visualTone: string[];
    personality: string[];
    avoid: string[];
  };
};

const BRAND_GENERATE_PAYLOAD_KEY = "brand_generate_payload_v1";

const REVEAL_STAGE_ORDER: Record<RevealStage, number> = {
  colors: 0,
  fonts: 1,
  profile: 2,
  voice: 3,
  done: 4,
};

function readGeneratePayload(value: unknown): GeneratePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<GeneratePayload>;

  if (
    typeof candidate.mode !== "string" ||
    typeof candidate.business !== "string" ||
    typeof candidate.vibe !== "string"
  ) {
    return null;
  }

  const payload: GeneratePayload = {
    mode: candidate.mode,
    business: candidate.business,
    vibe: candidate.vibe,
    ...(typeof candidate.primary === "string" ? { primary: candidate.primary } : {}),
    ...(typeof candidate.secondary === "string"
      ? { secondary: candidate.secondary }
      : {}),
  };

  if (
    candidate.guidance &&
    typeof candidate.guidance === "object" &&
    !Array.isArray(candidate.guidance) &&
    typeof candidate.guidance.audiencePrimary === "string"
  ) {
    payload.guidance = {
      audiencePrimary: candidate.guidance.audiencePrimary,
      ...(typeof candidate.guidance.audienceRefinement === "string"
        ? { audienceRefinement: candidate.guidance.audienceRefinement }
        : {}),
      visualTone: Array.isArray(candidate.guidance.visualTone)
        ? candidate.guidance.visualTone.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [],
      personality: Array.isArray(candidate.guidance.personality)
        ? candidate.guidance.personality.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [],
      avoid: Array.isArray(candidate.guidance.avoid)
        ? candidate.guidance.avoid.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [],
    };
  }

  return payload;
}

function readBrandKit(value: unknown): BrandKit | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<BrandKit>;

  if (
    typeof candidate.primary !== "string" ||
    typeof candidate.secondary !== "string" ||
    typeof candidate.accent !== "string" ||
    !Array.isArray(candidate.neutrals) ||
    candidate.neutrals.length !== 4 ||
    candidate.neutrals.some((entry) => typeof entry !== "string") ||
    typeof candidate.headlineFont !== "string" ||
    typeof candidate.bodyFont !== "string"
  ) {
    return null;
  }

  return {
    primary: candidate.primary,
    secondary: candidate.secondary,
    accent: candidate.accent,
    neutrals: [
      candidate.neutrals[0],
      candidate.neutrals[1],
      candidate.neutrals[2],
      candidate.neutrals[3],
    ],
    headlineFont: candidate.headlineFont,
    bodyFont: candidate.bodyFont,
  };
}

export function ResultsContent() {
  const router = useRouter();
  const requestStartedRef = useRef(false);

  const [payload, setPayload] = useState<GeneratePayload | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("loading");
  const [isGenerating, setIsGenerating] = useState(false);
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [stage, setStage] = useState<RevealStage>("colors");
  const [revealRun, setRevealRun] = useState(0);
  const [apiText, setApiText] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const mode = payload?.mode ?? "new";
  const business = payload?.business ?? "saas";
  const vibe = payload?.vibe ?? "minimal";

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.sessionStorage.getItem(BRAND_GENERATE_PAYLOAD_KEY);
      if (!raw) {
        setStatus("missing");
        return;
      }

      const parsed = readGeneratePayload(JSON.parse(raw));
      window.sessionStorage.removeItem(BRAND_GENERATE_PAYLOAD_KEY);

      if (!parsed) {
        setStatus("missing");
        return;
      }

      setPayload(parsed);
      setStatus("loading");
    } catch {
      setStatus("missing");
    }
  }, []);

  useEffect(() => {
    if (!payload || requestStartedRef.current) return;
    requestStartedRef.current = true;

    let canceled = false;

    const run = async () => {
      try {
        setIsGenerating(true);
        setKit(null);
        setApiText("");

        const res = await fetch("/api/brand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const raw = await res.text();
        let data: { text?: string; error?: string } | null = null;
        try {
          data = JSON.parse(raw) as { text?: string; error?: string };
        } catch {
          throw new Error(raw || "Could not parse API response.");
        }

        if (!res.ok) {
          throw new Error(data?.error ?? "Could not generate brand kit.");
        }

        let parsedKit: BrandKit | null = null;
        try {
          parsedKit = readBrandKit(JSON.parse(data?.text ?? ""));
        } catch {
          parsedKit = null;
        }
        if (!parsedKit) {
          throw new Error("Generated brand kit payload was invalid.");
        }

        if (canceled) return;
        setApiText(data?.text ?? "");
        setKit(parsedKit);
        setIsGenerating(false);
        try {
          window.localStorage.removeItem("brand_draft_v1");
        } catch {}
        setRevealRun((current) => current + 1);
        setStatus("success");
      } catch (error: unknown) {
        if (canceled) return;
        const message =
          error instanceof Error ? error.message : "Could not generate brand kit.";
        setIsGenerating(false);
        setErrorMessage(message);
        setStatus("error");
      }
    };

    run();
    return () => {
      canceled = true;
    };
  }, [payload]);

  useEffect(() => {
    if (!kit) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    setStage("colors");
    timers.push(setTimeout(() => setStage("fonts"), 350));
    timers.push(setTimeout(() => setStage("profile"), 750));
    timers.push(setTimeout(() => setStage("voice"), 1150));
    timers.push(setTimeout(() => setStage("done"), 1450));

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [kit, revealRun]);

  const canReveal = (target: RevealStage) =>
    REVEAL_STAGE_ORDER[stage] >= REVEAL_STAGE_ORDER[target];

  const audience =
    business === "saas"
      ? "Product and growth teams"
      : business === "ecom"
        ? "Digitally savvy shoppers"
        : business === "agency"
          ? "Marketing leaders and clients"
          : "Audience-first creators";

  const profileSummary =
    vibe === "minimal"
      ? "Clear, focused identity optimized for consistency."
      : vibe === "bold"
        ? "Confident identity with high-contrast visual choices."
        : vibe === "playful"
          ? "Expressive identity that stays approachable."
          : "Premium identity with refined, editorial direction.";

  const voiceSummary =
    vibe === "minimal"
      ? "Concise and calm with practical clarity."
      : vibe === "bold"
        ? "Direct and confident with strong calls to action."
        : vibe === "playful"
          ? "Friendly and energetic with clear benefit framing."
          : "Polished and authoritative with premium tone.";

  const voiceLines = [
    `Built for ${audience.toLowerCase()}.`,
    `A ${vibe} voice that stays consistent across posts.`,
    `Clear message, confident delivery, repeatable format.`,
  ];

  const bg =
    !kit
      ? "linear-gradient(120deg, #111827 0%, #000 60%, #27272A 140%)"
      : theme === "dark"
        ? `linear-gradient(120deg, ${kit.secondary} 0%, #000 60%, ${kit.primary} 140%)`
        : `linear-gradient(120deg, ${kit.neutrals[0]} 0%, #fff 60%, ${kit.primary} 160%)`;

  if (status === "missing") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h1 className="text-2xl font-semibold tracking-tight">No pending generation</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Start a new brand setup to generate results.
            </p>
            <Link
              href="/new"
              className="mt-5 inline-flex rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
            >
              Go to setup
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h1 className="text-2xl font-semibold tracking-tight">Generation failed</h1>
            <p className="mt-2 text-sm text-zinc-300">
              {errorMessage || "Could not generate your brand kit right now."}
            </p>
            <Link
              href="/new"
              className="mt-5 inline-flex rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
            >
              Back to setup
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-zinc-50" style={{ background: bg }}>
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-zinc-200/80 hover:text-zinc-50"
            >
              ← Back
            </button>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Your branding kit
            </h1>
            <p className="mt-2 text-sm text-zinc-200/80">
              Mode: {mode} • Business: {business} • Vibe: {vibe}
            </p>
            <Link
              href="/kits"
              className="mt-2 inline-block text-sm text-zinc-200/80 underline-offset-4 hover:text-zinc-50 hover:underline"
            >
              View saved kits
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <SignedOut>
              <Link
                href="/sign-in"
                className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/80 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/80 hover:text-white"
              >
                Sign up
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
              <button
                onClick={() => setTheme("light")}
                className={`rounded-xl px-4 py-2 text-sm ${
                  theme === "light"
                    ? "bg-white text-zinc-950"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`rounded-xl px-4 py-2 text-sm ${
                  theme === "dark"
                    ? "bg-white text-zinc-950"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        </div>
        
        {isGenerating && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="text-sm text-white/80">Generating your brand kit…</p>
          </div>
        )}

        {apiText && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="text-sm font-semibold">AI output (MVP)</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-white/80">
              {apiText}
            </pre>
          </div>
        )}


        <div className="mt-10">
          <section className="rounded-3xl border border-white/10 bg-black/25 p-6">
            {kit === null ? (
              <div className="space-y-6">
                <div>
                  <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={`skeleton-color-${i}`}
                        className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/10"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="h-5 w-20 animate-pulse rounded bg-white/10" />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/10" />
                    <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/10" />
                  </div>
                </div>
                <div>
                  <div className="h-5 w-28 animate-pulse rounded bg-white/10" />
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                    <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
                <div>
                  <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                    <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <StagedSection
                  key={`colors-${revealRun}`}
                  show={canReveal("colors")}
                  skeleton={
                    <div>
                      <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/10"
                          />
                        ))}
                      </div>
                    </div>
                  }
                >
                  <h2 className="text-lg font-semibold">Palette</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <ColorCard label="Primary" hex={kit.primary} big />
                    <ColorCard label="Secondary" hex={kit.secondary} />
                    <ColorCard label="Accent" hex={kit.accent} />
                  </div>
                </StagedSection>

                <StagedSection
                  key={`fonts-${revealRun}`}
                  show={canReveal("fonts")}
                  skeleton={
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/10" />
                      <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/10" />
                    </div>
                  }
                >
                  <h2 className="mt-8 text-lg font-semibold">Fonts</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <FontCard title="Font Pairing A" headline={kit.headlineFont} body={kit.bodyFont} />
                    <FontCard title="Font Pairing B" headline="Inter" body="DM Sans" />
                  </div>
                </StagedSection>

                <StagedSection
                  key={`profile-${revealRun}`}
                  show={canReveal("profile")}
                  skeleton={
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="h-5 w-28 animate-pulse rounded bg-white/10" />
                      <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
                      <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/10" />
                    </div>
                  }
                >
                  <h2 className="mt-8 text-lg font-semibold">Brand profile</h2>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white/70">Audience</p>
                    <p className="mt-1 text-sm">{audience}</p>
                    <p className="mt-4 text-sm text-white/70">Direction</p>
                    <p className="mt-1 text-sm">{profileSummary}</p>
                  </div>
                </StagedSection>

                <StagedSection
                  key={`voice-${revealRun}`}
                  show={canReveal("voice")}
                  skeleton={
                    <div className="mt-6">
                      <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
                      <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
                      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/10" />
                    </div>
                  }
                >
                  <h2 className="mt-8 text-lg font-semibold">Brand voice</h2>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white/80">{voiceSummary}</p>
                    <ul className="mt-3 space-y-1 text-sm text-white/75">
                      {voiceLines.map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold">Post previews</h2>
                    <span className="text-sm text-white/70">
                      Templates (MVP) • Brand applied
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <PostMock key={i} kit={kit} variant={i} theme={theme} />
                    ))}
                  </div>
                </StagedSection>

                <button
                  onClick={() => setRevealRun((current) => current + 1)}
                  className="mt-8 w-full rounded-2xl bg-white px-5 py-4 text-base font-semibold text-zinc-950 hover:bg-zinc-50"
                >
                  ✨ Regenerate
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function StagedSection({
  show,
  skeleton,
  children,
}: {
  show: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!show) {
      setEntered(false);
      return;
    }

    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [show]);

  if (!show) return <>{skeleton}</>;

  return (
    <div
      className={`transition-all duration-300 motion-reduce:transition-none ${
        entered
          ? "translate-y-0 opacity-100"
          : "translate-y-1 opacity-0 motion-reduce:translate-y-0"
      }`}
    >
      {children}
    </div>
  );
}

function ColorCard({ label, hex, big = false }: { label: string; hex: string; big?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-white/70">{label}</p>
      <div
        className="mt-3 rounded-2xl border border-white/10"
        style={{ background: hex, height: big ? 110 : 80 }}
      />
      <p className="mt-3 text-sm font-medium">{hex}</p>
    </div>
  );
}

function FontCard({ title, headline, body }: { title: string; headline: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-white/70">{title}</p>
      <p className="mt-3 text-lg font-semibold">{headline} — Headline</p>
      <p className="mt-1 text-sm text-white/80">{body} — Body</p>
      <p className="mt-3 text-xs text-white/60">(We’ll load real fonts next.)</p>
    </div>
  );
}

function PostMock({
  kit,
  variant,
  theme,
}: {
  kit: BrandKit;
  variant: number;
  theme: "light" | "dark";
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const bg =
    theme === "dark"
      ? variant % 3 === 0
        ? kit.secondary
        : variant % 3 === 1
        ? "#0B0B12"
        : "#111827"
      : variant % 3 === 0
      ? kit.neutrals[0]
      : variant % 3 === 1
      ? "#ffffff"
      : "#F8FAFC";

  const accent = variant % 2 === 0 ? kit.primary : kit.accent;
  const text = theme === "dark" ? "#F9FAFB" : "#0F172A";

  async function exportPng() {
    if (!ref.current) return;

    const dataUrl = await htmlToImage.toPng(ref.current, {
      pixelRatio: 2,
      cacheBust: true,
    });

    const link = document.createElement("a");
    link.download = `brand-post-${variant + 1}.png`;
    link.href = dataUrl;
    link.click();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-white/70">
          Template {variant + 1}
        </span>
        <button
          onClick={exportPng}
          className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-zinc-950 hover:bg-zinc-100"
        >
          Export
        </button>
      </div>

      <div
        ref={ref}
        className="relative aspect-square overflow-hidden rounded-xl"
        style={{ background: bg }}
      >
        <div
          className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-70"
          style={{ background: accent }}
        />
        <div
          className="absolute left-4 top-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: accent, color: "#0B0B12" }}
        >
          NEW
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-sm font-semibold" style={{ color: text }}>
            AI pages, but consistent.
          </p>
          <p className="mt-1 text-xs opacity-80" style={{ color: text }}>
            Templates + tokens → clean marketing.
          </p>
        </div>
      </div>
    </div>
  );
}
