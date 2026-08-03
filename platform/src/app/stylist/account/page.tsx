"use client";

import { useEffect, useState } from "react";

export default function StylistAccountPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/stylist/account")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/stylist/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.user) return;
        setEmail(data.user.email || "");
        setName(data.user.name || "");
      });
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/stylist/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        email,
        name,
        newPassword: newPassword || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not update");
      return;
    }
    setMessage(data.message || "Updated.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    if (data.user?.email) setEmail(data.user.email);
    if (data.user?.name) setName(data.user.name);
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Account</h1>
        <p className="mt-2 text-muted">
          Change your login email and password. Use these on your phone next time you open My Day.
        </p>
      </div>

      <form onSubmit={onSave} className="grid gap-4 rounded-2xl border border-ink/15 bg-cream p-4">
        <label className="grid gap-1.5 text-sm">
          Display name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          Login email / username
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          Current password
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          New password (optional)
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
          />
        </label>

        {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
        {message ? <p className="text-sm text-champagne">{message}</p> : null}

        <button type="submit" disabled={saving} className="stylist-tap btn-solid rounded-2xl">
          {saving ? "Saving…" : "Save login"}
        </button>
      </form>
    </main>
  );
}
