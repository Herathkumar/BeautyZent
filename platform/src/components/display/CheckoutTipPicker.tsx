"use client";

import { useEffect, useState } from "react";
import { centsToDollars, dollarsToCents } from "@/lib/pay";
import { formatCad } from "@/lib/money";
import {
  TIP_AMOUNTS_CENTS,
  TIP_PERCENTS,
  type CheckoutTipMode,
} from "@/lib/display-checkout-types";

const MAX_CUSTOM_CENTS = 99_999;

function tipCentsFor(chargedCents: number, mode: CheckoutTipMode) {
  if (mode.kind === "none") return 0;
  if (mode.kind === "percent") return Math.round((chargedCents * mode.pct) / 100);
  return Math.max(0, mode.cents);
}

function isPresetAmount(cents: number) {
  return (TIP_AMOUNTS_CENTS as readonly number[]).includes(cents);
}

export function CheckoutTipPicker({
  chargedCents,
  tipMode,
  onChange,
  variant,
}: {
  chargedCents: number;
  tipMode: CheckoutTipMode;
  onChange: (mode: CheckoutTipMode) => void;
  variant: "customer" | "reception";
}) {
  const customer = variant === "customer";
  const selectedTip = tipCentsFor(chargedCents, tipMode);

  const chip = (active: boolean) =>
    customer
      ? active
        ? "bg-[var(--cd-accent)] text-[color:var(--cd-on-accent)] ring-2 ring-[color:var(--cd-accent)]"
        : "bg-[var(--cd-panel)] text-[color:var(--cd-heading)] ring-1 ring-[color:var(--cd-line-soft)] active:ring-[color:var(--cd-accent)]"
      : active
        ? "bg-[#c45b7a] text-white ring-2 ring-[#c45b7a]"
        : "bg-white/5 text-white/80 ring-1 ring-white/12 hover:ring-white/30";

  return (
    <div data-testid={`${variant}-checkout-tip-picker`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p
          className={
            customer
              ? "text-[11px] font-semibold tracking-[0.2em] text-[color:var(--cd-accent)] uppercase"
              : "text-[10px] font-semibold tracking-wide text-white/40 uppercase"
          }
        >
          Add a tip
        </p>
        <p
          className={
            customer ? "text-sm tabular-nums text-[color:var(--cd-heading)]" : "text-sm tabular-nums text-white/80"
          }
        >
          {formatCad(selectedTip)}
        </p>
      </div>

      <div className={`grid grid-cols-4 ${customer ? "gap-2.5" : "gap-2"}`}>
        {TIP_PERCENTS.map((pct) => {
          const active = tipMode.kind === "percent" && tipMode.pct === pct;
          return (
            <button
              key={pct}
              type="button"
              onClick={() => onChange({ kind: "percent", pct })}
              className={`touch-manipulation rounded-2xl px-2 text-center font-semibold ${
                customer ? "min-h-[4.5rem] text-base" : "py-2.5 text-sm"
              } ${chip(active)}`}
              data-testid={`${variant}-tip-pct-${pct}`}
            >
              {pct}%
              <span className={`mt-0.5 block font-medium opacity-70 ${customer ? "text-xs" : "text-[10px]"}`}>
                {formatCad(Math.round((chargedCents * pct) / 100))}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`mt-2 grid grid-cols-4 ${customer ? "gap-2.5" : "gap-2"}`}>
        {TIP_AMOUNTS_CENTS.map((cents) => {
          const active = tipMode.kind === "custom" && tipMode.cents === cents;
          return (
            <button
              key={cents}
              type="button"
              onClick={() => onChange({ kind: "custom", cents })}
              className={`touch-manipulation rounded-2xl px-2 font-semibold ${
                customer ? "min-h-[3.75rem] text-base" : "py-2.5 text-sm"
              } ${chip(active)}`}
              data-testid={`${variant}-tip-amt-${cents}`}
            >
              {formatCad(cents)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange({ kind: "none" })}
          className={`touch-manipulation rounded-2xl px-2 font-semibold ${
            customer ? "min-h-[3.75rem] text-base" : "py-2.5 text-sm"
          } ${chip(tipMode.kind === "none")}`}
          data-testid={`${variant}-tip-none`}
        >
          No tip
        </button>
      </div>

      {customer ? (
        <CustomerTipPad tipMode={tipMode} onChange={onChange} chip={chip} />
      ) : (
        <ReceptionCustomTip tipMode={tipMode} onChange={onChange} />
      )}
    </div>
  );
}

function CustomerTipPad({
  tipMode,
  onChange,
  chip,
}: {
  tipMode: CheckoutTipMode;
  onChange: (mode: CheckoutTipMode) => void;
  chip: (active: boolean) => string;
}) {
  const otherSelected = tipMode.kind === "custom" && !isPresetAmount(tipMode.cents);
  const [open, setOpen] = useState(otherSelected);
  const [draftCents, setDraftCents] = useState(otherSelected ? tipMode.cents : 0);

  useEffect(() => {
    if (tipMode.kind === "percent") setOpen(false);
    if (tipMode.kind === "custom" && isPresetAmount(tipMode.cents)) setOpen(false);
    if (tipMode.kind === "custom" && !isPresetAmount(tipMode.cents)) {
      setDraftCents(tipMode.cents);
    }
  }, [tipMode.kind, tipMode.kind === "percent" ? tipMode.pct : 0, tipMode.kind === "custom" ? tipMode.cents : 0]);

  function press(digit: number) {
    setDraftCents((prev) => Math.min(prev * 10 + digit, MAX_CUSTOM_CENTS));
  }

  function apply(cents: number) {
    setOpen(false);
    if (cents <= 0) onChange({ kind: "none" });
    else onChange({ kind: "custom", cents });
  }

  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={() => {
          setDraftCents(otherSelected ? tipMode.cents : 0);
          setOpen((v) => !v);
        }}
        className={`touch-manipulation min-h-[3.75rem] w-full rounded-2xl px-3 text-base font-semibold ${chip(
          open || otherSelected
        )}`}
        data-testid="customer-tip-other"
      >
        Other amount
      </button>

      {open ? (
        <div
          className="mt-3 rounded-[1.5rem] border border-[color:var(--cd-line-soft)] bg-[var(--cd-bg)] px-4 py-4"
          data-testid="customer-tip-keypad"
        >
          <p className="text-center text-[11px] tracking-wide text-[color:var(--cd-muted)]">Tap an amount</p>
          <p className="mt-1 text-center font-[family-name:var(--font-display)] text-4xl tabular-nums text-[color:var(--cd-heading)]">
            {formatCad(draftCents)}
          </p>
          <div className="mx-auto mt-4 grid max-w-[17rem] grid-cols-3 gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (k === "C") setDraftCents(0);
                  else if (k === "⌫") setDraftCents((prev) => Math.floor(prev / 10));
                  else press(Number(k));
                }}
                className="touch-manipulation min-h-[3.5rem] rounded-2xl bg-[var(--cd-panel)] text-xl font-semibold text-[color:var(--cd-heading)] ring-1 ring-[color:var(--cd-line-soft)] active:bg-[var(--cd-accent)] active:text-[color:var(--cd-on-accent)]"
                data-testid={`customer-tip-key-${k === "⌫" ? "back" : k}`}
              >
                {k}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => apply(draftCents)}
            className="touch-manipulation mt-3 min-h-[3.25rem] w-full rounded-full bg-[var(--cd-accent)] text-sm font-semibold tracking-wide text-[color:var(--cd-on-accent)] uppercase"
            data-testid="customer-tip-key-set"
          >
            Use this amount
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ReceptionCustomTip({
  tipMode,
  onChange,
}: {
  tipMode: CheckoutTipMode;
  onChange: (mode: CheckoutTipMode) => void;
}) {
  const [custom, setCustom] = useState(
    tipMode.kind === "custom" ? centsToDollars(tipMode.cents) : ""
  );

  useEffect(() => {
    if (tipMode.kind === "custom") setCustom(centsToDollars(tipMode.cents));
    else setCustom("");
  }, [tipMode.kind, tipMode.kind === "custom" ? tipMode.cents : 0]);

  return (
    <label className="mt-3 block">
      <span className="mb-1.5 block text-[10px] tracking-wide text-white/40">Custom amount ($)</span>
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        onBlur={() => {
          const cents = dollarsToCents(custom);
          if (cents == null) return;
          if (cents === 0) {
            onChange({ kind: "none" });
            return;
          }
          onChange({ kind: "custom", cents });
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          (e.target as HTMLInputElement).blur();
        }}
        inputMode="decimal"
        placeholder="0.00"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white tabular-nums"
        data-testid="reception-tip-custom"
      />
    </label>
  );
}
