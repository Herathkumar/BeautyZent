"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BeautyZentLogo } from "@/components/BeautyZentBrand";

function IconProfile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 20a6.5 6.5 0 0 1 13 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AccountAvatarMenu({
  isOperator,
  onSignOut,
}: {
  isOperator: boolean;
  onSignOut?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="explore-luxe__avatar-menu" ref={rootRef}>
      <button
        type="button"
        className="explore-luxe__account-avatar"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <IconProfile className="h-5 w-5" />
      </button>
      {open ? (
        <div className="explore-luxe__avatar-dropdown" role="menu">
          {isOperator ? (
            <Link
              href="/platform"
              role="menuitem"
              className="explore-luxe__avatar-menuitem"
              onClick={() => setOpen(false)}
            >
              Operator console
            </Link>
          ) : null}
          {!onSignOut ? (
            <Link
              href="/account"
              role="menuitem"
              className="explore-luxe__avatar-menuitem"
              onClick={() => setOpen(false)}
            >
              My account
            </Link>
          ) : null}
          {onSignOut ? (
            <button
              type="button"
              role="menuitem"
              className="explore-luxe__avatar-signout"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
            >
              Sign out
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ExploreMarketplaceNav({
  current = null,
  onSignOut,
  showOperatorConsole = true,
}: {
  current?: "home" | "explore" | "claim" | "account" | null;
  onSignOut?: () => void;
  /** When false, hide Operator console even if the viewer has a platform session. */
  showOperatorConsole?: boolean;
}) {
  const [isOperator, setIsOperator] = useState(false);

  useEffect(() => {
    if (!showOperatorConsole) return;
    let cancelled = false;
    fetch("/api/platform/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setIsOperator(Boolean(data?.admin));
      })
      .catch(() => {
        if (!cancelled) setIsOperator(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showOperatorConsole]);

  const operatorVisible = showOperatorConsole && isOperator;
  const useMenu = Boolean(onSignOut) || operatorVisible;

  return (
    <header className="explore-luxe__topbar">
      <div className="explore-luxe__topbar-inner">
        <Link href="/" className="explore-luxe__brand" aria-label="BeautyZent Marketplace">
          <BeautyZentLogo
            variant="rose"
            size="sm"
            href={null}
            priority
            className="explore-luxe__brand-mark"
          />
          <span className="explore-luxe__brand-text">
            <span className="explore-luxe__brand-name">BeautyZent</span>
            <span className="explore-luxe__brand-sub">Marketplace</span>
          </span>
        </Link>
        <nav className="explore-luxe__top-links" aria-label="Marketplace">
          <Link href="/" className={current === "home" ? "is-current" : undefined}>
            Home
          </Link>
          <Link href="/explore" className={current === "explore" ? "is-current" : undefined}>
            Explore
          </Link>
          <Link href="/claim" className={current === "claim" ? "is-current" : undefined}>
            List your house
          </Link>
          {useMenu ? (
            <AccountAvatarMenu isOperator={operatorVisible} onSignOut={onSignOut} />
          ) : (
            <Link
              href="/account"
              className={`explore-luxe__account-avatar${current === "account" ? " is-current" : ""}`}
              aria-label="My account"
            >
              <IconProfile className="h-5 w-5" />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
