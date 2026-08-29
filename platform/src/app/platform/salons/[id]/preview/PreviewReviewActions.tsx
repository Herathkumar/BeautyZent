"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PreviewReviewActions({
  salonId,
  listingStatus,
  active,
}: {
  salonId: string;
  listingStatus: string;
  active: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run(action: "PUBLISHED" | "REJECTED" | "pause" | "resume") {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/platform/salons/${salonId}/listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: action === "REJECTED" ? reason : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  const pending = listingStatus === "DRAFT" || listingStatus === "REJECTED";

  return (
    <div className="grid gap-3 rounded-3xl border border-ink/12 bg-white/80 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">Review</h2>
      {pending ? (
        <>
          <p className="text-sm text-muted">
            Approve to publish on Explore, or reject with a reason so the business can fix
            details and request approval again.
          </p>
          <label className="grid gap-1.5 text-sm text-ink-soft">
            Reject reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="What’s missing or needs to change?"
              className="rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink"
              data-testid="listing-reject-reason"
            />
            <span className="text-right text-xs text-muted">{reason.length}/800</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run("PUBLISHED")}
              className="rounded-full bg-[#e7f0e6] px-5 py-2.5 text-sm font-semibold text-[#3f6b43] disabled:opacity-50"
              data-testid="listing-approve"
            >
              {busy ? "Saving…" : "Approve & publish"}
            </button>
            <button
              type="button"
              disabled={busy || reason.trim().length < 8}
              onClick={() => void run("REJECTED")}
              className="rounded-full bg-[#f2e6e2] px-5 py-2.5 text-sm font-semibold text-[#8a4a37] disabled:opacity-50"
              data-testid="listing-reject"
            >
              Reject with reason
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(active ? "pause" : "resume")}
            className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink-soft disabled:opacity-50"
          >
            {active ? "Pause listing" : "Resume listing"}
          </button>
        </div>
      )}
      {msg ? <p className="text-sm text-[#a4432f]">{msg}</p> : null}
    </div>
  );
}
