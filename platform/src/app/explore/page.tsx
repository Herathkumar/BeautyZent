import Link from "next/link";
import { BeautyZentMarketHeader } from "@/components/BeautyZentBrand";
import { ExploreDirectory } from "./ExploreDirectory";

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-[#f7f2ec]">
      <BeautyZentMarketHeader
        right={
          <>
            <Link href="/claim" className="text-muted hover:text-ink">
              List your business
            </Link>
            <Link href="/platform/login" className="text-muted hover:text-ink">
              Platform
            </Link>
          </>
        }
      />
      <ExploreDirectory />
    </main>
  );
}
