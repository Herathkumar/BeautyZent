"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BeautyZentLogo } from "@/components/BeautyZentBrand";
import { useConfirm } from "@/components/ConfirmDialog";
import { invalidateFavoriteAccountSession } from "@/components/FavoriteBusinessButton";
import { formatCad } from "@/lib/money";

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

function bookingDate(booking: Booking) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: booking.salon.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(booking.startsAt));
}

function slotTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
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
    <main className="min-h-screen bg-[#f7f2ec] px-4 py-10">
      <div className="mx-auto max-w-md">
        <Link href="/explore" className="text-sm font-medium text-cocoa">
          ← Explore
        </Link>
        <div className="mt-8 rounded-3xl border border-ink/12 bg-white/90 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <BeautyZentLogo variant="rose" size="md" href={null} priority />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
                BeautyZent
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
                My account
              </h1>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted">
            Sign in once to see bookings, rewards, and saved businesses across BeautyZent.
          </p>
          <form
            className="mt-6 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="grid gap-1.5 text-sm font-medium text-ink-soft">
              Email
              <input
                type="email"
                required
                disabled={sent}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink"
              />
            </label>
            {sent ? (
              <label className="grid gap-1.5 text-sm font-medium text-ink-soft">
                Six-digit code
                <input
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="rounded-2xl border border-ink/15 bg-white px-4 py-3 text-ink"
                  autoFocus
                />
              </label>
            ) : null}
            {demoCode ? (
              <p className="rounded-xl bg-[#f5efd8] px-3 py-2 text-sm text-[#7a6230]">
                Local demo code: <strong>{demoCode}</strong>
              </p>
            ) : null}
            {error ? <p className="text-sm text-[#a4432f]">{error}</p> : null}
            <button
              type="submit"
              disabled={busy || (sent && code.length !== 6)}
              className="btn-solid rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Please wait…" : sent ? "Verify & open account" : "Email me a code"}
            </button>
            {sent ? (
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setCode("");
                  setDemoCode("");
                  setError("");
                }}
                className="text-sm font-medium text-cocoa"
              >
                Use another email
              </button>
            ) : null}
          </form>
        </div>
      </div>
    </main>
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
      <main className="grid min-h-screen place-items-center bg-[#f7f2ec] text-sm text-muted">
        Loading your BeautyZent account…
      </main>
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

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "bookings", label: "Bookings", count: upcoming.length },
    { id: "favorites", label: "Favorites", count: account.favorites.length },
    { id: "rewards", label: "Rewards", count: account.memberships.length },
    { id: "profile", label: "Profile" },
  ];

  function BookingCard({ booking }: { booking: Booking }) {
    const editing = rescheduleId === booking.id;
    return (
      <article className="rounded-3xl border border-ink/12 bg-white/90 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href={`/explore/${booking.salon.slug}`}
              className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa hover:underline"
            >
              {booking.salon.name}
            </Link>
            <h3 className="mt-1 font-semibold text-ink">
              {booking.services.map((service) => service.name).join(" + ")}
            </h3>
            <p className="mt-1 text-sm font-medium text-[#8d4f59]">
              {bookingDate(booking)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {booking.stylist.name} · {booking.totalDurationMin} min ·{" "}
              {formatCad(booking.totalPriceCents)}
            </p>
          </div>
          <span className="rounded-full bg-[#f3eee8] px-3 py-1 text-xs font-semibold capitalize text-ink-soft">
            {statusLabel(booking.status)}
          </span>
        </div>
        {booking.canCancel || booking.canReschedule ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {booking.canReschedule ? (
              <button
                type="button"
                onClick={() => {
                  setRescheduleId(editing ? null : booking.id);
                  setRescheduleDate("");
                  setSelectedSlot("");
                  setSlots([]);
                }}
                className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink"
              >
                {editing ? "Close reschedule" : "Reschedule"}
              </button>
            ) : null}
            {booking.canCancel ? (
              <button
                type="button"
                disabled={busyId === booking.id}
                onClick={() => void cancelBooking(booking)}
                className="rounded-full border border-[#a4432f]/30 px-4 py-2 text-xs font-semibold text-[#a4432f] disabled:opacity-50"
              >
                {busyId === booking.id ? "Working…" : "Cancel"}
              </button>
            ) : null}
          </div>
        ) : null}
        {editing ? (
          <div className="mt-4 grid gap-3 rounded-2xl bg-[#f7f2ec] p-4">
            <label className="grid gap-1 text-xs font-medium text-muted">
              New date
              <input
                type="date"
                min={localToday()}
                value={rescheduleDate}
                onChange={(event) => void loadSlots(booking, event.target.value)}
                className="rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink"
              />
            </label>
            {rescheduleDate && slots.length === 0 && busyId !== booking.id ? (
              <p className="text-sm text-muted">No available times on this date.</p>
            ) : null}
            {slots.length ? (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                      selectedSlot === slot
                        ? "border-[#8d4f59] bg-[#8d4f59] text-white"
                        : "border-ink/15 bg-white text-ink"
                    }`}
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
                className="btn-solid w-fit rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
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
    <main className="min-h-screen bg-[#f7f2ec]">
      <header className="border-b border-ink/10 bg-white/85">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BeautyZentLogo variant="rose" size="sm" href="/explore" />
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
                BeautyZent
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl leading-none text-ink">
                My account
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/explore" className="font-medium text-ink-soft hover:text-ink">
              Explore
            </Link>
            <button type="button" onClick={() => void signOut()} className="text-cocoa">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-sm text-muted">Welcome back</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-ink">
            {account.account.name || account.account.email}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Everything you book and save across BeautyZent, in one place.
          </p>
        </div>

        <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-ink/10 bg-white/75 p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setError("");
                setMessage("");
              }}
              className={`min-w-fit flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                tab === item.id ? "bg-[#8d4f59] text-white" : "text-ink-soft"
              }`}
            >
              {item.label}
              {item.count ? ` · ${item.count}` : ""}
            </button>
          ))}
        </nav>

        {error ? (
          <p className="mb-4 rounded-2xl bg-[#f2e6e2] px-4 py-3 text-sm text-[#a4432f]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mb-4 rounded-2xl bg-[#e7f0e6] px-4 py-3 text-sm text-[#3f6b43]">
            {message}
          </p>
        ) : null}

        {tab === "bookings" ? (
          <div className="grid gap-8">
            <section>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-ink">
                Upcoming
              </h2>
              <p className="mt-1 text-sm text-muted">
                Cancel or reschedule online until 24 hours before your visit.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {upcoming.length ? (
                  upcoming.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <p className="rounded-3xl border border-dashed border-ink/20 bg-white/60 p-8 text-sm text-muted sm:col-span-2">
                    No upcoming bookings.{" "}
                    <Link href="/explore" className="font-semibold text-cocoa">
                      Find a business
                    </Link>
                    .
                  </p>
                )}
              </div>
            </section>
            {past.length ? (
              <section>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-ink">
                  Past bookings
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-ink">
              Saved businesses
            </h2>
            <p className="mt-1 text-sm text-muted">
              Keep the places you want to book again close at hand.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {account.favorites.length ? (
                account.favorites.map((favorite) => (
                  <article
                    key={favorite.id}
                    className="overflow-hidden rounded-3xl border border-ink/12 bg-white/90"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={favorite.coverUrl || "/display-promo.jpg"}
                      alt=""
                      className="aspect-[16/9] w-full object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-[family-name:var(--font-display)] text-xl text-ink">
                        {favorite.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {[favorite.city, favorite.region].filter(Boolean).join(", ") ||
                          favorite.address ||
                          "Location coming soon"}
                      </p>
                      <div className="mt-4 flex gap-2">
                        <Link
                          href={`/explore/${favorite.slug}`}
                          className="btn-solid flex-1 rounded-full px-4 py-2 text-center text-sm font-semibold"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === favorite.id}
                          onClick={() => void removeFavorite(favorite.id)}
                          className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink-soft"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-3xl border border-dashed border-ink/20 bg-white/60 p-8 text-sm text-muted sm:col-span-2 lg:col-span-3">
                  No favorites yet. Save businesses from Explore to see them here.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {tab === "rewards" ? (
          <section>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-ink">
              Rewards by business
            </h2>
            <p className="mt-1 text-sm text-muted">
              Points and offers remain with the business where you earned them.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {account.memberships.map((membership) => (
                <article
                  key={membership.salonId}
                  className="rounded-3xl border border-[#c9a87c]/35 bg-[linear-gradient(135deg,#fff,#f3ebe3)] p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
                    {membership.salon.name}
                  </p>
                  <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-ink">
                    {membership.rewards.enabled
                      ? `${membership.rewards.points} points`
                      : "Rewards not enabled"}
                  </p>
                  {membership.rewards.enabled ? (
                    <p className="mt-1 text-sm text-muted">
                      Worth {formatCad(membership.rewards.redeemValueCents)} ·{" "}
                      {membership.rewards.completedVisits} completed{" "}
                      {membership.rewards.completedVisits === 1 ? "visit" : "visits"}
                    </p>
                  ) : null}
                  {membership.salon.offerCount ? (
                    <p className="mt-2 text-sm font-medium text-[#8d4f59]">
                      {membership.salon.offerCount} active{" "}
                      {membership.salon.offerCount === 1 ? "offer" : "offers"}
                    </p>
                  ) : null}
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/explore/${membership.salon.slug}#rewards`}
                      className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink"
                    >
                      Details
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === `book:${membership.salon.slug}`}
                      onClick={() => void openBooking(membership.salon.slug)}
                      className="btn-solid rounded-full px-4 py-2 text-sm font-semibold"
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
          <section className="max-w-xl rounded-3xl border border-ink/12 bg-white/90 p-5 sm:p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-ink">
              Profile
            </h2>
            <p className="mt-1 text-sm text-muted">
              Updates apply to your memberships across BeautyZent.
            </p>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm font-medium text-ink-soft">
                Name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-2xl border border-ink/15 px-4 py-3 text-ink"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-ink-soft">
                Phone
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="rounded-2xl border border-ink/15 px-4 py-3 text-ink"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-muted">
                Email
                <input
                  value={account.account.email}
                  disabled
                  className="rounded-2xl border border-ink/10 bg-[#f7f2ec] px-4 py-3"
                />
              </label>
              <button
                type="button"
                disabled={busyId === "profile" || name.trim().length < 2}
                onClick={() => void saveProfile()}
                className="btn-solid w-fit rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
              >
                {busyId === "profile" ? "Saving…" : "Save profile"}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
