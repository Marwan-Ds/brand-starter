import { CopyTextButton } from "./copy-text-button";

type AssetItem = {
  id: string;
  type: "caption_pack";
  createdAt: string;
  input: {
    type: "caption_pack";
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

function readAssetItems(value: unknown): AssetItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const candidate = value as { items?: unknown };
  if (!Array.isArray(candidate.items)) return [];

  const parsed: AssetItem[] = [];

  for (const item of candidate.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;

    const entry = item as {
      id?: unknown;
      type?: unknown;
      createdAt?: unknown;
      input?: unknown;
      output?: unknown;
    };

    if (
      typeof entry.id !== "string" ||
      entry.type !== "caption_pack" ||
      typeof entry.createdAt !== "string"
    ) {
      continue;
    }

    const inputObj =
      entry.input && typeof entry.input === "object" && !Array.isArray(entry.input)
        ? (entry.input as {
            type?: unknown;
            goal?: unknown;
            cta?: unknown;
            topic?: unknown;
          })
        : null;
    const goal = trimAndClamp(inputObj?.goal, 120);
    const cta = trimAndClamp(inputObj?.cta, 120);
    const topic = trimAndClamp(inputObj?.topic, 280);
    if (!goal || !cta) continue;

    const outputObj =
      entry.output && typeof entry.output === "object" && !Array.isArray(entry.output)
        ? (entry.output as {
            hooks?: unknown;
            captions?: unknown;
            notes?: unknown;
          })
        : null;
    const hooks = normalizeOutputList(outputObj?.hooks, 90);
    const captions = normalizeOutputList(outputObj?.captions, 500);
    if (hooks.length !== 3 || captions.length !== 3) continue;
    const notes = trimAndClamp(outputObj?.notes, 280);

    parsed.push({
      id: entry.id,
      type: "caption_pack",
      createdAt: entry.createdAt,
      input: {
        type: "caption_pack",
        goal,
        cta,
        ...(topic ? { topic } : {}),
      },
      output: {
        hooks: [hooks[0], hooks[1], hooks[2]],
        captions: [captions[0], captions[1], captions[2]],
        ...(notes ? { notes } : {}),
      },
    });
  }

  return parsed.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function AssetsList({ assets }: { assets: unknown }) {
  const items = readAssetItems(assets);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-lg font-semibold">Saved outputs</h2>
        <p className="mt-3 text-sm text-zinc-400">No assets generated yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="text-lg font-semibold">Saved outputs</h2>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
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
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Hooks</p>
                  <ul className="mt-2 space-y-2">
                    {item.output.hooks.map((hook) => (
                      <li
                        key={`${item.id}-hook-${hook}`}
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
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Captions</p>
                  <ul className="mt-2 space-y-2">
                    {item.output.captions.map((caption) => (
                      <li
                        key={`${item.id}-caption-${caption}`}
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
    </div>
  );
}
