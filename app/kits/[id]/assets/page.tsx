import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { AppNav } from "@/components/app-nav";
import { AssetsGeneratorCard } from "../assets-generator-card";
import { AssetsList } from "../assets-list";

export default async function KitAssetsPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";
  if (!id) notFound();

  const record = await prisma.brandKit.findFirst({
    where: { id, userId },
    select: {
      id: true,
      mode: true,
      business: true,
      vibe: true,
      kitJson: true,
    },
  });

  if (!record) {
    notFound();
  }

  return (
    <>
      <AppNav />
      <main className="min-h-screen bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-8">
            <Link
              href={`/kits/${record.id}`}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              ← Back to kit
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Activation assets</h1>
            <p className="mt-2 text-sm text-zinc-400 capitalize">
              {record.mode} • {record.business} • {record.vibe}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <AssetsGeneratorCard id={record.id} />
            <AssetsList
              assets={
                (record.kitJson as { assets?: unknown } | null | undefined)?.assets
              }
            />
          </div>
        </div>
      </main>
    </>
  );
}
