import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { readBrandKit } from "@/lib/read-brand-kit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ step: "no-auth" });
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";

  const record = id
    ? await prisma.brandKit.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          kitJson: true,
          createdAt: true,
          mode: true,
          business: true,
          vibe: true,
        },
      })
    : null;

  if (!record) {
    return Response.json({ step: "not-found" });
  }

  if (record.userId !== userId) {
    return Response.json({ step: "user-mismatch" });
  }

  const kit = readBrandKit(record.kitJson);
  if (!kit) {
    return Response.json({ step: "invalid-kit-json" });
  }

  return Response.json({
    step: "ok",
    id: record.id,
    userId,
    recordUserId: record.userId,
    createdAt: record.createdAt.toISOString(),
  });
}
