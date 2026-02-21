import type { AssetCampaign, AssetItem } from "@/lib/assets-campaigns";
import { CopyTextButton } from "./copy-text-button";
import { CreateCampaignButton } from "./create-campaign-button";

type CaptionPackAsset = {
  id: string;
  createdAt: string;
  input: {
    goal: string;
    cta: string;
    topic?: string;
  };
  output: {
    hooks: [string, string, string];
    captions: [string, string, string];
    notes?: string;
  };
};

function trimAndClamp(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function normalizeOutputList(value: unknown, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, maxLen))
    .filter((entry) => entry.length > 0)
    .slice(0, 3);
}

function readCaptionPack(item: AssetItem): CaptionPackAsset | null {
  if (item.type !== "caption_pack") return null;

  const goal = trimAndClamp(item.input.goal, 120);
  const cta = trimAndClamp(item.input.cta, 120);
  const topic = trimAndClamp(item.input.topic, 280);
  if (!goal || !cta) return null;

  const hooks = normalizeOutputList(item.output.hooks, 90);
  const captions = normalizeOutputList(item.output.captions, 500);
  if (hooks.length !== 3 || captions.length !== 3) return null;
  const notes = trimAndClamp(item.output.notes, 280);

  return {
    id: item.id,
    createdAt: item.createdAt,
    input: {
      goal,
      cta,
      ...(topic ? { topic } : {}),
    },
    output: {
      hooks: [hooks[0], hooks[1], hooks[2]],
      captions: [captions[0], captions[1], captions[2]],
      ...(notes ? { notes } : {}),
    },
  };
}

export function AssetsList({
  id,
  campaigns,
}: {
  id: string;
  campaigns: AssetCampaign[];
}) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-semibold">No campaigns yet</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Campaigns group your assets by goal or launch.
        </p>
        <div className="mt-5">
          <CreateCampaignButton
            id={id}
            label="Create your first campaign"
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-lg font-semibold">Saved outputs</h2>

      <div className="mt-4 space-y-6">
        {campaigns.map((campaign) => {
          const captionPackItems = campaign.items
            .map((item) => readCaptionPack(item))
            .filter((item): item is CaptionPackAsset => item !== null);

          return (
            <section key={campaign.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-100">{campaign.name}</p>
                <p className="text-xs text-zinc-500">
                  {new Date(campaign.updatedAt ?? campaign.createdAt).toLocaleString()}
                </p>
              </div>

              {captionPackItems.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <p className="text-sm text-zinc-400">No assets in this campaign yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {captionPackItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">Caption Pack</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        Goal: {item.input.goal} • CTA: {item.input.cta}
                      </p>

                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-zinc-300 hover:text-zinc-100">
                          Show
                        </summary>

                        <div className="mt-3 space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                              Hooks
                            </p>
                            <ul className="mt-2 space-y-2">
                              {item.output.hooks.map((hook, index) => (
                                <li
                                  key={`${item.id}-hook-${index}`}
                                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm text-zinc-200">{hook}</p>
                                    <CopyTextButton text={hook} />
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                              Captions
                            </p>
                            <ul className="mt-2 space-y-2">
                              {item.output.captions.map((caption, index) => (
                                <li
                                  key={`${item.id}-caption-${index}`}
                                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm text-zinc-200">{caption}</p>
                                    <CopyTextButton text={caption} />
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {item.output.notes ? (
                            <p className="text-xs text-zinc-400">{item.output.notes}</p>
                          ) : null}
                        </div>
                      </details>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
