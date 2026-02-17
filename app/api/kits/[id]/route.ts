import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";
  if (!id) {
    return Response.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  try {
    const deleted = await prisma.brandKit.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { ok: false, error: message.slice(0, 180) },
      { status: 500 }
    );
  }
}
