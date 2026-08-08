"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { CLIENT_CANCEL_HOURS } from "@/lib/client-booking";
import { formatCad } from "@/lib/money";
import { LookPhoto, LookPhotoStrip, LookPhotoViewer } from "./LookPhotos";
import { StylePreviewPanel, StylePrefDraft } from "./StylePreviewPanel";

type StylistInfo = {
  id: string;
  name: string;
  photoUrl: string;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
};

type Row = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  canCancel: boolean;
  canAddPhotos: boolean;
  photos: LookPhoto[];
  service: { name: string; durationMin: number; priceCents: number };
  stylist: StylistInfo;
  stylePref?: {
    id: string;
    source: string;
    prompt: string | null;
    url: string;
  } | null;
};

export type MemberTab = "visits" | "lookbook";

function statusLabel(status: string) {
  return status.replace("_", " ").toLowerCase();
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function StylistThumb({
  stylist,
  onOpen,
}: {
  stylist: StylistInfo;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-[64px] shrink-0 flex-col items-center gap-1 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,180,232,0.7)]"
      aria-label={`View ${stylist.name} profile`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={stylist.photoUrl}
        alt=""
        width={52}
        height={52}
        className="h-[52px] w-[52px] rounded-full object-cover ring-2 ring-[rgba(201,180,232,0.45)]"
      />
      <p className="w-full truncate text-center text-[10px] font-medium leading-tight text-muted">
        {stylist.name}
      </p>
    </button>
  );
}

function StylistProfileCard({
  stylist,
  onClose,
}: {
  stylist: StylistInfo;
  onClose: () => void;
}) {
  const phone = stylist.phone?.trim() || "";
  const email = stylist.email?.trim() || "";
  const bio = stylist.bio?.trim() || "";

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${stylist.name} profile`}
      onClick={onClose}
    >
      <div
        className="book-card w-full max-w-sm overflow-hidden rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end px-4 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-xs font-semibold text-champagne"
          >
            Close
          </button>
        </div>
        <div className="flex flex-col items-center px-6 pb-6 pt-1 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stylist.photoUrl}
            alt={`${stylist.name} photo`}
            width={112}
            height={112}
            className="h-28 w-28 rounded-full object-cover shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-[5px] ring-[rgba(201,180,232,0.55)]"
          />
          <h3 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-ink">
            {stylist.name}
          </h3>
          <p className="mt-1 text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
            Your stylist
          </p>

          {email ? (
            <a
              href={`mailto:${email}`}
              className="mt-3 break-all text-sm font-medium text-champagne underline-offset-2 hover:underline"
            >
              {email}
            </a>
          ) : (
            <p className="mt-3 text-sm text-muted">Email not shared</p>
          )}

          {phone ? (
            <a
              href={phoneHref(phone)}
              className="mt-1 text-sm font-semibold text-ink"
            >
              {phone}
            </a>
          ) : (
            <p className="mt-1 text-sm text-muted">Phone not shared</p>
          )}

          {bio ? (
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              “{bio}”
            </p>
          ) : null}

          <div className="mt-5 grid w-full gap-2">
            {phone ? (
              <a
                href={phoneHref(phone)}
                className="btn-solid rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                Call {stylist.name.split(" ")[0]}
              </a>
            ) : null}
            {email ? (
              <a
                href={`mailto:${email}`}
                className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-semibold text-champagne"
              >
                Email stylist
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
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
  const [styleEditId, setStyleEditId] = useState<string | null>(null);
  const [styleDraft, setStyleDraft] = useState<StylePrefDraft | null>(null);
  const [styleBusy, setStyleBusy] = useState(false);
  const [styleViewer, setStyleViewer] = useState<string | null>(null);
  const [stylistCard, setStylistCard] = useState<StylistInfo | null>(null);
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

  function openStyleEdit(r: Row) {
    setStyleEditId(r.id);
    setStyleDraft(
      r.stylePref?.url
        ? {
            imageBase64: r.stylePref.url,
            mimeType: "image/jpeg",
            source: (r.stylePref.source as StylePrefDraft["source"]) || "UPLOAD",
            prompt: r.stylePref.prompt,
          }
        : null
    );
    setError("");
  }

  async function saveStylePref(appointmentId: string) {
    if (!styleDraft?.imageBase64) {
      setError("Add a style photo before saving.");
      return;
    }
    // Existing saved pref may be a URL — re-fetch bytes as data URL if needed.
    let imageBase64 = styleDraft.imageBase64;
    if (imageBase64.startsWith("/")) {
      setStyleBusy(true);
      try {
        const res = await fetch(imageBase64);
        const blob = await res.blob();
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Could not read photo"));
          reader.readAsDataURL(blob);
        });
      } catch {
        setError("Could not load the current style photo. Pick a new one.");
        setStyleBusy(false);
        return;
      }
    }

    setStyleBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/my-bookings/${appointmentId}/style-pref`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType: styleDraft.mimeType,
          source: styleDraft.source,
          prompt: styleDraft.prompt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save style preview");
      setRows((prev) =>
        prev.map((r) =>
          r.id === appointmentId ? { ...r, stylePref: data.stylePref } : r
        )
      );
      setStyleEditId(null);
      setStyleDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save style preview");
    } finally {
      setStyleBusy(false);
    }
  }

  async function removeStylePref(appointmentId: string) {
    const ok = await confirm({
      title: "Remove style preview?",
      message: "Your stylist will no longer see a preferred look for this visit.",
      confirmLabel: "Remove",
      cancelLabel: "Keep it",
      tone: "danger",
    });
    if (!ok) return;
    setStyleBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/my-bookings/${appointmentId}/style-pref`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not remove");
      setRows((prev) =>
        prev.map((r) => (r.id === appointmentId ? { ...r, stylePref: null } : r))
      );
      setStyleEditId(null);
      setStyleDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setStyleBusy(false);
    }
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
                            {dateLine(r, true)}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {formatCad(r.service.priceCents)} · {statusLabel(r.status)}
                          </p>
                        </div>
                        <StylistThumb
                          stylist={r.stylist}
                          onOpen={() => setStylistCard(r.stylist)}
                        />
                      </div>
                      {r.stylePref?.url && styleEditId !== r.id ? (
                        <button
                          type="button"
                          onClick={() => setStyleViewer(r.stylePref!.url)}
                          className="mt-3 flex w-full items-center gap-2 text-left"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={r.stylePref.url}
                            alt="Preferred look"
                            className="h-12 w-12 rounded-lg object-cover ring-1 ring-[rgba(201,180,232,0.45)]"
                          />
                          <p className="text-xs text-muted">
                            Preferred look
                            {r.stylePref.prompt ? ` · ${r.stylePref.prompt}` : ""}
                            <span className="mt-0.5 block font-semibold text-champagne">
                              Tap to view
                            </span>
                          </p>
                        </button>
                      ) : null}

                      {styleEditId === r.id ? (
                        <div className="mt-3 space-y-2">
                          <StylePreviewPanel
                            slug={slug}
                            isMember
                            value={styleDraft}
                            onChange={setStyleDraft}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={styleBusy || !styleDraft}
                              onClick={() => void saveStylePref(r.id)}
                              className="btn-solid rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-60"
                            >
                              {styleBusy ? "Saving…" : "Save to booking"}
                            </button>
                            {r.stylePref ? (
                              <button
                                type="button"
                                disabled={styleBusy}
                                onClick={() => void removeStylePref(r.id)}
                                className="rounded-full border border-[rgba(245,168,168,0.4)] px-4 py-2 text-xs font-semibold text-[#f5a8a8]"
                              >
                                Remove
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={styleBusy}
                              onClick={() => {
                                setStyleEditId(null);
                                setStyleDraft(null);
                              }}
                              className="rounded-full border border-[color:var(--line)] px-4 py-2 text-xs font-semibold text-champagne"
                            >
                              Close editor
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openStyleEdit(r)}
                          className="mt-3 mr-2 rounded-full border border-[color:var(--line)] bg-[color:var(--color-cream)] px-3 py-1.5 text-xs font-semibold text-champagne"
                        >
                          {r.stylePref ? "Update style preview" : "Add style preview"}
                        </button>
                      )}

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
                            {dateLine(r, false)} · {statusLabel(r.status)}
                          </p>
                        </div>
                        <StylistThumb
                          stylist={r.stylist}
                          onOpen={() => setStylistCard(r.stylist)}
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
                            {dateLine(r, false)}
                          </p>
                        </div>
                        <StylistThumb
                          stylist={r.stylist}
                          onOpen={() => setStylistCard(r.stylist)}
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

      {stylistCard ? (
        <StylistProfileCard
          stylist={stylistCard}
          onClose={() => setStylistCard(null)}
        />
      ) : null}

      {styleViewer ? (
        <div
          className="fixed inset-0 z-[90] flex flex-col bg-black/92"
          role="dialog"
          aria-modal="true"
          aria-label="Preferred look"
        >
          <div className="flex justify-end px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={() => setStyleViewer(null)}
              className="rounded-full bg-[#e0d0f5] px-4 py-2 text-sm font-semibold text-[#17121f]"
            >
              Close
            </button>
          </div>
          <button
            type="button"
            className="flex min-h-0 flex-1 items-center justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
            onClick={() => setStyleViewer(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={styleViewer}
              alt="Preferred look"
              className="max-h-full max-w-full object-contain"
            />
          </button>
        </div>
      ) : null}
    </div>
  );
}
