"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateCampaignButton } from "./create-campaign-button";

const GOAL_OPTIONS = ["Awareness", "Engagement", "Leads", "Launch"] as const;
const CTA_OPTIONS = ["Learn more", "Try now", "Book a demo", "Shop now"] as const;

type CampaignOption = {
  id: string;
  name: string;
  createdAt: string;
};

export function AssetsGeneratorCard({
  id,
  campaigns,
}: {
  id: string;
  campaigns: CampaignOption[];
}) {
  const router = useRouter();
  const [goal, setGoal] = useState<(typeof GOAL_OPTIONS)[number]>("Awareness");
  const [cta, setCta] = useState<(typeof CTA_OPTIONS)[number]>("Learn more");
  const [topic, setTopic] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const hasCampaigns = campaigns.length > 0;

  useEffect(() => {
    if (!hasCampaigns) {
      setSelectedCampaignId("");
      return;
    }

    if (campaigns.some((campaign) => campaign.id === selectedCampaignId)) {
      return;
    }

    setSelectedCampaignId(campaigns[0].id);
  }, [campaigns, hasCampaigns, selectedCampaignId]);

  async function handleGenerate() {
    if (isGenerating || !selectedCampaignId) return;

    setIsGenerating(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/kits/${id}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "caption_pack",
          campaignId: selectedCampaignId,
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
    <div className="relative rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-lg font-semibold">Generate Assets</h2>
      <p className="mt-1 text-sm text-zinc-400">Caption Pack (3 hooks + 3 captions)</p>

      {hasCampaigns ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <label className="block flex-1">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Campaign</span>
              <select
                value={selectedCampaignId}
                onChange={(event) => setSelectedCampaignId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              >
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="pt-5">
              <CreateCampaignButton
                id={id}
                label="New campaign"
                className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
              />
            </div>
          </div>
        </div>
      ) : null}

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
        disabled={isGenerating || !selectedCampaignId}
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

      {!hasCampaigns ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-zinc-950/75 p-6 text-center">
          <p className="text-sm text-zinc-300">Create a campaign to generate assets.</p>
        </div>
      ) : null}
    </div>
  );
}
