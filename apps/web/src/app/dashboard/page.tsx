import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { formatMoney } from "@zentralab/shared";
import { available } from "@/lib/inventory";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [orders, inventory, conflicts] = await Promise.all([
    prisma.order.findMany({
      where: {
        storeId: session.storeId,
        createdAt: { gte: start },
      },
    }),
    prisma.inventory.findMany({
      where: { storeId: session.storeId },
      include: { product: true },
    }),
    prisma.syncConflict.count({
      where: { storeId: session.storeId, status: "open" },
    }),
  ]);

  const salesCents = orders
    .filter((o) => ["completed", "paid", "fulfilled"].includes(o.status))
    .reduce((s, o) => s + o.totalCents, 0);

  const low = inventory.filter(
    (i) => available(i.onHand, i.reserved) <= i.reorderPoint
  );

  return (
    <Shell userName={session.name}>
      <h1>Dashboard</h1>
      <p className="muted">Today&apos;s retail pulse for your store.</p>
      <div className="stats">
        <div className="stat">
          <strong>{formatMoney(salesCents)}</strong>
          <span>Sales today</span>
        </div>
        <div className="stat">
          <strong>{orders.filter((o) => o.channel === "pos").length}</strong>
          <span>POS orders</span>
        </div>
        <div className="stat">
          <strong>{orders.filter((o) => o.channel === "online").length}</strong>
          <span>Online orders</span>
        </div>
        <div className="stat">
          <strong>{conflicts}</strong>
          <span>Open sync conflicts</span>
        </div>
      </div>
      <div className="panel">
        <h2>Low stock</h2>
        {low.length === 0 ? (
          <p className="muted">All products above reorder point.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Available</th>
                <th>Reorder</th>
              </tr>
            </thead>
            <tbody>
              {low.map((i) => (
                <tr key={i.id}>
                  <td>{i.product.sku}</td>
                  <td>{i.product.name}</td>
                  <td>{available(i.onHand, i.reserved)}</td>
                  <td>{i.reorderPoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
