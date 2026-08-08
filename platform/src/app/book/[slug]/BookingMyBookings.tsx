"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { CLIENT_CANCEL_HOURS } from "@/lib/client-booking";
import { formatCad } from "@/lib/money";
import { LookPhoto, LookPhotoStrip, LookPhotoViewer } from "./LookPhotos";

type Row = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  canCancel: boolean;
  canAddPhotos: boolean;
  photos: LookPhoto[];
  service: { name: string; durationMin: number; priceCents: number };
  stylist: { id: string; name: string; photoUrl: string };
};

export type MemberTab = "visits" | "lookbook";

function statusLabel(status: string) {
  return status.replace("_", " ").toLowerCase();
}

function StylistThumb({ name, photoUrl }: { name: string; photoUrl: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={name}
      width={52}
      height={52}
      className="h-[52px] w-[52px] shrink-0 rounded-full object-cover ring-2 ring-[rgba(201,180,232,0.45)]"
    />
  );
}

export function BookingMyBookings({
  slug,
  open,
  onClose,
  timezone,
  initialTab = "visits",
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
  timezone?: string;
  initialTab?: MemberTab;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<MemberTab>(initialTab);
  const [viewing, setViewing] = useState<{ rowId: string; photoId: string } | null>(
    null
  );
  const confirm = useConfirm();

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    fetch(`/api/public/${slug}/my-bookings`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load bookings");
        setRows(d.appointments || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"))
      .finally(() => setLoading(false));
  }, [open, slug]);

  function setPhotos(rowId: string, photos: LookPhoto[]) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, photos } : r)));
  }

  async function cancel(id: string) {
    const ok = await confirm({
      title: "Cancel booking?",
      message: "This appointment will be cancelled. You can book again anytime.",
      confirmLabel: "Cancel booking",
      cancelLabel: "Keep it",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/my-bookings/${id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cancel failed");
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "CANCELLED", canCancel: false } : r
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  const upcoming = useMemo(
    () =>
      rows.filter(
        (r) =>
          ["BOOKED", "CHECKED_IN"].includes(r.status) &&
          new Date(r.startsAt).getTime() >= Date.now() - 60_000
      ),
    [rows]
  );
  const past = useMemo(
    () => rows.filter((r) => !upcoming.includes(r)),
    [rows, upcoming]
  );
  const photoVisits = useMemo(
    () => past.filter((r) => r.canAddPhotos || r.photos.length > 0),
    [past]
  );
  const photoCount = useMemo(
    () => rows.reduce((sum, r) => sum + r.photos.length, 0),
    [rows]
  );

  const viewingRow = viewing ? rows.find((r) => r.id === viewing.rowId) ?? null : null;
  const viewingPhoto =
    viewingRow?.photos.find((p) => p.id === viewing?.photoId) ?? null;

  if (!open) return null;

  function dateLine(r: Row, withTime: boolean) {
    return new Date(r.startsAt).toLocaleString("en-CA", {
      weekday: withTime ? "short" : undefined,
      month: "short",
      day: "numeric",
      year: withTime ? undefined : "numeric",
      hour: withTime ? "numeric" : undefined,
      minute: withTime ? "2-digit" : undefined,
      timeZone: timezone,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-3">
      <div
        className="book-card flex h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-auto sm:max-h-[88dvh] sm:rounded-3xl"
        role="dialog"
        aria-label="My bookings"
      >
        <div className="shrink-0 px-5 pt-4">
          <div
            aria-hidden
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-[color:var(--line)] sm:hidden"
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
                Member
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                {tab === "visits" ? "My bookings" : "My look book"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-sm text-muted"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex gap-1 rounded-full border border-[color:var(--line)] p-1">
            <button
              type="button"
              onClick={() => setTab("visits")}
              data-testid="member-tab-visits"
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                tab === "visits"
                  ? "bg-[rgba(201,180,232,0.16)] text-champagne"
                  : "text-muted"
              }`}
            >
              Visits
            </button>
            <button
              type="button"
              onClick={() => setTab("lookbook")}
              data-testid="member-tab-lookbook"
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                tab === "lookbook"
                  ? "bg-[rgba(201,180,232,0.16)] text-champagne"
                  : "text-muted"
              }`}
            >
              Look book{photoCount ? ` · ${photoCount}` : ""}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {loading ? <p className="text-sm text-muted">Loading…</p> : null}
          {error ? <p className="mb-3 text-sm text-[#f5a8a8]">{error}</p> : null}

          {tab === "visits" ? (
            <>
              <p className="text-xs text-muted">
                Free cancel online until {CLIENT_CANCEL_HOURS}h before your visit.
              </p>

              <section className="mt-4 space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Upcoming
                </h3>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted">No upcoming visits.</p>
                ) : (
                  upcoming.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--color-cream)] px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink">{r.service.name}</p>
                          <p className="mt-1 text-sm font-medium text-champagne">
                            {dateLine(r, true)} · {r.stylist.name}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {formatCad(r.service.priceCents)} · {statusLabel(r.status)}
                          </p>
                        </div>
                        <StylistThumb
                          name={r.stylist.name}
                          photoUrl={r.stylist.photoUrl}
                        />
                      </div>
                      {r.canCancel ? (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => cancel(r.id)}
                          className="mt-3 rounded-full border border-[rgba(181,74,60,0.4)] px-3 py-1.5 text-xs font-semibold text-[#b54a3c]"
                        >
                          {busyId === r.id ? "Cancelling…" : "Cancel booking"}
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </section>

              {past.length > 0 ? (
                <section className="mt-6 space-y-3">
                  <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
                    Past
                  </h3>
                  {past.slice(0, 12).map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-[color:var(--line)] px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">
                            {r.service.name}
                          </p>
                          <p className="text-xs text-muted">
                            {dateLine(r, false)} · {r.stylist.name} ·{" "}
                            {statusLabel(r.status)}
                          </p>
                        </div>
                        <StylistThumb
                          name={r.stylist.name}
                          photoUrl={r.stylist.photoUrl}
                        />
                      </div>
                      {r.canAddPhotos || r.photos.length > 0 ? (
                        <LookPhotoStrip
                          slug={slug}
                          appointmentId={r.id}
                          photos={r.photos}
                          canAdd={r.canAddPhotos}
                          compact
                          onPhotosChange={(photos) => setPhotos(r.id, photos)}
                          onOpen={(photo) => setViewing({ rowId: r.id, photoId: photo.id })}
                        />
                      ) : null}
                    </div>
                  ))}
                </section>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-xs text-muted">
                Keep a photo record of every look — the cut, the colour, the notes
                you want to repeat next time. Only you can see these.
              </p>

              {photoVisits.length === 0 ? (
                <p className="mt-6 text-sm text-muted">
                  Your look book fills up after your first visit. Come back here to
                  add photos.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {photoVisits.map((r) => (
                    <section
                      key={r.id}
                      className="rounded-2xl border border-[color:var(--line)] px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">
                            {r.service.name}
                          </p>
                          <p className="text-xs text-muted">
                            {dateLine(r, false)} · {r.stylist.name}
                          </p>
                        </div>
                        <StylistThumb
                          name={r.stylist.name}
                          photoUrl={r.stylist.photoUrl}
                        />
                      </div>
                      <LookPhotoStrip
                        slug={slug}
                        appointmentId={r.id}
                        photos={r.photos}
                        canAdd={r.canAddPhotos}
                        onPhotosChange={(photos) => setPhotos(r.id, photos)}
                        onOpen={(photo) => setViewing({ rowId: r.id, photoId: photo.id })}
                      />
                      {r.photos.length === 0 ? (
                        <p className="mt-2 text-xs text-muted">
                          No photos yet — add one so you can show your stylist next
                          time.
                        </p>
                      ) : null}
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <LookPhotoViewer
        slug={slug}
        photos={viewingRow?.photos ?? []}
        photoId={viewingPhoto?.id ?? null}
        appointmentId={viewingRow?.id ?? null}
        visitLabel={
          viewingRow
            ? `${viewingRow.service.name} · ${dateLine(viewingRow, false)}`
            : ""
        }
        onClose={() => setViewing(null)}
        onPhotoIdChange={(photoId) => {
          if (!viewing) return;
          setViewing({ rowId: viewing.rowId, photoId });
        }}
        onDeleted={(photoId) => {
          if (!viewingRow) return;
          setPhotos(
            viewingRow.id,
            viewingRow.photos.filter((p) => p.id !== photoId)
          );
        }}
        onCaptionSaved={(photoId, caption) => {
          if (!viewingRow) return;
          setPhotos(
            viewingRow.id,
            viewingRow.photos.map((p) =>
              p.id === photoId ? { ...p, caption } : p
            )
          );
        }}
      />
    </div>
  );
}
