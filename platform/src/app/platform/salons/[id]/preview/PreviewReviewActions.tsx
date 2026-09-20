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
    <section className="platform-luxe__preview-card">
      <h2 className="platform-luxe__section-label">— Review</h2>
      {pending ? (
        <>
          <p className="platform-luxe__review-copy">
            Approve to publish on Explore, or reject with a reason so the house can fix details
            and request approval again.
          </p>
          <label className="platform-luxe__label">
            Reject reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="What’s missing or needs to change?"
              className="platform-luxe__textarea"
              data-testid="listing-reject-reason"
            />
            <span className="platform-luxe__hint" style={{ textAlign: "right" }}>
              {reason.length}/800
            </span>
          </label>
          <div className="platform-luxe__review-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run("PUBLISHED")}
              className="platform-luxe__btn-approve"
              data-testid="listing-approve"
            >
              {busy ? "Saving…" : "Approve & publish"}
            </button>
            <button
              type="button"
              disabled={busy || reason.trim().length < 8}
              onClick={() => void run("REJECTED")}
              className="platform-luxe__btn-reject"
              data-testid="listing-reject"
            >
              Reject with reason
            </button>
          </div>
        </>
      ) : (
        <div className="platform-luxe__review-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(active ? "pause" : "resume")}
            className="platform-luxe__cancel"
          >
            {active ? "Pause listing" : "Resume listing"}
          </button>
        </div>
      )}
      {msg ? <p className="platform-luxe__form-error">{msg}</p> : null}
    </section>
  );
}
