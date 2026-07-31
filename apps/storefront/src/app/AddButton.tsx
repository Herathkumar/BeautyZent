"use client";

import { useCart } from "@/lib/cart";

export function AddButton({
  product,
}: {
  product: {
    id: string;
    name: string;
    sku: string;
    priceCents: number;
    available: number;
  };
}) {
  const cart = useCart();
  return (
    <button
      disabled={product.available <= 0}
      onClick={() =>
        cart.add({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          priceCents: product.priceCents,
          available: product.available,
        })
      }
    >
      Add to cart
    </button>
  );
}
