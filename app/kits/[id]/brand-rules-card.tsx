"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RuleKey = "formality" | "humor" | "intensity";

export type BrandConstraints = {
  formality: number;
  humor: number;
  intensity: number;
  allowWords: string[];
  avoidWords: string[];
};

export function BrandRulesCard({
  id,
  initialConstraints,
}: {
  id: string;
  initialConstraints: BrandConstraints;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [constraints, setConstraints] = useState<BrandConstraints>(initialConstraints);
  const [form, setForm] = useState<BrandConstraints>(initialConstraints);
  const [allowInput, setAllowInput] = useState("");
  const [avoidInput, setAvoidInput] = useState("");

  useEffect(() => {
    setConstraints(initialConstraints);
    setForm(initialConstraints);
  }, [initialConstraints]);

  useEffect(() => {
    if (!saved) return;
    const timeout = setTimeout(() => setSaved(false), 1000);
    return () => clearTimeout(timeout);
  }, [saved]);

  function setRuleValue(key: RuleKey, value: number) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addWord(kind: "allowWords" | "avoidWords") {
    const input = kind === "allowWords" ? allowInput : avoidInput;
    const value = input.trim();
    if (!value) return;
    setForm((current) => {
      const currentList = current[kind];
      if (currentList.length >= 6 || currentList.includes(value)) return current;
      return { ...current, [kind]: [...currentList, value] };
    });
    if (kind === "allowWords") setAllowInput("");
    if (kind === "avoidWords") setAvoidInput("");
  }

  function removeWord(kind: "allowWords" | "avoidWords", value: string) {
    setForm((current) => ({
      ...current,
      [kind]: current[kind].filter((word) => word !== value),
    }));
  }

  const canSave = form.allowWords.length >= 3 && form.allowWords.length <= 6 && form.avoidWords.length <= 6;

  async function handleSave() {
    if (isSaving || !canSave) {
      if (!canSave) setErrorMsg("Add at least 3 allow words.");
      return;
    }
    setIsSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/kits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ constraints: form }),
      });

      if (!res.ok) {
        setIsSaving(false);
        setErrorMsg("Could not save brand rules.");
        return;
      }

      setConstraints(form);
      setIsEditing(false);
      setSaved(true);
      setIsSaving(false);
      setTimeout(() => router.refresh(), 700);
    } catch {
      setIsSaving(false);
      setErrorMsg("Could not save brand rules.");
    }
  }

  function handleCancel() {
    setErrorMsg("");
    setIsEditing(false);
    setAllowInput("");
    setAvoidInput("");
    setForm(constraints);
  }

  function renderWordList(words: string[]) {
    if (words.length === 0) {
      return <p className="text-sm italic text-zinc-500">Not set yet</p>;
    }
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {words.map((word) => (
          <span
            key={word}
            className="rounded-full border border-zinc-700 bg-zinc-900/50 px-2.5 py-1 text-xs text-zinc-200"
          >
            {word}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Brand Rules</h2>
        {saved ? <span className="text-xs text-emerald-300">Saved</span> : null}
      </div>

      {!isEditing ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {(["formality", "humor", "intensity"] as RuleKey[]).map((key) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                  <span className="capitalize">{key}</span>
                  <span>{constraints[key]}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800">
                  <div
                    className="h-1.5 rounded-full bg-zinc-200"
                    style={{ width: `${constraints[key]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Allow words</p>
            {renderWordList(constraints.allowWords)}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Avoid words</p>
            {renderWordList(constraints.avoidWords)}
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="space-y-3">
            {(["formality", "humor", "intensity"] as RuleKey[]).map((key) => (
              <label key={key} className="block">
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                  <span className="capitalize">{key}</span>
                  <span>{form[key]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form[key]}
                  onChange={(e) => setRuleValue(key, Number(e.target.value))}
                  className="w-full accent-zinc-100"
                />
              </label>
            ))}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500">
              <span>Allow words</span>
              <span>{form.allowWords.length}/6 (min 3)</span>
            </div>
            <input
              value={allowInput}
              onChange={(e) => setAllowInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addWord("allowWords");
              }}
              placeholder="Type a word and press Enter"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {form.allowWords.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => removeWord("allowWords", word)}
                  className="rounded-full border border-zinc-700 bg-zinc-900/50 px-2.5 py-1 text-xs text-zinc-200 hover:border-zinc-500"
                >
                  {word} ×
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-zinc-500">
              <span>Avoid words</span>
              <span>{form.avoidWords.length}/6</span>
            </div>
            <input
              value={avoidInput}
              onChange={(e) => setAvoidInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                addWord("avoidWords");
              }}
              placeholder="Type a word and press Enter"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {form.avoidWords.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => removeWord("avoidWords", word)}
                  className="rounded-full border border-zinc-700 bg-zinc-900/50 px-2.5 py-1 text-xs text-zinc-200 hover:border-zinc-500"
                >
                  {word} ×
                </button>
              ))}
            </div>
          </div>

          {errorMsg ? <p className="text-xs text-red-300">{errorMsg}</p> : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
