"use client";

import { useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatPanel({
  role,
  storeSlug,
  authToken,
}: {
  role: "customer" | "staff";
  storeSlug?: string;
  authToken?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        role === "staff"
          ? "Staff assistant ready. Ask about stock, low stock, or today's sales."
          : "Hi! Ask about products, stock, store hours, or order status.",
    },
  ]);
  const [input, setInput] = useState("");
  const [draftAction, setDraftAction] = useState<{
    tool: string;
    args: Record<string, unknown>;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(confirmed?: boolean) {
    if (!input.trim() && !confirmed) return;
    const nextMessages = confirmed
      ? messages
      : [...messages, { role: "user" as const, content: input.trim() }];
    if (!confirmed) {
      setMessages(nextMessages);
      setInput("");
    }
    setBusy(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/ai/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            role,
            storeSlug,
            messages: nextMessages,
            pendingAction: confirmed && draftAction
              ? { ...draftAction, confirmed: true }
              : undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");
      setMessages((m) => [...m, data.message]);
      setDraftAction(data.draftAction ?? null);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Chat failed",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>AI ChatBot</h2>
      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
      </div>
      {draftAction && (
        <div className="row" style={{ marginBottom: "0.75rem" }}>
          <span className="badge warn">Confirmation required</span>
          <button className="btn" disabled={busy} onClick={() => send(true)}>
            Confirm action
          </button>
          <button
            className="btn secondary"
            onClick={() => setDraftAction(null)}
          >
            Cancel
          </button>
        </div>
      )}
      <div className="row">
        <input
          style={{ flex: 1, minWidth: 200 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={
            role === "staff"
              ? 'e.g. "how many USB-C-HUB left?"'
              : 'e.g. "is MSE-WL in stock?"'
          }
        />
        <button className="btn" disabled={busy} onClick={() => send()}>
          Send
        </button>
      </div>
    </div>
  );
}
