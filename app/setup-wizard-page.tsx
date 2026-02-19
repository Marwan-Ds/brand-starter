"use client";

import { SignedOut, useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
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

const BRAND_DRAFT_STORAGE_KEY = "brand_draft_v1";
const BRAND_GENERATE_PAYLOAD_KEY = "brand_generate_payload_v1";

type BrandDraft = {
  mode: BrandMode;
  business: BusinessType;
  vibe: Vibe;
  existingPrimary: string;
  existingSecondary: string;
  audiencePrimary: string;
  audienceRefinement: string;
  visualTone: string[];
  personality: string[];
  avoid: string[];
};

function safeReadDraft(): BrandDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(BRAND_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BrandDraft>;
    const mode = parsed.mode === "existing" ? "existing" : "new";
    const businessOptions: BusinessType[] = ["saas", "ecom", "agency", "creator"];
    const vibeOptions: Vibe[] = ["minimal", "bold", "playful", "premium"];
    const business = businessOptions.includes(parsed.business as BusinessType)
      ? (parsed.business as BusinessType)
      : "saas";
    const vibe = vibeOptions.includes(parsed.vibe as Vibe)
      ? (parsed.vibe as Vibe)
      : "minimal";
    const existingPrimary =
      typeof parsed.existingPrimary === "string" ? parsed.existingPrimary : "#3B82F6";
    const existingSecondary =
      typeof parsed.existingSecondary === "string" ? parsed.existingSecondary : "#10B981";
    const audiencePrimary =
      typeof parsed.audiencePrimary === "string" &&
      AUDIENCE_PRIMARY_OPTIONS.includes(parsed.audiencePrimary as (typeof AUDIENCE_PRIMARY_OPTIONS)[number])
        ? parsed.audiencePrimary
        : AUDIENCE_PRIMARY_OPTIONS[0];
    const audienceRefinement =
      typeof parsed.audienceRefinement === "string" ? parsed.audienceRefinement : "";

    const visualTone = Array.isArray(parsed.visualTone)
      ? parsed.visualTone
          .filter(
            (item): item is string =>
              typeof item === "string" &&
              VISUAL_TONE_OPTIONS.includes(item as (typeof VISUAL_TONE_OPTIONS)[number])
          )
          .slice(0, 4)
      : [];
    const personality = Array.isArray(parsed.personality)
      ? parsed.personality
          .filter(
            (item): item is string =>
              typeof item === "string" &&
              PERSONALITY_OPTIONS.includes(item as (typeof PERSONALITY_OPTIONS)[number])
          )
          .slice(0, 5)
      : [];
    const avoid = Array.isArray(parsed.avoid)
      ? parsed.avoid
          .filter(
            (item): item is string =>
              typeof item === "string" &&
              AVOID_OPTIONS.includes(item as (typeof AVOID_OPTIONS)[number])
          )
          .slice(0, 3)
      : [];

    return {
      mode,
      business,
      vibe,
      existingPrimary,
      existingSecondary,
      audiencePrimary,
      audienceRefinement,
      visualTone: visualTone.length >= 2 ? visualTone : [VISUAL_TONE_OPTIONS[0], VISUAL_TONE_OPTIONS[1]],
      personality: personality.length >= 2
        ? personality
        : [PERSONALITY_OPTIONS[0], PERSONALITY_OPTIONS[1]],
      avoid,
    };
  } catch {
    return null;
  }
}

function safeWriteDraft(draft: BrandDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BRAND_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {}
}

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
  const { isSignedIn } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<BrandMode>("new");
  const [business, setBusiness] = useState<BusinessType>("saas");
  const [vibe, setVibe] = useState<Vibe>("minimal");

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
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  const canGenerate = useMemo(() => {
    if (mode === "new") return true;
    return Boolean(existingPrimary && existingSecondary);
  }, [mode, existingPrimary, existingSecondary]);

  const canFinalize =
    canGenerate &&
    audiencePrimary.trim().length > 0 &&
    visualTone.length >= 2 &&
    visualTone.length <= 4 &&
    personality.length >= 2 &&
    personality.length <= 5 &&
    avoid.length <= 3;
  const finalizeHint =
    visualTone.length < 2
      ? "Pick at least 2 Visual Tone chips."
      : personality.length < 2
        ? "Pick at least 2 Personality chips."
        : "Complete the selections to continue.";

  useEffect(() => {
    const draft = safeReadDraft();
    if (!draft) return;

    setMode(draft.mode);
    setBusiness(draft.business);
    setVibe(draft.vibe);
    setExistingPrimary(draft.existingPrimary);
    setExistingSecondary(draft.existingSecondary);
    setAudiencePrimary(draft.audiencePrimary);
    setAudienceRefinement(draft.audienceRefinement);
    setVisualTone(draft.visualTone);
    setPersonality(draft.personality);
    setAvoid(draft.avoid);
    setStep(2);
    setShowDraftBanner(true);
  }, []);

  async function generate() {
    const draft: BrandDraft = {
      mode,
      business,
      vibe,
      existingPrimary,
      existingSecondary,
      audiencePrimary,
      audienceRefinement,
      visualTone,
      personality,
      avoid,
    };

    if (!isSignedIn) {
      safeWriteDraft(draft);
      router.push("/sign-up?redirect_url=/new");
      return;
    }

    const payload = {
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
    };

    try {
      window.sessionStorage.setItem(
        BRAND_GENERATE_PAYLOAD_KEY,
        JSON.stringify(payload)
      );
    } catch {
      alert("Could not prepare generation. Please try again.");
      return;
    }

    router.push("/results?src=wizard");
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

            {showDraftBanner && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-200">
                <p>Your brand setup is ready. Click Finalize Brand to generate.</p>
                <button
                  type="button"
                  onClick={() => setShowDraftBanner(false)}
                  className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:text-zinc-100"
                >
                  Dismiss
                </button>
              </div>
            )}

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
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-300">Visual tone</p>
                        <p className="text-xs text-zinc-500">
                          {visualTone.length}/4 · Pick 2–4
                        </p>
                      </div>
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
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-300">Personality traits</p>
                        <p className="text-xs text-zinc-500">
                          {personality.length}/5 · Pick 2–5
                        </p>
                      </div>
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
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-300">Avoid traits</p>
                        <p className="text-xs text-zinc-500">
                          {avoid.length}/3 · Up to 3
                        </p>
                      </div>
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

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 flex items-start justify-between gap-3">
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
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={generate}
                    disabled={!canFinalize}
                    className="rounded-2xl bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Finalize Brand
                  </button>
                  {!canFinalize && step === 2 ? (
                    <p className="text-xs text-zinc-400">{finalizeHint}</p>
                  ) : null}
                </div>
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
