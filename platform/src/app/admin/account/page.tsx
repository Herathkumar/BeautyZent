"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/account")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/admin/login";
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not update password");
      return;
    }
    setMessage(data.message || "Password updated.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <main className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-[#c9a87c] uppercase">
          Account
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#fffaf6]">
          Change password
        </h1>
        <p className="mt-2 text-[#d4c4b0]">
          Update the admin login password for this salon.
        </p>
      </div>

      <div className="rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-4 text-sm text-[#d4c4b0]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p>
              Signed in as{" "}
              <span className="font-semibold text-[#f0c987]">{name || "Admin"}</span>
            </p>
            <p className="mt-1 break-all font-mono text-[#f0c987]">{email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-full border border-[#c9a87c]/45 px-4 py-2 text-sm font-semibold text-[#f0c987] hover:bg-[#c9a87c]/10"
          >
            Log out
          </button>
        </div>
      </div>

      <form
        onSubmit={onSave}
        className="grid gap-4 rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-5"
      >
        <label className="grid gap-1.5 text-sm text-[#d4c4b0]">
          Current password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
          />
        </label>
        <label className="grid gap-1.5 text-sm text-[#d4c4b0]">
          New password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
          />
        </label>
        <label className="grid gap-1.5 text-sm text-[#d4c4b0]">
          Confirm new password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
          />
        </label>

        {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
        {message ? <p className="text-sm text-[#9fe3b8]">{message}</p> : null}

        <button type="submit" disabled={saving} className="btn-solid rounded-full px-5 py-3">
          {saving ? "Saving…" : "Update password"}
        </button>
      </form>
    </main>
  );
}
