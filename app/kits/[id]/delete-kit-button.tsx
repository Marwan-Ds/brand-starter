"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteKitButton({ id }: { id: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting) return;

    const confirmed = window.confirm(
      "Delete this saved kit? This action cannot be undone."
    );
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/kits/${id}`, { method: "DELETE" });

      if (!res.ok) {
        setIsDeleting(false);
        window.alert("Could not delete this kit.");
        return;
      }

      router.push("/kits");
    } catch {
      setIsDeleting(false);
      window.alert("Could not delete this kit.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-xl border border-red-900/80 bg-red-950/40 px-3 py-2 text-sm text-red-200 transition hover:border-red-700 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
