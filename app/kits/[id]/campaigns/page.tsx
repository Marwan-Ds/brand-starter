import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { prisma } from "@/lib/db/prisma";
import { readAssetCampaigns } from "@/lib/assets-campaigns";
import { CreateCampaignButton } from "../create-campaign-button";

export default async function KitCampaignsPage(
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
      createdAt: true,
      business: true,
      mode: true,
      vibe: true,
      kitJson: true,
    },
  });

  if (!record) notFound();

  const campaigns = readAssetCampaigns(
    (record.kitJson as { assets?: unknown } | null | undefined)?.assets,
    record.createdAt.toISOString()
  );

  return (
    <>
      <AppNav />
      <main className="min-h-screen bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <Link
                href={`/kits/${record.id}`}
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                ← Back to kit
              </Link>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Campaigns</h1>
              <p className="mt-2 text-sm text-zinc-400 capitalize">
                {record.mode} • {record.business} • {record.vibe}
              </p>
            </div>
            <CreateCampaignButton
              id={record.id}
              label="New campaign"
              className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-500"
            />
          </div>

          {campaigns.length === 0 ? (
            <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8">
              <h2 className="text-xl font-semibold">No campaigns yet</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Campaigns group your assets by goal or launch.
              </p>
              <div className="mt-5">
                <CreateCampaignButton
                  id={record.id}
                  label="Create your first campaign"
                  className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
                />
              </div>
            </section>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/kits/${record.id}/campaigns/${campaign.id}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  <p className="text-base font-medium text-zinc-100">{campaign.name}</p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Goal: {campaign.goal || "Not set"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Platform: {campaign.platform || "Not set"}
                  </p>
                  <p className="mt-3 text-xs text-zinc-500">
                    Last updated{" "}
                    {new Date(campaign.updatedAt ?? campaign.createdAt).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
