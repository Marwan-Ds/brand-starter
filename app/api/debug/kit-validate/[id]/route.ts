import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { readBrandKit } from "@/lib/read-brand-kit";

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
        select: { id: true, userId: true, kitJson: true },
      })
    : null;

  const found = Boolean(record);
  const match = Boolean(record && record.userId === userId);
  const valid = Boolean(record && readBrandKit(record.kitJson));

  let reason = "ok";
  if (!id) reason = "missing-id";
  else if (!found) reason = "not-found";
  else if (!match) reason = "user-mismatch";
  else if (!valid) reason = "invalid-kit-json";

  return Response.json({
    id,
    found,
    match,
    valid,
    reason,
  });
}
