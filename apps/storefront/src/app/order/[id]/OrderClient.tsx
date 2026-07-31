"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@zentralab/shared";
import { api } from "@/lib/api";
import { ChatWidget } from "@/components/ChatWidget";

export function OrderClient({ orderId }: { orderId: string }) {
  const search = useSearchParams();
  const email = search.get("email") ?? "";
  const [order, setOrder] = useState<{
    id: string;
    status: string;
    totalCents: number;
    taxCents: number;
    subtotalCents: number;
    customerName: string | null;
    storeName: string;
    lines: Array<{ qty: number; name: string; lineTotalCents: number }>;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId || !email) {
      setError("Order id and email are required.");
      return;
    }
    api<{ order: NonNullable<typeof order> }>("/api/storefront/order-status", {
      method: "POST",
      body: JSON.stringify({ orderId, email }),
    })
      .then((d) => setOrder(d.order))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [orderId, email]);

  return (
    <main className="wrap section">
      <Link href="/" className="muted">
        ← Store
      </Link>
      <h2>Order status</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {order && (
        <div className="panel">
          <p>
            <strong>{order.storeName}</strong>
          </p>
          <p>
            Order <code>{order.id}</code>
          </p>
          <p>
            Status: <strong>{order.status}</strong>
          </p>
          <p>Customer: {order.customerName}</p>
          <ul>
            {order.lines.map((l, i) => (
              <li key={i}>
                {l.qty}× {l.name} — {formatMoney(l.lineTotalCents)}
              </li>
            ))}
          </ul>
          <p>Subtotal {formatMoney(order.subtotalCents)}</p>
          <p>Tax {formatMoney(order.taxCents)}</p>
          <p>
            <strong>Total {formatMoney(order.totalCents)}</strong>
          </p>
        </div>
      )}
      <ChatWidget />
    </main>
  );
}
