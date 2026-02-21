import type { AssetCampaign, AssetItem } from "@/lib/assets-campaigns";
import { CopyTextButton } from "./copy-text-button";
import { CreateCampaignButton } from "./create-campaign-button";

const HOOK_STYLES = ["Curiosity", "Pain", "Proof"] as const;
type CaptionPackHookStyle = (typeof HOOK_STYLES)[number];

type CaptionPackAssetLegacy = {
  id: string;
  createdAt: string;
  outputVersion: 1;
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

type CaptionPackAssetV2 = {
  id: string;
  createdAt: string;
  outputVersion: 2;
  input: {
    goal: string;
    cta: string;
    topic?: string;
  };
  output: {
    angle: string;
    hooks: [
      { style: CaptionPackHookStyle; text: string },
      { style: CaptionPackHookStyle; text: string },
      { style: CaptionPackHookStyle; text: string }
    ];
    captions: [
      { text: string; ctaLine: string },
      { text: string; ctaLine: string },
      { text: string; ctaLine: string }
    ];
  };
};

type CaptionPackAsset = CaptionPackAssetLegacy | CaptionPackAssetV2;

function trimAndClamp(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function isHookStyle(value: unknown): value is CaptionPackHookStyle {
  return (
    typeof value === "string" &&
    (HOOK_STYLES as readonly string[]).includes(value)
  );
}

function normalizeOutputList(value: unknown, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, maxLen))
    .filter((entry) => entry.length > 0)
    .slice(0, 3);
}

function readV2Hooks(value: unknown) {
  if (!Array.isArray(value)) return null;

  const hooks: { style: CaptionPackHookStyle; text: string }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const candidate = item as { style?: unknown; text?: unknown };
    if (!isHookStyle(candidate.style)) continue;

    const text = trimAndClamp(candidate.text, 120);
    if (!text) continue;
    hooks.push({ style: candidate.style, text });
    if (hooks.length === 3) break;
  }

  if (hooks.length !== 3) return null;
  return [hooks[0], hooks[1], hooks[2]] as [
    { style: CaptionPackHookStyle; text: string },
    { style: CaptionPackHookStyle; text: string },
    { style: CaptionPackHookStyle; text: string }
  ];
}

function readV2Captions(value: unknown) {
  if (!Array.isArray(value)) return null;

  const captions: { text: string; ctaLine: string }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const candidate = item as { text?: unknown; ctaLine?: unknown };
    const text = trimAndClamp(candidate.text, 500);
    if (!text) continue;
    captions.push({
      text,
      ctaLine: trimAndClamp(candidate.ctaLine, 90),
    });
    if (captions.length === 3) break;
  }

  if (captions.length !== 3) return null;
  return [captions[0], captions[1], captions[2]] as [
    { text: string; ctaLine: string },
    { text: string; ctaLine: string },
    { text: string; ctaLine: string }
  ];
}

function readCaptionPack(item: AssetItem): CaptionPackAsset | null {
  if (item.type !== "caption_pack") return null;

  const goal = trimAndClamp(item.input.goal, 120);
  const cta = trimAndClamp(item.input.cta, 120);
  const topic = trimAndClamp(item.input.topic, 280);
  if (!goal || !cta) return null;

  const outputVersionValue = (item as { outputVersion?: unknown }).outputVersion;
  const outputVersion = outputVersionValue === 2 ? 2 : 1;
  const angle = trimAndClamp(item.output.angle, 140);
  const v2Hooks = readV2Hooks(item.output.hooks);
  const v2Captions = readV2Captions(item.output.captions);

  if (outputVersion === 2 || angle || v2Hooks || v2Captions) {
    if (!v2Hooks || !v2Captions) return null;
    return {
      id: item.id,
      createdAt: item.createdAt,
      outputVersion: 2,
      input: {
        goal,
        cta,
        ...(topic ? { topic } : {}),
      },
      output: {
        angle: angle || "Brand-aligned captions for your campaign goal.",
        hooks: [v2Hooks[0], v2Hooks[1], v2Hooks[2]],
        captions: [v2Captions[0], v2Captions[1], v2Captions[2]],
      },
    };
  }

  const hooks = normalizeOutputList(item.output.hooks, 90);
  const captions = normalizeOutputList(item.output.captions, 500);
  if (hooks.length !== 3 || captions.length !== 3) return null;
  const notes = trimAndClamp(item.output.notes, 280);

  return {
    id: item.id,
    createdAt: item.createdAt,
    outputVersion: 1,
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
                          {item.outputVersion === 2 ? (
                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                                Angle
                              </p>
                              <p className="mt-1 text-sm text-zinc-200">{item.output.angle}</p>
                            </div>
                          ) : null}

                          <div>
                            <p className="text-xs uppercase tracking-wide text-zinc-500">
                              Hooks
                            </p>
                            <ul className="mt-2 space-y-2">
                              {item.outputVersion === 2
                                ? item.output.hooks.map((hook, index) => (
                                    <li
                                      key={`${item.id}-hook-${index}`}
                                      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
                                    >
                                      <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="inline-flex rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                                          {hook.style}
                                        </span>
                                        <CopyTextButton text={hook.text} />
                                      </div>
                                      <p className="text-sm text-zinc-200">{hook.text}</p>
                                    </li>
                                  ))
                                : item.output.hooks.map((hook, index) => (
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
                              {item.outputVersion === 2
                                ? item.output.captions.map((caption, index) => (
                                    <li
                                      key={`${item.id}-caption-${index}`}
                                      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm text-zinc-200">{caption.text}</p>
                                        <CopyTextButton text={caption.text} />
                                      </div>
                                      {caption.ctaLine ? (
                                        <div className="mt-2 flex items-start justify-between gap-3">
                                          <p className="text-xs text-zinc-400">
                                            CTA line: {caption.ctaLine}
                                          </p>
                                          <CopyTextButton text={caption.ctaLine} />
                                        </div>
                                      ) : null}
                                    </li>
                                  ))
                                : item.output.captions.map((caption, index) => (
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

                          {item.outputVersion === 2 ? (
                            null
                          ) : item.output.notes ? (
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
