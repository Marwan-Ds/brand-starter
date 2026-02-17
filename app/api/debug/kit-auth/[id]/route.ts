import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";

  const record = id
    ? await prisma.brandKit.findUnique({
        where: { id },
        select: { id: true, userId: true },
      })
    : null;

  return Response.json({
    id,
    found: Boolean(record),
    viewerUserId: userId,
    recordUserId: record?.userId ?? null,
    match: Boolean(record && record.userId === userId),
  });
}
