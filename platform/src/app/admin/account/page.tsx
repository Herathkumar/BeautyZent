"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MANAGER_DEFAULT_AVATAR } from "@/lib/manager-photo";

function hourLabel(h: number) {
  if (h === 0 || h === 24) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that photo. Try another selfie."));
      el.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function fileToJpegDataUrl(file: File, maxSize = 480): Promise<string> {
  let width = 0;
  let height = 0;
  let source: CanvasImageSource;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      source = bitmap;
    } catch {
      const img = await loadImageElement(file);
      width = img.naturalWidth;
      height = img.naturalHeight;
      source = img;
    }
  } else {
    const img = await loadImageElement(file);
    width = img.naturalWidth;
    height = img.naturalHeight;
    source = img;
  }

  if (!width || !height) throw new Error("Could not process photo");
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process photo");
  ctx.drawImage(source, 0, 0, w, h);
  if ("close" in source && typeof source.close === "function") source.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

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
  const [openHour, setOpenHour] = useState(9);
  const [closeHour, setCloseHour] = useState(18);
  const [hoursMsg, setHoursMsg] = useState("");
  const [hoursError, setHoursError] = useState("");
  const [savingHours, setSavingHours] = useState(false);

  const [photoUrl, setPhotoUrl] = useState(MANAGER_DEFAULT_AVATAR);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/account")
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = "/manager/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.user) return;
        setEmail(data.user.email || "");
        setName(data.user.name || "");
      });
    fetch("/api/admin/salon")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.salon) return;
        setOpenHour(data.salon.openHour);
        setCloseHour(data.salon.closeHour);
      });
    fetch("/api/admin/photo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.user) return;
        setPhotoUrl(data.user.photoUrl);
        setHasPhoto(Boolean(data.user.hasPhoto));
      });
  }, []);

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setPhotoError("");
    setPhotoMessage("");
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToJpegDataUrl(file);
      const res = await fetch("/api/admin/photo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPhotoUrl(data.user.photoUrl);
      setHasPhoto(true);
      setPhotoMessage("Selfie saved.");
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Could not save photo");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoError("");
    const res = await fetch("/api/admin/photo", { method: "DELETE" });
    const data = await res.json();
    setPhotoBusy(false);
    if (!res.ok) {
      setPhotoError(data.error || "Could not remove photo");
      return;
    }
    setPhotoUrl(data.user.photoUrl);
    setHasPhoto(false);
    setPhotoMessage(data.message || "Photo removed.");
  }

  async function onSaveHours(e: React.FormEvent) {
    e.preventDefault();
    setHoursError("");
    setHoursMsg("");
    setSavingHours(true);
    const res = await fetch("/api/admin/salon", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openHour, closeHour }),
    });
    const data = await res.json();
    setSavingHours(false);
    if (!res.ok) {
      setHoursError(data.error || "Could not save store hours");
      return;
    }
    setHoursMsg(data.message || "Store hours saved.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/manager/login");
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
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#fffaf6]">
          Account
        </h1>
        <p className="mt-2 text-[#d4c4b0]">
          Update your photo, store hours, and login password for this salon.
        </p>
      </div>

      <div className="rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-4 text-sm text-[#d4c4b0]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p>
              Signed in as{" "}
              <span className="font-semibold text-[#f0c987]">{name || "Manager"}</span>
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

      <section className="grid gap-4 rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#fffaf6]">
            Profile photo
          </h2>
          <p className="mt-1 text-sm text-[#d4c4b0]">
            Shown on your account. Before a selfie, we show a generic avatar.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Your profile photo"
            width={96}
            height={96}
            data-testid="manager-photo-preview"
            className="h-24 w-24 rounded-full object-cover ring-2 ring-[#c9a87c]/40"
          />
          <div className="grid gap-1 text-sm text-[#d4c4b0]">
            <p>{hasPhoto ? "Your selfie" : "Generic avatar"}</p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          data-testid="manager-selfie-input"
          onChange={(e) => onPickPhoto(e.target.files?.[0] || null)}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={photoBusy}
            className="btn-solid rounded-full px-5 py-3"
            onClick={() => fileRef.current?.click()}
          >
            {photoBusy ? "Saving…" : hasPhoto ? "Retake selfie" : "Take selfie"}
          </button>
          {hasPhoto ? (
            <button
              type="button"
              disabled={photoBusy}
              className="rounded-full border border-[#c9a87c]/45 px-5 py-3 text-sm font-semibold text-[#f0c987] hover:bg-[#c9a87c]/10"
              onClick={removePhoto}
            >
              Use avatar instead
            </button>
          ) : null}
        </div>
        {photoError ? <p className="text-sm text-[#f5a8a8]">{photoError}</p> : null}
        {photoMessage ? <p className="text-sm text-[#9fe3b8]">{photoMessage}</p> : null}
      </section>

      <form
        onSubmit={onSaveHours}
        className="grid gap-4 rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-5"
        data-testid="store-hours-form"
      >
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#fffaf6]">
            Store regular hours
          </h2>
          <p className="mt-1 text-sm text-[#d4c4b0]">
            Default open/close for new stylists. Existing stylist schedules stay as set.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm text-[#d4c4b0]">
            Opens
            <select
              value={openHour}
              onChange={(e) => setOpenHour(Number(e.target.value))}
              aria-label="Store open hour"
              className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-[#d4c4b0]">
            Closes
            <select
              value={closeHour}
              onChange={(e) => setCloseHour(Number(e.target.value))}
              aria-label="Store close hour"
              className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
            >
              {Array.from({ length: 24 }, (_, i) => {
                const h = i + 1;
                return (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        {hoursError ? <p className="text-sm text-[#f5a8a8]">{hoursError}</p> : null}
        {hoursMsg ? <p className="text-sm text-[#9fe3b8]">{hoursMsg}</p> : null}
        <button
          type="submit"
          disabled={savingHours}
          className="btn-solid rounded-full px-5 py-3"
        >
          {savingHours ? "Saving…" : "Save store hours"}
        </button>
      </form>

      <form
        onSubmit={onSave}
        className="grid gap-4 rounded-2xl border border-[#c9a87c]/30 bg-[#2a211c] p-5"
      >
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#fffaf6]">Login</h2>
          <p className="mt-1 text-sm text-[#d4c4b0]">Change the manager login password.</p>
        </div>
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
