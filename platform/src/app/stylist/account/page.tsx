"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Gender = "FEMALE" | "MALE" | "UNSPECIFIED";

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

export default function StylistAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [gender, setGender] = useState<Gender>("UNSPECIFIED");
  const [photoUrl, setPhotoUrl] = useState("/avatars/stylist-neutral.svg");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
        setPhone(data.user.phone || "");
        setBio(data.user.bio || "");
      });

    fetch("/api/stylist/photo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.stylist) return;
        setGender((data.stylist.gender as Gender) || "UNSPECIFIED");
        setPhotoUrl(data.stylist.photoUrl);
        setHasPhoto(Boolean(data.stylist.hasPhoto));
      });
  }, []);

  async function saveGender(next: Gender) {
    setGender(next);
    setPhotoError("");
    setPhotoMessage("");
    setPhotoBusy(true);
    const res = await fetch("/api/stylist/photo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gender: next }),
    });
    const data = await res.json();
    setPhotoBusy(false);
    if (!res.ok) {
      setPhotoError(data.error || "Could not update gender");
      return;
    }
    setPhotoUrl(data.stylist.photoUrl);
    setHasPhoto(Boolean(data.stylist.hasPhoto));
    setPhotoMessage(hasPhoto ? "Gender saved." : "Avatar updated for your gender.");
  }

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setPhotoError("");
    setPhotoMessage("");
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToJpegDataUrl(file);
      const res = await fetch("/api/stylist/photo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPhotoUrl(data.stylist.photoUrl);
      setHasPhoto(true);
      setPhotoMessage("Selfie saved. Clients will see this when they book.");
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
    const res = await fetch("/api/stylist/photo", { method: "DELETE" });
    const data = await res.json();
    setPhotoBusy(false);
    if (!res.ok) {
      setPhotoError(data.error || "Could not remove photo");
      return;
    }
    setPhotoUrl(data.stylist.photoUrl);
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
    const res = await fetch("/api/stylist/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), phone, bio }),
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
    setProfileMsg(data.message || "Profile updated.");
  }

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
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Profile</h1>
        <p className="mt-2 text-muted">
          Update your profile and photo for online booking, and manage login credentials.
        </p>
      </div>

      <div className="rounded-2xl border border-ink/15 bg-cream p-4 text-sm text-muted">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p>
              Signed in as{" "}
              <span className="font-semibold text-champagne">{name || "Stylist"}</span>
            </p>
            <p className="mt-1 break-all font-mono text-champagne">{email}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full border border-[#7ec4b8]/45 px-4 py-2 text-sm font-semibold text-[#b5ebe0] hover:bg-[#7ec4b8]/10"
            data-testid="stylist-logout"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/stylist/login");
              router.refresh();
            }}
          >
            Log out
          </button>
        </div>
      </div>

      <section className="grid gap-4 rounded-2xl border border-ink/15 bg-cream p-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl">Profile</h2>
          <p className="mt-1 text-sm text-muted">
            Your name, contact info, and photo. Clients see your name and bio when they book.
            Update anytime — no password needed.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Your profile photo"
            width={96}
            height={96}
            data-testid="stylist-photo-preview"
            className="h-24 w-24 rounded-full object-cover ring-2 ring-champagne/40"
          />
          <div className="grid gap-2 text-sm">
            <p className="text-muted">{hasPhoto ? "Your selfie" : "Default avatar"}</p>
            <label className="grid gap-1">
              Gender (for avatar)
              <select
                value={gender}
                disabled={photoBusy}
                onChange={(e) => saveGender(e.target.value as Gender)}
                className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
                aria-label="Gender for avatar"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="UNSPECIFIED">Prefer not to say</option>
              </select>
            </label>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          data-testid="stylist-selfie-input"
          onChange={(e) => onPickPhoto(e.target.files?.[0] || null)}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={photoBusy}
            className="stylist-tap btn-solid rounded-2xl px-4"
            onClick={() => fileRef.current?.click()}
          >
            {photoBusy ? "Saving…" : hasPhoto ? "Retake selfie" : "Take selfie"}
          </button>
          {hasPhoto ? (
            <button
              type="button"
              disabled={photoBusy}
              className="stylist-tap rounded-2xl border border-ink/20 px-4"
              onClick={removePhoto}
            >
              Use avatar instead
            </button>
          ) : null}
        </div>
        {photoError ? <p className="text-sm text-[#f5a8a8]">{photoError}</p> : null}
        {photoMessage ? <p className="text-sm text-champagne">{photoMessage}</p> : null}

        <form onSubmit={onSaveProfile} className="grid gap-3 border-t border-ink/15 pt-4">
          <label className="grid gap-1.5 text-sm">
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 text-ink"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Short bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Optional — shown when clients choose a stylist"
              className="stylist-tap rounded-2xl border border-ink/15 bg-white px-3 py-2 text-ink"
            />
          </label>
          {profileError ? <p className="text-sm text-[#f5a8a8]">{profileError}</p> : null}
          {profileMsg ? <p className="text-sm text-champagne">{profileMsg}</p> : null}
          <button
            type="submit"
            disabled={savingProfile}
            className="stylist-tap btn-solid rounded-2xl"
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <form onSubmit={onSave} className="grid gap-4 rounded-2xl border border-ink/15 bg-cream p-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Login</h2>
        <p className="text-sm text-muted">Change your password. Email is updated under Profile.</p>
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
