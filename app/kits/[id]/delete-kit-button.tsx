"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteKitButton({ id }: { id: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDelete() {
    if (isDeleting) return;

    const confirmed = window.confirm(
      "Delete this saved kit? This action cannot be undone."
    );
    if (!confirmed) return;

    setErrorMsg("");
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/kits/${id}`, { method: "DELETE" });

      if (!res.ok) {
        setIsDeleting(false);
        setErrorMsg("Could not delete this kit.");
        return;
      }

      router.push("/kits");
      router.refresh();
    } catch {
      setIsDeleting(false);
      setErrorMsg("Could not delete this kit.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-xl border border-red-900/80 bg-red-950/40 px-3 py-2 text-sm text-red-200 transition hover:border-red-700 hover:text-red-100 disabled:cursor-not-allowed disabled:border-red-900/40 disabled:text-red-300/70 disabled:hover:border-red-900/40"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {errorMsg ? <p className="text-xs text-red-300">{errorMsg}</p> : null}
    </div>
  );
}
