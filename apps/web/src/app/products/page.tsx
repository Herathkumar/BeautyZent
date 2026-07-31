import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { formatMoney } from "@zentralab/shared";
import { ProductForm } from "./ProductForm";
import { StockAdjustForm } from "./StockAdjustForm";

export default async function ProductsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const products = await prisma.product.findMany({
    where: { storeId: session.storeId },
    include: { inventory: true },
    orderBy: { name: "asc" },
  });

  return (
    <Shell userName={session.name}>
      <h1>Products & inventory</h1>
      <div className="grid-2">
        <div className="panel">
          <h2>Catalog</h2>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Barcode</th>
                <th>Name</th>
                <th>Price</th>
                <th>On hand</th>
                <th>Reserved</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.barcode}</td>
                  <td>{p.name}</td>
                  <td>{formatMoney(p.priceCents)}</td>
                  <td>{p.inventory?.onHand ?? 0}</td>
                  <td>{p.inventory?.reserved ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <ProductForm />
          <div style={{ height: "1rem" }} />
          <StockAdjustForm
            products={products.map((p) => ({
              id: p.id,
              label: `${p.sku} — ${p.name}`,
            }))}
          />
        </div>
      </div>
    </Shell>
  );
}
