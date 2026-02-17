import { prisma } from "@/lib/db/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";

  if (!id) {
    return Response.json(
      { id, found: false, userId: null, createdAt: null },
      { status: 400 }
    );
  }

  const kit = await prisma.brandKit.findUnique({
    where: { id },
    select: { id: true, userId: true, createdAt: true },
  });

  return Response.json({
    id,
    found: Boolean(kit),
    userId: kit?.userId ?? null,
    createdAt: kit?.createdAt?.toISOString() ?? null,
  });
}
