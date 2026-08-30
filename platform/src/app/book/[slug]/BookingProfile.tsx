"use client";

import { useEffect, useState } from "react";
import { SelfieCamera } from "@/components/SelfieCamera";
import { useConfirm } from "@/components/ConfirmDialog";
import { DEFAULT_CLIENT_AVATAR, MAX_CLIENT_PHOTO_BYTES } from "@/lib/client-photo";
import { fileToBoundedJpegDataUrl } from "@/lib/photo-resize";
import { BookThemeToggle } from "./BookThemeToggle";
import { BookingSalonChooser } from "./BookingSalonChooser";
import { BeautyZentPoweredBy } from "@/components/ZentraLabFooter";
import type { BookClient } from "./ClientMemberBar";

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

  const clientId = client?.id ?? null;
  // Keyed on the member id so saving a rename doesn't refetch and wipe its own
  // confirmation message.
  useEffect(() => {
    if (!open || !clientId) return;
    setMessage("");
    setError("");
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-3">
      <div
        className="book-theme book-card flex h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-auto sm:max-h-[88dvh] sm:rounded-3xl"
        role="dialog"
        aria-label="Profile"
        data-testid="book-profile"
      >
        <div className="shrink-0 px-5 pt-4">
          <div
            aria-hidden
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-[color:var(--line)] sm:hidden"
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
                {salonName?.trim() || "Client"}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                Profile
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {client ? (
                <button
                  type="button"
                  onClick={signOut}
                  data-testid="client-sign-out"
                  className="rounded-full border border-[color:var(--champagne)]/45 px-3 py-1.5 text-sm font-semibold text-champagne hover:bg-[color:var(--champagne)]/10"
                >
                  Log out
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-sm text-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {client ? (
            <>
              <section className="book-card rounded-3xl px-5 py-6">
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
                      className="h-28 w-28 rounded-full object-cover shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-[5px] ring-[#c9b4e8]/50"
                    />
                    <span className="absolute right-1 bottom-1 rounded-full bg-[#17121f] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#e0d0f5] ring-1 ring-[#c9b4e8]/40">
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

                  <h3 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-ink">
                    {displayName}
                  </h3>
                  <p className="mt-1 break-all text-sm text-muted">{email || "—"}</p>
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
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={saving}
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

              <BookThemeToggle />
              <BeautyZentPoweredBy className="mt-4" />
            </>
          ) : (
            <>
              <section className="book-card rounded-3xl px-5 py-6 text-center">
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

              <BookThemeToggle />
              <BeautyZentPoweredBy className="mt-4" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
