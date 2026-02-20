"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORM_OPTIONS = [
  "Instagram",
  "LinkedIn",
  "TikTok",
  "X",
  "Email",
  "Website",
] as const;

const GOAL_OPTIONS = [
  "Awareness",
  "Engagement",
  "Leads",
  "Launch",
  "Retention",
] as const;

export function CreateCampaignButton({
  id,
  label = "New campaign",
  className,
  onCreatedCampaign,
}: {
  id: string;
  label?: string;
  className?: string;
  onCreatedCampaign?: (campaignId: string) => void;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<(typeof GOAL_OPTIONS)[number]>("Awareness");
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]>("Instagram");
  const [ctaStyle, setCtaStyle] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCreate() {
    const trimmedName = name.trim();
    const trimmedGoal = goal.trim();
    const trimmedPlatform = platform.trim();
    const trimmedCtaStyle = ctaStyle.trim();
    const trimmedNotes = notes.trim();

    if (trimmedName.length < 2 || trimmedName.length > 60) {
      setErrorMsg("Campaign name must be 2-60 characters.");
      return;
    }

    if (trimmedGoal.length < 3 || trimmedGoal.length > 80) {
      setErrorMsg("Goal must be 3-80 characters.");
      return;
    }

    if (trimmedPlatform.length < 2 || trimmedPlatform.length > 40) {
      setErrorMsg("Platform must be 2-40 characters.");
      return;
    }

    if (trimmedCtaStyle && (trimmedCtaStyle.length < 2 || trimmedCtaStyle.length > 30)) {
      setErrorMsg("CTA style must be 2-30 characters.");
      return;
    }

    if (isSaving) return;
    setIsSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/kits/${id}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_campaign",
          name: trimmedName,
          goal: trimmedGoal,
          platform: trimmedPlatform,
          ...(trimmedCtaStyle ? { ctaStyle: trimmedCtaStyle } : {}),
          ...(trimmedNotes ? { notes: trimmedNotes } : {}),
        }),
      });

      if (!res.ok) {
        setIsSaving(false);
        setErrorMsg("Could not create campaign.");
        return;
      }

      let createdCampaignId = "";
      try {
        const json = (await res.json()) as { campaignId?: unknown };
        if (typeof json.campaignId === "string") {
          createdCampaignId = json.campaignId;
        }
      } catch {
        createdCampaignId = "";
      }

      setName("");
      setGoal("Awareness");
      setPlatform("Instagram");
      setCtaStyle("");
      setNotes("");
      setIsSaving(false);
      setIsOpen(false);
      if (createdCampaignId && onCreatedCampaign) {
        onCreatedCampaign(createdCampaignId);
      }
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

          <label className="mt-3 block">
            <span className="text-xs text-zinc-500">Goal</span>
            <select
              value={goal}
              onChange={(event) => setGoal(event.target.value as (typeof GOAL_OPTIONS)[number])}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            >
              {GOAL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block">
            <span className="text-xs text-zinc-500">Platform</span>
            <select
              value={platform}
              onChange={(event) =>
                setPlatform(event.target.value as (typeof PLATFORM_OPTIONS)[number])
              }
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block">
            <span className="text-xs text-zinc-500">CTA style (optional)</span>
            <input
              value={ctaStyle}
              onChange={(event) => setCtaStyle(event.target.value)}
              maxLength={30}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-xs text-zinc-500">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={280}
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
