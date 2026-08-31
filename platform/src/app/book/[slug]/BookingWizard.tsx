"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ANY_STYLIST_ID, CLIENT_CANCEL_HOURS } from "@/lib/client-booking";
import { formatCad } from "@/lib/money";
import { calendarDateInTz } from "@/lib/salon-time";
import { writeSalonBrand } from "@/lib/salon-branding";
import { BookBottomNav, BookTabKey } from "./BookBottomNav";
import { BookingMyBookings, MemberTab } from "./BookingMyBookings";
import { BookingProfile } from "./BookingProfile";
import { BookingRewards } from "./BookingRewards";
import { BookClient, ClientMemberBar } from "./ClientMemberBar";
import { StylePrefDraft } from "./StylePreviewPanel";
import { clearStyleDraft, readStyleDraft } from "./style-draft-storage";
import { BOOK_NOTIFY_EVENT } from "./BookMarketNav";
import { SettingToggle } from "@/components/admin/SettingToggle";
import { GoldLogoLoader } from "@/components/GoldLogoSpin";
import { serviceIconSrc } from "@/lib/service-icons";
import {
  LuxeCrown,
  LuxeOrnament,
  LuxeSparkle,
  MemberBadge,
  memberTierFromPoints,
  memberTierLabel,
} from "./luxe";

type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMin: number;
  priceCents: number;
};
type Stylist = {
  id: string;
  name: string;
  bio: string | null;
  color: string;
  gender?: string;
  photoUrl?: string;
  hasPhoto?: boolean;
  serviceIds: string[];
};
type Salon = {
  id: string;
  name: string;
  slug?: string;
  phone: string | null;
  address: string | null;
  timezone?: string;
  today?: string;
};

const STEPS = ["Service", "Provider", "Time", "Details"] as const;

const CATEGORY_ORDER = ["WOMEN", "MEN"] as const;

function categoryLabel(category: string) {
  if (category === "WOMEN") return "Women";
  if (category === "MEN") return "Men";
  return "Other";
}

function PostBookJoin({
  slug,
  name,
  phone,
  email,
  onJoined,
  onSkip,
}: {
  slug: string;
  name: string;
  phone: string;
  email: string;
  onJoined: (c: BookClient) => void;
  onSkip: () => void;
}) {
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function sendCode() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "join", name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code");
      setSent(true);
      if (data.demoCode) setDemoCode(data.demoCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify");
      onJoined(data.client);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="book-card rounded-3xl p-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
        Save your profile?
      </p>
      <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
        Join for easier booking next time
      </h3>
      <p className="mt-2 text-sm text-muted">
        One-time code to {email}. No password. Free cancel until {CLIENT_CANCEL_HOURS}h before.
      </p>
      {!sent ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={sendCode}
            className="btn-solid rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Sending…" : "Email me a code"}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-muted"
          >
            Skip for now
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {demoCode ? (
            <p className="rounded-xl border border-[rgba(201,180,232,0.35)] bg-[rgba(201,180,232,0.1)] px-3 py-2 text-sm text-[#e0d0f5]">
              Demo code: <span className="font-bold tracking-widest">{demoCode}</span>
            </p>
          ) : (
            <p className="text-sm text-muted">Check your inbox for the code.</p>
          )}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="rounded-xl border px-3 py-2.5 tracking-[0.35em]"
            inputMode="numeric"
            placeholder="6-digit code"
          />
          <button
            type="button"
            disabled={busy || code.length !== 6}
            onClick={verify}
            className="btn-solid rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Saving…" : "Join & save"}
          </button>
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-[#f5a8a8]">{error}</p> : null}
    </div>
  );
}

export function BookingWizard({ slug }: { slug: string }) {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [stylistId, setStylistId] = useState("");
  const [minDate, setMinDate] = useState(() => calendarDateInTz("America/Toronto"));
  const [date, setDate] = useState(() => calendarDateInTz("America/Toronto"));
  const [slots, setSlots] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [stylePref, setStylePref] = useState<StylePrefDraft | null>(null);
  const [saveAsMember, setSaveAsMember] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [client, setClient] = useState<BookClient | null>(null);
  const [showBookings, setShowBookings] = useState(false);
  const [memberTab, setMemberTab] = useState<MemberTab>("visits");
  const [signInSignal, setSignInSignal] = useState(0);
  const [signInMode, setSignInMode] = useState<"signin" | "join">("signin");
  const [joinPrompt, setJoinPrompt] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [counts, setCounts] = useState({ upcoming: 0, photos: 0 });
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);
  const [justBooked, setJustBooked] = useState<{
    id: string;
    stylist: string;
    service: string;
    startsAt: string;
    priceCents?: number;
    durationMin?: number;
  } | null>(null);

  const wasMember = useRef(false);
  const onClientChange = useCallback((c: BookClient | null) => {
    setClient(c);
    if (c) {
      wasMember.current = true;
      setName(c.name || "");
      setPhone(c.phone || "");
      setEmail(c.email || "");
      return;
    }
    // The initial session check also reports null; only a real sign-out should
    // wipe what a guest has already typed.
    if (!wasMember.current) return;
    wasMember.current = false;
    setName("");
    setPhone("");
    setEmail("");
    setShowBookings(false);
    setSaveAsMember(true);
    setCounts({ upcoming: 0, photos: 0 });
    setLoyaltyPoints(null);
  }, []);

  useEffect(() => {
    if (!client) {
      setLoyaltyPoints(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/public/${slug}/loyalty`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setLoyaltyPoints(
          typeof d?.loyalty?.points === "number" ? d.loyalty.points : 0
        );
      })
      .catch(() => {
        if (!cancelled) setLoyaltyPoints(0);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, client, rewardsOpen, profileOpen, justBooked]);

  useEffect(() => {
    const draft = readStyleDraft(slug);
    if (draft) setStylePref(draft);
  }, [slug]);

  useEffect(() => {
    fetch(`/api/public/${slug}/catalog`, { cache: "no-store" })
      .then(async (r) => {
        const text = await r.text();
        if (!text) throw new Error("Catalog unavailable");
        return JSON.parse(text) as {
          error?: string;
          salon?: Salon & { today?: string; timezone?: string };
          services?: Service[];
          stylists?: Stylist[];
        };
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSalon(data.salon || null);
        if (data.salon?.name) {
          writeSalonBrand({
            slug: data.salon.slug || slug,
            name: data.salon.name,
            address: data.salon.address ?? null,
          });
        }
        setServices(data.services || []);
        setStylists(data.stylists || []);
        const today =
          data.salon?.today ||
          calendarDateInTz(data.salon?.timezone || "America/Toronto");
        setMinDate(today);
        setDate((prev) => (prev < today ? today : prev));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Catalog unavailable"))
      .finally(() => setLoading(false));
  }, [slug]);

  const filteredStylists = useMemo(() => {
    if (serviceIds.length === 0) return stylists;
    return stylists.filter((s) => serviceIds.every((id) => s.serviceIds.includes(id)));
  }, [stylists, serviceIds]);

  const selectedServices = useMemo(
    () =>
      serviceIds
        .map((id) => services.find((s) => s.id === id))
        .filter((s): s is Service => Boolean(s)),
    [serviceIds, services]
  );
  const selectedTotalMin = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const selectedTotalCents = selectedServices.reduce((sum, s) => sum + s.priceCents, 0);
  const selectedServiceLabel = selectedServices.map((s) => s.name).join(" + ");

  const serviceGroups = useMemo(() => {
    const byCat = new Map<string, Service[]>();
    for (const s of services) {
      const key = CATEGORY_ORDER.includes(s.category as (typeof CATEGORY_ORDER)[number])
        ? s.category
        : "OTHER";
      const list = byCat.get(key) || [];
      list.push(s);
      byCat.set(key, list);
    }
    const order = [...CATEGORY_ORDER, "OTHER"];
    return order
      .filter((key) => (byCat.get(key) || []).length > 0)
      .map((key) => ({ key, label: categoryLabel(key), items: byCat.get(key)! }));
  }, [services]);

  const selectedStylist =
    stylistId === ANY_STYLIST_ID
      ? null
      : stylists.find((s) => s.id === stylistId) || null;

  useEffect(() => {
    if (serviceIds.length === 0 || !stylistId || !date) {
      setSlots([]);
      return;
    }
    const ac = new AbortController();
    setSlots([]);
    const q = new URLSearchParams({
      serviceIds: serviceIds.join(","),
      stylistId,
      date,
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
  }, [slug, serviceIds, stylistId, date]);

  // Tab-bar badges: upcoming visits and saved look-book photos.
  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    fetch(`/api/public/${slug}/my-bookings`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.appointments) return;
        const now = Date.now();
        setCounts({
          upcoming: d.appointments.filter(
            (a: { status: string; startsAt: string }) =>
              ["BOOKED", "CHECKED_IN"].includes(a.status) &&
              new Date(a.startsAt).getTime() >= now - 60_000
          ).length,
          photos: d.appointments.reduce(
            (sum: number, a: { photos?: unknown[] }) => sum + (a.photos?.length || 0),
            0
          ),
        });
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [slug, client, showBookings, justBooked]);

  useEffect(() => {
    if (!client?.preferredStylistId || stylistId || serviceIds.length === 0) return;
    const pref = filteredStylists.find((s) => s.id === client.preferredStylistId);
    if (pref) setStylistId(pref.id);
  }, [client, filteredStylists, serviceIds, stylistId]);

  // Drop stylist if they no longer cover every selected service.
  useEffect(() => {
    if (!stylistId || stylistId === ANY_STYLIST_ID || serviceIds.length === 0) return;
    if (!filteredStylists.some((s) => s.id === stylistId)) {
      setStylistId("");
      setStartsAt("");
    }
  }, [filteredStylists, serviceIds, stylistId]);

  const activeStep =
    serviceIds.length === 0 ? 0 : !stylistId ? 1 : !startsAt ? 2 : 3;

  function toggleService(id: string) {
    setServiceIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next;
    });
    setStylistId("");
    setStartsAt("");
  }

  function goToStep(i: number) {
    if (i <= 0) {
      setServiceIds([]);
      setStylistId("");
      setStartsAt("");
      return;
    }
    if (i === 1) {
      setStylistId("");
      setStartsAt("");
      return;
    }
    if (i === 2) {
      setStartsAt("");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds,
          stylistId,
          startsAt,
          clientName: name,
          clientPhone: phone,
          clientEmail: email,
          notes,
          saveAsMember: !client && saveAsMember,
          stylePref: stylePref
            ? {
                imageBase64: stylePref.imageBase64,
                mimeType: stylePref.mimeType,
                source: stylePref.source,
                prompt: stylePref.prompt || undefined,
              }
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Booking failed");
      try {
        navigator.vibrate?.([18, 40, 24]);
      } catch {
        /* haptic optional */
      }
      clearStyleDraft(slug);
      setServiceIds([]);
      setStylistId("");
      setStartsAt("");
      setNotes("");
      setStylePref(null);
      setJoinPrompt(Boolean(data.suggestJoin && saveAsMember && email));

      const booked = {
        id: data.appointment.id as string,
        stylist: data.appointment.stylist as string,
        service: data.appointment.service as string,
        startsAt: data.appointment.startsAt as string,
        priceCents: data.appointment.priceCents as number | undefined,
        durationMin: data.appointment.durationMin as number | undefined,
      };

      if (client) {
        setJustBooked(booked);
        setMemberTab("visits");
        setShowBookings(true);
        setProfileOpen(false);
        setRewardsOpen(false);
      } else {
        setJustBooked(booked);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  function pickNextSlot() {
    if (slots[0]) setStartsAt(slots[0]);
  }

  /** Ask the member bar to pop open its sign-in (or join) form for a guest. */
  function requestMemberForm(mode: "signin" | "join") {
    setShowBookings(false);
    setProfileOpen(false);
    setSignInMode(mode);
    setSignInSignal((n) => n + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMemberTab(tab: MemberTab) {
    if (!client) {
      requestMemberForm("signin");
      return;
    }
    setProfileOpen(false);
    setRewardsOpen(false);
    setMemberTab(tab);
    setShowBookings(true);
  }

  useEffect(() => {
    function onNotify() {
      if (!client) {
        requestMemberForm("signin");
        return;
      }
      setProfileOpen(false);
      setRewardsOpen(false);
      setMemberTab("visits");
      setShowBookings(true);
    }
    window.addEventListener(BOOK_NOTIFY_EVENT, onNotify);
    return () => window.removeEventListener(BOOK_NOTIFY_EVENT, onNotify);
  }, [client]);

  function selectTab(key: BookTabKey) {
    if (key === "book") {
      setShowBookings(false);
      setProfileOpen(false);
      setRewardsOpen(false);
      setJustBooked(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (key === "profile") {
      // Guests still get Profile — it holds the join prompt.
      setShowBookings(false);
      setRewardsOpen(false);
      setProfileOpen(true);
      return;
    }
    if (key === "rewards") {
      // Guests can browse offers; points balance needs sign-in.
      setShowBookings(false);
      setProfileOpen(false);
      setRewardsOpen(true);
      return;
    }
    openMemberTab(key === "lookbook" ? "lookbook" : "visits");
  }

  const activeTab: BookTabKey = rewardsOpen
    ? "rewards"
    : profileOpen
      ? "profile"
      : showBookings
        ? memberTab === "lookbook"
          ? "lookbook"
          : "visits"
        : "book";

  const appChrome = (
    <>
      <BookingMyBookings
        slug={slug}
        open={showBookings}
        initialTab={memberTab}
        salonName={salon?.name}
        highlightId={justBooked?.id ?? null}
        onClose={() => {
          setShowBookings(false);
          setJustBooked(null);
        }}
        timezone={salon?.timezone}
      />
      <BookingRewards
        slug={slug}
        salonName={salon?.name}
        open={rewardsOpen}
        signedIn={Boolean(client)}
        onClose={() => setRewardsOpen(false)}
        onSignInRequest={() => {
          setRewardsOpen(false);
          requestMemberForm("signin");
        }}
        onJoinRequest={() => {
          setRewardsOpen(false);
          requestMemberForm("join");
        }}
      />
      <BookingProfile
        slug={slug}
        salonName={salon?.name}
        open={profileOpen}
        client={client}
        onClose={() => setProfileOpen(false)}
        onClientChange={onClientChange}
        onSignInRequest={() => requestMemberForm("signin")}
        onJoinRequest={() => requestMemberForm("join")}
      />
      <BookBottomNav
        active={activeTab}
        badge={{ visits: counts.upcoming, lookbook: counts.photos }}
        onSelect={selectTab}
      />
    </>
  );

  if (loading) {
    return <GoldLogoLoader size={80} label="Loading booking" />;
  }

  if (justBooked && !client) {
    const endsAt = new Date(
      new Date(justBooked.startsAt).getTime() +
        (justBooked.durationMin || selectedTotalMin || 30) * 60000
    );
    const start = new Date(justBooked.startsAt)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
    const end = endsAt
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `${justBooked.service} at ${salon?.name || "Salon"}`
    )}&dates=${start}/${end}&details=${encodeURIComponent(`with ${justBooked.stylist}`)}`;
    const when = new Date(justBooked.startsAt).toLocaleString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: salon?.timezone,
    });
    const timeOnly = new Date(justBooked.startsAt).toLocaleTimeString("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: salon?.timezone,
    });

    return (
      <div className="space-y-5 pb-24">
        <div
          data-testid="booking-confirmed"
          className="book-luxe-card rounded-2xl px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-display)] text-xl leading-tight">
                {justBooked.service}
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                with {justBooked.stylist}
                <LuxeCrown className="h-3.5 w-3.5 text-[#8a6a3e]" />
              </p>
              <div className="mt-3 space-y-1 border-t border-[#d4b483]/40 pt-2 text-sm">
                <p>{when}</p>
                <p>{timeOnly}</p>
              </div>
            </div>
            <span className="text-lg text-[#c9a87c]" aria-hidden>
              ›
            </span>
          </div>
          {stylePref?.imageBase64 ? (
            <div className="mt-3 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stylePref.imageBase64}
                alt=""
                className="h-12 w-12 rounded-lg object-cover ring-1 ring-[#d4b483]/45"
              />
              <p className="text-xs text-muted">
                Preferred look
                <span className="mt-0.5 block font-semibold">Shared with your stylist</span>
              </p>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              data-testid="booking-add-calendar"
              className="btn-solid inline-flex rounded-full px-3 py-1.5 text-xs font-semibold"
            >
              Add to calendar
            </a>
          </div>
        </div>

        {joinPrompt ? (
          <PostBookJoin
            slug={slug}
            name={name}
            phone={phone}
            email={email}
            onJoined={(c) => {
              onClientChange(c);
              setJoinPrompt(false);
              setJustBooked((prev) => prev);
              setMemberTab("visits");
              setShowBookings(true);
            }}
            onSkip={() => setJoinPrompt(false)}
          />
        ) : null}

        {appChrome}
      </div>
    );
  }

  return (
    <>
      <ClientMemberBar
        slug={slug}
        client={client}
        onClientChange={onClientChange}
        onOpenBookings={() => openMemberTab("visits")}
        onOpenProfile={() => setProfileOpen(true)}
        openSignInSignal={signInSignal}
        openSignInMode={signInMode}
      />

      {client ? (
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="book-luxe-member mb-4 w-full text-left"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[color:var(--champagne)]/55 font-[family-name:var(--font-display)] text-lg text-champagne">
            {client.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-muted">Member</span>
            <span className="block font-[family-name:var(--font-display)] text-xl leading-tight text-white">
              {client.name}
            </span>
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-champagne">
              <LuxeCrown className="h-3.5 w-3.5" />
              {memberTierLabel(memberTierFromPoints(loyaltyPoints))}
              <span aria-hidden>›</span>
            </span>
          </span>
          <MemberBadge tier={memberTierFromPoints(loyaltyPoints)} />
        </button>
      ) : null}

      <form onSubmit={submit} className="mt-5 space-y-8 pb-52">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((label, i) => {
            const reachable =
              i === 0 ||
              (i === 1 && serviceIds.length > 0) ||
              (i === 2 && stylistId) ||
              (i === 3 && startsAt) ||
              i < activeStep;
            return (
              <button
                key={label}
                type="button"
                disabled={!reachable && i > activeStep}
                onClick={() => {
                  if (i < activeStep) goToStep(i);
                }}
                className={`book-step ${
                  i === activeStep ? "is-active" : i < activeStep ? "is-done" : ""
                }`}
              >
                <span aria-hidden>{i < activeStep ? "✓" : i + 1}</span>
                {label}
              </button>
            );
          })}
        </div>

        <section className="space-y-4">
          <div className="text-center">
            <h2 className="book-luxe-title font-[family-name:var(--font-display)] text-3xl">
              Choose services
            </h2>
            <LuxeOrnament className="mx-auto mt-3 max-w-[11rem]" />
            <p className="book-luxe-kicker mt-3">
              Select services for a perfect experience
            </p>
          </div>
          {serviceGroups.map((group) => (
            <div key={group.key} className="space-y-2">
              <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg text-white">
                <LuxeSparkle className="h-3 w-3 text-champagne" />
                {group.label}
              </h3>
              <div className="grid gap-2">
                {group.items.map((s) => {
                  const selected = serviceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      aria-pressed={selected}
                      className={`book-luxe-card rounded-[1.15rem] px-3.5 py-3.5 text-left ${
                        selected ? "is-selected" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="book-luxe-service-icon" aria-hidden>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={serviceIconSrc(s.name)} alt="" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-[family-name:var(--font-display)] text-[1.05rem] leading-tight">
                            {s.name}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">
                            {s.durationMin} min
                          </span>
                        </span>
                        <span className="shrink-0 font-[family-name:var(--font-display)] text-[1.15rem]">
                          {formatCad(s.priceCents)}
                        </span>
                        <span
                          className={`book-luxe-radio ${selected ? "is-on" : ""}`}
                          aria-hidden
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {serviceIds.length > 0 ? (
            <p className="text-sm text-[#e0d0f5]">
              {serviceIds.length} selected · {selectedTotalMin} min ·{" "}
              {formatCad(selectedTotalCents)}
            </p>
          ) : null}
        </section>

        {serviceIds.length > 0 ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                Choose your provider
              </h2>
              <button
                type="button"
                className="text-xs font-semibold text-champagne underline-offset-2 hover:underline"
                onClick={() => goToStep(0)}
              >
                Change services
              </button>
            </div>
            {filteredStylists.length === 0 ? (
              <div className="book-card rounded-2xl px-4 py-5 text-sm text-muted">
                No provider is available for this selection yet.{" "}
                <button
                  type="button"
                  className="font-semibold text-champagne underline-offset-2 hover:underline"
                  onClick={() => goToStep(0)}
                >
                  Pick another service
                </button>
                , or refresh the page and try again.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setStylistId(ANY_STYLIST_ID);
                    setStartsAt("");
                  }}
                  className={`book-card rounded-2xl px-4 py-4 text-left sm:col-span-2 ${
                    stylistId === ANY_STYLIST_ID ? "is-selected" : ""
                  }`}
                >
                  <p className="font-semibold">Any available provider</p>
                  <p className="mt-1 text-sm text-muted">
                    We’ll match you to the first open chair for your time.
                  </p>
                </button>
                {filteredStylists.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setStylistId(s.id);
                      setStartsAt("");
                    }}
                    className={`book-card rounded-2xl px-4 py-4 text-left ${
                      stylistId === s.id ? "is-selected" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.photoUrl || "/avatars/stylist-neutral.svg"}
                        alt={`${s.name} photo`}
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[#e0d0f5]/35"
                      />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-[#e0d0f5]/50"
                            style={{ background: s.color }}
                            aria-hidden
                          />
                          {s.name}
                        </p>
                        {s.bio ? <p className="mt-1 text-sm text-muted">{s.bio}</p> : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {stylistId ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-2xl">Pick a time</h2>
              <button
                type="button"
                className="text-xs font-semibold text-champagne underline-offset-2 hover:underline"
                onClick={() => goToStep(1)}
              >
                Change stylist
              </button>
            </div>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => {
                const next = e.target.value;
                if (!next) return;
                setDate(next);
                setStartsAt("");
              }}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {
                  /* native icon still works */
                }
              }}
              className="w-full rounded-2xl border border-ink/15 px-4 py-3"
            />
            {slots.length > 0 ? (
              <button
                type="button"
                onClick={pickNextSlot}
                className="rounded-full border border-[rgba(201,180,232,0.4)] px-4 py-2 text-xs font-semibold text-[#e0d0f5]"
              >
                Next available ·{" "}
                {new Date(slots[0]).toLocaleTimeString("en-CA", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: salon?.timezone || "America/Toronto",
                })}
              </button>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {slots.length === 0 ? (
                <p className="text-sm text-muted">No open slots this day. Try another date.</p>
              ) : null}
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  data-slot-day={calendarDateInTz(
                    salon?.timezone || "America/Toronto",
                    new Date(slot)
                  )}
                  onClick={() => setStartsAt(slot)}
                  className={`book-slot rounded-full px-4 py-2.5 text-sm ${
                    startsAt === slot ? "is-selected" : ""
                  }`}
                >
                  {new Date(slot).toLocaleTimeString("en-CA", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: salon?.timezone || "America/Toronto",
                  })}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {startsAt ? (
          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Your details</h2>
            {client ? (
              <p className="text-sm text-[#e0d0f5]">
                Signed in as {client.name} — details filled for you.
              </p>
            ) : (
              <p className="text-sm text-muted">
                Booking as guest is fine. You can join anytime with email OTP.
              </p>
            )}
            <div className="book-card grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                Name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border px-3 py-2.5"
                  autoComplete="name"
                />
              </label>
              <label className="grid gap-1.5 text-sm">
                Phone
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl border px-3 py-2.5"
                  autoComplete="tel"
                  inputMode="tel"
                />
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                Email {client ? "" : "(recommended)"}
                <input
                  type="email"
                  required={saveAsMember && !client}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border px-3 py-2.5"
                  autoComplete="email"
                />
              </label>
              <label className="grid gap-1.5 text-sm sm:col-span-2">
                Notes for your stylist (optional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. haircut with head massage"
                  className="rounded-xl border px-3 py-2.5"
                />
              </label>
              {!client ? (
                <SettingToggle
                  label="Save my profile after booking"
                  description={`Email code — no password. Cancel free until ${CLIENT_CANCEL_HOURS}h before.`}
                  checked={saveAsMember}
                  onChange={setSaveAsMember}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}

        {(selectedServices.length > 0 ||
          selectedStylist ||
          stylistId === ANY_STYLIST_ID ||
          startsAt) && (
          <div className="book-sticky-summary">
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 text-sm">
                <p className="book-luxe-kicker flex items-center gap-2">
                  <span className="book-luxe-ornament__diamond" aria-hidden />
                  Running total
                </p>
                <p className="truncate text-xs text-muted">
                  {[
                    selectedServiceLabel || null,
                    stylistId === ANY_STYLIST_ID
                      ? "Any stylist"
                      : selectedStylist?.name,
                    startsAt
                      ? new Date(startsAt).toLocaleString("en-CA", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: salon?.timezone,
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {selectedServices.length > 0 ? (
                  <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-champagne">
                    {formatCad(selectedTotalCents)}
                    <span className="ml-2 text-xs font-sans tracking-normal text-muted">
                      {selectedTotalMin} min
                    </span>
                  </p>
                ) : null}
              </div>
              {startsAt ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-solid shrink-0 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {submitting ? "Booking…" : "Confirm reservation"}
                </button>
              ) : (
                <span className="text-xs text-muted">Keep going →</span>
              )}
            </div>
          </div>
        )}
      </form>

      {appChrome}
    </>
  );
}
