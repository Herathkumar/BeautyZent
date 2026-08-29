import Link from "next/link";
import { ExploreDirectory } from "./ExploreDirectory";

export const metadata = {
  title: "Explore businesses — BeautyZent",
  description: "Find salons, barbers, spas, and book online.",
};

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-[#f7f2ec]">
      <div className="border-b border-ink/10 bg-white/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-ink">
            BeautyZent
          </Link>
          <div className="flex gap-3 text-sm">
            <Link href="/claim" className="text-muted hover:text-ink">
              List your business
            </Link>
            <Link href="/platform/login" className="text-muted hover:text-ink">
              Platform
            </Link>
          </div>
        </div>
      </div>
      <ExploreDirectory />
    </main>
  );
}
