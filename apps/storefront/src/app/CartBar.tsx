"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatMoney } from "@zentralab/shared";

export function CartBar() {
  const cart = useCart();
  return (
    <Link href="/checkout">
      <button className="secondary">
        Cart ({cart.count}) · {formatMoney(cart.subtotal)}
      </button>
    </Link>
  );
}
