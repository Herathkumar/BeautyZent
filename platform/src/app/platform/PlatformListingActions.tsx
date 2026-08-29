"use client";

import { useState } from "react";

/** Quick approve / reject / pause for marketplace listings. */
export function PlatformListingActions({
  salonId,
  listingStatus,
  active,
}: {
  salonId: string;
  listingStatus: string;
  active: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run(action: "PUBLISHED" | "REJECTED" | "pause" | "resume") {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/platform/salons/${salonId}/listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      window.location.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Update failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {listingStatus === "DRAFT" ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("PUBLISHED")}
            className="rounded-full bg-[#e7f0e6] px-3 py-1.5 text-xs font-semibold text-[#3f6b43] disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("REJECTED")}
            className="rounded-full bg-[#f2e6e2] px-3 py-1.5 text-xs font-semibold text-[#8a4a37] disabled:opacity-50"
          >
            Reject
          </button>
        </>
      ) : null}
      {listingStatus === "PUBLISHED" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(active ? "pause" : "resume")}
          className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-muted disabled:opacity-50"
        >
          {active ? "Pause" : "Resume"}
        </button>
      ) : null}
      {listingStatus === "REJECTED" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run("PUBLISHED")}
          className="rounded-full bg-[#e7f0e6] px-3 py-1.5 text-xs font-semibold text-[#3f6b43] disabled:opacity-50"
        >
          Publish
        </button>
      ) : null}
      {msg ? <span className="text-xs text-muted">{msg}</span> : null}
    </div>
  );
}
