import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { readBrandKit } from "@/lib/read-brand-kit";
import { DeleteKitButton } from "./delete-kit-button";

export default async function KitDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";
  if (!id) notFound();

  const record = await prisma.brandKit.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      mode: true,
      business: true,
      vibe: true,
      kitJson: true,
    },
  });

  if (!record) {
    notFound();
  }

  if (record.userId !== userId) {
    notFound();
  }

  const kit = readBrandKit(record.kitJson);
  if (!kit) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link
              href="/kits"
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              ← Back to saved kits
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Brand kit</h1>
            <p className="mt-2 text-sm text-zinc-400 capitalize">
              {record.mode} • {record.business} • {record.vibe}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm text-zinc-400">
              {new Date(record.createdAt).toLocaleString()}
            </p>
            <DeleteKitButton id={record.id} />
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-lg font-semibold">Palette</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ColorCard label="Primary" hex={kit.primary} />
            <ColorCard label="Secondary" hex={kit.secondary} />
            <ColorCard label="Accent" hex={kit.accent} />
          </div>

          <h2 className="mt-8 text-lg font-semibold">Neutrals</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            {kit.neutrals.map((hex) => (
              <ColorCard key={hex} label="Neutral" hex={hex} />
            ))}
          </div>

          <h2 className="mt-8 text-lg font-semibold">Fonts</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-sm text-zinc-400">Headline</p>
              <p className="mt-2 text-lg font-semibold">{kit.headlineFont}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-sm text-zinc-400">Body</p>
              <p className="mt-2 text-lg font-semibold">{kit.bodyFont}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ColorCard({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <div
        className="mt-3 h-16 rounded-xl border border-zinc-800"
        style={{ backgroundColor: hex }}
      />
      <p className="mt-3 text-sm text-zinc-200">{hex}</p>
    </div>
  );
}
