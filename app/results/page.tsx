import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { ResultsContent } from "./results-content";

export default function ResultsPage() {
  return (
    <>
      <AppNav />
      <Suspense fallback={<main className="min-h-screen bg-zinc-950" />}>
        <ResultsContent />
      </Suspense>
    </>
  );
}
