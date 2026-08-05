"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DisplayBoard } from "@/app/display/[slug]/DisplayBoard";

export default function ManagerStoreDisplayPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/admin/salon");
      if (res.status === 401) {
        window.location.href = "/manager/login";
        return;
      }
      if (!res.ok) {
        if (!cancelled) setError("Could not load salon.");
        return;
      }
      const data = await res.json();
      if (!cancelled) setSlug(data.salon?.slug || null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="space-y-4" data-testid="manager-store-display">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#c9a87c] uppercase">
            Bookings
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#fffaf6]">
            Store display
          </h1>
          <p className="text-sm text-muted">
            Same floor board as the salon tablet — seat waitlist, check in, and complete jobs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/manager/appointments"
            className="rounded-full border border-[#c9a87c]/45 px-4 py-2.5 text-sm text-[#f0c987]"
          >
            Back to bookings
          </Link>
          {slug ? (
            <Link
              href={`/display/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-4 py-2.5 text-sm text-white/80"
            >
              Open tablet view
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
      {!slug && !error ? (
        <p className="text-sm text-muted">Loading store display…</p>
      ) : null}
      {slug ? (
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-2 sm:px-4 md:px-6">
          <DisplayBoard slug={slug} embedded />
        </div>
      ) : null}
    </main>
  );
}
