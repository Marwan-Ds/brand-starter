import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import type { BrandKit } from "@/lib/types";
import { AppNav } from "@/components/app-nav";

function readBrandKit(value: unknown): BrandKit | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<BrandKit>;

  if (
    typeof candidate.primary !== "string" ||
    typeof candidate.secondary !== "string" ||
    typeof candidate.accent !== "string" ||
    !Array.isArray(candidate.neutrals) ||
    candidate.neutrals.length !== 4 ||
    candidate.neutrals.some((entry) => typeof entry !== "string") ||
    typeof candidate.headlineFont !== "string" ||
    typeof candidate.bodyFont !== "string"
  ) {
    return null;
  }

  return {
    primary: candidate.primary,
    secondary: candidate.secondary,
    accent: candidate.accent,
    neutrals: [
      candidate.neutrals[0],
      candidate.neutrals[1],
      candidate.neutrals[2],
      candidate.neutrals[3],
    ],
    headlineFont: candidate.headlineFont,
    bodyFont: candidate.bodyFont,
  };
}

export default async function KitsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const kits = await prisma.brandKit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      mode: true,
      business: true,
      vibe: true,
      kitJson: true,
    },
  });

  return (
    <>
      <AppNav />
      <main className="min-h-screen bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Saved kits</h1>
              <p className="mt-2 text-sm text-zinc-400">Newest first</p>
            </div>
            <Link
              href="/new"
              className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
            >
              New kit
            </Link>
          </div>

          {kits.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-300">
              <p>No saved kits yet.</p>
              <Link
                href="/new"
                className="mt-4 inline-flex rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
              >
                New kit
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-4">
              {kits.map((kit) => {
                const parsed = readBrandKit(kit.kitJson);
                return (
                  <Link
                    key={kit.id}
                    href={`/kits/${kit.id}`}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-zinc-600"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-zinc-400">
                          {new Date(kit.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-1 font-medium capitalize">
                          {kit.mode} • {kit.business} • {kit.vibe}
                        </p>
                      </div>
                      {parsed && (
                        <div className="flex items-center gap-2">
                          {[parsed.primary, parsed.secondary, parsed.accent].map((hex) => (
                            <div
                              key={hex}
                              className="h-6 w-6 rounded-full border border-zinc-700"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
