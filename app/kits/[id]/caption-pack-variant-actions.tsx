"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VariantMode = "hooks_only" | "captions_only" | "ctas_only";
type VariantTone = "softer" | "default" | "bolder";

const TONE_OPTIONS: Array<{ value: VariantTone; label: string }> = [
  { value: "softer", label: "Softer" },
  { value: "default", label: "Default" },
  { value: "bolder", label: "Bolder" },
];

export function CaptionPackVariantActions({
  id,
  campaignId,
  parentItemId,
}: {
  id: string;
  campaignId: string;
  parentItemId: string;
}) {
  const router = useRouter();
  const [tone, setTone] = useState<VariantTone>("default");
  const [loadingMode, setLoadingMode] = useState<VariantMode | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function runVariant(mode: VariantMode) {
    if (loadingMode) return;
    setLoadingMode(mode);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/kits/${id}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "variant_caption_pack",
          campaignId,
          parentItemId,
          mode,
          tone,
        }),
      });

      if (!res.ok) {
        setLoadingMode(null);
        setErrorMsg("Could not generate variant.");
        return;
      }

      setLoadingMode(null);
      router.refresh();
    } catch {
      setLoadingMode(null);
      setErrorMsg("Could not generate variant.");
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">Variants</span>
        <select
          value={tone}
          onChange={(event) => setTone(event.target.value as VariantTone)}
          disabled={loadingMode !== null}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
        >
          {TONE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => runVariant("hooks_only")}
          disabled={loadingMode !== null}
          className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
        >
          {loadingMode === "hooks_only" ? "Generating..." : "Variant: Hooks"}
        </button>
        <button
          type="button"
          onClick={() => runVariant("captions_only")}
          disabled={loadingMode !== null}
          className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
        >
          {loadingMode === "captions_only" ? "Generating..." : "Variant: Captions"}
        </button>
        <button
          type="button"
          onClick={() => runVariant("ctas_only")}
          disabled={loadingMode !== null}
          className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
        >
          {loadingMode === "ctas_only" ? "Generating..." : "Variant: CTAs"}
        </button>
      </div>
      {errorMsg ? <p className="mt-2 text-xs text-red-300">{errorMsg}</p> : null}
    </div>
  );
}
