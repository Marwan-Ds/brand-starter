"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function BrandCoreAutofillButton({ id }: { id: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isDone) return;
    const timeout = setTimeout(() => setIsDone(false), 1000);
    return () => clearTimeout(timeout);
  }, [isDone]);

  async function handleGenerate() {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/kits/${id}/core`, { method: "POST" });
      if (!res.ok) {
        setIsLoading(false);
        setErrorMsg("Could not auto-fill brand core.");
        return;
      }

      setIsLoading(false);
      setIsDone(true);
      setTimeout(() => router.refresh(), 700);
    } catch {
      setIsLoading(false);
      setErrorMsg("Could not auto-fill brand core.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isLoading}
        className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
      >
        {isLoading ? "Generating..." : isDone ? "Done" : "Auto-fill Brand Core (AI)"}
      </button>
      {errorMsg ? <p className="text-xs text-red-300">{errorMsg}</p> : null}
    </div>
  );
}
