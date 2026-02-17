"use client";

import { useEffect, useState } from "react";

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export function ColorSwatch({ label, hex }: { label: string; hex: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    let didCopy = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(hex);
        didCopy = true;
      }
    } catch {
      didCopy = false;
    }

    if (!didCopy) {
      didCopy = fallbackCopy(hex);
    }

    setCopied(didCopy);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <div
        className="group relative mt-3 h-16 rounded-xl border border-zinc-800"
        style={{ backgroundColor: hex }}
      >
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${hex}`}
          className="absolute right-2 top-2 rounded-md border border-zinc-700 bg-zinc-950/80 px-2 py-1 text-xs text-zinc-200 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-3 text-sm text-zinc-200">{hex}</p>
    </div>
  );
}
