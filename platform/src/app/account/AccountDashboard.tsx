"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { invalidateFavoriteAccountSession } from "@/components/FavoriteBusinessButton";
import { ExploreMarketplaceNav } from "@/app/explore/ExploreMarketplaceNav";

type Tab = "bookings" | "favorites" | "rewards" | "profile";

type AccountData = {
  account: { id: string; email: string; name: string | null; phone: string | null };
  memberships: Array<{
    clientId: string;
    salonId: string;
    memberName: string;
    salon: {
      name: string;
      slug: string;
      businessType: string;
      city: string | null;
      region: string | null;
      address: string | null;
      loyaltyEnabled: boolean;
      discountsEnabled: boolean;
      loyaltyPointsPerDollar: number;
      loyaltyCentsPerPoint: number;
      loyaltyMaxRedeemPercent: number;
      offerCount: number;
    };
    rewards: {
      enabled: boolean;
      points: number;
      redeemValueCents: number;
      completedVisits: number;
    };
  }>;
  favorites: Array<{
    id: string;
    name: string;
    slug: string;
    businessType: string;
    city: string | null;
    region: string | null;
    address: string | null;
    description: string | null;
    coverUrl: string | null;
  }>;
};

type Booking = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  canCancel: boolean;
  canReschedule: boolean;
  salon: {
    name: string;
    slug: string;
    timezone: string;
    phone: string | null;
    city: string | null;
    region: string | null;
    coverUrl?: string | null;
  };
  stylist: { id: string; name: string };
  services: Array<{ id: string; name: string; durationMin: number; priceCents: number }>;
  totalDurationMin: number;
  totalPriceCents: number;
};

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

/** "Wed, Oct 7 · 4:00 PM" */
function bookingDateLine(booking: Booking) {
  const starts = new Date(booking.startsAt);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.salon.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(starts);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: booking.salon.timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(starts);
  return `${day} · ${time}`;
}

function slotTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "$25" not "$25.00" when whole dollars. */
function formatAccountPrice(cents: number) {
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
}

function firstNameFrom(name: string | null, email: string) {
  const fromName = (name || "").trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email.split("@")[0] || "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function statusPresentation(status: string): { label: string; tone: "booked" | "muted" } {
  if (status === "BOOKED" || status === "CHECKED_IN") {
    return { label: "Booked", tone: "booked" };
  }
  if (status === "COMPLETED") {
    return { label: "Completed", tone: "muted" };
  }
  return {
    label: status.replaceAll("_", " ").toLowerCase(),
    tone: "muted",
  };
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconHeart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 20s-6.5-4.1-8.7-7.6C1.4 9.6 2.5 6.5 5.4 5.5c1.8-.6 3.6.1 4.6 1.5C11 5.6 12.8 4.9 14.6 5.5c2.9 1 4 4.1 2.1 6.9C18.5 15.9 12 20 12 20z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGift({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 7h18v4H3V7z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v14" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7c-1.8-2.8-4.8-2.6-5.5-1.2C5.7 7.4 7.2 9 12 7zm0 0c1.8-2.8 4.8-2.6 5.5-1.2.8 1.6-.7 3.2-5.5 1.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPerson({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AccountSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoCode, setDemoCode] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        sent
          ? "/api/public/auth/consumer/verify-otp"
          : "/api/public/auth/consumer/request-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sent ? { email, code } : { email }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sign in failed");
      if (sent) {
        onSignedIn();
      } else {
        setSent(true);
        setDemoCode(data.demoCode || "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="explore-luxe account-luxe">
      <ExploreMarketplaceNav current="account" />

      <section className="account-luxe__hero account-luxe__hero--signin" aria-label="Welcome">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-account.jpg"
          alt=""
          className="account-luxe__hero-img"
        />
        <div className="account-luxe__hero-gradient account-luxe__hero-gradient--signin" aria-hidden />
        <div className="account-luxe__hero-copy">
          <p className="account-luxe__hero-eyebrow">Your account</p>
          <h1 className="account-luxe__welcome">Welcome back</h1>
          <p className="account-luxe__subline">Bookings, favorites and rewards.</p>
        </div>
      </section>

      <div className="account-luxe__signin">
        <div className="account-luxe__signin-card">
          <p className="account-luxe__signin-eyebrow">Your account</p>
          <h2 className="account-luxe__signin-title">Sign in</h2>
          <p className="account-luxe__signin-lead">
            See bookings, favorites and reserved visits.
          </p>
          <form
            className="account-luxe__signin-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="account-luxe__field">
              Email address
              <input
                type="email"
                required
                disabled={sent}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                autoComplete="email"
              />
            </label>
            {sent ? (
              <label className="account-luxe__field">
                Six-digit code
                <input
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                />
              </label>
            ) : null}
            {demoCode ? (
              <p className="account-luxe__signin-demo">
                Local demo code: <strong>{demoCode}</strong>
              </p>
            ) : null}
            {error ? <p className="account-luxe__signin-error">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || (sent && code.length !== 6)}
              className="account-luxe__signin-submit"
            >
              {busy ? "Please wait…" : sent ? "Verify & open account" : "Email me a code"}
            </button>
            {!sent ? (
              <p className="account-luxe__signin-helper">We&apos;ll email a one-time code.</p>
            ) : null}
            {sent ? (
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setDemoCode("");
                  setError("");
                }}
                className="account-luxe__text-link"
              >
                Use another email
              </button>
            ) : (
              <Link href="/explore" className="account-luxe__signin-explore">
                Explore houses →
              </Link>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export function AccountDashboard() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("bookings");
  const [account, setAccount] = useState<AccountData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const accountRes = await fetch("/api/public/account", { cache: "no-store" });
      if (accountRes.status === 401) {
        setAccount(null);
        setBookings([]);
        return;
      }
      const accountData = await accountRes.json();
      if (!accountRes.ok) throw new Error(accountData.error || "Could not load account");
      setAccount(accountData);
      setName(accountData.account.name || "");
      setPhone(accountData.account.phone || "");

      const bookingRes = await fetch("/api/public/account/bookings", { cache: "no-store" });
      const bookingData = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(bookingData.error || "Could not load bookings");
      setBookings(bookingData.bookings || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load account");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upcoming = useMemo(
    () =>
      bookings
        .filter(
          (booking) =>
            booking.status === "BOOKED" &&
            new Date(booking.startsAt).getTime() >= Date.now() - 60_000
        )
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        ),
    [bookings]
  );
  const past = useMemo(
    () => bookings.filter((booking) => !upcoming.includes(booking)),
    [bookings, upcoming]
  );

  async function cancelBooking(booking: Booking) {
    const approved = await confirm({
      title: "Cancel booking?",
      message: `${booking.services.map((service) => service.name).join(" + ")} at ${booking.salon.name} will be cancelled.`,
      confirmLabel: "Cancel booking",
      cancelLabel: "Keep booking",
      tone: "danger",
    });
    if (!approved) return;
    setBusyId(booking.id);
    setError("");
    const res = await fetch(`/api/public/account/bookings/${booking.id}/cancel`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not cancel booking");
      return;
    }
    setMessage(data.message || "Booking cancelled.");
    await load();
  }

  async function loadSlots(booking: Booking, date: string) {
    setRescheduleDate(date);
    setSelectedSlot("");
    setSlots([]);
    if (!date) return;
    setBusyId(booking.id);
    setError("");
    const res = await fetch(
      `/api/public/account/bookings/${booking.id}/reschedule?date=${encodeURIComponent(date)}`,
      { cache: "no-store" }
    );
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not load times");
      return;
    }
    setSlots(data.slots || []);
  }

  async function reschedule(booking: Booking) {
    if (!selectedSlot) return;
    setBusyId(booking.id);
    setError("");
    const res = await fetch(`/api/public/account/bookings/${booking.id}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt: selectedSlot }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not reschedule booking");
      return;
    }
    setMessage(data.message || "Booking rescheduled.");
    setRescheduleId(null);
    setRescheduleDate("");
    setSelectedSlot("");
    setSlots([]);
    await load();
  }

  async function removeFavorite(salonId: string) {
    setBusyId(salonId);
    const res = await fetch(`/api/public/account/favorites/${salonId}`, {
      method: "DELETE",
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not remove favorite");
      return;
    }
    setAccount((current) =>
      current
        ? {
            ...current,
            favorites: current.favorites.filter((item) => item.id !== salonId),
          }
        : current
    );
  }

  async function saveProfile() {
    setBusyId("profile");
    setError("");
    setMessage("");
    const res = await fetch("/api/public/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not update profile");
      return;
    }
    setMessage(data.message || "Profile updated.");
    await load();
  }

  async function signOut() {
    await fetch("/api/public/account/logout", { method: "POST" });
    invalidateFavoriteAccountSession();
    setAccount(null);
    setBookings([]);
  }

  async function openBooking(slug: string) {
    setBusyId(`book:${slug}`);
    setError("");
    const res = await fetch("/api/public/auth/switch-salon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusyId(null);
      setError(data.error || "Could not open this business");
      return;
    }
    window.location.assign(`/book/${encodeURIComponent(slug)}`);
  }

  if (loading && !account) {
    return (
      <div className="explore-luxe account-luxe">
        <ExploreMarketplaceNav current="account" />
        <main className="grid min-h-[50vh] place-items-center text-sm text-[var(--account-muted)]">
          Loading your BeautyZent account…
        </main>
      </div>
    );
  }
  if (!account) {
    return (
      <AccountSignIn
        onSignedIn={() => {
          invalidateFavoriteAccountSession();
          void load();
        }}
      />
    );
  }

  const tabs: Array<{
    id: Tab;
    label: string;
    count?: number;
    icon: typeof IconCalendar;
  }> = [
    { id: "bookings", label: "Bookings", count: upcoming.length, icon: IconCalendar },
    { id: "favorites", label: "Favorites", count: account.favorites.length, icon: IconHeart },
    { id: "rewards", label: "Rewards", count: account.memberships.length, icon: IconGift },
    { id: "profile", label: "Profile", icon: IconPerson },
  ];

  const welcomeName = firstNameFrom(account.account.name, account.account.email);

  function BookingCard({ booking }: { booking: Booking }) {
    const editing = rescheduleId === booking.id;
    const status = statusPresentation(booking.status);
    const coverUrl = booking.salon.coverUrl || "/display-promo.jpg";
    return (
      <article className="account-luxe__booking-card">
        <div className="account-luxe__booking-main">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            className="account-luxe__booking-photo"
          />
          <div className="account-luxe__booking-copy">
            <Link
              href={`/explore/${booking.salon.slug}`}
              className="account-luxe__house-name"
            >
              {booking.salon.name}
            </Link>
            <h3 className="account-luxe__service-name">
              {booking.services.map((service) => service.name).join(" + ")}
            </h3>
            <p className="account-luxe__date-line">{bookingDateLine(booking)}</p>
            <p className="account-luxe__meta-line">
              {booking.stylist.name} · {booking.totalDurationMin} min ·{" "}
              {formatAccountPrice(booking.totalPriceCents)}
            </p>
            <div className="account-luxe__status-row">
              <span
                className={`account-luxe__status account-luxe__status--${status.tone}`}
              >
                {status.label}
              </span>
            </div>
          </div>
        </div>
        {booking.canCancel || booking.canReschedule ? (
          <div className="account-luxe__booking-actions">
            {booking.canReschedule ? (
              <button
                type="button"
                onClick={() => {
                  setRescheduleId(editing ? null : booking.id);
                  setRescheduleDate("");
                  setSelectedSlot("");
                  setSlots([]);
                }}
                className="account-luxe__btn-reschedule"
              >
                <IconCalendar className="h-3.5 w-3.5" />
                {editing ? "Close" : "Reschedule"}
              </button>
            ) : null}
            {booking.canReschedule && booking.canCancel ? (
              <span className="account-luxe__action-divider" aria-hidden />
            ) : null}
            {booking.canCancel ? (
              <button
                type="button"
                disabled={busyId === booking.id}
                onClick={() => void cancelBooking(booking)}
                className="account-luxe__btn-cancel"
              >
                {busyId === booking.id ? "Working…" : "Cancel"}
              </button>
            ) : null}
          </div>
        ) : null}
        {editing ? (
          <div className="account-luxe__reschedule-panel">
            <label className="account-luxe__field" style={{ fontSize: "0.75rem", color: "var(--account-muted)" }}>
              New date
              <input
                type="date"
                min={localToday()}
                value={rescheduleDate}
                onChange={(event) => void loadSlots(booking, event.target.value)}
              />
            </label>
            {rescheduleDate && slots.length === 0 && busyId !== booking.id ? (
              <p className="text-sm text-[var(--account-muted)]">No available times on this date.</p>
            ) : null}
            {slots.length ? (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`account-luxe__slot${selectedSlot === slot ? " is-selected" : ""}`}
                  >
                    {slotTime(slot, booking.salon.timezone)}
                  </button>
                ))}
              </div>
            ) : null}
            {selectedSlot ? (
              <button
                type="button"
                disabled={busyId === booking.id}
                onClick={() => void reschedule(booking)}
                className="account-luxe__confirm"
              >
                {busyId === booking.id ? "Saving…" : "Confirm new time"}
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <div className="explore-luxe account-luxe">
      <ExploreMarketplaceNav current="account" onSignOut={() => void signOut()} />

      <section className="account-luxe__hero" aria-label="Welcome">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-account.jpg"
          alt=""
          className="account-luxe__hero-img"
        />
        <div className="account-luxe__hero-gradient" aria-hidden />
        <div className="account-luxe__hero-copy">
          <p className="account-luxe__eyebrow">Your account</p>
          <h1 className="account-luxe__welcome">Welcome back, {welcomeName}</h1>
          <p className="account-luxe__subline">
            Bookings, favorites and rewards in one place.
          </p>
        </div>
      </section>

      <div className="account-luxe__body">
        <nav className="account-luxe__tabs" aria-label="Account sections">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setError("");
                  setMessage("");
                }}
                className={`account-luxe__tab${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="account-luxe__tab-icon" />
                {item.label}
                {item.count != null && item.count > 0 ? (
                  <span className="account-luxe__tab-count">{item.count}</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {error ? <p className="account-luxe__alert-error">{error}</p> : null}
        {message ? <p className="account-luxe__alert-ok">{message}</p> : null}

        {tab === "bookings" ? (
          <div className="grid gap-8">
            <section>
              <h2 className="account-luxe__section-title">Upcoming</h2>
              <p className="account-luxe__section-lead">
                Cancel or reschedule online until 24 hours before your visit.
              </p>
              <div className="account-luxe__booking-grid">
                {upcoming.length ? (
                  upcoming.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <p className="account-luxe__empty">
                    No upcoming bookings.{" "}
                    <Link href="/explore">Find a business</Link>.
                  </p>
                )}
              </div>
            </section>
            {past.length ? (
              <section>
                <h2 className="account-luxe__section-title">Past bookings</h2>
                <div className="account-luxe__booking-grid">
                  {past.slice(0, 24).map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === "favorites" ? (
          <section>
            <h2 className="account-luxe__section-title">Saved businesses</h2>
            <p className="account-luxe__section-lead">
              Keep the places you want to book again close at hand.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {account.favorites.length ? (
                account.favorites.map((favorite) => (
                  <article key={favorite.id} className="account-luxe__panel-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={favorite.coverUrl || "/display-promo.jpg"}
                      alt=""
                      className="aspect-[16/9] w-full object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--account-ink)]">
                        {favorite.name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--account-muted)]">
                        {[favorite.city, favorite.region].filter(Boolean).join(", ") ||
                          favorite.address ||
                          "Location coming soon"}
                      </p>
                      <div className="mt-4 flex gap-2">
                        <Link
                          href={`/explore/${favorite.slug}`}
                          className="account-luxe__primary flex-1 text-center"
                          style={{ display: "inline-block" }}
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === favorite.id}
                          onClick={() => void removeFavorite(favorite.id)}
                          className="rounded-full border border-[var(--account-line)] px-4 py-2 text-sm font-semibold text-[var(--account-taupe)]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="account-luxe__empty sm:col-span-2 lg:col-span-3">
                  No favorites yet. Save businesses from Explore to see them here.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {tab === "rewards" ? (
          <section>
            <h2 className="account-luxe__section-title">Rewards by business</h2>
            <p className="account-luxe__section-lead">
              Points and offers remain with the business where you earned them.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {account.memberships.map((membership) => (
                <article
                  key={membership.salonId}
                  className="account-luxe__panel-card p-5"
                  style={{
                    background: "linear-gradient(135deg,#fff,#f6f2eb)",
                  }}
                >
                  <p className="account-luxe__house-name">{membership.salon.name}</p>
                  <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--account-ink)]">
                    {membership.rewards.enabled
                      ? `${membership.rewards.points} points`
                      : "Rewards not enabled"}
                  </p>
                  {membership.rewards.enabled ? (
                    <p className="mt-1 text-sm text-[var(--account-muted)]">
                      Worth {formatAccountPrice(membership.rewards.redeemValueCents)} ·{" "}
                      {membership.rewards.completedVisits} completed{" "}
                      {membership.rewards.completedVisits === 1 ? "visit" : "visits"}
                    </p>
                  ) : null}
                  {membership.salon.offerCount ? (
                    <p className="mt-2 text-sm font-medium text-[var(--account-gold-soft)]">
                      {membership.salon.offerCount} active{" "}
                      {membership.salon.offerCount === 1 ? "offer" : "offers"}
                    </p>
                  ) : null}
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/explore/${membership.salon.slug}#rewards`}
                      className="rounded-full border border-[var(--account-line)] px-4 py-2 text-sm font-semibold text-[var(--account-ink)]"
                    >
                      Details
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === `book:${membership.salon.slug}`}
                      onClick={() => void openBooking(membership.salon.slug)}
                      className="account-luxe__primary"
                    >
                      {busyId === `book:${membership.salon.slug}` ? "Opening…" : "Book"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "profile" ? (
          <section className="account-luxe__profile">
            <aside className="account-luxe__profile-side">
              <div className="account-luxe__profile-avatar" aria-hidden>
                {(name.trim() || account.account.email).charAt(0).toUpperCase()}
              </div>
              <p className="account-luxe__profile-side-name">
                {name.trim() || welcomeName}
              </p>
              <p className="account-luxe__profile-side-email">{account.account.email}</p>
              <hr className="account-luxe__profile-side-divider" />
              <div className="account-luxe__profile-side-links">
                <button
                  type="button"
                  className="account-luxe__profile-side-link"
                  onClick={() =>
                    setMessage("Photo updates aren’t available yet — hang tight.")
                  }
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M4.5 19h15a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 19.5 7h-2.2l-1.1-1.6A1.5 1.5 0 0 0 14.95 4.5h-5.9a1.5 1.5 0 0 0-1.25.9L6.7 7H4.5A1.5 1.5 0 0 0 3 8.5v9A1.5 1.5 0 0 0 4.5 19z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle cx="12" cy="12.5" r="3.25" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Change photo
                </button>
                <button
                  type="button"
                  className="account-luxe__profile-side-link"
                  onClick={() => void signOut()}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M7 7l10 10M17 7 7 17"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Sign out
                </button>
              </div>
            </aside>

            <div className="account-luxe__profile-main">
              <h2 className="account-luxe__profile-main-title">Profile</h2>
              <p className="account-luxe__profile-main-lead">
                Used when you reserve a visit.
              </p>
              <div className="account-luxe__profile-form">
                <div className="account-luxe__profile-fields">
                  <label className="account-luxe__field">
                    Name
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                    />
                  </label>
                  <label className="account-luxe__field">
                    Phone
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      autoComplete="tel"
                    />
                  </label>
                </div>

                <div className="account-luxe__email-row">
                  <span className="account-luxe__email-lock" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                      <rect
                        x="5"
                        y="10.5"
                        width="14"
                        height="9"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <div className="account-luxe__email-copy">
                    <p className="account-luxe__email-value">{account.account.email}</p>
                    <p className="account-luxe__email-hint">Used to sign in.</p>
                  </div>
                  <button
                    type="button"
                    className="account-luxe__profile-link"
                    onClick={() =>
                      setMessage("To change your email, sign out and sign in with a new address.")
                    }
                  >
                    Change email
                  </button>
                </div>

                <div className="account-luxe__password-row">
                  <div className="account-luxe__password-copy">
                    <p className="account-luxe__password-label">Password</p>
                    <p className="account-luxe__password-bullets" aria-hidden>
                      ••••••••
                    </p>
                  </div>
                  <button
                    type="button"
                    className="account-luxe__profile-link"
                    onClick={() =>
                      setMessage("BeautyZent uses email codes to sign in — no password to update.")
                    }
                  >
                    Update password
                  </button>
                </div>

                <div className="account-luxe__profile-actions">
                  <button
                    type="button"
                    disabled={busyId === "profile" || name.trim().length < 2}
                    onClick={() => void saveProfile()}
                    className="account-luxe__save-changes"
                  >
                    {busyId === "profile" ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
