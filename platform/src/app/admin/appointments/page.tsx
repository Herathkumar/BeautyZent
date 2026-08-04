"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Appt = {
  id: string;
  startsAt: string;
  status: string;
  source: string;
  notes: string | null;
  calendarSyncedAt: string | null;
  client: { name: string; phone: string | null };
  service: { name: string };
  stylist: { name: string };
};

export default function AppointmentsAdminPage() {
  const [appointments, setAppointments] = useState<Appt[]>([]);

  useEffect(() => {
    fetch("/api/admin/appointments?days=14")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setAppointments(data.appointments || []);
      });
  }, []);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Bookings</h1>
          <p className="text-muted">Next 14 days across all stylists.</p>
        </div>
        <Link href="/admin/book" className="btn-solid rounded-full px-4 py-2.5 text-sm">
          Book for client
        </Link>
      </div>
      <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-cream">
        {appointments.length === 0 && (
          <p className="px-4 py-8 text-muted">No upcoming bookings yet.</p>
        )}
        {appointments.map((a) => (
          <div key={a.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr_auto]">
            <div>
              <p className="font-medium">
                {new Date(a.startsAt).toLocaleString("en-CA", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-muted uppercase">{a.status} · {a.source}</p>
            </div>
            <div>
              <p className="font-medium">{a.client.name}</p>
              <p className="text-sm text-muted">
                {a.service.name} with {a.stylist.name}
                {a.client.phone ? ` · ${a.client.phone}` : ""}
              </p>
              {a.notes ? (
                <p className="mt-1 text-sm text-cocoa">
                  <span className="font-semibold">Note:</span> {a.notes}
                </p>
              ) : null}
            </div>
            <p className="text-xs text-muted">
              {a.calendarSyncedAt ? "Calendar synced" : "Calendar pending"}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
