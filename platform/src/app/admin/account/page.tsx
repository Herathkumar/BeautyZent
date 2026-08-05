"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MANAGER_DEFAULT_AVATAR } from "@/lib/manager-photo";

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
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [alsoStylist, setAlsoStylist] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
        setPhone(data.user.phone || "");
        setBio(data.user.bio || "");
        setAlsoStylist(Boolean(data.user.alsoStylist));
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

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileMsg("");
    if (!name.trim()) {
      setProfileError("Display name is required");
      return;
    }
    setSavingProfile(true);
    const res = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone,
        bio,
        alsoStylist,
      }),
    });
    const data = await res.json();
    setSavingProfile(false);
    if (!res.ok) {
      setProfileError(data.error || "Could not update profile");
      return;
    }
    if (data.user?.name) setName(data.user.name);
    if (data.user?.email) setEmail(data.user.email);
    setPhone(data.user?.phone || "");
    setBio(data.user?.bio || "");
    setAlsoStylist(Boolean(data.user?.alsoStylist));
    setProfileMsg(data.message || "Profile updated.");
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
          Profile
        </h1>
        <p className="mt-2 text-[#d4c4b0]">
          Update your profile and login password for this salon.
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
            Profile
          </h2>
          <p className="mt-1 text-sm text-[#d4c4b0]">
            Your name, contact info, and photo. Update anytime — no password needed.
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

        <form onSubmit={onSaveProfile} className="grid gap-3 border-t border-[#c9a87c]/20 pt-4">
          <label className="grid gap-1.5 text-sm text-[#d4c4b0]">
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[#d4c4b0]">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[#d4c4b0]">
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
            />
          </label>
          <label className="grid gap-1.5 text-sm text-[#d4c4b0]">
            Short bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Optional — a short note about you"
              className="rounded-xl border border-[#c9a87c]/35 bg-[#1c1714] px-3 py-2 text-[#fffaf6]"
            />
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-[#c9a87c]/25 bg-[#1c1714]/60 px-3 py-3 text-sm text-[#d4c4b0]">
            <input
              type="checkbox"
              checked={alsoStylist}
              onChange={(e) => setAlsoStylist(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#c9a87c]"
              data-testid="manager-also-stylist"
            />
            <span>
              <span className="font-semibold text-[#fffaf6]">I am also a stylist</span>
              <span className="mt-1 block text-xs text-[#d4c4b0]/90">
                Adds you to the floor as a self-managed stylist (you set your own hours and leave).
                Use the same login on the Stylist App.
              </span>
            </span>
          </label>
          {profileError ? <p className="text-sm text-[#f5a8a8]">{profileError}</p> : null}
          {profileMsg ? <p className="text-sm text-[#9fe3b8]">{profileMsg}</p> : null}
          <button
            type="submit"
            disabled={savingProfile}
            className="btn-solid rounded-full px-5 py-3"
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

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
