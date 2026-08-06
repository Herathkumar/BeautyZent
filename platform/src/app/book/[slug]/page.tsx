import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ZentraLabFooter } from "@/components/ZentraLabFooter";
import { BookingWizard } from "./BookingWizard";

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });

  if (!salon) {
    return (
      <main className="book-theme mx-auto px-6 py-20">
        <div className="mx-auto max-w-lg">
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Salon not found</h1>
          <Link href="/" className="mt-4 inline-block text-champagne">
            Back home
          </Link>
          <ZentraLabFooter compact />
        </div>
      </main>
    );
  }

  return (
    <main className="book-theme flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-8 pt-6 sm:px-6">
        <section className="book-hero relative mb-5 overflow-hidden rounded-3xl">
          <div className="book-hero-media absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/display-promo.jpg"
              alt=""
              className="book-hero-img h-full w-full object-cover"
            />
            <div className="book-hero-overlay absolute inset-0" />
          </div>
          <div className="relative space-y-2 px-5 py-5 sm:px-7 sm:py-6">
            <p className="book-hero-kicker text-xs font-semibold tracking-[0.22em] uppercase">
              Book your visit
            </p>
            <h1 className="book-hero-title font-[family-name:var(--font-display)] text-3xl leading-none sm:text-4xl">
              {salon.name}
            </h1>
            <p className="book-hero-copy max-w-xl text-sm sm:text-base">
              Guest or member — pick a service, stylist, and time. No app needed.
            </p>
            {(salon.phone || salon.address) && (
              <p className="book-hero-meta text-xs sm:text-sm">
                {salon.phone}
                {salon.phone && salon.address ? " · " : ""}
                {salon.address}
              </p>
            )}
          </div>
        </section>

        <BookingWizard slug={slug} />
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <ZentraLabFooter compact />
      </div>
    </main>
  );
}
