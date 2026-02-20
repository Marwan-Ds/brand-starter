"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GOAL_OPTIONS = ["Awareness", "Engagement", "Leads", "Launch"] as const;
const CTA_OPTIONS = ["Learn more", "Try now", "Book a demo", "Shop now"] as const;

export function AssetsGeneratorCard({ id }: { id: string }) {
  const router = useRouter();
  const [goal, setGoal] = useState<(typeof GOAL_OPTIONS)[number]>("Awareness");
  const [cta, setCta] = useState<(typeof CTA_OPTIONS)[number]>("Learn more");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGenerate() {
    if (isGenerating) return;

    setIsGenerating(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/kits/${id}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "caption_pack",
          goal,
          cta,
          ...(topic.trim() ? { topic: topic.trim() } : {}),
        }),
      });

      if (!res.ok) {
        setIsGenerating(false);
        setErrorMsg("Could not generate assets.");
        return;
      }

      setIsGenerating(false);
      setTopic("");
      router.refresh();
    } catch {
      setIsGenerating(false);
      setErrorMsg("Could not generate assets.");
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-lg font-semibold">Generate Assets</h2>
      <p className="mt-1 text-sm text-zinc-400">Caption Pack (3 hooks + 3 captions)</p>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Goal</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setGoal(option)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                goal === option
                  ? "border-zinc-200 bg-zinc-50 text-zinc-950"
                  : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-xs uppercase tracking-wide text-zinc-500">CTA</span>
        <select
          value={cta}
          onChange={(event) => setCta(event.target.value as (typeof CTA_OPTIONS)[number])}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        >
          {CTA_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-5 block">
        <span className="text-xs uppercase tracking-wide text-zinc-500">
          Topic (optional)
        </span>
        <textarea
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          rows={3}
          maxLength={280}
          placeholder="What is this post about?"
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
        />
      </label>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="mt-5 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
      >
        {isGenerating ? "Generating..." : "Generate"}
      </button>

      {errorMsg ? <p className="mt-3 text-xs text-red-300">{errorMsg}</p> : null}

      {isGenerating ? (
        <div className="mt-5 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-xl border border-zinc-800 bg-zinc-950/50"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
