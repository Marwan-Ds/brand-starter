"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCampaignButton({
  id,
  label = "New campaign",
  className,
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCreate() {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setErrorMsg("Campaign name must be 2-60 characters.");
      return;
    }

    if (isSaving) return;
    setIsSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/kits/${id}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_campaign", name: trimmed }),
      });

      if (!res.ok) {
        setIsSaving(false);
        setErrorMsg("Could not create campaign.");
        return;
      }

      setName("");
      setIsSaving(false);
      setIsOpen(false);
      router.refresh();
    } catch {
      setIsSaving(false);
      setErrorMsg("Could not create campaign.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={
          className ??
          "rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
        }
      >
        {label}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl">
          <p className="text-sm font-medium text-zinc-100">Create campaign</p>
          <label className="mt-3 block">
            <span className="text-xs text-zinc-500">Campaign name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>

          {errorMsg ? <p className="mt-2 text-xs text-red-300">{errorMsg}</p> : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setErrorMsg("");
              }}
              disabled={isSaving}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSaving}
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
            >
              {isSaving ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
