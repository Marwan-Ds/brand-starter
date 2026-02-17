import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-zinc-100 hover:text-white">
            Brand Starter
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-300">
            <Link href="/" className="hover:text-zinc-100">
              Home
            </Link>
            <Link href="/kits" className="hover:text-zinc-100">
              Saved kits
            </Link>
          </nav>
        </div>
        <UserButton />
      </div>
    </header>
  );
}
