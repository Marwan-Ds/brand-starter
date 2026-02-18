"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ToneKey = "bold" | "playful" | "formal" | "emotional";

export type ProfileTone = Record<ToneKey, number>;

export type BrandProfile = {
  name: string;
  description: string;
  audience: string;
  tone: ProfileTone;
};

export function BrandIdentityCard({
  id,
  initialProfile,
}: {
  id: string;
  initialProfile: BrandProfile;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [profile, setProfile] = useState<BrandProfile>(initialProfile);
  const [form, setForm] = useState<BrandProfile>(initialProfile);

  useEffect(() => {
    setProfile(initialProfile);
    setForm(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    if (!saved) return;
    const timeout = setTimeout(() => setSaved(false), 1000);
    return () => clearTimeout(timeout);
  }, [saved]);

  function updateTone(key: ToneKey, value: number) {
    setForm((current) => ({
      ...current,
      tone: { ...current.tone, [key]: value },
    }));
  }

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/kits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: form }),
      });

      if (!res.ok) {
        setIsSaving(false);
        setErrorMsg("Could not save brand identity.");
        return;
      }

      setProfile(form);
      setIsEditing(false);
      setSaved(true);
      setIsSaving(false);
      setTimeout(() => router.refresh(), 700);
    } catch {
      setIsSaving(false);
      setErrorMsg("Could not save brand identity.");
    }
  }

  function handleCancel() {
    setErrorMsg("");
    setIsEditing(false);
    setForm(profile);
  }

  function renderValue(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return <p className="text-sm italic text-zinc-500">Not set yet</p>;
    }
    return <p className="text-sm text-zinc-200">{trimmed}</p>;
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Brand Identity</h2>
        {saved ? <span className="text-xs text-emerald-300">Saved</span> : null}
      </div>

      {!isEditing ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Name</p>
            <div className="mt-1">{renderValue(profile.name)}</div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Description</p>
            <div className="mt-1">{renderValue(profile.description)}</div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Audience</p>
            <div className="mt-1">{renderValue(profile.audience)}</div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Tone</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(Object.keys(profile.tone) as ToneKey[]).map((key) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                    <span className="capitalize">{key}</span>
                    <span>{profile.tone[key]}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800">
                    <div
                      className="h-1.5 rounded-full bg-zinc-200"
                      style={{ width: `${profile.tone[key]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Description</span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((current) => ({ ...current, description: e.target.value }))
              }
              rows={3}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Audience</span>
            <input
              value={form.audience}
              onChange={(e) =>
                setForm((current) => ({ ...current, audience: e.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            />
          </label>

          <div className="space-y-3">
            {(Object.keys(form.tone) as ToneKey[]).map((key) => (
              <label key={key} className="block">
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                  <span className="capitalize">{key}</span>
                  <span>{form.tone[key]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.tone[key]}
                  onChange={(e) => updateTone(key, Number(e.target.value))}
                  className="w-full accent-zinc-100"
                />
              </label>
            ))}
          </div>

          {errorMsg ? <p className="text-xs text-red-300">{errorMsg}</p> : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
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
