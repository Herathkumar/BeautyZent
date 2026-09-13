"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  clockParts,
  formatClock,
  formatHourLabel,
  hourMarks,
  initials,
  timelineCardBox,
} from "@/lib/display-schedule";
import {
  addCalendarDays,
  addCalendarMonths,
  calendarDateInTz,
  firstDayOfMonth,
  monthGrid,
  mondayOfWeekContaining,
  upcomingCalendarDays,
  weekDayKeys,
} from "@/lib/salon-time";
import {
  MONTH_LEGEND,
  appointmentCalendarTone,
  statusPillLabel,
} from "@/lib/stylist-calendar-colors";

export type CalendarAppt = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source?: string;
  client: { name: string };
  service: { name: string; durationMin?: number };
};

export type CalendarView = "day" | "week" | "month";

const DAY_HOUR_PX = 88;
const WEEK_HOUR_PX = 64;
const MIN_CARD_H = 36;

type Props = {
  view: CalendarView;
  selectedYmd: string;
  timeZone: string;
  openHour: number;
  closeHour: number;
  appointments: CalendarAppt[];
  selectedId?: string | null;
  now?: Date;
  onSelectDate: (ymd: string) => void;
  onSelectAppointment: (id: string) => void;
  onChangeView: (view: CalendarView) => void;
};

function isBlocked(a: CalendarAppt) {
  return (
    a.source === "BLOCK" ||
    /\b(lunch|unavailable|block|break)\b/i.test(a.service.name)
  );
}

function DayStrip({
  selectedYmd,
  timeZone,
  onSelectDate,
}: {
  selectedYmd: string;
  timeZone: string;
  onSelectDate: (ymd: string) => void;
}) {
  const today = calendarDateInTz(timeZone);
  const start = addCalendarDays(selectedYmd, -3, timeZone);
  const days = upcomingCalendarDays(7, timeZone, start);

  return (
    <div className="bz-cal-daystrip" role="listbox" aria-label="Pick a day">
      {days.map((ymd) => {
        const dt = new Date(`${ymd}T12:00:00`);
        const weekday = dt.toLocaleDateString("en-CA", {
          timeZone,
          weekday: "short",
        });
        const dayNum = Number(ymd.slice(8, 10));
        const active = ymd === selectedYmd;
        const isToday = ymd === today;
        return (
          <button
            key={ymd}
            type="button"
            role="option"
            aria-selected={active}
            className={`bz-cal-daychip${active ? " is-active" : ""}${isToday && !active ? " is-today" : ""}`}
            onClick={() => onSelectDate(ymd)}
          >
            <span className="bz-cal-daychip__wd">{weekday}</span>
            <span className="bz-cal-daychip__num">{dayNum}</span>
          </button>
        );
      })}
    </div>
  );
}

function ViewToggle({
  view,
  onChangeView,
}: {
  view: CalendarView;
  onChangeView: (v: CalendarView) => void;
}) {
  return (
    <div className="bz-cal-toggle" role="tablist" aria-label="Calendar view">
      {(["day", "week", "month"] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={view === v}
          className={`bz-cal-toggle__btn${view === v ? " is-active" : ""}`}
          onClick={() => onChangeView(v)}
          data-testid={`stylist-cal-view-${v}`}
        >
          {v[0]!.toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  );
}

function ApptBlock({
  appt,
  top,
  height,
  selected,
  compact,
  timeZone,
  onSelect,
}: {
  appt: CalendarAppt;
  top: number;
  height: number;
  selected: boolean;
  compact?: boolean;
  timeZone: string;
  onSelect: () => void;
}) {
  const tone = appointmentCalendarTone({
    serviceName: appt.service.name,
    status: appt.status,
    source: appt.source,
  });
  const blocked = isBlocked(appt);
  const label = statusPillLabel(appt.status);

  return (
    <article
      className={`bz-cal-block${selected ? " is-selected" : ""}${blocked ? " is-blocked" : ""}`}
      style={{
        top,
        height,
        background: blocked
          ? `repeating-linear-gradient(-45deg, ${tone.bg}, ${tone.bg} 6px, #f7f7f6 6px, #f7f7f6 12px)`
          : tone.bg,
        color: tone.text,
      }}
      data-testid="stylist-cal-block"
      data-appt-id={appt.id}
    >
      <button type="button" className="bz-cal-block__hit" onClick={onSelect}>
        <span className="bz-cal-block__title">
          {compact ? appt.client.name.split(" ")[0] : appt.client.name}
          {!compact ? ` · ${appt.service.name}` : ""}
        </span>
        {!compact && height > 52 ? (
          <span className="bz-cal-block__meta">
            {formatClock(appt.startsAt, timeZone)}
            {appt.status === "COMPLETED" || appt.status === "BOOKED" || appt.status === "CHECKED_IN" ? (
              <span
                className="bz-cal-block__badge"
                style={{ background: tone.badge, color: tone.badgeText }}
              >
                {appt.status === "COMPLETED" ? "Paid" : label}
              </span>
            ) : null}
          </span>
        ) : null}
        {compact && height > 40 ? (
          <span className="bz-cal-block__meta truncate">{appt.service.name}</span>
        ) : null}
      </button>
    </article>
  );
}

function DayTimeline({
  selectedYmd,
  timeZone,
  openHour,
  closeHour,
  appointments,
  selectedId,
  now,
  onSelectAppointment,
  hourPx,
  compact,
}: {
  selectedYmd: string;
  timeZone: string;
  openHour: number;
  closeHour: number;
  appointments: CalendarAppt[];
  selectedId?: string | null;
  now: Date;
  onSelectAppointment: (id: string) => void;
  hourPx: number;
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = hourMarks(openHour, closeHour);
  const openMin = openHour * 60;
  const spanMin = (closeHour - openHour) * 60;
  const height = hours.length * hourPx;
  const today = calendarDateInTz(timeZone);
  const isToday = selectedYmd === today;
  const nowMin = clockParts(now.toISOString(), timeZone).minutes;
  const showNow = isToday && nowMin >= openMin && nowMin <= openMin + spanMin;
  const nowTop = ((nowMin - openMin) / spanMin) * height;

  const dayAppts = useMemo(
    () =>
      appointments.filter(
        (a) =>
          calendarDateInTz(timeZone, new Date(a.startsAt)) === selectedYmd &&
          a.status !== "CANCELLED"
      ),
    [appointments, selectedYmd, timeZone]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !showNow) return;
    el.scrollTo({ top: Math.max(0, nowTop - el.clientHeight * 0.3), behavior: "smooth" });
  }, [selectedYmd, showNow, nowTop]);

  return (
    <div
      ref={scrollRef}
      className="bz-cal-scroll"
      data-testid="stylist-day-timeline"
    >
      <div className="bz-cal-grid" style={{ height, gridTemplateColumns: compact ? "2.4rem 1fr" : "3.25rem 1fr" }}>
        <div className="bz-cal-hours" style={{ height }}>
          {hours.map((h, i) => (
            <p key={h} className="bz-cal-hour" style={{ top: i * hourPx - 6 }}>
              {compact
                ? formatHourLabel(h).replace(":00 ", " ")
                : formatHourLabel(h)}
            </p>
          ))}
        </div>
        <div className="bz-cal-lane" style={{ height }}>
          {hours.map((h, i) => (
            <div key={h} className="bz-cal-hline" style={{ top: i * hourPx }} />
          ))}
          {hours.map((h, i) => (
            <div
              key={`${h}-q`}
              className="bz-cal-hline bz-cal-hline--quarter"
              style={{ top: i * hourPx + hourPx / 2 }}
            />
          ))}
          {dayAppts.map((a) => {
            const box = timelineCardBox(
              a,
              now,
              openMin,
              spanMin,
              height,
              MIN_CARD_H,
              timeZone
            );
            return (
              <ApptBlock
                key={a.id}
                appt={a}
                top={box.top}
                height={box.height}
                selected={selectedId === a.id}
                compact={compact}
                timeZone={timeZone}
                onSelect={() => onSelectAppointment(a.id)}
              />
            );
          })}
          {showNow ? (
            <div className="bz-cal-now" style={{ top: nowTop }}>
              <span className="bz-cal-now__dot" />
              <span className="bz-cal-now__line" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WeekView({
  selectedYmd,
  timeZone,
  openHour,
  closeHour,
  appointments,
  selectedId,
  now,
  onSelectDate,
  onSelectAppointment,
}: Omit<Props, "view" | "onChangeView"> & { now: Date }) {
  const monday = mondayOfWeekContaining(selectedYmd, timeZone);
  const days = weekDayKeys(monday, timeZone);
  const hours = hourMarks(openHour, closeHour);
  const openMin = openHour * 60;
  const spanMin = (closeHour - openHour) * 60;
  const height = hours.length * WEEK_HOUR_PX;

  return (
    <div className="bz-cal-week">
      <div className="bz-cal-week__head">
        <div className="bz-cal-week__gutter" />
        {days.map((ymd) => {
          const active = ymd === selectedYmd;
          const wd = new Date(`${ymd}T12:00:00`).toLocaleDateString("en-CA", {
            timeZone,
            weekday: "short",
          });
          const num = Number(ymd.slice(8, 10));
          return (
            <button
              key={ymd}
              type="button"
              className={`bz-cal-week__day${active ? " is-active" : ""}`}
              onClick={() => onSelectDate(ymd)}
            >
              <span>{wd}</span>
              <strong>{num}</strong>
            </button>
          );
        })}
      </div>
      <div className="bz-cal-scroll bz-cal-week__body" data-testid="stylist-cal-week-scroll">
        <div className="bz-cal-week__grid" style={{ height }}>
          <div className="bz-cal-hours" style={{ height }}>
            {hours.map((h, i) => (
              <p key={h} className="bz-cal-hour" style={{ top: i * WEEK_HOUR_PX - 6 }}>
                {formatHourLabel(h).replace(":00 ", "")}
              </p>
            ))}
          </div>
          {days.map((ymd) => {
            const dayAppts = appointments.filter(
              (a) =>
                calendarDateInTz(timeZone, new Date(a.startsAt)) === ymd &&
                a.status !== "CANCELLED"
            );
            return (
              <div key={ymd} className="bz-cal-lane bz-cal-lane--week" style={{ height }}>
                {hours.map((h, i) => (
                  <div key={h} className="bz-cal-hline" style={{ top: i * WEEK_HOUR_PX }} />
                ))}
                {dayAppts.map((a) => {
                  const box = timelineCardBox(
                    a,
                    now,
                    openMin,
                    spanMin,
                    height,
                    28,
                    timeZone
                  );
                  return (
                    <ApptBlock
                      key={a.id}
                      appt={a}
                      top={box.top}
                      height={box.height}
                      selected={selectedId === a.id}
                      compact
                      timeZone={timeZone}
                      onSelect={() => {
                        onSelectDate(ymd);
                        onSelectAppointment(a.id);
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthView({
  selectedYmd,
  timeZone,
  appointments,
  onSelectDate,
}: {
  selectedYmd: string;
  timeZone: string;
  appointments: CalendarAppt[];
  onSelectDate: (ymd: string) => void;
}) {
  const today = calendarDateInTz(timeZone);
  const grid = monthGrid(selectedYmd, timeZone);
  const monthLabel = new Date(`${firstDayOfMonth(selectedYmd, timeZone)}T12:00:00`).toLocaleDateString(
    "en-CA",
    { timeZone, month: "long", year: "numeric" }
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarAppt[]>();
    for (const a of appointments) {
      if (a.status === "CANCELLED") continue;
      const key = calendarDateInTz(timeZone, new Date(a.startsAt));
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  }, [appointments, timeZone]);

  // Fill leading/trailing from adjacent months for visual continuity like the mockup
  const first = grid.find((d) => d != null) as string;
  const lead = dayPadBefore(first, timeZone, grid.filter((c) => c == null).length);
  const cells: string[] = [...lead];
  for (const c of grid) if (c) cells.push(c);
  while (cells.length % 7 !== 0) {
    cells.push(addCalendarDays(cells[cells.length - 1]!, 1, timeZone));
  }

  return (
    <div className="bz-cal-month" data-testid="stylist-cal-month">
      <div className="bz-cal-month__wd">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="bz-cal-month__grid">
        {cells.map((ymd) => {
          const inMonth = ymd.slice(0, 7) === selectedYmd.slice(0, 7);
          const active = ymd === selectedYmd;
          const isToday = ymd === today;
          const dayAppts = byDay.get(ymd) || [];
          const tones = dayAppts.slice(0, 4).map((a) =>
            appointmentCalendarTone({
              serviceName: a.service.name,
              status: a.status,
              source: a.source,
            })
          );
          return (
            <button
              key={ymd}
              type="button"
              className={`bz-cal-month__cell${!inMonth ? " is-outside" : ""}${active ? " is-active" : ""}${isToday ? " is-today" : ""}`}
              onClick={() => onSelectDate(ymd)}
            >
              <span className="bz-cal-month__num">{Number(ymd.slice(8, 10))}</span>
              <span className="bz-cal-month__marks">
                {tones.map((t, i) => (
                  <i key={`${ymd}-${i}`} style={{ background: t.dot }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="bz-cal-legend" aria-label={`${monthLabel} legend`}>
        {MONTH_LEGEND.map(({ tone, label }) => (
          <span key={tone.id}>
            <i style={{ background: tone.dot }} />
            {label}
          </span>
        ))}
      </div>
      <p className="bz-cal-month__summary">
        {appointments.filter((a) => {
          const key = calendarDateInTz(timeZone, new Date(a.startsAt));
          return key.slice(0, 7) === selectedYmd.slice(0, 7) && a.status !== "CANCELLED";
        }).length}{" "}
        bookings this month
      </p>
    </div>
  );
}

function dayPadBefore(firstYmd: string, timeZone: string, count: number) {
  const out: string[] = [];
  for (let i = count; i > 0; i--) {
    out.push(addCalendarDays(firstYmd, -i, timeZone));
  }
  return out;
}

export function StylistCalendar(props: Props) {
  const now = props.now || new Date();
  const {
    view,
    selectedYmd,
    timeZone,
    openHour,
    closeHour,
    appointments,
    selectedId,
    onSelectDate,
    onSelectAppointment,
    onChangeView,
  } = props;

  const rangeLabel = useMemo(() => {
    if (view === "month") {
      return new Date(`${firstDayOfMonth(selectedYmd, timeZone)}T12:00:00`).toLocaleDateString(
        "en-CA",
        { timeZone, month: "long", year: "numeric" }
      );
    }
    if (view === "week") {
      const mon = mondayOfWeekContaining(selectedYmd, timeZone);
      const sun = addCalendarDays(mon, 6, timeZone);
      const a = new Date(`${mon}T12:00:00`).toLocaleDateString("en-CA", {
        timeZone,
        month: "short",
        day: "numeric",
      });
      const b = new Date(`${sun}T12:00:00`).toLocaleDateString("en-CA", {
        timeZone,
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${a} – ${b}`;
    }
    return new Date(`${selectedYmd}T12:00:00`).toLocaleDateString("en-CA", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [view, selectedYmd, timeZone]);

  function shift(delta: number) {
    if (view === "month") onSelectDate(addCalendarMonths(selectedYmd, delta, timeZone));
    else if (view === "week") onSelectDate(addCalendarDays(selectedYmd, delta * 7, timeZone));
    else onSelectDate(addCalendarDays(selectedYmd, delta, timeZone));
  }

  return (
    <section className="bz-cal" data-testid="stylist-calendar">
      <div className="bz-cal-toolbar">
        <div className="bz-cal-toolbar__date">
          <button type="button" className="bz-cal-nav" aria-label="Previous" onClick={() => shift(-1)}>
            ‹
          </button>
          <h2>{rangeLabel}</h2>
          <button type="button" className="bz-cal-nav" aria-label="Next" onClick={() => shift(1)}>
            ›
          </button>
        </div>
        <ViewToggle view={view} onChangeView={onChangeView} />
      </div>

      {view === "day" ? (
        <>
          <DayStrip
            selectedYmd={selectedYmd}
            timeZone={timeZone}
            onSelectDate={onSelectDate}
          />
          <DayTimeline
            selectedYmd={selectedYmd}
            timeZone={timeZone}
            openHour={openHour}
            closeHour={closeHour}
            appointments={appointments}
            selectedId={selectedId}
            now={now}
            onSelectAppointment={onSelectAppointment}
            hourPx={DAY_HOUR_PX}
          />
        </>
      ) : null}

      {view === "week" ? (
        <WeekView
          selectedYmd={selectedYmd}
          timeZone={timeZone}
          openHour={openHour}
          closeHour={closeHour}
          appointments={appointments}
          selectedId={selectedId}
          now={now}
          onSelectDate={onSelectDate}
          onSelectAppointment={onSelectAppointment}
        />
      ) : null}

      {view === "month" ? (
        <MonthView
          selectedYmd={selectedYmd}
          timeZone={timeZone}
          appointments={appointments}
          onSelectDate={(ymd) => {
            onSelectDate(ymd);
            onChangeView("day");
          }}
        />
      ) : null}
    </section>
  );
}

export function StylistChipAvatar({
  name,
  photoUrl,
  selected,
  tone,
  label,
  onClick,
}: {
  name: string;
  photoUrl?: string | null;
  selected?: boolean;
  tone: string;
  label?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`bz-chip-avatar${selected ? " is-selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" style={{ borderColor: selected ? "#c19a6b" : "transparent" }} />
      ) : (
        <span className="bz-chip-avatar__initials" style={{ background: tone }}>
          {initials(name)}
        </span>
      )}
      <span className="bz-chip-avatar__name">{label || name.split(" ")[0]}</span>
    </button>
  );
}
