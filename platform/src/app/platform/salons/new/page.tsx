"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BUSINESS_TYPES } from "@/lib/marketplace";
import { MARKETPLACE_BOOK_THEME_ID } from "@/lib/marketplace-book-theme";
import {
  DEFAULT_MANAGER_THEME_ID,
  DEFAULT_STYLIST_THEME_ID,
} from "@/lib/salon-themes";
import { TIMEZONES } from "../salon-form";
import { SettingToggle } from "@/components/admin/SettingToggle";

const HOUSE_CATEGORIES = BUSINESS_TYPES.filter((t) =>
  ["SALON", "SKIN", "NAILS", "SPA", "MEDSPA", "MAKEUP", "WELLNESS"].includes(t.id)
);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function hourToTimeValue(hour: number) {
  const h = Math.min(23, Math.max(0, Math.round(hour)));
  return `${String(h).padStart(2, "0")}:00`;
}

function timeValueToHour(value: string, fallback: number) {
  const h = Number(String(value).split(":")[0]);
  return Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : fallback;
}

export default function NewSalonPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("SALON");
  const [timezone, setTimezone] = useState("America/Toronto");
  const [openHour, setOpenHour] = useState(9);
  const [closeHour, setCloseHour] = useState(18);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [starterMenu, setStarterMenu] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveSlug = slugify(name);

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
        businessType,
        timezone,
        openHour,
        closeHour,
        slotMinutes,
        phone,
        email,
        address,
        bookingThemeId: MARKETPLACE_BOOK_THEME_ID,
        managerThemeId: DEFAULT_MANAGER_THEME_ID,
        stylistThemeId: DEFAULT_STYLIST_THEME_ID,
        managerName: managerName.trim() || "House manager",
        managerEmail,
        managerPassword,
        starterMenu,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create house");
      return;
    }
    router.push(`/platform/salons/${data.salon.id}?created=1`);
    router.refresh();
  }

  return (
    <div className="platform-luxe__form-page">
      <Link href="/platform" className="platform-luxe__back">
        ← Houses
      </Link>
      <h1 className="platform-luxe__form-title">New house</h1>
      <p className="platform-luxe__form-lead">
        Add a house to Explore. Services and cover can be finished after.
      </p>

      <form onSubmit={onSubmit} className="platform-luxe__form-card platform-luxe__form">
        <section className="platform-luxe__section">
          <h2 className="platform-luxe__section-label">— House</h2>
          <label className="platform-luxe__label">
            House name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Demo Hair Studio"
              required
              className="platform-luxe__input"
            />
          </label>
          <div className="platform-luxe__label">
            Public URL
            <div className="platform-luxe__slug-preview">
              /explore/{effectiveSlug || "slug"}
            </div>
            <span className="platform-luxe__hint">
              Public page: /explore/{effectiveSlug || "slug"} — slug auto from name
            </span>
          </div>
          <label className="platform-luxe__label">
            Category
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
            >
              {HOUSE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </label>
          <div className="platform-luxe__row platform-luxe__row--2">
            <label className="platform-luxe__label">
              Timezone
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>
            <label className="platform-luxe__label">
              Slot length
              <select
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(Number(e.target.value))}
              >
                {[15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </label>
            <label className="platform-luxe__label">
              Opens at
              <input
                type="time"
                value={hourToTimeValue(openHour)}
                onChange={(e) => setOpenHour(timeValueToHour(e.target.value, 9))}
              />
            </label>
            <label className="platform-luxe__label">
              Closes at
              <input
                type="time"
                value={hourToTimeValue(closeHour)}
                onChange={(e) => setCloseHour(timeValueToHour(e.target.value, 18))}
              />
            </label>
          </div>
          <div className="platform-luxe__row platform-luxe__row--2">
            <label className="platform-luxe__label">
              Phone
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="platform-luxe__input"
              />
            </label>
            <label className="platform-luxe__label">
              Public email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@demohairstudio.com"
                className="platform-luxe__input"
              />
            </label>
          </div>
          <label className="platform-luxe__label">
            Address
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Beauty Lane, San Francisco, CA 94107"
              className="platform-luxe__input"
            />
          </label>
        </section>

        <section className="platform-luxe__section">
          <h2 className="platform-luxe__section-label">— Manager</h2>
          <p className="platform-luxe__section-note">
            Must be unique on the platform.
          </p>
          <label className="platform-luxe__label">
            Manager name
            <input
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="House manager"
              className="platform-luxe__input"
            />
          </label>
          <div className="platform-luxe__row platform-luxe__row--2">
            <label className="platform-luxe__label">
              Email
              <input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="alex@demohairstudio.com"
                required
                className="platform-luxe__input"
              />
            </label>
            <label className="platform-luxe__label">
              Password (min 8)
              <input
                type="password"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                required
                minLength={8}
                className="platform-luxe__input"
              />
            </label>
          </div>
          <SettingToggle
            label="Add starter services so Reserve works immediately"
            checked={starterMenu}
            onChange={setStarterMenu}
          />
        </section>

        {error ? <p className="platform-luxe__form-error">{error}</p> : null}

        <div className="platform-luxe__form-foot">
          <Link href="/platform" className="platform-luxe__cancel">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="platform-luxe__create">
            {saving ? "Creating…" : "Create house"}
          </button>
        </div>
      </form>
    </div>
  );
}
