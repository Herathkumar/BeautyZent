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
import { StylePrefDraft, StylePreviewPanel } from "./StylePreviewPanel";
import { StylistLiveSchedule, StylistScheduleSheet } from "./StylistLiveSchedule";
import { clearStyleDraft, readStyleDraft, writeStyleDraft } from "./style-draft-storage";
import { SettingToggle } from "@/components/admin/SettingToggle";
import { GoldLogoLoader } from "@/components/GoldLogoSpin";
import { serviceIconSrc } from "@/lib/service-icons";
import {
  BookingConfirmedOverlay,
  BookingDateStrip,
  BookingStepper,
  BookingSummaryCard,
  formatBookingSummaryDate,
  formatBookingSummaryTime,
  LuxeContinueButton,
  LuxeStepContinueButton,
  LuxeCrown,
  LuxeOrnament,
  LuxeSparkle,
  LuxeStarRow,
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

export function BookingWizard({ slug, coverUrl }: { slug: string; coverUrl?: string }) {
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
  const [focusedStep, setFocusedStep] = useState(0);
  const [providerPickToken, setProviderPickToken] = useState(0);
  const [scheduleStylist, setScheduleStylist] = useState<Stylist | null>(null);
  const [bookQuote, setBookQuote] = useState<{
    catalogSubtotalCents: number;
    discountCents: number;
    discountLabel: string | null;
    chargedCents: number;
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
    if (client) setJoinPrompt(false);
  }, [client]);

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

  const salonTz = salon?.timezone || "America/Toronto";

  useEffect(() => {
    if (focusedStep !== 3 || serviceIds.length === 0) {
      setBookQuote(null);
      return;
    }
    let cancelled = false;
    const q = new URLSearchParams({ serviceIds: serviceIds.join(",") });
    fetch(`/api/public/${slug}/book/quote?${q}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setBookQuote(data?.quote ?? null);
      })
      .catch(() => {
        if (!cancelled) setBookQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [focusedStep, slug, serviceIds, client]);

  useEffect(() => {
    setFocusedStep((f) => Math.min(f, activeStep));
  }, [activeStep]);

  function advanceStep(next: number) {
    setFocusedStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleService(id: string) {
    setServiceIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next;
    });
    setStylistId("");
    setStartsAt("");
  }

  function goToStep(i: number) {
    setFocusedStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (focusedStep === 1) setProviderPickToken(0);
  }, [focusedStep]);

  function selectProvider(id: string) {
    setStylistId(id);
    setStartsAt("");
    if (focusedStep === 1) setProviderPickToken((t) => t + 1);
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
      const text = await res.text();
      const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      if (!res.ok) {
        const err = data.error;
        throw new Error(
          typeof err === "string"
            ? err
            : res.status === 409
              ? "That time was just taken. Pick another slot."
              : "Booking failed"
        );
      }
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
      setJoinPrompt(Boolean(!client && data.suggestJoin && saveAsMember && email));

      const booked = {
        id: data.appointment.id as string,
        stylist: data.appointment.stylist as string,
        service: data.appointment.service as string,
        startsAt: data.appointment.startsAt as string,
        priceCents: data.appointment.priceCents as number | undefined,
        durationMin: data.appointment.durationMin as number | undefined,
      };

      setJustBooked(booked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
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
        photoUrl={client?.photoUrl}
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
      <StylistScheduleSheet
        open={Boolean(scheduleStylist)}
        onClose={() => setScheduleStylist(null)}
        slug={slug}
        stylistId={scheduleStylist?.id || ""}
        stylistName={scheduleStylist?.name || ""}
        photoUrl={scheduleStylist?.photoUrl}
        bio={scheduleStylist?.bio}
        date={date || undefined}
        minDate={minDate}
        salonName={salon?.name}
        salonAddress={salon?.address}
        service={
          selectedServices[0]
            ? {
                name: selectedServiceLabel,
                durationMin: selectedTotalMin,
                priceCents: selectedTotalCents,
              }
            : null
        }
        serviceIds={serviceIds}
        onBook={(opts) => {
          if (!scheduleStylist) return;
          selectProvider(scheduleStylist.id);
          if (opts?.date) setDate(opts.date);
          if (opts?.startsAt) setStartsAt(opts.startsAt);
          setScheduleStylist(null);
          advanceStep(opts?.startsAt ? 3 : 2);
        }}
      />
    </>
  );

  if (loading) {
    return <GoldLogoLoader size={80} label="Loading booking" />;
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
          <span className="book-luxe-member__avatar shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={client.photoUrl || "/avatars/client-neutral.svg"}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
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

      <form onSubmit={submit} className="mt-5 space-y-6 pb-52">
        <BookingStepper
          steps={STEPS}
          activeIndex={focusedStep}
          onStepClick={(i) => {
            goToStep(i);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

        {focusedStep === 0 ? (
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
                <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg text-champagne">
                  <LuxeSparkle className="h-3 w-3" />
                  {group.label}
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                            <span className="block font-[family-name:var(--font-display)] text-[1.02rem] leading-tight">
                              {s.name}
                            </span>
                            <span className="mt-0.5 block text-sm text-muted">
                              {s.durationMin} min
                            </span>
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
              <p className="text-center text-sm text-muted">
                {serviceIds.length} selected · {selectedTotalMin} min ·{" "}
                {formatCad(selectedTotalCents)}
              </p>
            ) : null}
            <LuxeStepContinueButton
              fromLabel="Service"
              toLabel="Provider"
              ready={serviceIds.length > 0}
              onAdvance={() => advanceStep(1)}
              autoAdvance={false}
            />
          </section>
        ) : null}

        {focusedStep === 1 ? (
          <section className="space-y-4">
            <div className="text-center">
              <h2 className="book-luxe-title font-[family-name:var(--font-display)] text-3xl">
                Choose your provider
              </h2>
              <LuxeOrnament className="mx-auto mt-3 max-w-[11rem]" />
            </div>
            {filteredStylists.length === 0 ? (
              <div className="book-luxe-card rounded-2xl px-4 py-5 text-sm text-muted">
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
              <div className="grid gap-2.5">
                <button
                  type="button"
                  onClick={() => selectProvider(ANY_STYLIST_ID)}
                  className={`book-luxe-provider ${
                    stylistId === ANY_STYLIST_ID ? "is-selected" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--font-display)] text-lg text-champagne">
                        Any available provider
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        We&apos;ll match you to the first open chair for your time.
                      </p>
                    </div>
                    <span
                      className={`book-luxe-radio ${stylistId === ANY_STYLIST_ID ? "is-on" : ""}`}
                      aria-hidden
                    />
                  </div>
                </button>
                {filteredStylists.map((s) => {
                  const selected = stylistId === s.id;
                  return (
                    <div
                      key={s.id}
                      className={`book-luxe-provider ${selected ? "is-selected" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => selectProvider(s.id)}
                        className="flex w-full items-center gap-3 text-left"
                      >
                        <span className="book-luxe-glow-avatar shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={s.photoUrl || "/avatars/stylist-neutral.svg"}
                            alt=""
                            width={52}
                            height={52}
                            className="h-[3.25rem] w-[3.25rem] rounded-full object-cover"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-[family-name:var(--font-display)] text-lg text-champagne">
                            {s.name}
                          </span>
                          {s.bio ? (
                            <span className="mt-0.5 block text-sm text-muted">{s.bio}</span>
                          ) : null}
                          <LuxeStarRow className="mt-1.5" />
                        </span>
                        <span
                          className={`book-luxe-radio ${selected ? "is-on" : ""}`}
                          aria-hidden
                        />
                      </button>
                      <div className="mt-2 flex justify-end border-t border-[color:var(--line)] pt-2">
                        <button
                          type="button"
                          onClick={() => setScheduleStylist(s)}
                          className="text-xs font-semibold text-champagne underline-offset-2 hover:underline"
                          data-testid={`stylist-schedule-${s.id}`}
                        >
                          Live schedule
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <LuxeStepContinueButton
              fromLabel="Provider"
              toLabel="Time"
              ready={providerPickToken > 0}
              onAdvance={() => advanceStep(2)}
            />
          </section>
        ) : null}

        {focusedStep === 2 ? (
          <section className="space-y-4">
            <div className="text-center">
              <h2 className="book-luxe-title font-[family-name:var(--font-display)] text-3xl">
                Pick a time
              </h2>
              <LuxeOrnament className="mx-auto mt-3 max-w-[11rem]" />
              {selectedStylist ? (
                <p className="book-luxe-kicker mt-3">with {selectedStylist.name}</p>
              ) : stylistId === ANY_STYLIST_ID ? (
                <p className="book-luxe-kicker mt-3">Any available provider</p>
              ) : null}
            </div>
            {selectedStylist ? (
              <StylistLiveSchedule
                slug={slug}
                stylistId={selectedStylist.id}
                stylistName={selectedStylist.name}
                photoUrl={selectedStylist.photoUrl}
                bio={selectedStylist.bio}
                salonName={salon?.name}
                salonAddress={salon?.address}
                date={date}
                minDate={minDate}
                slots={slots}
                startsAt={startsAt}
                service={{
                  name: selectedServiceLabel || "Service",
                  durationMin: selectedTotalMin || 60,
                  priceCents: selectedTotalCents,
                }}
                onSelectDate={(next) => {
                  setDate(next);
                  setStartsAt("");
                }}
                onSelectSlot={setStartsAt}
                onContinue={() => advanceStep(3)}
                onEditService={() => goToStep(0)}
                showFooter
              />
            ) : (
              <>
                <BookingDateStrip
                  selected={date}
                  timeZone={salonTz}
                  minDate={minDate}
                  onSelect={(next) => {
                    setDate(next);
                    setStartsAt("");
                  }}
                />
                {slots.length === 0 ? (
                  <p className="text-center text-sm text-muted">
                    No open slots this day. Try another date.
                  </p>
                ) : (
                  <div className="book-luxe-slots">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        data-slot-day={calendarDateInTz(salonTz, new Date(slot))}
                        onClick={() => setStartsAt(slot)}
                        className={`book-slot rounded-xl px-2 py-2.5 text-xs sm:text-sm ${
                          startsAt === slot ? "is-selected" : ""
                        }`}
                      >
                        {new Date(slot).toLocaleTimeString("en-CA", {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: salonTz,
                        })}
                      </button>
                    ))}
                  </div>
                )}
                <LuxeStepContinueButton
                  fromLabel="Time"
                  toLabel="Details"
                  ready={Boolean(startsAt)}
                  onAdvance={() => advanceStep(3)}
                />
              </>
            )}
          </section>
        ) : null}

        {focusedStep === 3 ? (
          <section className="space-y-4">
            <BookingSummaryCard
              serviceLabel={selectedServiceLabel}
              servicePriceCents={selectedTotalCents}
              providerName={
                stylistId === ANY_STYLIST_ID
                  ? "Any available provider"
                  : selectedStylist?.name || "—"
              }
              dateLabel={formatBookingSummaryDate(date, salonTz)}
              timeLabel={
                startsAt ? formatBookingSummaryTime(startsAt, salonTz) : "—"
              }
              subtotalCents={bookQuote?.catalogSubtotalCents ?? selectedTotalCents}
              discountCents={bookQuote?.discountCents ?? 0}
              discountLabel={bookQuote?.discountLabel}
              memberTier={
                client && loyaltyPoints != null
                  ? memberTierLabel(memberTierFromPoints(loyaltyPoints))
                  : null
              }
              totalCents={bookQuote?.chargedCents ?? selectedTotalCents}
              notes={notes}
              onNotesChange={setNotes}
              stylePreview={
                <StylePreviewPanel
                  slug={slug}
                  isMember={Boolean(client)}
                  value={stylePref}
                  onChange={(next) => {
                    setStylePref(next);
                    writeStyleDraft(slug, next);
                  }}
                  variant="summary"
                />
              }
            />
            {client ? (
              <p className="text-center text-sm text-muted">
                Signed in as {client.name} — contact details on file.
              </p>
            ) : (
              <div className="book-luxe-summary-contact grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm">
                  Name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl border border-champagne/25 bg-transparent px-3 py-2.5"
                    autoComplete="name"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Phone
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl border border-champagne/25 bg-transparent px-3 py-2.5"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </label>
                <label className="grid gap-1.5 text-sm sm:col-span-2">
                  Email (recommended)
                  <input
                    type="email"
                    required={saveAsMember}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl border border-champagne/25 bg-transparent px-3 py-2.5"
                    autoComplete="email"
                  />
                </label>
                <SettingToggle
                  label="Save my profile after booking"
                  description={`Email code — no password. Cancel free until ${CLIENT_CANCEL_HOURS}h before.`}
                  checked={saveAsMember}
                  onChange={setSaveAsMember}
                />
              </div>
            )}
            <LuxeContinueButton
              type="submit"
              disabled={submitting || !startsAt || !name.trim() || !phone.trim()}
            >
              {submitting ? "Booking…" : "Confirm booking →"}
            </LuxeContinueButton>
          </section>
        ) : null}

        {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
      </form>

      {joinPrompt && !justBooked && !client ? (
        <PostBookJoin
          slug={slug}
          name={name}
          phone={phone}
          email={email}
          onJoined={(c) => {
            onClientChange(c);
            setJoinPrompt(false);
            setMemberTab("visits");
            setShowBookings(true);
          }}
          onSkip={() => setJoinPrompt(false)}
        />
      ) : null}

      {justBooked ? (
        <BookingConfirmedOverlay
          coverUrl={coverUrl}
          stylist={justBooked.stylist}
          startsAt={justBooked.startsAt}
          timeZone={salonTz}
          onViewAppointment={() => {
            setMemberTab("visits");
            setShowBookings(true);
            setProfileOpen(false);
            setRewardsOpen(false);
            setJustBooked(null);
          }}
          onBackHome={() => {
            setJustBooked(null);
            setFocusedStep(0);
            if (joinPrompt) {
              /* keep join prompt visible below */
            }
          }}
        />
      ) : null}

      {appChrome}
    </>
  );
}
