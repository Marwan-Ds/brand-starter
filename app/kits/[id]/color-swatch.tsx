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
          className="group absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950/80 text-zinc-200 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <rect
              x="9"
              y="9"
              width="10"
              height="10"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
          <span className="pointer-events-none absolute -top-8 right-0 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] text-zinc-200 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </div>
      <p className="mt-3 text-sm text-zinc-200">{hex}</p>
    </div>
  );
}
