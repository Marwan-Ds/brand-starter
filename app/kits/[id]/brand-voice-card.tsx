"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type BrandVoiceAi = {
  taglines: [string, string, string];
  voiceSummary: string;
  guidelines: string[];
  do: string[];
  dont: string[];
  sampleLines: [string, string, string];
};

export function BrandVoiceCard({
  id,
  initialVoiceAi,
}: {
  id: string;
  initialVoiceAi: BrandVoiceAi | null;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGenerate() {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/kits/${id}/voice`, { method: "POST" });
      if (!res.ok) {
        setIsLoading(false);
        setErrorMsg("Could not generate suggestions.");
        return;
      }
      setIsLoading(false);
      router.refresh();
    } catch {
      setIsLoading(false);
      setErrorMsg("Could not generate suggestions.");
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Brand Voice (AI)</h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
        >
          {isLoading
            ? "Generating..."
            : initialVoiceAi
              ? "Regenerate"
              : "Generate suggestions"}
        </button>
      </div>

      {errorMsg ? <p className="mt-3 text-xs text-red-300">{errorMsg}</p> : null}

      {!initialVoiceAi ? (
        <p className="mt-4 text-sm italic text-zinc-500">
          No AI voice suggestions yet.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Voice summary</p>
            <p className="mt-1 text-sm text-zinc-200">{initialVoiceAi.voiceSummary}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Taglines</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-200">
              {initialVoiceAi.taglines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Guidelines</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-200">
                {initialVoiceAi.guidelines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Do</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-200">
                {initialVoiceAi.do.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Don't</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-200">
                {initialVoiceAi.dont.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Sample lines</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-200">
              {initialVoiceAi.sampleLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
