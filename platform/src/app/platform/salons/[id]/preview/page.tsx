import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { businessTypeLabel } from "@/lib/marketplace";
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

function formatHour(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatPrice(cents: number) {
  if (cents % 100 === 0) return `$${cents / 100}`;
  return `$${(cents / 100).toFixed(2)}`;
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

function houseStatus(salon: { listingStatus: string; active: boolean }) {
  if (salon.listingStatus === "DRAFT") return { id: "review", label: "In review" } as const;
  if (!salon.active) return { id: "paused", label: "Paused" } as const;
  if (salon.listingStatus === "PUBLISHED") return { id: "live", label: "Live" } as const;
  return { id: "draft", label: "Draft" } as const;
}

const CATEGORY_BADGE: Record<string, string> = {
  SALON: "HAIR",
  BARBER: "BARBER",
  SPA: "SPA",
  NAILS: "NAILS",
  OTHER: "BEAUTY",
  MEDSPA: "MEDSPA",
  SKIN: "SKIN",
  MAKEUP: "MAKEUP",
  WELLNESS: "WELLNESS",
};

export default async function SalonPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPlatformSession();
  if (!session) redirect("/explore");

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
      coverMime: true,
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
  const coverUrl =
    salon.coverUpdatedAt || salon.coverMime
      ? `/api/public/cover/${salon.id}?t=${salon.coverUpdatedAt?.getTime() ?? 0}`
      : "/display-promo.jpg";
  const place = [salon.city, salon.region, salon.country].filter(Boolean).join(", ");
  const status = houseStatus(salon);
  const category =
    CATEGORY_BADGE[String(salon.businessType || "").toUpperCase()] ||
    businessTypeLabel(salon.businessType).toUpperCase();

  return (
    <div className="platform-luxe__preview">
      <div>
        <Link href="/platform" className="platform-luxe__back">
          ← Houses
        </Link>
        <div className="platform-luxe__preview-top">
          <div>
            <p className="platform-luxe__section-label" style={{ marginTop: "0.85rem" }}>
              Preview
            </p>
            <h1 className="platform-luxe__form-title">{salon.name}</h1>
            <p className="platform-luxe__slug" style={{ marginTop: "0.35rem" }}>
              /explore/{salon.slug}
            </p>
            <div className="platform-luxe__preview-meta">
              <span className="platform-luxe__category">{category}</span>
              <span
                className={`platform-luxe__status platform-luxe__status--${
                  status.id === "review" ? "review" : status.id
                }`}
              >
                {status.label}
              </span>
              {place ? <p className="platform-luxe__preview-place">{place}</p> : null}
            </div>
          </div>
          <Link href={`/platform/salons/${salon.id}`} className="platform-luxe__btn-ghost">
            Configure
          </Link>
        </div>
      </div>

      <div className="platform-luxe__preview-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt={`${salon.name} cover`} />
      </div>

      {missing.length ? (
        <p className="platform-luxe__preview-warn">Incomplete: {missing.join(", ")}.</p>
      ) : null}

      {salon.listingReviewNote ? (
        <section className="platform-luxe__preview-note">
          <h2 className="platform-luxe__preview-note-title">Last review note</h2>
          <p className="platform-luxe__preview-note-body">{salon.listingReviewNote}</p>
          <p className="platform-luxe__preview-note-when">{fmtWhen(salon.listingReviewedAt)}</p>
        </section>
      ) : null}

      <section className="platform-luxe__preview-card">
        <h2 className="platform-luxe__section-label">— House details</h2>
        <dl className="platform-luxe__preview-dl">
          <div>
            <dt>Phone</dt>
            <dd>{salon.phone || "—"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{salon.email || "—"}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{salon.address || "—"}</dd>
          </div>
          <div>
            <dt>Hours</dt>
            <dd>
              {formatHour(salon.openHour)} – {formatHour(salon.closeHour)} · {salon.slotMinutes}{" "}
              min slots
            </dd>
          </div>
          <div>
            <dt>Closed</dt>
            <dd>{closed}</dd>
          </div>
          <div>
            <dt>Timezone</dt>
            <dd>{salon.timezone}</dd>
          </div>
          <div>
            <dt>Claimed</dt>
            <dd>{fmtWhen(salon.claimedAt)}</dd>
          </div>
          <div>
            <dt>Approved</dt>
            <dd>{fmtWhen(salon.approvedAt)}</dd>
          </div>
        </dl>
        {salon.description ? (
          <p className="platform-luxe__preview-desc">{salon.description}</p>
        ) : (
          <p className="platform-luxe__preview-muted">No description submitted.</p>
        )}
      </section>

      <section className="platform-luxe__preview-card">
        <h2 className="platform-luxe__section-label">— Owner login</h2>
        {salon.users.length === 0 ? (
          <p className="platform-luxe__preview-muted">No staff accounts yet.</p>
        ) : (
          <ul className="platform-luxe__preview-list">
            {salon.users.map((user) => (
              <li key={user.id}>
                <span>
                  {user.name} · {user.email}
                </span>
                <span className="platform-luxe__preview-role">{user.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="platform-luxe__preview-card">
        <h2 className="platform-luxe__section-label">— Services</h2>
        <p className="platform-luxe__preview-muted">
          {salon._count.stylists} provider{salon._count.stylists === 1 ? "" : "s"} ·{" "}
          {salon._count.services} service{salon._count.services === 1 ? "" : "s"} ·{" "}
          {salon._count.appointments} booking{salon._count.appointments === 1 ? "" : "s"}
        </p>
        {salon.services.length === 0 ? (
          <p className="platform-luxe__preview-muted">No services yet.</p>
        ) : (
          <ul className="platform-luxe__preview-list">
            {salon.services.map((svc) => (
              <li key={svc.id}>
                <span>{svc.name}</span>
                <span className="meta">
                  {svc.durationMin} min · {formatPrice(svc.priceCents)}
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
