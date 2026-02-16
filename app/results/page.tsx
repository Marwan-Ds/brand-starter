"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import * as htmlToImage from "html-to-image";

type BrandKit = {
  primary: string;
  secondary: string;
  neutrals: string[];
  accent: string;
  headlineFont: string;
  bodyFont: string;
};

function clampHex(hex: string, fallback: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : fallback;
}

function generateBrandKit(params: {
  mode: string;
  business: string;
  vibe: string;
  primary?: string;
  secondary?: string;
}): BrandKit {
  const presets: Record<string, BrandKit> = {
    minimal: {
      primary: "#3B82F6",
      secondary: "#111827",
      neutrals: ["#F9FAFB", "#E5E7EB", "#9CA3AF", "#111827"],
      accent: "#10B981",
      headlineFont: "Inter",
      bodyFont: "Inter",
    },
    bold: {
      primary: "#8B5CF6",
      secondary: "#111827",
      neutrals: ["#0B0B12", "#111827", "#A1A1AA", "#FAFAFA"],
      accent: "#F97316",
      headlineFont: "Space Grotesk",
      bodyFont: "Inter",
    },
    playful: {
      primary: "#22C55E",
      secondary: "#111827",
      neutrals: ["#F8FAFC", "#E2E8F0", "#94A3B8", "#0F172A"],
      accent: "#EC4899",
      headlineFont: "DM Sans",
      bodyFont: "Inter",
    },
    premium: {
      primary: "#BE9D5F",
      secondary: "#0B1220",
      neutrals: ["#05070C", "#0B1220", "#8B93A7", "#F6F2E8"],
      accent: "#60A5FA",
      headlineFont: "Cormorant Garamond",
      bodyFont: "Inter",
    },
  };

  const base = presets[params.vibe] ?? presets.minimal;
  const primary = clampHex(params.primary ?? base.primary, base.primary);
  const secondary = clampHex(params.secondary ?? base.secondary, base.secondary);
  return { ...base, primary, secondary };
}

function ResultsContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const mode = sp.get("mode") ?? "new";
  const business = sp.get("business") ?? "saas";
  const vibe = sp.get("vibe") ?? "minimal";
  const primary = sp.get("primary") ?? undefined;
  const secondary = sp.get("secondary") ?? undefined;
  const ai = sp.get("ai") ?? "";
  const aiKit = useMemo(() => {
  if (!ai) return null;
  try {
    return JSON.parse(ai) as Partial<BrandKit>;
  } catch {
    return null;
  }
}, [ai]);


  const baseKit = useMemo(
  () => generateBrandKit({ mode, business, vibe, primary, secondary }),
  [mode, business, vibe, primary, secondary]
);

const kit = {
  ...baseKit,
  ...(aiKit ?? {}),
};


  const [phase, setPhase] = useState<"loading" | "skeleton" | "ready">("loading");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("skeleton"), 700);
    const t2 = setTimeout(() => setPhase("ready"), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const bg =
    theme === "dark"
      ? `linear-gradient(120deg, ${kit.secondary} 0%, #000 60%, ${kit.primary} 140%)`
      : `linear-gradient(120deg, ${kit.neutrals[0]} 0%, #fff 60%, ${kit.primary} 160%)`;

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
        
        {ai && (
  <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
    <p className="text-sm font-semibold">AI output (MVP)</p>
    <pre className="mt-2 whitespace-pre-wrap text-xs text-white/80">
      {ai}
    </pre>
  </div>
)}


        <div className="mt-10">
          <AnimatePresence mode="wait">
            {phase !== "ready" ? (
              <motion.div
                key="wip"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl border border-white/10 bg-black/25 p-6"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className="h-3 w-3 rounded-full bg-white"
                    animate={{ scale: [1, 1.6, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <p className="text-sm text-white/80">
                    {phase === "loading" ? "Working on it…" : "Finalizing your kit…"}
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-2xl bg-white/10" />
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="h-20 rounded-2xl bg-white/10" />
                  <div className="h-20 rounded-2xl bg-white/10" />
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl bg-white/10" />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <section className="rounded-3xl border border-white/10 bg-black/25 p-6">
                  <h2 className="text-lg font-semibold">Palette</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <ColorCard label="Primary" hex={kit.primary} big />
                    <ColorCard label="Secondary" hex={kit.secondary} />
                    <ColorCard label="Accent" hex={kit.accent} />
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <FontCard title="Font Pairing A" headline={kit.headlineFont} body={kit.bodyFont} />
                    <FontCard title="Font Pairing B" headline="Inter" body="DM Sans" />
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

                  <button
                    onClick={() => {
                      setPhase("loading");
                      setTimeout(() => setPhase("skeleton"), 500);
                      setTimeout(() => setPhase("ready"), 1300);
                    }}
                    className="mt-8 w-full rounded-2xl bg-white px-5 py-4 text-base font-semibold text-zinc-950 hover:bg-zinc-50"
                  >
                    ✨ Regenerate
                  </button>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-zinc-950" />}>
      <ResultsContent />
    </Suspense>
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
