"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

function OperatorAvatarMenu({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
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
        aria-label="Operator menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <IconProfile className="h-5 w-5" />
      </button>
      {open ? (
        <div className="explore-luxe__avatar-dropdown" role="menu">
          <p className="platform-luxe__avatar-email">{email}</p>
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
        </div>
      ) : null}
    </div>
  );
}

export function PlatformShell({
  admin,
  children,
}: {
  admin: { name: string; email: string } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === "/platform/login";

  async function signOut() {
    await fetch("/api/platform/auth/logout", { method: "POST" });
    router.push("/platform/login");
    router.refresh();
  }

  return (
    <div className="explore-luxe platform-luxe">
      {!onLogin ? (
        <header className="explore-luxe__topbar">
          <div className="explore-luxe__topbar-inner">
            <Link
              href={admin ? "/platform" : "/platform/login"}
              className="explore-luxe__brand"
              aria-label="BeautyZent Marketplace"
            >
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
            {admin ? (
              <div className="platform-luxe__top-actions">
                <Link href="/explore">Explore</Link>
                <OperatorAvatarMenu email={admin.email} onSignOut={() => void signOut()} />
              </div>
            ) : null}
          </div>
        </header>
      ) : null}

      <div className="platform-luxe__shell">{children}</div>
    </div>
  );
}
