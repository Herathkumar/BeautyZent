import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { formatMoney } from "@zentralab/shared";
import { OrderActions } from "./OrderActions";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { storeId: session.storeId },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <Shell userName={session.name}>
      <h1>Orders</h1>
      <p className="muted">POS sales and online order queue.</p>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Lines</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
                <td>
                  <span className="badge">{o.channel}</span>
                </td>
                <td>{o.status}</td>
                <td>{o.customerName ?? "—"}</td>
                <td>{formatMoney(o.totalCents)}</td>
                <td>
                  {o.lines.map((l) => (
                    <div key={l.id}>
                      {l.qty}× {l.name}
                    </div>
                  ))}
                </td>
                <td>
                  <OrderActions
                    orderId={o.id}
                    status={o.status}
                    channel={o.channel}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
