import { notFound, redirect } from "next/navigation";

export default async function KitAssetsPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";
  if (!id) notFound();

  redirect(`/kits/${id}/campaigns`);
}
