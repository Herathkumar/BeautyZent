"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmTone = "default" | "danger";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

type ActiveConfirm = ConfirmOptions & {
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmTone;
};

const ConfirmContext = createContext<ConfirmFn | null>(null);

function normalize(opts: ConfirmOptions | string): ActiveConfirm {
  const raw = typeof opts === "string" ? { message: opts } : opts;
  const tone = raw.tone ?? "danger";
  return {
    title: raw.title ?? (tone === "danger" ? "Please confirm" : "Confirm"),
    message: raw.message,
    confirmLabel: raw.confirmLabel ?? (tone === "danger" ? "Confirm" : "OK"),
    cancelLabel: raw.cancelLabel ?? "Cancel",
    tone,
  };
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    // Fallback for rare mounts outside the provider
    return async (opts) => {
      const { message, title } = normalize(opts);
      return window.confirm(title ? `${title}\n\n${message}` : message);
    };
  }
  return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveConfirm | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const titleId = useId();
  const descId = useId();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // Resolve any prior pending confirm as cancelled
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setActive(normalize(opts));
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setActive(null);
  }, []);

  useEffect(() => {
    if (!active) return;
    confirmBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {active ? (
        <div
          className="fh-confirm-overlay fixed inset-0 z-[300] flex items-end justify-center bg-black/55 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) finish(false);
          }}
        >
          <div
            className="fh-confirm-dialog w-full max-w-md rounded-[1.75rem] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-7"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            data-testid="confirm-dialog"
            data-tone={active.tone}
          >
            <h2
              id={titleId}
              className="fh-confirm-title text-center font-[family-name:var(--font-display)] text-2xl leading-tight"
            >
              {active.title}
            </h2>
            <p
              id={descId}
              className="fh-confirm-message mt-3 whitespace-pre-line text-center text-sm leading-relaxed"
            >
              {active.message}
            </p>
            <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                className="fh-confirm-cancel rounded-full px-5 py-3.5 text-sm font-semibold"
                onClick={() => finish(false)}
              >
                {active.cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className={`fh-confirm-ok rounded-full px-5 py-3.5 text-sm font-bold ${
                  active.tone === "danger" ? "fh-confirm-ok--danger" : ""
                }`}
                onClick={() => finish(true)}
                data-testid="confirm-dialog-ok"
              >
                {active.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
