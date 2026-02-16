"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type BrandMode = "new" | "existing";
type BusinessType = "saas" | "ecom" | "agency" | "creator";
type Vibe = "minimal" | "bold" | "playful" | "premium";

export default function SetupWizardPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<BrandMode>("new");
  const [business, setBusiness] = useState<BusinessType>("saas");
  const [vibe, setVibe] = useState<Vibe>("minimal");
  
  const [isGenerating, setIsGenerating] = useState(false);

  const [existingPrimary, setExistingPrimary] = useState("#3B82F6");
  const [existingSecondary, setExistingSecondary] = useState("#10B981");

  const canGenerate = useMemo(() => {
    if (mode === "new") return true;
    return Boolean(existingPrimary && existingSecondary);
  }, [mode, existingPrimary, existingSecondary]);

  function next() {
    setStep((s) => (s === 1 ? 2 : s === 2 ? 3 : 3));
  }
  function back() {
    setStep((s) => (s === 3 ? 2 : s === 2 ? 1 : 1));
  }

  async function generate() {
    setIsGenerating(true);

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
}),

  });

  const raw = await res.text(); // <-- read as text first (safe)
  let data: any = null;

  try {
    data = JSON.parse(raw);
  } catch {
    // If server returned HTML / empty, show raw
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
    ai: data.text ?? "",
  });

  router.push(`/results?${params.toString()}`);
  setIsGenerating(false);
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
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-300">Setup</p>
              <p className="text-sm text-zinc-400">Step {step} / 3</p>
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
                    <h2 className="text-xl font-semibold">Start point</h2>
                    <p className="mt-2 text-sm text-zinc-300">
                      Are we generating a new branding direction, or using an
                      existing one?
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
                              onChange={(e) =>
                                setExistingPrimary(e.target.value)
                              }
                              className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-700 bg-transparent"
                            />
                            Primary
                          </label>
                          <label className="flex items-center gap-3 text-sm">
                            <input
                              type="color"
                              value={existingSecondary}
                              onChange={(e) =>
                                setExistingSecondary(e.target.value)
                              }
                              className="h-9 w-12 cursor-pointer rounded-lg border border-zinc-700 bg-transparent"
                            />
                            Secondary
                          </label>
                        </div>
                      </div>
                    )}
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
                    <h2 className="text-xl font-semibold">Business type</h2>
                    <p className="mt-2 text-sm text-zinc-300">
                      Helps pick sensible defaults (still deterministic in MVP).
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2 className="text-xl font-semibold">Vibe / tone</h2>
                    <p className="mt-2 text-sm text-zinc-300">
                      This controls palette direction + typography pairing.
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

                    <AnimatePresence>
                      {canGenerate && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.25 }}
                          onClick={generate}
                          className="mt-7 w-full rounded-2xl bg-zinc-50 px-5 py-4 text-base font-semibold text-zinc-950 hover:bg-white"
                        >
                          {isGenerating ? "Generating…" : "✨ Generate branding kit"}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={back}
                disabled={step === 1}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-200 disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={next}
                disabled={step === 3}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-200 disabled:opacity-40"
              >
                Next
              </button>
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
