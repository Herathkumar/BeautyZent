"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@zentralab/shared";
import { Providers } from "../Providers";
import { useCart } from "@/lib/cart";
import { api, STORE_SLUG } from "@/lib/api";
import { ChatWidget } from "@/components/ChatWidget";

function CheckoutInner() {
  const cart = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ checkoutUrl: string; orderId: string }>(
        "/api/storefront/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            storeSlug: STORE_SLUG,
            customerName: name,
            customerEmail: email,
            lines: cart.items.map((i) => ({
              productId: i.productId,
              qty: i.qty,
            })),
          }),
        }
      );
      cart.clear();
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  return (
    <main className="wrap section">
      <Link href="/" className="muted">
        ← Back to catalog
      </Link>
      <h2>Checkout</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1rem" }}>
        <form className="panel" onSubmit={placeOrder}>
          <div className="field">
            <label>Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <button disabled={busy || cart.items.length === 0} type="submit">
            {busy ? "Placing order…" : "Place order"}
          </button>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Demo mode marks orders paid without Stripe when no key is configured.
          </p>
        </form>
        <aside className="cart-panel">
          <h3>Cart</h3>
          {cart.items.length === 0 && <p className="muted">Your cart is empty.</p>}
          {cart.items.map((i) => (
            <div
              key={i.productId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <div>
                <strong>{i.name}</strong>
                <div className="muted">
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => cart.setQty(i.productId, i.qty - 1)}
                  >
                    -
                  </button>{" "}
                  {i.qty}{" "}
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => cart.setQty(i.productId, i.qty + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div>{formatMoney(i.priceCents * i.qty)}</div>
            </div>
          ))}
          <strong>Subtotal {formatMoney(cart.subtotal)}</strong>
          <p className="muted">Tax calculated at reservation.</p>
        </aside>
      </div>
      <ChatWidget />
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Providers>
      <CheckoutInner />
    </Providers>
  );
}
