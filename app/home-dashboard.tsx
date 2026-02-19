import Link from "next/link";

type BrandSummary = {
  id: string;
  createdAt: Date;
  kitJson: unknown;
};

function readBrandName(kitJson: unknown) {
  if (!kitJson || typeof kitJson !== "object") return "Untitled Brand";
  const profile = (kitJson as { profile?: { name?: unknown } }).profile;
  if (profile && typeof profile.name === "string" && profile.name.trim()) {
    return profile.name.trim();
  }
  return "Untitled Brand";
}

function readColors(kitJson: unknown) {
  if (!kitJson || typeof kitJson !== "object") {
    return ["#52525B", "#3F3F46", "#27272A"];
  }

  const candidate = kitJson as {
    primary?: unknown;
    secondary?: unknown;
    accent?: unknown;
  };

  const primary = typeof candidate.primary === "string" ? candidate.primary : "#52525B";
  const secondary =
    typeof candidate.secondary === "string" ? candidate.secondary : "#3F3F46";
  const accent = typeof candidate.accent === "string" ? candidate.accent : "#27272A";

  return [primary, secondary, accent];
}

export default function HomeDashboard({ brands }: { brands: BrandSummary[] }) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-zinc-400">Recent Brands</p>
          </div>
          <Link
            href="/new"
            className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
          >
            Create new brand
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => {
            const [primary, secondary, accent] = readColors(brand.kitJson);
            const name = readBrandName(brand.kitJson);

            return (
              <Link
                key={brand.id}
                href={`/kits/${brand.id}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-zinc-600"
              >
                <p className="font-medium text-zinc-100">{name}</p>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full border border-zinc-800">
                  <div style={{ backgroundColor: primary, width: "33.333%" }} />
                  <div style={{ backgroundColor: secondary, width: "33.333%" }} />
                  <div style={{ backgroundColor: accent, width: "33.333%" }} />
                </div>
                <p className="mt-3 text-xs text-zinc-400">
                  {new Date(brand.createdAt).toLocaleString()}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
