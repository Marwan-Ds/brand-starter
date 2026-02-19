"use client";

import { SignedOut } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type BrandMode = "new" | "existing";
type BusinessType = "saas" | "ecom" | "agency" | "creator";
type Vibe = "minimal" | "bold" | "playful" | "premium";

const AUDIENCE_PRIMARY_OPTIONS = [
  "Founders and operators",
  "Marketing teams",
  "Small business owners",
  "Enterprise buyers",
  "Creators and influencers",
  "Students and learners",
] as const;

const VISUAL_TONE_OPTIONS = [
  "Clean",
  "Technical",
  "Editorial",
  "Warm",
  "Confident",
  "Premium",
] as const;

const PERSONALITY_OPTIONS = [
  "Trustworthy",
  "Bold",
  "Playful",
  "Calm",
  "Direct",
  "Friendly",
  "Expert",
] as const;

const AVOID_OPTIONS = [
  "Too corporate",
  "Too loud",
  "Too playful",
  "Too generic",
  "Too trendy",
  "Too formal",
] as const;

function toggleLimited(list: string[], value: string, max: number, min = 0) {
  const hasValue = list.includes(value);
  if (hasValue) {
    if (list.length <= min) return list;
    return list.filter((item) => item !== value);
  }
  if (list.length >= max) return list;
  return [...list, value];
}

export default function SetupWizardPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<BrandMode>("new");
  const [business, setBusiness] = useState<BusinessType>("saas");
  const [vibe, setVibe] = useState<Vibe>("minimal");

  const [isGenerating, setIsGenerating] = useState(false);

  const [existingPrimary, setExistingPrimary] = useState("#3B82F6");
  const [existingSecondary, setExistingSecondary] = useState("#10B981");

  const [audiencePrimary, setAudiencePrimary] = useState<string>(
    AUDIENCE_PRIMARY_OPTIONS[0]
  );
  const [audienceRefinement, setAudienceRefinement] = useState("");
  const [visualTone, setVisualTone] = useState<string[]>([
    VISUAL_TONE_OPTIONS[0],
    VISUAL_TONE_OPTIONS[1],
  ]);
  const [personality, setPersonality] = useState<string[]>([
    PERSONALITY_OPTIONS[0],
    PERSONALITY_OPTIONS[1],
  ]);
  const [avoid, setAvoid] = useState<string[]>([]);

  const canGenerate = useMemo(() => {
    if (mode === "new") return true;
    return Boolean(existingPrimary && existingSecondary);
  }, [mode, existingPrimary, existingSecondary]);

  const canFinalize =
    canGenerate &&
    visualTone.length >= 2 &&
    visualTone.length <= 4 &&
    personality.length >= 2 &&
    personality.length <= 5 &&
    avoid.length <= 3;

  async function generate() {
    setIsGenerating(true);

    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          business,
          vibe,
          ...(mode === "existing"
            ? { primary: existingPrimary, secondary: existingSecondary }
            : {}),
          guidance: {
            audiencePrimary,
            ...(audienceRefinement.trim()
              ? { audienceRefinement: audienceRefinement.trim() }
              : {}),
            visualTone,
            personality,
            avoid,
          },
        }),
      });

      const raw = await res.text();
      let data: { text?: string; error?: string } | null = null;

      try {
        data = JSON.parse(raw) as { text?: string; error?: string };
      } catch {
        alert(raw || "API returned empty response (check terminal logs).");
        return;
      }

      if (!res.ok) {
        alert(data?.error ?? "AI request failed");
        return;
      }

      const params = new URLSearchParams({
        mode,
        business,
        vibe,
        primary: existingPrimary,
        secondary: existingSecondary,
        ai: data?.text ?? "",
      });

      router.push(`/results?${params.toString()}`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">Weekend MVP</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Brand Starter
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-300">
              A guided setup that generates a consistent social branding kit:
              palette, font pairing, and post mock variations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SignedOut>
              <Link
                href="/sign-in"
                className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
              >
                Sign up
              </Link>
            </SignedOut>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-300">Setup</p>
              <p className="text-sm text-zinc-400">Step {step} / 2</p>
            </div>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2 className="text-xl font-semibold">Core setup</h2>
                    <p className="mt-2 text-sm text-zinc-300">
                      Pick your baseline direction, business type, and vibe.
                    </p>

                    <h3 className="mt-6 text-sm font-semibold text-zinc-200">Start point</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => setMode("new")}
                        className={`rounded-xl border px-4 py-4 text-left transition ${
                          mode === "new"
                            ? "border-zinc-200 bg-zinc-50 text-zinc-950"
                            : "border-zinc-800 bg-zinc-950/40 text-zinc-100 hover:border-zinc-600"
                        }`}
                      >
                        <p className="font-medium">New branding</p>
                        <p className="mt-1 text-sm opacity-80">
                          Generate palette + fonts from vibe.
                        </p>
                      </button>

                      <button
                        onClick={() => setMode("existing")}
                        className={`rounded-xl border px-4 py-4 text-left transition ${
                          mode === "existing"
                            ? "border-zinc-200 bg-zinc-50 text-zinc-950"
                            : "border-zinc-800 bg-zinc-950/40 text-zinc-100 hover:border-zinc-600"
                        }`}
                      >
                        <p className="font-medium">I have branding</p>
                        <p className="mt-1 text-sm opacity-80">
                          Start from your colors, then build variations.
                        </p>
                      </button>
                    </div>

                    {mode === "existing" && (
                      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                        <p className="text-sm text-zinc-300">Your base colors</p>
                        <div className="mt-3 flex flex-wrap gap-4">
                          <label className="flex items-center gap-3 text-sm">
                            <input
                              type="color"
                              value={existingPrimary}
                              onChange={(e) => setExistingPrimary(e.target.value)}
                              className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-700 bg-transparent"
                            />
                            Primary
                          </label>
                          <label className="flex items-center gap-3 text-sm">
                            <input
                              type="color"
                              value={existingSecondary}
                              onChange={(e) => setExistingSecondary(e.target.value)}
                              className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-700 bg-transparent"
                            />
                            Secondary
                          </label>
                        </div>
                      </div>
                    )}

                    <h3 className="mt-6 text-sm font-semibold text-zinc-200">Business type</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["saas", "SaaS"],
                          ["ecom", "E-commerce"],
                          ["agency", "Agency"],
                          ["creator", "Creator"],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setBusiness(key)}
                          className={`rounded-xl border px-4 py-4 text-left transition ${
                            business === key
                              ? "border-zinc-200 bg-zinc-50 text-zinc-950"
                              : "border-zinc-800 bg-zinc-950/40 text-zinc-100 hover:border-zinc-600"
                          }`}
                        >
                          <p className="font-medium">{label}</p>
                          <p className="mt-1 text-sm opacity-80">
                            Presets tuned for {label.toLowerCase()} posts.
                          </p>
                        </button>
                      ))}
                    </div>

                    <h3 className="mt-6 text-sm font-semibold text-zinc-200">Vibe / tone</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["minimal", "Minimal"],
                          ["bold", "Bold"],
                          ["playful", "Playful"],
                          ["premium", "Premium"],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setVibe(key)}
                          className={`rounded-xl border px-4 py-4 text-left transition ${
                            vibe === key
                              ? "border-zinc-200 bg-zinc-50 text-zinc-950"
                              : "border-zinc-800 bg-zinc-950/40 text-zinc-100 hover:border-zinc-600"
                          }`}
                        >
                          <p className="font-medium">{label}</p>
                          <p className="mt-1 text-sm opacity-80">
                            Generates a matching post system.
                          </p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2 className="text-xl font-semibold">Refine your direction</h2>
                    <p className="mt-2 text-sm text-zinc-300">
                      Add audience and brand traits. We will only generate after
                      you finalize.
                    </p>

                    <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                      <label className="text-sm text-zinc-300" htmlFor="audience-primary">
                        Audience primary
                      </label>
                      <select
                        id="audience-primary"
                        value={audiencePrimary}
                        onChange={(e) => setAudiencePrimary(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                      >
                        {AUDIENCE_PRIMARY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <label className="mt-4 block text-sm text-zinc-300" htmlFor="audience-refinement">
                        Audience refinement (optional)
                      </label>
                      <input
                        id="audience-refinement"
                        type="text"
                        value={audienceRefinement}
                        onChange={(e) => setAudienceRefinement(e.target.value)}
                        placeholder="e.g. B2B SaaS founders in early stage"
                        className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                      />
                    </div>

                    <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                      <p className="text-sm text-zinc-300">Visual tone (pick 2-4)</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {VISUAL_TONE_OPTIONS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() =>
                              setVisualTone((current) => toggleLimited(current, item, 4, 2))
                            }
                            className={`rounded-full border px-3 py-1.5 text-sm transition ${
                              visualTone.includes(item)
                                ? "border-zinc-200 bg-zinc-50 text-zinc-950"
                                : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                      <p className="text-sm text-zinc-300">Personality traits (pick 2-5)</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {PERSONALITY_OPTIONS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() =>
                              setPersonality((current) => toggleLimited(current, item, 5, 2))
                            }
                            className={`rounded-full border px-3 py-1.5 text-sm transition ${
                              personality.includes(item)
                                ? "border-zinc-200 bg-zinc-50 text-zinc-950"
                                : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                      <p className="text-sm text-zinc-300">Avoid traits (max 3)</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {AVOID_OPTIONS.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setAvoid((current) => toggleLimited(current, item, 3))}
                            className={`rounded-full border px-3 py-1.5 text-sm transition ${
                              avoid.includes(item)
                                ? "border-zinc-200 bg-zinc-50 text-zinc-950"
                                : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500"
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    {!canFinalize && (
                      <p className="mt-4 text-sm text-zinc-400">
                        Pick 2-4 visual tones and 2-5 personality traits to finalize.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 flex items-center justify-between">
              {step === 2 ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-200"
                >
                  Back
                </button>
              ) : (
                <span />
              )}

              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-200"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={generate}
                  disabled={!canFinalize || isGenerating}
                  className="rounded-2xl bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? "Finalizing…" : "Finalize Brand"}
                </button>
              )}
            </div>
          </section>

          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h3 className="text-lg font-semibold">What you’ll get</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li>• Palette cards (primary + supporting)</li>
              <li>• Font pairing (headline + body)</li>
              <li>• Light/Dark preview tabs</li>
              <li>• Post mock grid (template-based variations)</li>
            </ul>
            <p className="mt-6 text-sm text-zinc-400">
              This weekend version uses deterministic presets (no AI calls yet).
              Later we can add AI text and smarter palette generation.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
