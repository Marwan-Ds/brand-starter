import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { prisma } from "@/lib/db/prisma";
import { readAssetCampaigns } from "@/lib/assets-campaigns";
import { AssetsGeneratorCard } from "../../assets-generator-card";
import { AssetsList } from "../../assets-list";
import { CampaignContextCard } from "../../campaign-context-card";

export default async function KitCampaignDetailPage(
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";
  const campaignId = resolvedParams?.campaignId ?? "";
  if (!id || !campaignId) notFound();

  const record = await prisma.brandKit.findFirst({
    where: { id, userId },
    select: {
      id: true,
      createdAt: true,
      mode: true,
      business: true,
      vibe: true,
      kitJson: true,
    },
  });

  if (!record) notFound();

  const campaigns = readAssetCampaigns(
    (record.kitJson as { assets?: unknown } | null | undefined)?.assets,
    record.createdAt.toISOString()
  );
  const campaign = campaigns.find((entry) => entry.id === campaignId);
  if (!campaign) notFound();

  const campaignOptions = campaigns.map((entry) => ({
    id: entry.id,
    name: entry.name,
    createdAt: entry.createdAt,
  }));

  return (
    <>
      <AppNav />
      <main className="min-h-screen bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-8">
            <Link
              href={`/kits/${record.id}/campaigns`}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              ← Back to campaigns
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{campaign.name}</h1>
            <p className="mt-2 text-sm text-zinc-400 capitalize">
              {record.mode} • {record.business} • {record.vibe}
            </p>
          </div>

          <CampaignContextCard
            id={record.id}
            initialContext={{
              campaignId: campaign.id,
              name: campaign.name,
              goal: campaign.goal,
              platform: campaign.platform,
              ctaStyle: campaign.ctaStyle,
              notes: campaign.notes,
            }}
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <AssetsGeneratorCard
              id={record.id}
              campaigns={campaignOptions}
              fixedCampaignId={campaign.id}
            />
            <AssetsList id={record.id} campaigns={[campaign]} />
          </div>
        </div>
      </main>
    </>
  );
}
