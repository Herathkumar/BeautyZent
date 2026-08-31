import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BookMarketNav } from "./BookMarketNav";
import { BookingWizard } from "./BookingWizard";
import { LuxeKickerLined, LuxeOrnament } from "./luxe";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;
  const fromExplore = from === "explore";
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, coverUpdatedAt: true },
  });

  if (!salon) {
    return (
      <main className="book-theme mx-auto px-6 py-20">
        <div className="mx-auto max-w-lg">
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Business not found</h1>
          <Link href="/explore" className="mt-4 inline-block text-champagne">
            Explore businesses
          </Link>
        </div>
      </main>
    );
  }

  const coverUrl = salon.coverUpdatedAt
    ? `/api/public/cover/${salon.id}?t=${salon.coverUpdatedAt.getTime()}`
    : "/display-promo.jpg";

  return (
    <main className="book-theme flex min-h-screen flex-col">
      <BookMarketNav fromExplore={fromExplore} />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-[calc(var(--book-nav-h)+0.5rem)] pt-4 sm:px-6">
        <section className="book-home-cover mb-5" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverUrl} alt="" />
        </section>

        <header className="mb-5 text-center">
          <LuxeKickerLined>Book your visit</LuxeKickerLined>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-[1.85rem] leading-none text-white sm:text-4xl">
            {salon.name}
          </h1>
          <LuxeOrnament className="mx-auto mt-3 max-w-[9rem]" />
        </header>

        <BookingWizard slug={slug} />
      </div>
    </main>
  );
}
