"use client";

import { useCallback, useEffect, useState } from "react";

type LeaveReq = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  note: string | null;
  stylist: { id: string; name: string };
};

function formatRange(startsAt: string, endsAt: string) {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  return `${new Date(startsAt).toLocaleString("en-CA", opts)} → ${new Date(endsAt).toLocaleString("en-CA", opts)}`;
}

export function PendingLeavePanel() {
  const [blocks, setBlocks] = useState<LeaveReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/leave-requests");
    if (res.status === 401) {
      window.location.href = "/manager/login";
      return;
    }
    const data = await res.json();
    setBlocks(data.blocks || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(stylistId: string, blockId: string, action: "approve" | "reject") {
    setBusyId(blockId);
    setMessage("");
    const res = await fetch(`/api/admin/stylists/${stylistId}/blocks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: blockId, action }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Could not update leave");
      return;
    }
    setMessage(action === "approve" ? "Leave approved." : "Leave rejected.");
    await load();
  }

  if (loading) return null;
  if (blocks.length === 0 && !message) return null;

  return (
    <section className="mt-8 space-y-3" data-testid="pending-leave-panel">
      {blocks.length > 0 ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#f0c987] uppercase">
                Needs your attention
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#fffaf6]">
                Leave awaiting approval
              </h2>
              <p className="mt-1 text-sm text-muted">
                {blocks.length} request{blocks.length === 1 ? "" : "s"} from your team
              </p>
            </div>
          </div>
          <div className="divide-y divide-[#c9a87c]/20 overflow-hidden rounded-2xl border border-[#f0c987]/35 bg-[#3a2a22]">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#c9a87c]">Leave request from</p>
                  <p className="text-lg font-semibold text-[#fffaf6]">{b.stylist.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {b.reason}
                    {b.reason ? " · " : ""}
                    {formatRange(b.startsAt, b.endsAt)}
                  </p>
                  {b.note ? <p className="mt-1 text-sm text-[#f0c987]">{b.note}</p> : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    className="btn-solid rounded-full px-4 py-2 text-sm disabled:opacity-40"
                    onClick={() => void review(b.stylist.id, b.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    className="rounded-full border border-[rgba(245,168,168,0.45)] px-4 py-2 text-sm text-[#f5a8a8] disabled:opacity-40"
                    onClick={() => void review(b.stylist.id, b.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {message ? <p className="text-sm text-[#9fe3b8]">{message}</p> : null}
    </section>
  );
}
