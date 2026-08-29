import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { businessTypeLabel } from "@/lib/marketplace";
import { formatCad } from "@/lib/money";
import { DAY_LABELS } from "../../salon-form";
import { PreviewReviewActions } from "./PreviewReviewActions";

export const dynamic = "force-dynamic";

function fmtWhen(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function missingOnboarding(salon: {
  description: string | null;
  coverUpdatedAt: Date | null;
  phone: string | null;
  address: string | null;
  city: string | null;
}) {
  const missing: string[] = [];
  if (!salon.coverUpdatedAt) missing.push("Cover photo");
  if (!salon.description?.trim()) missing.push("Description");
  if (!salon.phone?.trim()) missing.push("Phone");
  if (!salon.address?.trim()) missing.push("Street address");
  if (!salon.city?.trim()) missing.push("City");
  return missing;
}

export default async function SalonPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPlatformSession();
  if (!session) redirect("/platform/login");

  const { id } = await params;
  const salon = await prisma.salon.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      listingStatus: true,
      listingReviewNote: true,
      listingReviewedAt: true,
      businessType: true,
      city: true,
      region: true,
      country: true,
      description: true,
      phone: true,
      email: true,
      address: true,
      timezone: true,
      openHour: true,
      closeHour: true,
      closedDays: true,
      slotMinutes: true,
      coverUpdatedAt: true,
      claimedAt: true,
      approvedAt: true,
      createdAt: true,
      users: {
        orderBy: [{ role: "asc" }, { email: "asc" }],
        select: { id: true, name: true, email: true, role: true },
      },
      services: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, durationMin: true, priceCents: true, category: true },
        take: 16,
      },
      _count: { select: { stylists: true, services: true, appointments: true } },
    },
  });
  if (!salon) notFound();

  const missing = missingOnboarding(salon);
  const closed =
    salon.closedDays?.length
      ? salon.closedDays.map((d) => DAY_LABELS[d] ?? String(d)).join(", ")
      : "None";
  const coverUrl = salon.coverUpdatedAt
    ? `/api/public/cover/${salon.id}?t=${salon.coverUpdatedAt.getTime()}`
    : "";
  const place = [salon.city, salon.region, salon.country].filter(Boolean).join(", ");

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/platform" className="text-sm text-cocoa">
          ← All businesses
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
          Onboarding preview
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-ink">
          {salon.name}
        </h1>
        <code className="text-xs text-muted">/{salon.slug}</code>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${
            salon.listingStatus === "PUBLISHED"
              ? "bg-[#e7f0e6] text-[#3f6b43]"
              : salon.listingStatus === "DRAFT"
                ? "bg-[#f5efd8] text-[#7a6230]"
                : "bg-[#f2e6e2] text-[#8a4a37]"
          }`}
        >
          {salon.listingStatus}
        </span>
        <span className="text-xs text-muted">
          {businessTypeLabel(salon.businessType)}
          {place ? ` · ${place}` : ""}
        </span>
        <Link
          href={`/platform/salons/${salon.id}`}
          className="ml-auto rounded-full border border-ink/20 px-4 py-1.5 text-sm font-medium text-ink-soft hover:border-ink"
        >
          Configure
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-ink/12 bg-white/80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl || "/display-promo.jpg"}
          alt={`${salon.name} cover`}
          className="aspect-[16/9] w-full object-cover"
        />
      </div>

      {missing.length ? (
        <p className="rounded-2xl border border-[#7a6230]/25 bg-[#f5efd8] px-4 py-3 text-sm text-[#7a6230]">
          Incomplete: {missing.join(", ")}.
        </p>
      ) : null}

      {salon.listingReviewNote ? (
        <section className="rounded-3xl border border-[#8a4a37]/25 bg-[#f2e6e2] p-5 text-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a4a37]">
            Last review note
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-ink">{salon.listingReviewNote}</p>
          <p className="mt-2 text-xs text-muted">{fmtWhen(salon.listingReviewedAt)}</p>
        </section>
      ) : null}

      <section className="grid gap-3 rounded-3xl border border-ink/12 bg-white/80 p-5 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">
          Business details
        </h2>
        <dl className="grid gap-2 text-ink-soft">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Phone</dt>
            <dd>{salon.phone || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Email</dt>
            <dd className="break-all">{salon.email || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Address</dt>
            <dd className="text-right">{salon.address || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Hours</dt>
            <dd>
              {salon.openHour}:00–{salon.closeHour}:00 · {salon.slotMinutes} min slots
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Closed</dt>
            <dd>{closed}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Timezone</dt>
            <dd>{salon.timezone}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Claimed</dt>
            <dd>{fmtWhen(salon.claimedAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Approved</dt>
            <dd>{fmtWhen(salon.approvedAt)}</dd>
          </div>
        </dl>
        {salon.description ? (
          <p className="mt-1 whitespace-pre-wrap text-ink">{salon.description}</p>
        ) : (
          <p className="text-muted">No description submitted.</p>
        )}
      </section>

      <section className="grid gap-2 rounded-3xl border border-ink/12 bg-white/80 p-5 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">Owner login</h2>
        {salon.users.length === 0 ? (
          <p className="text-muted">No staff accounts yet.</p>
        ) : (
          <ul className="grid gap-1 text-ink-soft">
            {salon.users.map((user) => (
              <li key={user.id} className="flex flex-wrap justify-between gap-2">
                <span>
                  {user.name} · {user.email}
                </span>
                <span className="text-xs uppercase tracking-[0.12em] text-muted">{user.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-2 rounded-3xl border border-ink/12 bg-white/80 p-5 text-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-cocoa">
          Starter menu
        </h2>
        <p className="text-xs text-muted">
          {salon._count.stylists} providers · {salon._count.services} services ·{" "}
          {salon._count.appointments} bookings
        </p>
        {salon.services.length === 0 ? (
          <p className="text-muted">No services yet.</p>
        ) : (
          <ul className="grid gap-1 text-ink-soft">
            {salon.services.map((svc) => (
              <li key={svc.id} className="flex justify-between gap-3">
                <span>{svc.name}</span>
                <span className="text-muted">
                  {svc.durationMin} min · {formatCad(svc.priceCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PreviewReviewActions
        salonId={salon.id}
        listingStatus={salon.listingStatus}
        active={salon.active}
      />
    </div>
  );
}
