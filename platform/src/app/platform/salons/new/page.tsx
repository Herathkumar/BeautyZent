"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEFAULT_BOOKING_THEME_ID,
  DEFAULT_MANAGER_THEME_ID,
  DEFAULT_STYLIST_THEME_ID,
} from "@/lib/salon-themes";
import { TIMEZONES, fieldClass, labelClass } from "../salon-form";
import { THEME_PICKER_HINT, ThemePicker } from "../ThemePicker";
import { SettingToggle } from "@/components/admin/SettingToggle";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function NewSalonPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [timezone, setTimezone] = useState("America/Toronto");
  const [openHour, setOpenHour] = useState(9);
  const [closeHour, setCloseHour] = useState(18);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [bookingThemeId, setBookingThemeId] = useState(DEFAULT_BOOKING_THEME_ID);
  const [managerThemeId, setManagerThemeId] = useState(DEFAULT_MANAGER_THEME_ID);
  const [stylistThemeId, setStylistThemeId] = useState(DEFAULT_STYLIST_THEME_ID);
  const [managerName, setManagerName] = useState("Salon Manager");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [starterMenu, setStarterMenu] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/platform/salons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: effectiveSlug,
        timezone,
        openHour,
        closeHour,
        slotMinutes,
        phone,
        email,
        address,
        bookingThemeId,
        managerThemeId,
        stylistThemeId,
        managerName,
        managerEmail,
        managerPassword,
        starterMenu,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create salon");
      return;
    }
    router.push(`/platform/salons/${data.salon.id}?created=1`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/platform" className="text-sm text-cocoa">
          ← All salons
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-ink">New salon</h1>
        <p className="mt-1 text-sm text-muted">
          Creates the tenant, a manager login, and (optionally) a starter menu so the booking page
          works right away.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-5">
        <section className="grid gap-4 rounded-3xl border border-ink/12 bg-white/80 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">Salon</h2>
          <label className={labelClass}>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Demo Hair Studio"
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Slug (used in URLs)
            <input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="demosalon"
              className={fieldClass}
            />
            <span className="text-xs text-muted">
              /book/{effectiveSlug || "slug"} · /display/{effectiveSlug || "slug"}/lounge · /display/{effectiveSlug || "slug"}/scheduler
            </span>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Timezone
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={fieldClass}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Slot length
              <select
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(Number(e.target.value))}
                className={fieldClass}
              >
                {[15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Opens at
              <input
                type="number"
                min={0}
                max={23}
                value={openHour}
                onChange={(e) => setOpenHour(Number(e.target.value))}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Closes at
              <input
                type="number"
                min={1}
                max={24}
                value={closeHour}
                onChange={(e) => setCloseHour(Number(e.target.value))}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
            </label>
            <label className={labelClass}>
              Public email
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
            </label>
          </div>
          <label className={labelClass}>
            Address
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={fieldClass} />
          </label>
        </section>

        <section className="grid gap-5 rounded-3xl border border-ink/12 bg-white/80 p-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">Themes</h2>
            <p className="mt-1 text-xs text-muted">{THEME_PICKER_HINT}</p>
          </div>
          <ThemePicker
            name="booking"
            legend="Booking app"
            hint="What clients see at /book/{slug}."
            value={bookingThemeId}
            onChange={setBookingThemeId}
          />
          <ThemePicker
            name="manager"
            legend="Manager app"
            hint="Dashboard, bookings, earnings, and team."
            value={managerThemeId}
            onChange={setManagerThemeId}
          />
          <ThemePicker
            name="stylist"
            legend="Stylist app"
            hint="Phone portal for the floor team."
            value={stylistThemeId}
            onChange={setStylistThemeId}
          />
        </section>

        <section className="grid gap-4 rounded-3xl border border-ink/12 bg-white/80 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">
            Manager login
          </h2>
          <p className="text-xs text-muted">
            Staff sign in with email only, so this address must be unique across all salons.
          </p>
          <label className={labelClass}>
            Manager name
            <input
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Email
              <input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="manager@demosalon.ca"
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Password (min 8)
              <input
                type="text"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
          <SettingToggle
            label="Add a starter stylist + 4 services so booking works immediately"
            checked={starterMenu}
            onChange={setStarterMenu}
          />
        </section>

        {error ? <p className="text-sm text-[#a4432f]">{error}</p> : null}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-solid rounded-2xl px-5 py-3 font-medium">
            {saving ? "Creating…" : "Create salon"}
          </button>
          <Link
            href="/platform"
            className="rounded-2xl border border-ink/20 px-5 py-3 font-medium text-ink-soft hover:border-ink"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
