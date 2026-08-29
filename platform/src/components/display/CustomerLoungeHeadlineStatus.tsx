"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loungeHeadlineSlides,
  type DisplayAppt,
  type DisplayStylist,
} from "@/lib/display-schedule";

const ROTATE_MS = 4_500;

/** Soft rotating lounge status under “Today’s Appointments”. */
export function CustomerLoungeHeadlineStatus({
  appointments,
  stylists,
  openHour,
  closeHour,
  timeZone,
  now,
  storeClosed,
}: {
  appointments: DisplayAppt[];
  stylists: DisplayStylist[];
  openHour: number;
  closeHour: number;
  timeZone?: string | null;
  now: Date;
  storeClosed?: boolean;
}) {
  const slides = useMemo(
    () =>
      loungeHeadlineSlides({
        appointments,
        stylists,
        openHour,
        closeHour,
        timeZone,
        now,
        storeClosed,
      }),
    [appointments, stylists, openHour, closeHour, timeZone, now, storeClosed]
  );
  const key = slides.join("|");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [key]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [key, slides.length]);

  const active = Math.min(index, Math.max(0, slides.length - 1));
  const line = slides[active] || "";

  return (
    <div className="customer-lounge-headline-status" data-testid="display-store-hours">
      <p key={`${active}-${line}`} className="customer-lounge-headline-status__line">
        {line}
      </p>
      {slides.length > 1 ? (
        <div className="customer-lounge-headline-status__dots" aria-hidden>
          {slides.map((_, i) => (
            <span
              key={i}
              className={`customer-lounge-headline-status__dot${i === active ? " is-on" : ""}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
