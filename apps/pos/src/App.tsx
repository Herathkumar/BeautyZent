import { useEffect, useMemo, useRef, useState } from "react";
import { calcTax, formatMoney } from "@zentralab/shared";
import type { SyncStatus } from "@zentralab/sync";
import { api, clearToken, setToken } from "./api";
import { db } from "./db";
import {
  completeSale,
  findProductByScan,
  hydrateFromServer,
  runSync,
  type CartLine,
} from "./sync";
import type { LocalProduct } from "@zentralab/sync";
import { InstallHint } from "./InstallHint";

type Tab = "sell" | "online" | "chat";

export function App() {
  const [token, setTok] = useState(localStorage.getItem("zl_token"));
  if (!token) {
    return (
      <Login
        onLogin={(t) => {
          setToken(t);
          setTok(t);
        }}
      />
    );
  }
  return (
    <PosShell
      onLogout={() => {
        clearToken();
        setTok(null);
      }}
    />
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("cashier@demo.store");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card" onSubmit={submit}>
        <h1 className="brand">
          Zentra<span>Lab</span> POS
        </h1>
        <p className="muted">Counter sales · barcode · offline ready</p>
        <div className="field">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        <button disabled={busy} type="submit">
          {busy ? "Signing in…" : "Open register"}
        </button>
      </form>
    </div>
  );
}

function PosShell({ onLogout }: { onLogout: () => void }) {
  const [status, setStatus] = useState<SyncStatus>(
    navigator.onLine ? "online" : "offline"
  );
  const [tab, setTab] = useState<Tab>("sell");
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [scan, setScan] = useState("");
  const [tender, setTender] = useState<"cash" | "card_external">("card_external");
  const [cashIn, setCashIn] = useState("");
  const [receipt, setReceipt] = useState("");
  const [message, setMessage] = useState("");
  const [onlineOrders, setOnlineOrders] = useState<Array<Record<string, unknown>>>([]);
  const scanRef = useRef<HTMLInputElement>(null);

  async function refreshLocal() {
    const ps = await db.products.filter((p) => p.active).toArray();
    const inv = await db.inventory.toArray();
    const map: Record<string, number> = {};
    for (const i of inv) map[i.productId] = i.onHand - i.reserved;
    setProducts(ps.sort((a, b) => a.name.localeCompare(b.name)));
    setInventoryMap(map);
    const oo = await db.onlineOrders.toArray();
    setOnlineOrders(oo);
  }

  useEffect(() => {
    (async () => {
      try {
        await hydrateFromServer();
        setStatus("online");
      } catch {
        setStatus(navigator.onLine ? "online" : "offline");
      }
      await refreshLocal();
    })();

    const on = () => {
      setStatus("online");
      runSync(setStatus).then(refreshLocal).catch(() => setStatus("offline"));
    };
    const off = () => setStatus("offline");
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const timer = setInterval(() => {
      if (navigator.onLine) {
        runSync(setStatus).then(refreshLocal).catch(() => undefined);
      }
    }, 15000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      clearInterval(timer);
    };
  }, []);

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const line of cart) {
      const lt = line.unitPriceCents * line.qty;
      subtotal += lt;
      tax += calcTax(lt, line.taxBps);
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [cart]);

  function addProduct(p: LocalProduct) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          sku: p.sku,
          name: p.name,
          qty: 1,
          unitPriceCents: p.priceCents,
          taxBps: p.taxBps,
        },
      ];
    });
    setMessage("");
  }

  async function onScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = scan.trim();
    if (!code) return;
    const product = await findProductByScan(code);
    if (!product) {
      setMessage(`No product for “${code}”`);
    } else {
      addProduct(product);
    }
    setScan("");
    scanRef.current?.focus();
  }

  async function checkout() {
    if (!cart.length) return;
    const amountTenderedCents =
      tender === "cash" && cashIn
        ? Math.round(Number(cashIn) * 100)
        : undefined;
    try {
      const result = await completeSale({
        lines: cart,
        tenderType: tender,
        amountTenderedCents,
      });
      setReceipt(result.receipt);
      setCart([]);
      setCashIn("");
      setMessage("Sale completed");
      await refreshLocal();
      if (navigator.onLine) setStatus("online");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sale failed");
    }
  }

  function printReceipt() {
    const w = window.open("", "_blank", "width=360,height=640");
    if (!w) return;
    w.document.write(`<pre style="font:14px monospace;padding:16px">${receipt}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  }

  async function syncNow() {
    try {
      const result = await runSync(setStatus);
      await refreshLocal();
      if (result.conflicts.length) {
        setMessage(`Synced with ${result.conflicts.length} conflict(s) — check Admin`);
      } else {
        setMessage("Synced");
      }
    } catch (err) {
      setStatus("offline");
      setMessage(err instanceof Error ? err.message : "Sync failed");
    }
  }

  async function fulfillOnline(id: string) {
    await api(`/api/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "fulfilled" }),
    });
    await runSync(setStatus);
    await refreshLocal();
  }

  return (
    <div className="shell">
      <InstallHint />
      <header className="topbar">
        <div>
          <strong className="brand" style={{ fontSize: "1.25rem" }}>
            Zentra<span>Lab</span> POS
          </strong>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {JSON.parse(localStorage.getItem("zl_store") || "{}").name}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className={`badge ${status}`}>{status}</span>
          <button className="secondary" onClick={syncNow}>
            Sync
          </button>
          <button className="secondary" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className="content">
        <section className={`panel panel-main${tab === "sell" ? " panel-catalog" : ""}`}>
          <div className="tabs">
            <button className={tab === "sell" ? "active" : "secondary"} onClick={() => setTab("sell")}>
              Sell
            </button>
            <button className={tab === "online" ? "active" : "secondary"} onClick={() => setTab("online")}>
              Online queue
            </button>
            <button className={tab === "chat" ? "active" : "secondary"} onClick={() => setTab("chat")}>
              AI Chat
            </button>
          </div>

          {tab === "sell" && (
            <>
              <form onSubmit={onScanSubmit}>
                <input
                  ref={scanRef}
                  className="scan"
                  autoFocus
                  placeholder="Scan barcode or type SKU / name"
                  value={scan}
                  onChange={(e) => setScan(e.target.value)}
                />
              </form>
              {message && <p className="muted message-banner">{message}</p>}
              <div className="products">
                {products.map((p) => (
                  <button key={p.id} className="product" onClick={() => addProduct(p)}>
                    <strong>{p.name}</strong>
                    <span className="muted">{p.sku}</span>
                    <div>{formatMoney(p.priceCents)}</div>
                    <div className="muted">Stock {inventoryMap[p.id] ?? 0}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === "online" && (
            <div>
              <h3>Online orders</h3>
              {onlineOrders.length === 0 && <p className="muted">No open online orders.</p>}
              {onlineOrders.map((o) => (
                <div key={String(o.id)} className="cart-line">
                  <div>
                    <strong>{String(o.customerName ?? "Customer")}</strong>
                    <div className="muted">
                      {String(o.status)} · {formatMoney(Number(o.totalCents ?? 0))}
                    </div>
                  </div>
                  <button onClick={() => fulfillOnline(String(o.id))}>Fulfill</button>
                </div>
              ))}
            </div>
          )}

          {tab === "chat" && <StaffChat />}
        </section>

        <aside className="panel">
          <h3>Cart</h3>
          {cart.length === 0 && <p className="muted">Scan or tap a product.</p>}
          {cart.map((line) => (
            <div className="cart-line" key={line.productId}>
              <div>
                <strong>{line.name}</strong>
                <div className="muted">{formatMoney(line.unitPriceCents)}</div>
              </div>
              <div className="muted">×{line.qty}</div>
              <button
                className="secondary"
                onClick={() =>
                  setCart((c) => c.filter((l) => l.productId !== line.productId))
                }
              >
                ✕
              </button>
            </div>
          ))}
          <div className="totals">
            <div>
              <span>Subtotal</span>
              <span>{formatMoney(totals.subtotal)}</span>
            </div>
            <div>
              <span>Tax</span>
              <span>{formatMoney(totals.tax)}</span>
            </div>
            <div className="grand">
              <span>Total</span>
              <span>{formatMoney(totals.total)}</span>
            </div>
          </div>
          <div className="field">
            <label>Tender</label>
            <select
              value={tender}
              onChange={(e) =>
                setTender(e.target.value as "cash" | "card_external")
              }
            >
              <option value="card_external">Card (external)</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          {tender === "cash" && (
            <div className="field">
              <label>Cash tendered ($)</label>
              <input
                value={cashIn}
                onChange={(e) => setCashIn(e.target.value)}
                placeholder={(totals.total / 100).toFixed(2)}
              />
            </div>
          )}
          <button disabled={!cart.length} onClick={checkout} style={{ width: "100%" }}>
            Complete sale
          </button>
          {receipt && (
            <div style={{ marginTop: "1rem" }}>
              <div className="receipt">{receipt}</div>
              <button className="secondary" style={{ marginTop: "0.5rem" }} onClick={printReceipt}>
                Print receipt
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StaffChat() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Ask about stock or today's sales." },
  ]);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<{ tool: string; args: Record<string, unknown> } | null>(null);

  async function send(confirmed = false) {
    const next = confirmed
      ? messages
      : [...messages, { role: "user" as const, content: input }];
    if (!confirmed) {
      setMessages(next);
      setInput("");
    }
    const data = await api<{
      message: { role: "assistant"; content: string };
      draftAction?: { tool: string; args: Record<string, unknown> };
    }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        role: "staff",
        messages: next,
        pendingAction:
          confirmed && draft ? { ...draft, confirmed: true } : undefined,
      }),
    });
    setMessages((m) => [...m, data.message]);
    setDraft(data.draftAction ?? null);
  }

  return (
    <div>
      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
      </div>
      {draft && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <button onClick={() => send(true)}>Confirm</button>
          <button className="secondary" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      )}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder='e.g. "low stock"'
        />
        <button onClick={() => send()}>Send</button>
      </div>
    </div>
  );
}
