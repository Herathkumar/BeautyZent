"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { FacebookIcon, InstagramIcon } from "@/components/SocialBrandIcons";
import { facebookUrl, instagramUrl } from "@/lib/social-links";
import { LookPhoto, LookPhotoStrip, LookPhotoViewer } from "./LookPhotos";
import { StylePreviewPanel, StylePrefDraft } from "./StylePreviewPanel";
import { StylistLiveSchedule } from "./StylistLiveSchedule";
import { readStyleDraft, writeStyleDraft } from "./style-draft-storage";
import { LuxeSheet } from "./luxe";
import { GoldLogoLoader } from "@/components/GoldLogoSpin";

type StylistInfo = {
  id: string;
  name: string;
  photoUrl: string;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  facebook?: string | null;
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
type VisitsSegment = "upcoming" | "past";

function statusLabel(status: string) {
  return status.replace("_", " ").toLowerCase();
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function googleCalendarUrl(
  r: Pick<Row, "startsAt" | "endsAt" | "service" | "stylist">,
  salonName?: string | null
) {
  const start = new Date(r.startsAt)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const end = new Date(r.endsAt)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const title = encodeURIComponent(
    `${r.service.name} at ${salonName?.trim() || "Salon"}`
  );
  const details = encodeURIComponent(`with ${r.stylist.name}`);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

function formatVisitDate(startsAt: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date(startsAt));
}

function formatVisitTimeRange(startsAt: string, endsAt: string, timeZone: string) {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  };
  const start = new Intl.DateTimeFormat("en-CA", opts).format(new Date(startsAt));
  const end = new Intl.DateTimeFormat("en-CA", opts).format(new Date(endsAt));
  return `${start} – ${end}`;
}

function IconCalendar({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M5 1.5v2.5M11 1.5v2.5M2 6.5h12" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function IconClock({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8 5v3.2l2 1.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function IconEye({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M1.5 8s2.2-4 6.5-4 6.5 4 6.5 4-2.2 4-6.5 4-6.5-4-6.5-4Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <circle cx="8" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function IconCalendarPlus({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M5 1.5v2.5M11 1.5v2.5M2 6.5h12M8 9v3M6.5 10.5H9.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function BookingStylistAvatar({
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
      className="book-luxe-booking-avatar-btn shrink-0"
      aria-label={`View ${stylist.name} profile`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={stylist.photoUrl} alt="" className="book-luxe-booking-avatar" />
    </button>
  );
}

function VisitBookingCard({
  row,
  timeZone,
  salonName,
  slug,
  highlight,
  busyId,
  styleEditId,
  styleDraft,
  styleBusy,
  onOpenStylist,
  onCancel,
  onOpenStyleEdit,
  onSaveStylePref,
  onRemoveStylePref,
  onCloseStyleEdit,
  onViewStylePref,
  onStyleDraftChange,
  onPhotosChange,
  onOpenPhoto,
  showPastExtras,
}: {
  row: Row;
  timeZone: string;
  salonName?: string | null;
  slug: string;
  highlight?: boolean;
  busyId: string | null;
  styleEditId: string | null;
  styleDraft: StylePrefDraft | null;
  styleBusy: boolean;
  onOpenStylist: () => void;
  onCancel: (id: string) => void;
  onOpenStyleEdit: (row: Row) => void;
  onSaveStylePref: (id: string) => void;
  onRemoveStylePref: (id: string) => void;
  onCloseStyleEdit: () => void;
  onViewStylePref: (url: string) => void;
  onStyleDraftChange: (next: StylePrefDraft | null) => void;
  onPhotosChange: (photos: LookPhoto[]) => void;
  onOpenPhoto: (photo: LookPhoto) => void;
  showPastExtras?: boolean;
}) {
  const isUpcoming = ["BOOKED", "CHECKED_IN"].includes(row.status);
  const editing = styleEditId === row.id;

  return (
    <article
      data-testid={highlight ? "booking-confirmed" : "booking-card"}
      className="book-luxe-booking-card"
    >
      <div className="flex items-start gap-3">
        <BookingStylistAvatar stylist={row.stylist} onOpen={onOpenStylist} />
        <div className="min-w-0 flex-1">
          <h3 className="book-luxe-booking-card__title font-[family-name:var(--font-display)]">
            {row.service.name}
          </h3>
          <p className="book-luxe-booking-card__stylist">with {row.stylist.name}</p>
          <div className="book-luxe-booking-card__meta">
            <p>
              <IconCalendar className="book-luxe-booking-card__icon" />
              {formatVisitDate(row.startsAt, timeZone)}
            </p>
            <p>
              <IconClock className="book-luxe-booking-card__icon" />
              {formatVisitTimeRange(row.startsAt, row.endsAt, timeZone)}
            </p>
          </div>
        </div>
        {showPastExtras && !isUpcoming ? (
          <span className={`book-luxe-status ${statusTone(row.status)}`}>
            {statusLabel(row.status)}
          </span>
        ) : null}
      </div>

      {row.stylePref?.url && !editing ? (
        <button
          type="button"
          onClick={() => onViewStylePref(row.stylePref!.url)}
          className="book-luxe-booking-style-thumb"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.stylePref.url} alt="Preferred look" />
          <span>
            Preferred look
            {row.stylePref.prompt ? ` · ${row.stylePref.prompt}` : ""}
          </span>
        </button>
      ) : null}

      {editing ? (
        <div className="mt-3 space-y-2">
          <StylePreviewPanel
            slug={slug}
            isMember
            value={styleDraft}
            onChange={onStyleDraftChange}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={styleBusy || !styleDraft}
              onClick={() => onSaveStylePref(row.id)}
              className="book-luxe-booking-action book-luxe-booking-action--solid"
            >
              {styleBusy ? "Saving…" : "Save to booking"}
            </button>
            {row.stylePref ? (
              <button
                type="button"
                disabled={styleBusy}
                onClick={() => onRemoveStylePref(row.id)}
                className="book-luxe-booking-action book-luxe-booking-action--outline"
              >
                Remove
              </button>
            ) : null}
            <button
              type="button"
              disabled={styleBusy}
              onClick={onCloseStyleEdit}
              className="book-luxe-booking-action book-luxe-booking-action--outline"
            >
              Close
            </button>
          </div>
        </div>
      ) : isUpcoming ? (
        <div className="book-luxe-booking-actions">
          <a
            href={googleCalendarUrl(row, salonName)}
            target="_blank"
            rel="noreferrer"
            data-testid="booking-add-calendar"
            className="book-luxe-booking-action book-luxe-booking-action--solid"
          >
            <IconCalendarPlus className="h-3.5 w-3.5" />
            Add to calendar
          </a>
          <button
            type="button"
            onClick={() => onOpenStyleEdit(row)}
            className="book-luxe-booking-action book-luxe-booking-action--outline"
          >
            <IconEye className="h-3.5 w-3.5" />
            {row.stylePref ? "Update style preview" : "Add style preview"}
          </button>
        </div>
      ) : null}

      {showPastExtras && (row.canAddPhotos || row.photos.length > 0) ? (
        <LookPhotoStrip
          slug={slug}
          appointmentId={row.id}
          photos={row.photos}
          canAdd={row.canAddPhotos}
          compact
          onPhotosChange={onPhotosChange}
          onOpen={onOpenPhoto}
        />
      ) : null}

      {row.canCancel ? (
        <button
          type="button"
          disabled={busyId === row.id}
          onClick={() => onCancel(row.id)}
          className="book-luxe-booking-cancel"
        >
          {busyId === row.id ? "Cancelling…" : "Cancel booking"}
        </button>
      ) : null}
    </article>
  );
}

function statusTone(status: string) {
  if (status === "CANCELLED") return "book-luxe-status--cancelled";
  if (status === "NO_SHOW") return "book-luxe-status--noshow";
  return "book-luxe-status--done";
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
        className="h-[52px] w-[52px] book-luxe-glow-avatar rounded-full object-cover"
      />
      <p className="w-full truncate text-center text-[10px] font-medium leading-tight text-muted">
        {stylist.name}
      </p>
    </button>
  );
}

function StylistProfileCard({
  slug,
  stylist,
  onClose,
}: {
  slug: string;
  stylist: StylistInfo;
  onClose: () => void;
}) {
  const phone = stylist.phone?.trim() || "";
  const email = stylist.email?.trim() || "";
  const bio = stylist.bio?.trim() || "";
  const ig = instagramUrl(stylist.instagram);
  const fb = facebookUrl(stylist.facebook);

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
            className="h-28 w-28 rounded-full object-cover shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-[5px] ring-[rgb(var(--t-accent-rgb)/0.55)]"
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

          <div className="mt-5 w-full text-left">
            <StylistLiveSchedule
              slug={slug}
              stylistId={stylist.id}
              stylistName={stylist.name}
              photoUrl={stylist.photoUrl}
              bio={bio}
              compact
            />
          </div>

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
            {ig ? (
              <a
                href={ig}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-semibold text-champagne"
              >
                <InstagramIcon className="h-5 w-5 shrink-0" />
                Instagram
              </a>
            ) : null}
            {fb ? (
              <a
                href={fb}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-semibold text-champagne"
              >
                <FacebookIcon className="h-5 w-5 shrink-0" />
                Facebook
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
  salonName,
  initialTab = "visits",
  highlightId = null,
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
  timezone?: string;
  salonName?: string | null;
  initialTab?: MemberTab;
  /** Scroll / mark the booking just created. */
  highlightId?: string | null;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<MemberTab>(initialTab);
  const [visitsSegment, setVisitsSegment] = useState<VisitsSegment>("upcoming");
  const [viewing, setViewing] = useState<{ rowId: string; photoId: string } | null>(
    null
  );
  const [styleEditId, setStyleEditId] = useState<string | null>(null);
  const [styleDraft, setStyleDraft] = useState<StylePrefDraft | null>(null);
  const [styleBusy, setStyleBusy] = useState(false);
  const [styleViewer, setStyleViewer] = useState<string | null>(null);
  const [studioDraft, setStudioDraft] = useState<StylePrefDraft | null>(null);
  const [stylistCard, setStylistCard] = useState<StylistInfo | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      if (initialTab === "visits") setVisitsSegment("upcoming");
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    setStudioDraft(readStyleDraft(slug));
  }, [open, slug]);

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

  useEffect(() => {
    if (!open || !highlightId || loading) return;
    const el = document.querySelector('[data-testid="booking-confirmed"]');
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [open, highlightId, loading, rows]);

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
      rows
        .filter(
          (r) =>
            ["BOOKED", "CHECKED_IN"].includes(r.status) &&
            new Date(r.startsAt).getTime() >= Date.now() - 60_000
        )
        .sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        ),
    [rows]
  );
  const past = useMemo(
    () =>
      rows
        .filter((r) => !upcoming.some((u) => u.id === r.id))
        .sort(
          (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
        ),
    [rows, upcoming]
  );
  const photoVisits = useMemo(
    () => past.filter((r) => r.canAddPhotos || r.photos.length > 0),
    [past]
  );

  const viewingRow = viewing ? rows.find((r) => r.id === viewing.rowId) ?? null : null;
  const viewingPhoto =
    viewingRow?.photos.find((p) => p.id === viewing?.photoId) ?? null;

  if (!open) return null;

  const cardProps = (r: Row, highlight?: boolean) => ({
    row: r,
    timeZone: timezone || "America/Toronto",
    salonName,
    slug,
    highlight,
    busyId,
    styleEditId,
    styleDraft,
    styleBusy,
    onOpenStylist: () => setStylistCard(r.stylist),
    onCancel: cancel,
    onOpenStyleEdit: openStyleEdit,
    onSaveStylePref: (id: string) => void saveStylePref(id),
    onRemoveStylePref: (id: string) => void removeStylePref(id),
    onCloseStyleEdit: () => {
      setStyleEditId(null);
      setStyleDraft(null);
    },
    onViewStylePref: setStyleViewer,
    onStyleDraftChange: setStyleDraft,
    onPhotosChange: (photos: LookPhoto[]) => setPhotos(r.id, photos),
    onOpenPhoto: (photo: LookPhoto) => setViewing({ rowId: r.id, photoId: photo.id }),
  });

  function dateLine(r: Row, withTime: boolean) {
    return new Date(r.startsAt).toLocaleString("en-CA", {
      weekday: withTime ? "long" : undefined,
      month: withTime ? "long" : "short",
      day: "numeric",
      year: withTime ? undefined : "numeric",
      hour: withTime ? "numeric" : undefined,
      minute: withTime ? "2-digit" : undefined,
      timeZone: timezone,
    });
  }

  return (
    <LuxeSheet label={tab === "visits" ? "My bookings" : "BeautyAI"}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-5 pt-[max(0.85rem,env(safe-area-inset-top))]">
          <div className="book-luxe-bookings-header">
            <h2 className="book-luxe-bookings-header__title font-[family-name:var(--font-display)]">
              {tab === "visits" ? "My Bookings" : "BeautyAI"}
            </h2>
          </div>

          {tab === "visits" ? (
            <div className="book-luxe-segment mt-4">
              <button
                type="button"
                onClick={() => setVisitsSegment("upcoming")}
                data-testid="member-tab-upcoming"
                className={visitsSegment === "upcoming" ? "is-on" : ""}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setVisitsSegment("past")}
                data-testid="member-tab-past"
                className={visitsSegment === "past" ? "is-on" : ""}
              >
                Past
              </button>
            </div>
          ) : null}
        </div>

        <div className="book-luxe-sheet-scroll px-5 pt-4">
          {loading ? <GoldLogoLoader size={64} label="Loading bookings" /> : null}
          {error ? <p className="mb-3 text-sm text-[#f5a8a8]">{error}</p> : null}

          {tab === "visits" ? (
            <section className="space-y-3 pb-4">
              {visitsSegment === "upcoming" ? (
                upcoming.length === 0 ? (
                  <p className="text-sm text-muted">No upcoming visits.</p>
                ) : (
                  upcoming.map((r) => (
                    <VisitBookingCard
                      key={r.id}
                      {...cardProps(r, highlightId === r.id)}
                    />
                  ))
                )
              ) : past.length === 0 ? (
                <p className="text-sm text-muted">No past visits yet.</p>
              ) : (
                past.slice(0, 12).map((r) => (
                  <VisitBookingCard
                    key={r.id}
                    {...cardProps(r)}
                    showPastExtras
                  />
                ))
              )}
            </section>
          ) : (
            <>
              <div className="mt-1">
                <StylePreviewPanel
                  slug={slug}
                  isMember
                  variant="studio"
                  value={studioDraft}
                  onChange={(next) => {
                    setStudioDraft(next);
                    writeStyleDraft(slug, next);
                  }}
                />
              </div>

              {photoVisits.length === 0 ? (
                <div className="book-luxe-empty book-luxe-empty--dark mt-6 px-4 py-8 text-center">
                  <span className="book-luxe-empty__plus" aria-hidden>
                    +
                  </span>
                  <p className="mt-2 text-sm font-semibold">BeautyAI is ready for you</p>
                  <p className="text-xs">Visit photos appear here after your first appointment.</p>
                </div>
              ) : (
                <div className="relative mt-5 space-y-4 pl-4">
                  <span
                    className="absolute top-2 bottom-2 left-[7px] w-px bg-[#d4b483]/55"
                    aria-hidden
                  />
                  {photoVisits.map((r) => (
                    <section key={r.id} className="relative">
                      <span
                        className="absolute top-7 -left-[13px] h-2.5 w-2.5 rounded-full border border-[#d4b483] bg-transparent"
                        aria-hidden
                      />
                      <div className="book-luxe-card rounded-2xl px-4 py-3">
                        <div className="flex items-start gap-3">
                          <StylistThumb
                            stylist={r.stylist}
                            onOpen={() => setStylistCard(r.stylist)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-[family-name:var(--font-display)] text-lg">
                              {r.service.name}
                            </p>
                            <p className="text-xs text-muted">{dateLine(r, false)}</p>
                          </div>
                        </div>
                        <LookPhotoStrip
                          slug={slug}
                          appointmentId={r.id}
                          photos={r.photos}
                          canAdd={r.canAddPhotos}
                          onPhotosChange={(photos) => setPhotos(r.id, photos)}
                          onOpen={(photo) => setViewing({ rowId: r.id, photoId: photo.id })}
                        />
                      </div>
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
          slug={slug}
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
              className="btn-solid rounded-full px-4 py-2 text-sm font-semibold"
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
    </LuxeSheet>
  );
}
