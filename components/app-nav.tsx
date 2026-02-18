"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

export function AppNav() {
  const pathname = usePathname();
  const isHomeActive = pathname === "/";
  const isKitsActive = pathname.startsWith("/kits");

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold text-zinc-100 hover:text-white">
            Brand Starter
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-300">
            <Link
              href="/"
              className={`border-b pb-0.5 ${
                isHomeActive
                  ? "border-zinc-200 text-white"
                  : "border-transparent hover:border-zinc-500 hover:text-zinc-100"
              }`}
            >
              Home
            </Link>
            <Link
              href="/kits"
              className={`border-b pb-0.5 ${
                isKitsActive
                  ? "border-zinc-200 text-white"
                  : "border-transparent hover:border-zinc-500 hover:text-zinc-100"
              }`}
            >
              Saved kits
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
          >
            New kit
          </Link>
          <UserButton />
        </div>
      </div>
    </header>
  );
}
