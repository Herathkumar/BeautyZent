"use client";

import { useState } from "react";
import { api, STORE_SLUG } from "@/lib/api";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([
    {
      role: "assistant",
      content: "Hi! Ask about products, stock, hours, or an order status.",
    },
  ]);

  async function send() {
    if (!input.trim()) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(next);
    setInput("");
    try {
      const data = await api<{ message: { role: "assistant"; content: string } }>(
        "/api/ai/chat",
        {
          method: "POST",
          body: JSON.stringify({
            role: "customer",
            storeSlug: STORE_SLUG,
            messages: next,
          }),
        }
      );
      setMessages((m) => [...m, data.message]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Chat failed",
        },
      ]);
    }
  }

  if (!open) {
    return (
      <button
        className="chat-fab"
        style={{ width: "auto" }}
        onClick={() => setOpen(true)}
      >
        Chat with store
      </button>
    );
  }

  return (
    <div className="chat-fab panel">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Store assistant</strong>
        <button className="secondary" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything…"
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
