"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Toast = { message: string; type: "success" | "error" } | null;

export function DeleteKitButton({ id }: { id: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(timeout);
  }, [toast]);

  async function handleDelete() {
    if (isDeleting) return;

    const confirmed = window.confirm(
      "Delete this saved kit? This action cannot be undone."
    );
    if (!confirmed) return;

    setToast(null);
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/kits/${id}`, { method: "DELETE" });

      if (!res.ok) {
        setIsDeleting(false);
        setToast({ message: "Could not delete this kit.", type: "error" });
        return;
      }

      setToast({ message: "Deleted", type: "success" });
      await new Promise((resolve) => setTimeout(resolve, 700));
      router.push("/kits");
      router.refresh();
    } catch {
      setIsDeleting(false);
      setToast({ message: "Could not delete this kit.", type: "error" });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-xl border border-red-900/80 bg-red-950/40 px-3 py-2 text-sm text-red-200 transition hover:border-red-700 hover:text-red-100 disabled:cursor-not-allowed disabled:border-red-900/40 disabled:text-red-300/70 disabled:hover:border-red-900/40 disabled:opacity-70"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 rounded-xl border px-3 py-2 text-sm ${
            toast.type === "success"
              ? "border-emerald-700/70 bg-emerald-950/85 text-emerald-200"
              : "border-red-800/70 bg-red-950/85 text-red-200"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
