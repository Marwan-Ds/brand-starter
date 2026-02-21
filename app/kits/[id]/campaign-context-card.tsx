"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CampaignContext = {
  campaignId: string;
  name: string;
  goal: string;
  platform: string;
  ctaStyle?: string;
  notes?: string;
};

export function CampaignContextCard({
  id,
  initialContext,
}: {
  id: string;
  initialContext: CampaignContext;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [goal, setGoal] = useState(initialContext.goal);
  const [platform, setPlatform] = useState(initialContext.platform);
  const [ctaStyle, setCtaStyle] = useState(initialContext.ctaStyle ?? "");
  const [notes, setNotes] = useState(initialContext.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSave = useMemo(
    () => goal.trim().length >= 3 && platform.trim().length >= 2 && !isSaving,
    [goal, platform, isSaving]
  );

  async function handleSave() {
    if (!canSave) return;

    setIsSaving(true);
    setErrorMsg("");
    setSaved(false);

    try {
      const res = await fetch(`/api/kits/${id}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_campaign_context",
          campaignId: initialContext.campaignId,
          goal: goal.trim(),
          platform: platform.trim(),
          ctaStyle: ctaStyle.trim(),
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        setIsSaving(false);
        setErrorMsg("Could not update campaign context.");
        return;
      }

      setIsSaving(false);
      setIsEditing(false);
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 1000);
    } catch {
      setIsSaving(false);
      setErrorMsg("Could not update campaign context.");
    }
  }

  function handleCancel() {
    setGoal(initialContext.goal);
    setPlatform(initialContext.platform);
    setCtaStyle(initialContext.ctaStyle ?? "");
    setNotes(initialContext.notes ?? "");
    setErrorMsg("");
    setSaved(false);
    setIsEditing(false);
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Campaign Context</h2>
          <p className="mt-1 text-sm text-zinc-400">{initialContext.name}</p>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-zinc-500">Goal</span>
            <input
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              maxLength={80}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500">Platform</span>
            <input
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              maxLength={40}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-500">CTA style (optional)</span>
            <input
              value={ctaStyle}
              onChange={(event) => setCtaStyle(event.target.value)}
              maxLength={30}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-zinc-500">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={280}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>
        </div>
      ) : (
        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">Goal</dt>
            <dd className="text-zinc-100">{initialContext.goal || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Platform</dt>
            <dd className="text-zinc-100">{initialContext.platform || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">CTA style</dt>
            <dd className="text-zinc-100">{initialContext.ctaStyle || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Notes</dt>
            <dd className="text-zinc-100">{initialContext.notes || "Not set"}</dd>
          </div>
        </dl>
      )}

      {saved ? <p className="mt-3 text-xs text-emerald-300">Saved</p> : null}
      {errorMsg ? <p className="mt-3 text-xs text-red-300">{errorMsg}</p> : null}
    </section>
  );
}
