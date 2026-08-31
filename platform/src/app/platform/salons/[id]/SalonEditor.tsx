"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  normalizeCustomerDisplayView,
  normalizeCustomerDisplayViewControl,
  normalizeCustomerDisplayViewRotateSec,
} from "@/lib/customer-display-view";
import {
  DEFAULT_BOOKING_THEME_ID,
  DEFAULT_MANAGER_THEME_ID,
  DEFAULT_STYLIST_THEME_ID,
  normalizeThemeId,
} from "@/lib/salon-themes";
import { fileToBoundedJpegDataUrl } from "@/lib/photo-resize";
import { SettingToggle } from "@/components/admin/SettingToggle";
import { DAY_LABELS, TIMEZONES, fieldClass, labelClass } from "../salon-form";
import { THEME_PICKER_HINT, ThemePicker } from "../ThemePicker";

const MAX_COVER_BYTES = 900_000;

export type EditableSalon = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string;
  openHour: number;
  closeHour: number;
  closedDays: number[];
  slotMinutes: number;
  bookingThemeId: string;
  managerThemeId: string;
  stylistThemeId: string;
  displayViewMode: string;
  displayViewControl?: string | null;
  displayViewRotateSec?: number | null;
  loungeDisplayEnabled?: boolean | null;
  schedulerDisplayEnabled?: boolean | null;
  coverUpdatedAt?: string | Date | null;
};

export function SalonEditor({ salon }: { salon: EditableSalon }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: salon.name,
    slug: salon.slug,
    active: salon.active,
    phone: salon.phone ?? "",
    email: salon.email ?? "",
    address: salon.address ?? "",
    city: salon.city ?? "",
    region: salon.region ?? "",
    country: salon.country ?? "CA",
    timezone: salon.timezone,
    openHour: salon.openHour,
    closeHour: salon.closeHour,
    closedDays: salon.closedDays?.length ? salon.closedDays : [0],
    slotMinutes: salon.slotMinutes,
    bookingThemeId: normalizeThemeId(salon.bookingThemeId, DEFAULT_BOOKING_THEME_ID),
    managerThemeId: normalizeThemeId(salon.managerThemeId, DEFAULT_MANAGER_THEME_ID),
    stylistThemeId: normalizeThemeId(salon.stylistThemeId, DEFAULT_STYLIST_THEME_ID),
    displayViewMode: normalizeCustomerDisplayView(salon.displayViewMode),
    displayViewControl: normalizeCustomerDisplayViewControl(salon.displayViewControl),
    displayViewRotateSec: normalizeCustomerDisplayViewRotateSec(salon.displayViewRotateSec),
    loungeDisplayEnabled: salon.loungeDisplayEnabled !== false,
    schedulerDisplayEnabled: salon.schedulerDisplayEnabled !== false,
  });
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [generatedCover, setGeneratedCover] = useState("");
  const [generatingCover, setGeneratingCover] = useState(false);
  const [coverUrl, setCoverUrl] = useState(
    salon.coverUpdatedAt
      ? `/api/public/cover/${salon.id}?t=${new Date(salon.coverUpdatedAt).getTime()}`
      : ""
  );

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleClosedDay(day: number) {
    setForm((prev) => ({
      ...prev,
      closedDays: prev.closedDays.includes(day)
        ? prev.closedDays.filter((d) => d !== day)
        : [...prev.closedDays, day].sort((a, b) => a - b),
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch(`/api/platform/salons/${salon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, managerEmail, managerPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save salon");
      return;
    }
    setManagerPassword("");
    setMessage(data.message || "Saved.");
    // Keep device cache in sync so manager/stylist/book cold starts use the new packs.
    try {
      const { writeSalonBrand } = await import("@/lib/salon-branding");
      writeSalonBrand({
        slug: form.slug,
        name: form.name,
        address: form.address || null,
        bookingThemeId: form.bookingThemeId,
        managerThemeId: form.managerThemeId,
        stylistThemeId: form.stylistThemeId,
      });
    } catch {
      /* ignore */
    }
    router.refresh();
  }

  async function onPickCover(file: File | null) {
    if (!file) return;
    setCoverBusy(true);
    setError("");
    setMessage("");
    try {
      const dataUrl = await fileToBoundedJpegDataUrl(file, MAX_COVER_BYTES);
      const res = await fetch(`/api/platform/salons/${salon.id}/cover`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save cover");
      setCoverUrl(data.coverUrl || `/api/public/cover/${salon.id}?t=${Date.now()}`);
      setGeneratedCover("");
      setMessage(data.message || "Explore cover saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save cover");
    } finally {
      setCoverBusy(false);
    }
  }

  async function removeCover() {
    setCoverBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/platform/salons/${salon.id}/cover`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove cover");
      setCoverUrl("");
      setGeneratedCover("");
      setMessage(data.message || "Cover removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove cover");
    } finally {
      setCoverBusy(false);
    }
  }

  async function generateCover() {
    setGeneratingCover(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/platform/salons/${salon.id}/cover/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: coverPrompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not generate cover");
      setGeneratedCover(data.imageBase64 || "");
      setMessage("AI cover generated. Review it, then use it as the cover.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate cover");
    } finally {
      setGeneratingCover(false);
    }
  }

  async function applyGeneratedCover() {
    if (!generatedCover) return;
    setCoverBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/platform/salons/${salon.id}/cover`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: generatedCover,
          mimeType: "image/jpeg",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save generated cover");
      setCoverUrl(data.coverUrl || `/api/public/cover/${salon.id}?t=${Date.now()}`);
      setGeneratedCover("");
      setMessage(data.message || "AI cover saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save generated cover");
    } finally {
      setCoverBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid w-full min-w-0 gap-5">
      <section className="grid w-full gap-4 rounded-3xl border border-ink/12 bg-white/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">Details</h2>
          <SettingToggle
            label="Active (public booking page open)"
            checked={form.active}
            onChange={(active) => set("active", active)}
          />
        </div>

        <label className={labelClass}>
          Name
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Slug
          <input value={form.slug} onChange={(e) => set("slug", e.target.value)} className={fieldClass} />
          <span className="text-xs text-muted">
            Changing this breaks existing bookmarks and home-screen apps for the salon.
          </span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Phone
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Public email
            <input value={form.email} onChange={(e) => set("email", e.target.value)} className={fieldClass} />
          </label>
        </div>
        <label className={labelClass}>
          Street address
          <input value={form.address} onChange={(e) => set("address", e.target.value)} className={fieldClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-[1fr_0.7fr_0.45fr]">
          <label className={labelClass}>
            City
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Province / state
            <input value={form.region} onChange={(e) => set("region", e.target.value)} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Country
            <input
              value={form.country}
              onChange={(e) => set("country", e.target.value.toUpperCase())}
              maxLength={8}
              className={fieldClass}
            />
          </label>
        </div>
      </section>

      <section className="grid gap-3 rounded-3xl border border-ink/12 bg-white/80 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">
          Explore cover
        </h2>
        <p className="text-sm text-muted">
          This picture shows on the public{" "}
          <Link href="/explore" className="font-semibold text-ink underline-offset-2 hover:underline">
            /explore
          </Link>{" "}
          directory for this business. Each business can have its own photo.
        </p>
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-[#f3eee8]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={generatedCover || coverUrl || "/display-promo.jpg"}
            alt=""
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <label
            className={`relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink ${
              coverBusy ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <span className="pointer-events-none">
              {coverBusy ? "Saving…" : coverUrl ? "Change cover" : "Upload cover"}
            </span>
            <input
              type="file"
              accept="image/*"
              disabled={coverBusy}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void onPickCover(file);
                e.target.value = "";
              }}
            />
          </label>
          {coverUrl ? (
            <button
              type="button"
              disabled={coverBusy}
              onClick={() => void removeCover()}
              className="rounded-full border border-[#8a4a37]/35 px-4 py-2 text-sm font-medium text-[#8a4a37] disabled:opacity-50"
            >
              Remove
            </button>
          ) : null}
          {generatedCover ? (
            <>
              <button
                type="button"
                disabled={coverBusy || generatingCover}
                onClick={() => void applyGeneratedCover()}
                className="btn-solid rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {coverBusy ? "Saving…" : "Use AI cover"}
              </button>
              <button
                type="button"
                disabled={coverBusy}
                onClick={() => setGeneratedCover("")}
                className="rounded-full border border-ink/20 px-4 py-2 text-sm text-muted disabled:opacity-50"
              >
                Cancel preview
              </button>
            </>
          ) : null}
        </div>
        <div className="grid gap-2 rounded-2xl border border-ink/12 bg-[#f8f2ec] p-4">
          <div>
            <p className="text-sm font-semibold text-ink">AI cover generator</p>
            <p className="mt-0.5 text-xs text-muted">
              Describe the business interior or scene. Generate a preview before updating the
              public cover.
            </p>
          </div>
          <textarea
            value={coverPrompt}
            onChange={(e) => setCoverPrompt(e.target.value)}
            rows={3}
            maxLength={400}
            placeholder="Example: A premium modern salon with warm lighting, walnut mirrors, cream chairs, and plants"
            className={fieldClass}
            data-testid="platform-cover-ai-prompt"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted">{coverPrompt.length}/400</span>
            <button
              type="button"
              disabled={generatingCover || coverBusy || coverPrompt.trim().length < 8}
              onClick={() => void generateCover()}
              className="rounded-full border border-ink/25 bg-white px-4 py-2 text-sm font-semibold text-ink-soft disabled:opacity-50"
              data-testid="platform-cover-generate"
            >
              {generatingCover
                ? "Generating…"
                : generatedCover
                  ? "Generate again"
                  : "Generate with AI"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-ink/12 bg-white/80 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">Hours</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Timezone
            <select
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
              className={fieldClass}
            >
              {[...new Set([form.timezone, ...TIMEZONES])].map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Slot length
            <select
              value={form.slotMinutes}
              onChange={(e) => set("slotMinutes", Number(e.target.value))}
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
              value={form.openHour}
              onChange={(e) => set("openHour", Number(e.target.value))}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            Closes at
            <input
              type="number"
              min={1}
              max={24}
              value={form.closeHour}
              onChange={(e) => set("closeHour", Number(e.target.value))}
              className={fieldClass}
            />
          </label>
        </div>
        <div className="grid gap-2">
          <span className="text-sm text-ink-soft">Default closed days</span>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, day) => {
              const on = form.closedDays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleClosedDay(day)}
                  className={`rounded-full px-4 py-2 text-sm ${
                    on
                      ? "bg-ink text-[#fffaf6]"
                      : "border border-ink/20 text-ink-soft hover:border-ink"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid w-full gap-4 rounded-3xl border border-ink/12 bg-white/80 p-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">
            Store displays
          </h2>
          <p className="mt-1 text-xs text-muted">
            Enable separate Lounge and Scheduler TVs for this business. Each gets its own app
            icon and home-screen install. Managers control promotions per TV under Promotions.
          </p>
        </div>
        <SettingToggle
          label="Lounge display"
          description={`Waiting-room TV at /display/${form.slug || "slug"}/lounge`}
          checked={form.loungeDisplayEnabled}
          onChange={(loungeDisplayEnabled) => set("loungeDisplayEnabled", loungeDisplayEnabled)}
          testId="salon-lounge-display-enabled"
        />
        <SettingToggle
          label="Scheduler display"
          description={`Day schedule TV at /display/${form.slug || "slug"}/scheduler`}
          checked={form.schedulerDisplayEnabled}
          onChange={(schedulerDisplayEnabled) =>
            set("schedulerDisplayEnabled", schedulerDisplayEnabled)
          }
          testId="salon-scheduler-display-enabled"
        />
      </section>

      <section className="grid gap-5 rounded-3xl border border-ink/12 bg-white/80 p-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">Themes</h2>
          <p className="mt-1 text-xs text-muted">{THEME_PICKER_HINT}</p>
        </div>
        <ThemePicker
          name="booking"
          legend="Booking app"
          hint={`What clients see at /book/${form.slug || "slug"}.`}
          value={form.bookingThemeId}
          onChange={(id) => set("bookingThemeId", id)}
        />
        <ThemePicker
          name="manager"
          legend="Manager app"
          hint="Dashboard, bookings, earnings, and team."
          value={form.managerThemeId}
          onChange={(id) => set("managerThemeId", id)}
        />
        <ThemePicker
          name="stylist"
          legend="Stylist app"
          hint="Phone portal for the floor team."
          value={form.stylistThemeId}
          onChange={(id) => set("stylistThemeId", id)}
        />
      </section>

      <section className="grid gap-4 rounded-3xl border border-ink/12 bg-white/80 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">
          Manager access
        </h2>
        <p className="text-xs text-muted">
          Optional — set both fields to add a manager login or reset an existing one.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Manager email
            <input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            New password (min 8)
            <input
              type="text"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
      </section>

      {error ? <p className="text-sm text-[#a4432f]">{error}</p> : null}
      {message ? <p className="text-sm text-[#3f6b43]">{message}</p> : null}

      <div>
        <button type="submit" disabled={saving} className="btn-solid rounded-2xl px-5 py-3 font-medium">
          {saving ? "Saving…" : "Save salon"}
        </button>
      </div>
    </form>
  );
}
