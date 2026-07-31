import Link from "next/link";
import { api, STORE_SLUG } from "@/lib/api";
import { formatMoney } from "@zentralab/shared";
import { AddButton } from "./AddButton";
import { Providers } from "./Providers";
import { CartBar } from "./CartBar";
import { ChatWidget } from "@/components/ChatWidget";

type Catalog = {
  store: { name: string; policies: string };
  products: Array<{
    id: string;
    sku: string;
    name: string;
    description: string | null;
    priceCents: number;
    available: number;
  }>;
};

export default async function HomePage() {
  let catalog: Catalog | null = null;
  let error = "";
  try {
    catalog = await api<Catalog>(`/api/storefront/${STORE_SLUG}/catalog`);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load catalog";
  }

  return (
    <Providers>
      <header className="bar">
        <div className="wrap bar-inner">
          <strong>
            Zentra<span style={{ color: "var(--accent)" }}>Lab</span>
          </strong>
          <CartBar />
        </div>
      </header>

      <main className="wrap">
        <section className="hero">
          <h1 className="brand">
            Zentra<span>Lab</span>
          </h1>
          <p>
            {catalog
              ? `${catalog.store.name} — gear in stock, ready for pickup.`
              : "Retail storefront powered by ZentraLab POS."}
          </p>
          <div className="cta">
            <a href="#catalog">
              <button>Shop catalog</button>
            </a>
            <Link href="/checkout">
              <button className="secondary">Checkout</button>
            </Link>
          </div>
        </section>

        <section className="section" id="catalog">
          <h2>Catalog</h2>
          <p className="muted">Live cloud inventory · reserved on checkout</p>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <div className="grid">
            {catalog?.products.map((p) => (
              <article key={p.id} className="item">
                <h3>{p.name}</h3>
                <div className="muted">{p.sku}</div>
                <p className="muted" style={{ minHeight: "2.5rem" }}>
                  {p.description}
                </p>
                <strong>{formatMoney(p.priceCents)}</strong>
                <div className="muted">
                  {p.available > 0 ? `${p.available} available` : "Out of stock"}
                </div>
                <AddButton product={p} />
              </article>
            ))}
          </div>
        </section>
      </main>
      <ChatWidget />
    </Providers>
  );
}
