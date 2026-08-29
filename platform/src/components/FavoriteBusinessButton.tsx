"use client";

import { useEffect, useState } from "react";

type AccountSession = {
  signedIn?: boolean;
  favoriteSalonIds?: string[];
};

let accountSessionPromise: Promise<AccountSession> | null = null;

export function invalidateFavoriteAccountSession() {
  accountSessionPromise = null;
}

function loadAccountSession() {
  if (!accountSessionPromise) {
    accountSessionPromise = fetch("/api/public/account/session", {
      cache: "no-store",
    })
      .then((res) => res.json())
      .catch(() => ({ signedIn: false, favoriteSalonIds: [] }));
  }
  return accountSessionPromise;
}

export function FavoriteBusinessButton({
  salonId,
  compact = false,
}: {
  salonId: string;
  compact?: boolean;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAccountSession()
      .then((data) => {
        if (cancelled) return;
        setSignedIn(Boolean(data.signedIn));
        setFavorite(
          Array.isArray(data.favoriteSalonIds) &&
            data.favoriteSalonIds.includes(salonId)
        );
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [salonId]);

  async function toggle() {
    if (!signedIn) {
      window.location.assign("/account");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/public/account/favorites/${salonId}`, {
      method: favorite ? "DELETE" : "POST",
    });
    if (res.ok) {
      const next = !favorite;
      setFavorite(next);
      accountSessionPromise = accountSessionPromise?.then((session) => ({
        ...session,
        favoriteSalonIds: next
          ? [...new Set([...(session.favoriteSalonIds || []), salonId])]
          : (session.favoriteSalonIds || []).filter((id) => id !== salonId),
      })) || null;
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      disabled={busy || signedIn === null}
      onClick={() => void toggle()}
      aria-pressed={favorite}
      aria-label={favorite ? "Remove from favorites" : "Save to favorites"}
      title={favorite ? "Remove from favorites" : "Save to favorites"}
      className={
        compact
          ? `inline-flex h-9 w-9 items-center justify-center rounded-full border text-lg shadow-sm ${
              favorite
                ? "border-[#8d4f59] bg-[#8d4f59] text-white"
                : "border-ink/15 bg-white/90 text-[#8d4f59]"
            } disabled:opacity-60`
          : `rounded-full border px-5 py-2.5 text-sm font-semibold ${
              favorite
                ? "border-[#8d4f59] bg-[#8d4f59] text-white"
                : "border-ink/15 bg-white text-[#8d4f59]"
            } disabled:opacity-60`
      }
    >
      <span aria-hidden>{favorite ? "♥" : "♡"}</span>
      {compact ? null : <span className="ml-2">{favorite ? "Saved" : "Save"}</span>}
    </button>
  );
}
