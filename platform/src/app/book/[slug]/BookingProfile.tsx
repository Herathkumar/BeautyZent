"use client";

import { useEffect, useState } from "react";
import { SelfieCamera } from "@/components/SelfieCamera";
import { useConfirm } from "@/components/ConfirmDialog";
import { DEFAULT_CLIENT_AVATAR, MAX_CLIENT_PHOTO_BYTES } from "@/lib/client-photo";
import { fileToBoundedJpegDataUrl } from "@/lib/photo-resize";
import { BookingSalonChooser } from "./BookingSalonChooser";
import type { BookClient } from "./ClientMemberBar";
import {
  LuxeCrown,
  LuxeOrnament,
  LuxeSheet,
  MemberBadge,
  memberTierFromPoints,
  memberTierLabel,
  pointsToNextTier,
} from "./luxe";

export function BookingProfile({
  slug,
  salonName,
  open,
  client,
  onClose,
  onClientChange,
  onSignInRequest,
  onJoinRequest,
}: {
  slug: string;
  salonName?: string | null;
  open: boolean;
  client: BookClient | null;
  onClose: () => void;
  onClientChange: (c: BookClient | null) => void;
  onSignInRequest: () => void;
  onJoinRequest: () => void;
}) {
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photoUrl, setPhotoUrl] = useState(DEFAULT_CLIENT_AVATAR);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);
  const [loyaltyLoaded, setLoyaltyLoaded] = useState(false);

  const clientId = client?.id ?? null;
  // Keyed on the member id so saving a rename doesn't refetch and wipe its own
  // confirmation message.
  useEffect(() => {
    if (!open || !clientId) return;
    setMessage("");
    setError("");
    setLoyaltyPoints(null);
    setLoyaltyLoaded(false);
    fetch(`/api/public/${slug}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.client) return;
        setName(d.client.name || "");
        setPhone(d.client.phone || "");
        setEmail(d.client.email || "");
        setPhotoUrl(d.client.photoUrl || DEFAULT_CLIENT_AVATAR);
        setHasPhoto(Boolean(d.client.hasPhoto));
      })
      .catch(() => null);
    fetch(`/api/public/${slug}/loyalty`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setLoyaltyPoints(
          typeof d?.loyalty?.points === "number" ? d.loyalty.points : 0
        );
      })
      .catch(() => setLoyaltyPoints(0))
      .finally(() => setLoyaltyLoaded(true));
  }, [open, slug, clientId]);

  async function onPickPhoto(file: File | null) {
    if (!file) return;
    setPhotoBusy(true);
    setError("");
    setMessage("");
    try {
      const dataUrl = await fileToBoundedJpegDataUrl(file, MAX_CLIENT_PHOTO_BYTES);
      const res = await fetch(`/api/public/${slug}/profile/photo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPhotoUrl(data.photoUrl);
      setHasPhoto(true);
      setMessage(data.message || "Selfie saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save photo");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    const ok = await confirm({
      title: "Remove your photo?",
      message: "Your profile goes back to the default avatar.",
      confirmLabel: "Remove",
      cancelLabel: "Keep",
      tone: "danger",
    });
    if (!ok) return;
    setPhotoBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/public/${slug}/profile/photo`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove photo");
      setPhotoUrl(data.photoUrl);
      setHasPhoto(false);
      setMessage(data.message || "Photo removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove photo");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (name.trim().length < 2) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/public/${slug}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save profile");
      setName(data.client.name || "");
      setPhone(data.client.phone || "");
      setMessage(data.message || "Profile updated.");
      setEditing(false);
      if (client) {
        onClientChange({
          ...client,
          name: data.client.name,
          phone: data.client.phone,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const ok = await confirm({
      title: "Log out?",
      message: "You can still book as a guest, and sign back in anytime.",
      confirmLabel: "Log out",
      cancelLabel: "Stay",
    });
    if (!ok) return;
    await fetch(`/api/public/${slug}/auth/logout`, { method: "POST" });
    onClientChange(null);
    onClose();
  }

  if (!open) return null;

  const displayName = name.trim() || client?.name || "Your name";
  const currentTier = memberTierFromPoints(loyaltyPoints);
  const tierProgress = pointsToNextTier(loyaltyPoints);

  return (
    <LuxeSheet label="Profile">
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-testid="book-profile"
      >
        <div className="shrink-0 px-5 pt-[max(0.85rem,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--champagne)]/45 text-champagne"
              aria-label="Close"
            >
              ←
            </button>
            <div className="min-w-0 text-center">
              <p className="flex items-center justify-center gap-1 font-[family-name:var(--font-display)] text-xl text-white">
                <LuxeCrown className="h-4 w-4 text-champagne" />
                {salonName?.trim() || "BeautyZent"}
              </p>
              <LuxeOrnament className="mx-auto mt-2 max-w-[7rem]" />
            </div>
            {client ? (
              <button
                type="button"
                onClick={signOut}
                data-testid="client-sign-out"
                className="rounded-full border border-[color:var(--champagne)]/45 px-2.5 py-1.5 text-xs font-semibold text-champagne"
              >
                Log out
              </button>
            ) : (
              <span className="h-9 w-9" aria-hidden />
            )}
          </div>
        </div>

        <div className="book-luxe-sheet-scroll space-y-5 px-5 pt-4">
          {client ? (
            <>
              <section className="rounded-3xl border border-[color:var(--line)] px-5 py-6">
                <div className="flex flex-col items-center text-center">
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => setCameraOpen(true)}
                    aria-label={hasPhoto ? "Update selfie" : "Take selfie"}
                    data-testid="client-photo-button"
                    className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--champagne)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt={`${displayName} profile photo`}
                      width={112}
                      height={112}
                      data-testid="client-photo-preview"
                      className="h-28 w-28 book-luxe-glow-avatar rounded-full object-cover"
                    />
                    <span className="absolute right-0 bottom-1 rounded-full bg-[linear-gradient(135deg,#e8c99a,#c9a87c)] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#1a1512]">
                      {photoBusy ? "…" : hasPhoto ? "Update" : "Selfie"}
                    </span>
                  </button>
                  <p className="mt-2 text-xs text-muted">
                    Tap the photo to take a selfie, or choose one from your library
                  </p>

                  {!editing ? (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={photoBusy}
                        onClick={() => setCameraOpen(true)}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-[rgba(201,180,232,0.5)] bg-[rgba(201,180,232,0.12)] px-5 text-sm font-semibold text-champagne disabled:opacity-50"
                      >
                        {photoBusy ? "Saving…" : hasPhoto ? "Update selfie" : "Take selfie"}
                      </button>
                      <label
                        className={`relative inline-flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[rgba(201,180,232,0.35)] px-5 text-sm font-semibold text-muted ${
                          photoBusy ? "pointer-events-none opacity-50" : ""
                        }`}
                      >
                        <span className="pointer-events-none">Choose photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={photoBusy}
                          data-testid="client-photo-input"
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

                  <h3 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-white">
                    {displayName}
                  </h3>

                  {loyaltyLoaded && loyaltyPoints != null ? (
                    <div
                      className="book-luxe-tier-progress"
                      data-testid="profile-member-tier"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <MemberBadge tier={currentTier} />
                        <p className="text-[10px] font-semibold tracking-[0.14em] text-champagne uppercase">
                          {memberTierLabel(currentTier)}
                        </p>
                      </div>
                      {tierProgress ? (
                        <>
                          <div className="book-luxe-tier-progress__meta">
                            <p className="book-luxe-tier-progress__arrow" aria-hidden>
                              →
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              <span className="font-semibold tabular-nums text-champagne">
                                {tierProgress.remaining.toLocaleString()}
                              </span>{" "}
                              {tierProgress.remaining === 1 ? "pt" : "pts"} to{" "}
                              {memberTierLabel(tierProgress.next).replace(
                                / Member$/i,
                                ""
                              )}
                            </p>
                            <p className="mt-0.5 text-[10px] text-muted">
                              Balance · {loyaltyPoints.toLocaleString()} pts
                            </p>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <MemberBadge
                              tier={tierProgress.next}
                              className="book-luxe-badge--sm"
                            />
                            <p className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                              Next
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="book-luxe-tier-progress__meta">
                          <p className="text-xs text-champagne">Top tier reached</p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            Balance · {loyaltyPoints.toLocaleString()} pts
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted">Loading membership…</p>
                  )}

                  <p className="mt-3 break-all text-sm text-muted">{email || "—"}</p>
                  {phone.trim() ? (
                    <p className="mt-0.5 text-sm text-champagne">{phone.trim()}</p>
                  ) : null}

                  <div className="mt-5 flex w-full max-w-sm justify-center">
                    <button
                      type="button"
                      data-testid="client-edit-profile"
                      onClick={() => {
                        setEditing((v) => !v);
                        setError("");
                        setMessage("");
                      }}
                      className="btn-solid rounded-full px-8 py-2.5 text-sm font-semibold"
                    >
                      {editing ? "Close editor" : "Edit profile"}
                    </button>
                  </div>

                  {hasPhoto && !editing ? (
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={removePhoto}
                      className="mt-3 rounded-full border border-[rgba(181,74,60,0.4)] px-4 py-2 text-xs font-semibold text-[#b54a3c] disabled:opacity-50"
                    >
                      {photoBusy ? "Removing…" : "Remove photo"}
                    </button>
                  ) : null}
                </div>

                <SelfieCamera
                  open={cameraOpen}
                  onClose={() => setCameraOpen(false)}
                  accent="book"
                  fileInputTestId="client-selfie-input"
                  onCapture={onPickPhoto}
                />

                {editing ? (
                  <form
                    onSubmit={saveProfile}
                    className="mt-5 grid gap-3 border-t border-[color:var(--line)] pt-5"
                    data-testid="client-profile-editor"
                  >
                    <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
                      Edit details
                    </p>
                    <label className="grid gap-1.5 text-sm">
                      Name
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="rounded-xl border px-3 py-2.5"
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      Phone
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Optional"
                        className="rounded-xl border px-3 py-2.5"
                      />
                    </label>
                    <p className="text-xs text-muted">
                      Your email is your sign-in and can&apos;t be changed here — ask the
                      salon if it needs updating.
                    </p>
                    <div className="book-luxe-sheet-footer flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={saving}
                        data-testid="client-save-profile"
                        className="btn-solid rounded-full px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
                      >
                        {saving ? "Saving…" : "Save profile"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="rounded-full border border-[color:var(--line)] px-5 py-2.5 text-sm text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}

                {message ? (
                  <p className="mt-4 text-center text-sm text-champagne">{message}</p>
                ) : null}
                {error ? (
                  <p className="mt-4 text-center text-sm text-[#f5a8a8]">{error}</p>
                ) : null}
              </section>

              <BookingSalonChooser
                currentSlug={slug}
                enabled={Boolean(client)}
              />
            </>
          ) : (
            <>
              <section className="rounded-3xl border border-[color:var(--line)] px-5 py-6 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={DEFAULT_CLIENT_AVATAR}
                  alt=""
                  width={96}
                  height={96}
                  className="mx-auto h-24 w-24 rounded-full ring-[5px] ring-[color:var(--champagne)]/40"
                />
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-2xl">
                  You&apos;re browsing as a guest
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Join free to add a photo, save your details, and keep a look book of
                  every visit. No password — just an email code.
                </p>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onJoinRequest();
                    }}
                    className="btn-solid rounded-2xl px-4 py-3 text-sm font-semibold"
                  >
                    Join free
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSignInRequest();
                    }}
                    className="rounded-2xl border border-[color:var(--line)] px-4 py-3 text-sm font-semibold text-champagne"
                  >
                    Sign in
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </LuxeSheet>
  );
}
