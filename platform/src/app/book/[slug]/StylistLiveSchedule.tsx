"use client";

import { useEffect, useState } from "react";
import { ClientStylistSchedule } from "./ClientStylistSchedule";

export type { StylistSchedulePayload } from "./ClientStylistSchedule";

/** Public stylist day board — light Apple Calendar card on the dark client shell. */
export function StylistLiveSchedule({
  slug,
  stylistId,
  stylistName,
  photoUrl,
  bio,
  salonName,
  salonAddress,
  date,
  minDate,
  slots,
  startsAt,
  service,
  onSelectDate,
  onSelectSlot,
  onContinue,
  onEditService,
  compact = false,
  showFooter = false,
  pollMs = 30_000,
}: {
  slug: string;
  stylistId: string;
  stylistName?: string;
  photoUrl?: string | null;
  bio?: string | null;
  salonName?: string | null;
  salonAddress?: string | null;
  date?: string;
  minDate?: string;
  slots?: string[];
  startsAt?: string;
  service?: { name: string; durationMin: number; priceCents: number } | null;
  onSelectDate?: (ymd: string) => void;
  onSelectSlot?: (iso: string) => void;
  onContinue?: () => void;
  onEditService?: () => void;
  compact?: boolean;
  showFooter?: boolean;
  pollMs?: number;
}) {
  return (
    <ClientStylistSchedule
      slug={slug}
      stylistId={stylistId}
      stylistName={stylistName}
      photoUrl={photoUrl}
      bio={bio}
      salonName={salonName}
      salonAddress={salonAddress}
      date={date}
      minDate={minDate}
      slots={slots}
      startsAt={startsAt}
      service={service}
      onSelectDate={onSelectDate}
      onSelectSlot={onSelectSlot}
      onContinue={onContinue}
      onEditService={onEditService}
      compact={compact}
      showFooter={showFooter}
      pollMs={pollMs}
    />
  );
}

export function StylistScheduleSheet({
  open,
  onClose,
  slug,
  stylistId,
  stylistName,
  photoUrl,
  bio,
  date,
  salonName,
  salonAddress,
  service,
  serviceIds,
  minDate,
  onBook,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  stylistId: string;
  stylistName: string;
  photoUrl?: string | null;
  bio?: string | null;
  date?: string;
  salonName?: string | null;
  salonAddress?: string | null;
  service?: { name: string; durationMin: number; priceCents: number } | null;
  serviceIds?: string[];
  minDate?: string;
  onBook?: (opts?: { date?: string; startsAt?: string }) => void;
}) {
  const [sheetDate, setSheetDate] = useState(date || "");
  const [startsAt, setStartsAt] = useState("");
  const [slots, setSlots] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setSheetDate(date || "");
    setStartsAt("");
  }, [open, date, stylistId]);

  useEffect(() => {
    if (!open || !stylistId || !sheetDate || !serviceIds?.length) {
      setSlots([]);
      return;
    }
    const ac = new AbortController();
    const q = new URLSearchParams({
      stylistId,
      date: sheetDate,
      serviceIds: serviceIds.join(","),
    });
    fetch(`/api/public/${slug}/slots?${q}`, { signal: ac.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!ac.signal.aborted) setSlots(data.slots || []);
      })
      .catch(() => {
        if (!ac.signal.aborted) setSlots([]);
      });
    return () => ac.abort();
  }, [open, slug, stylistId, sheetDate, serviceIds]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${stylistName} schedule`}
      onClick={onClose}
    >
      <div
        className="bz-client-cal-sheet w-full max-w-md overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bz-client-cal-sheet__chrome">
          <button type="button" className="bz-client-cal-sheet__icon" onClick={onClose} aria-label="Back">
            ←
          </button>
          <div className="bz-client-cal-sheet__brand">
            <span className="bz-client-cal-sheet__lotus" aria-hidden>
              ✿
            </span>
            <span>BeautyZent</span>
          </div>
          <span className="bz-client-cal-sheet__icon" aria-hidden>
            ♡
          </span>
        </div>

        <div className="max-h-[min(88vh,44rem)] overflow-y-auto px-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-1">
          <ClientStylistSchedule
            slug={slug}
            stylistId={stylistId}
            stylistName={stylistName}
            photoUrl={photoUrl}
            bio={bio}
            salonName={salonName}
            salonAddress={salonAddress}
            date={sheetDate || undefined}
            minDate={minDate}
            slots={slots}
            startsAt={startsAt}
            service={service}
            onSelectDate={(ymd) => {
              setSheetDate(ymd);
              setStartsAt("");
            }}
            onSelectSlot={setStartsAt}
            onContinue={
              onBook
                ? () => onBook({ date: sheetDate, startsAt })
                : undefined
            }
            showFooter={Boolean(onBook)}
            compact={false}
          />
          {onBook && !serviceIds?.length ? (
            <button
              type="button"
              onClick={() => onBook()}
              className="bz-client-cal__cta mt-3 w-full"
            >
              Book with {stylistName.split(" ")[0]}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
