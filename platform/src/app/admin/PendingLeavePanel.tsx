"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [blocks, setBlocks] = useState<LeaveReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/leave-requests", { cache: "no-store" });
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

  async function review(stylistId: string, blockId: string, status: "APPROVED" | "REJECTED") {
    setBusyId(blockId);
    setMessage("");
    const res = await fetch(`/api/admin/stylists/${stylistId}/blocks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ id: blockId, status }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error || "Could not update leave");
      return;
    }
    if (data.block?.status !== status) {
      setMessage("Could not update leave status. Try again.");
      await load();
      return;
    }
    setMessage(status === "APPROVED" ? "Leave approved." : "Leave rejected.");
    // Optimistically remove from pending list
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    await load();
    router.refresh();
  }

  if (loading) return null;
  if (blocks.length === 0 && !message) return null;

  return (
    <section className="mt-8 space-y-3" data-testid="pending-leave-panel">
      {blocks.length > 0 ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#7d6154] uppercase">
                Needs your attention
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[#2b2521]">
                Leave awaiting approval
              </h2>
              <p className="mt-1 text-sm text-muted">
                {blocks.length} request{blocks.length === 1 ? "" : "s"} from your team
              </p>
            </div>
          </div>
          <div className="divide-y divide-[#7d6154]/20 overflow-hidden rounded-2xl border border-[#7d6154]/35 bg-[#f3ebe3]">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#7d6154]">Leave request from</p>
                  <p className="text-lg font-semibold text-[#2b2521]">{b.stylist.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {b.reason}
                    {b.reason ? " · " : ""}
                    {formatRange(b.startsAt, b.endsAt)}
                  </p>
                  {b.note ? <p className="mt-1 text-sm text-[#7d6154]">{b.note}</p> : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    className="btn-solid rounded-full px-4 py-2 text-sm disabled:opacity-40"
                    onClick={() => void review(b.stylist.id, b.id, "APPROVED")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === b.id}
                    className="rounded-full border border-[rgba(245,168,168,0.45)] px-4 py-2 text-sm text-[#f5a8a8] disabled:opacity-40"
                    onClick={() => void review(b.stylist.id, b.id, "REJECTED")}
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
