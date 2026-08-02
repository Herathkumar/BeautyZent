import Link from "next/link";
import { prisma } from "@/lib/prisma";
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
      <main className="mx-auto max-w-lg px-6 py-20">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Salon not found</h1>
        <Link href="/" className="mt-4 inline-block text-cocoa">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← SalonBook
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          {salon.name}
        </h1>
        <p className="mt-2 text-muted">
          Book online — pick your stylist and time. No app download needed.
        </p>
        {salon.address && <p className="mt-1 text-sm text-muted">{salon.address}</p>}
      </div>
      <BookingWizard slug={slug} />
    </main>
  );
}
