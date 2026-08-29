"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SelfieCamera } from "@/components/SelfieCamera";
import { TabletPinCard } from "@/components/TabletPinCard";
import { MANAGER_DEFAULT_AVATAR } from "@/lib/manager-photo";
import { ManagerThemeToggle } from "../ManagerThemeToggle";
import { SettingToggle } from "@/components/admin/SettingToggle";

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
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessSlug, setBusinessSlug] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [listingMessage, setListingMessage] = useState("");
  const [listingError, setListingError] = useState("");
  const [savingListing, setSavingListing] = useState(false);

  const [photoUrl, setPhotoUrl] = useState(MANAGER_DEFAULT_AVATAR);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

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
    fetch("/api/admin/salon", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.salon) return;
        setBusinessName(data.salon.name || "");
        setBusinessSlug(data.salon.slug || "");
        setBusinessDescription(data.salon.description || "");
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
    setEditingProfile(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/manager/login");
    router.refresh();
  }

  async function saveListing(e: React.FormEvent) {
    e.preventDefault();
    setListingError("");
    setListingMessage("");
    setSavingListing(true);
    const res = await fetch("/api/admin/salon", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: businessDescription }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingListing(false);
    if (!res.ok) {
      setListingError(data.error || "Could not update Explore listing");
      return;
    }
    setBusinessDescription(data.salon?.description || "");
    setListingMessage(data.message || "Explore listing saved.");
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

  const displayName = name.trim() || "Your name";

  return (
    <main className="mx-auto max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-champagne uppercase">
            Account
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl leading-tight text-ink">
            Profile
          </h1>
          <p className="mt-1.5 text-sm text-muted">Your salon manager identity and login.</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="shrink-0 rounded-full border border-[color:var(--champagne)]/45 px-4 py-2 text-sm font-semibold text-champagne hover:bg-[color:var(--champagne)]/10"
        >
          Log out
        </button>
      </div>

      <section
        className="manager-profile-card overflow-hidden rounded-3xl border border-[color:var(--line)]"
        data-testid="manager-profile-card"
      >
        <div className="px-5 pb-5 pt-7 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => setCameraOpen(true)}
              className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7d6154]"
              aria-label={hasPhoto ? "Update selfie" : "Take selfie"}
              data-testid="manager-photo-button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt={`${displayName} profile photo`}
                width={112}
                height={112}
                data-testid="manager-photo-preview"
                className="h-28 w-28 rounded-full object-cover shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-[5px] ring-[#7d6154]/55"
              />
              <span className="absolute bottom-1 right-1 rounded-full bg-[#fffcf9] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#7d6154] ring-1 ring-[#7d6154]/40">
                {photoBusy ? "…" : hasPhoto ? "Update" : "Selfie"}
              </span>
            </button>
            <p className="mt-2 text-xs text-[#6b5b52]">
              Tap photo to take a selfie, or choose one from your library
            </p>
            {!editingProfile ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => setCameraOpen(true)}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#7d6154]/50 bg-[#7d6154]/12 px-5 text-sm font-semibold leading-none text-[#7d6154] hover:bg-[#7d6154]/20 disabled:opacity-50"
                >
                  {photoBusy ? "Saving…" : hasPhoto ? "Update selfie" : "Take selfie"}
                </button>
                <label
                  className={`relative inline-flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#7d6154]/35 px-5 text-sm font-semibold leading-none text-[#6b5b52] hover:bg-[#7d6154]/10 ${
                    photoBusy ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <span className="pointer-events-none">Choose photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={photoBusy}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void onPickPhoto(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            ) : null}

            <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-[#2b2521]">
              {displayName}
            </h2>
            <p className="mt-1 break-all text-sm text-[#6b5b52]">{email || "—"}</p>
            {phone.trim() ? (
              <p className="mt-0.5 text-sm text-[#7d6154]/90">{phone.trim()}</p>
            ) : null}

            {alsoStylist && !editingProfile ? (
              <p className="mt-3 rounded-full border border-[#7d6154]/35 bg-[#7d6154]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#7d6154]">
                Also a stylist
              </p>
            ) : null}

            {bio.trim() && !editingProfile ? (
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#5c4f47]/90">
                “{bio.trim()}”
              </p>
            ) : null}

            <div className="mt-5 flex w-full max-w-sm justify-center">
              <button
                type="button"
                className="btn-solid rounded-full px-8 py-3"
                data-testid="manager-edit-profile"
                onClick={() => {
                  setEditingProfile((v) => !v);
                  setProfileError("");
                  setProfileMsg("");
                }}
              >
                {editingProfile ? "Close editor" : "Edit profile"}
              </button>
            </div>
          </div>

          <SelfieCamera
            open={cameraOpen}
            onClose={() => setCameraOpen(false)}
            accent="manager"
            fileInputTestId="manager-selfie-input"
            onCapture={onPickPhoto}
          />

          {(photoError || photoMessage || hasPhoto) && !editingProfile ? (
            <div className="mt-4 space-y-3 text-center text-sm">
              {photoMessage ? <p className="text-[#9fe3b8]">{photoMessage}</p> : null}
              {photoError ? <p className="text-[#f5a8a8]">{photoError}</p> : null}
              {hasPhoto ? (
                <div className="mx-auto max-w-xs space-y-1.5">
                  <button
                    type="button"
                    disabled={photoBusy}
                    className="w-full rounded-full border border-[#7d6154]/50 bg-[#fffcf9]/80 px-4 py-2.5 text-sm font-semibold text-[#7d6154] hover:bg-[#7d6154]/12 disabled:opacity-50"
                    onClick={removePhoto}
                  >
                    {photoBusy ? "Removing…" : "Remove photo"}
                  </button>
                  <p className="text-xs text-[#6b5b52]">
                    Clears your selfie and shows the default avatar again
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {editingProfile ? (
          <form
            onSubmit={onSaveProfile}
            className="grid gap-3 border-t border-[#7d6154]/20 bg-[#fffcf9]/55 px-5 py-5 sm:px-6"
            data-testid="manager-profile-editor"
          >
            <p className="text-xs font-semibold tracking-[0.16em] text-[#7d6154] uppercase">
              Edit details
            </p>

            {hasPhoto ? (
              <div className="space-y-1">
                <button
                  type="button"
                  disabled={photoBusy}
                  className="w-fit rounded-full border border-[#7d6154]/45 px-4 py-2 text-sm font-semibold text-[#7d6154] hover:bg-[#7d6154]/10 disabled:opacity-50"
                  onClick={removePhoto}
                >
                  {photoBusy ? "Removing…" : "Remove photo"}
                </button>
                <p className="text-xs text-[#6b5b52]">Back to the default avatar</p>
              </div>
            ) : null}
            {photoError ? <p className="text-sm text-[#f5a8a8]">{photoError}</p> : null}
            {photoMessage ? <p className="text-sm text-[#9fe3b8]">{photoMessage}</p> : null}

            <label className="grid gap-1.5 text-sm text-[#6b5b52]">
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
              />
            </label>
            <label className="grid gap-1.5 text-sm text-[#6b5b52]">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
              />
            </label>
            <label className="grid gap-1.5 text-sm text-[#6b5b52]">
              Phone
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
              />
            </label>
            <label className="grid gap-1.5 text-sm text-[#6b5b52]">
              Short bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="Optional — a short note about you"
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
              />
            </label>
            <div className="rounded-xl border border-[#7d6154]/25 bg-[#fffcf9]/60 px-3 py-3">
              <SettingToggle
                label="I am also a stylist"
                description="Adds you to the floor as a self-managed stylist (you set your own hours and leave). Use the same login on the Stylist App."
                checked={alsoStylist}
                onChange={setAlsoStylist}
                testId="manager-also-stylist"
              />
            </div>
            {profileError ? <p className="text-sm text-[#f5a8a8]">{profileError}</p> : null}
            {profileMsg ? <p className="text-sm text-[#9fe3b8]">{profileMsg}</p> : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-solid flex-1 rounded-full px-5 py-3 sm:flex-none sm:px-8"
              >
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
              <button
                type="button"
                className="rounded-full border border-[#7d6154]/45 px-5 py-3 text-sm font-semibold text-[#7d6154] hover:bg-[#7d6154]/10"
                onClick={() => {
                  setEditingProfile(false);
                  setProfileError("");
                  setProfileMsg("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <form
        onSubmit={saveListing}
        className="grid gap-4 rounded-3xl border border-[#7d6154]/30 bg-white p-5"
        data-testid="manager-explore-listing"
      >
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[#7d6154] uppercase">
            Public business card
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[#2b2521]">
            Explore listing
          </h2>
          <p className="mt-1 text-sm text-[#6b5b52]">
            Update the description customers see on the BeautyZent business card.
          </p>
        </div>
        <div className="rounded-2xl border border-[#7d6154]/20 bg-[#fffcf9] px-4 py-3">
          <p className="font-semibold text-[#2b2521]">{businessName || "Your business"}</p>
          {businessSlug ? (
            <p className="mt-0.5 text-xs text-[#6b5b52]">/explore/{businessSlug}</p>
          ) : null}
        </div>
        <label className="grid gap-1.5 text-sm text-[#6b5b52]">
          Business description
          <textarea
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            rows={4}
            maxLength={600}
            placeholder="Describe your services and what makes your business special."
            className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
            data-testid="manager-business-description"
          />
          <span className="text-right text-xs text-[#6b5b52]">
            {businessDescription.length}/600
          </span>
        </label>
        {listingError ? <p className="text-sm text-[#b54a3c]">{listingError}</p> : null}
        {listingMessage ? <p className="text-sm text-[#2f7a4f]">{listingMessage}</p> : null}
        <div>
          <button
            type="submit"
            disabled={savingListing}
            className="btn-solid rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {savingListing ? "Saving…" : "Save Explore listing"}
          </button>
        </div>
      </form>

      <form
        onSubmit={onSave}
        className="grid gap-4 rounded-3xl border border-[#7d6154]/30 bg-[#ffffff] p-5"
      >
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#2b2521]">Login</h2>
          <p className="mt-1 text-sm text-[#6b5b52]">
            Change the manager login password. Email is updated under Edit profile.
          </p>
        </div>
        <label className="grid gap-1.5 text-sm text-[#6b5b52]">
          Current password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
          />
        </label>
        <label className="grid gap-1.5 text-sm text-[#6b5b52]">
          New password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
          />
        </label>
        <label className="grid gap-1.5 text-sm text-[#6b5b52]">
          Confirm new password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
          />
        </label>

        {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}
        {message ? <p className="text-sm text-[#9fe3b8]">{message}</p> : null}

        <button type="submit" disabled={saving} className="btn-solid rounded-full px-5 py-3">
          {saving ? "Saving…" : "Update password"}
        </button>
      </form>

      <TabletPinCard />

      <ManagerThemeToggle />
    </main>
  );
}
