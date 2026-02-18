import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { readBrandKit } from "@/lib/read-brand-kit";
import { DeleteKitButton } from "./delete-kit-button";
import { ColorSwatch } from "./color-swatch";
import { AppNav } from "@/components/app-nav";

const GOOGLE_FONT_NAMES = new Set([
  "Inter",
  "Poppins",
  "Montserrat",
  "Roboto",
  "Open Sans",
  "Lato",
  "Raleway",
  "Nunito",
  "Playfair Display",
  "Merriweather",
  "Oswald",
]);

function getGoogleFontUrl(fontName: string): string | null {
  if (!GOOGLE_FONT_NAMES.has(fontName)) return null;
  return `https://fonts.google.com/specimen/${fontName.replace(/ /g, "+")}`;
}

export default async function KitDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const resolvedParams = await params;
  const id = resolvedParams?.id ?? "";
  if (!id) notFound();

  const record = await prisma.brandKit.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      mode: true,
      business: true,
      vibe: true,
      kitJson: true,
    },
  });

  if (!record) {
    notFound();
  }

  if (record.userId !== userId) {
    notFound();
  }

  const kit = readBrandKit(record.kitJson);
  if (!kit) {
    notFound();
  }

  const headlineFontUrl = getGoogleFontUrl(kit.headlineFont);
  const bodyFontUrl = getGoogleFontUrl(kit.bodyFont);

  return (
    <>
      <AppNav />
      <main className="min-h-screen bg-zinc-950 text-zinc-50">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href="/kits"
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                ← Back to saved kits
              </Link>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Brand kit</h1>
              <p className="mt-2 text-sm text-zinc-400 capitalize">
                {record.mode} • {record.business} • {record.vibe}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="text-sm text-zinc-400">
                {new Date(record.createdAt).toLocaleString()}
              </p>
              <DeleteKitButton id={record.id} />
            </div>
          </div>

          <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-lg font-semibold">Palette</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <ColorSwatch label="Primary" hex={kit.primary} />
              <ColorSwatch label="Secondary" hex={kit.secondary} />
              <ColorSwatch label="Accent" hex={kit.accent} />
            </div>

          <h2 className="mt-8 text-lg font-semibold">Neutrals</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            {kit.neutrals.map((hex) => (
              <ColorSwatch key={hex} label="Neutral" hex={hex} />
            ))}
          </div>

          <h2 className="mt-8 text-lg font-semibold">Fonts</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-sm text-zinc-400">Headline</p>
              {headlineFontUrl ? (
                <a
                  href={headlineFontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${kit.headlineFont} on Google Fonts`}
                  className="mt-2 inline-block text-lg font-semibold text-zinc-100 underline-offset-4 hover:text-white hover:underline"
                >
                  {kit.headlineFont}
                </a>
              ) : (
                <p className="mt-2 text-lg font-semibold">{kit.headlineFont}</p>
              )}
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-sm text-zinc-400">Body</p>
              {bodyFontUrl ? (
                <a
                  href={bodyFontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${kit.bodyFont} on Google Fonts`}
                  className="mt-2 inline-block text-lg font-semibold text-zinc-100 underline-offset-4 hover:text-white hover:underline"
                >
                  {kit.bodyFont}
                </a>
              ) : (
                <p className="mt-2 text-lg font-semibold">{kit.bodyFont}</p>
              )}
            </div>
          </div>
          </section>
        </div>
      </main>
    </>
  );
}
