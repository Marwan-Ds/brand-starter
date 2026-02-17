import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch (e) {
    const error = e as { name?: string; message?: string } | null;
    return Response.json(
      {
        ok: false,
        name: error?.name,
        message: error?.message?.slice(0, 180),
      },
      { status: 500 }
    );
  }
}
