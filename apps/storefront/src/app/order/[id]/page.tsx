import { Suspense } from "react";
import { OrderClient } from "./OrderClient";

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<main className="wrap section">Loading order…</main>}>
      <OrderClient orderId={id} />
    </Suspense>
  );
}
