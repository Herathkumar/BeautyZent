import Link from "next/link";
import { ExploreDirectory } from "./ExploreDirectory";

function IconProfile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 20a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ExplorePage() {
  return (
    <main className="explore-luxe min-h-screen">
      <header className="explore-luxe__topbar">
        <div className="explore-luxe__topbar-inner explore-luxe__topbar-inner--end">
          <nav className="explore-luxe__top-links" aria-label="Marketplace">
            <Link href="/">Home</Link>
            <Link href="/claim">List your business</Link>
            <Link href="/account" className="explore-luxe__account-btn">
              <IconProfile className="h-4 w-4" />
              My account
            </Link>
          </nav>
        </div>
      </header>
      <ExploreDirectory />
    </main>
  );
}
