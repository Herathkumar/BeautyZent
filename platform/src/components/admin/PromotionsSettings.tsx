"use client";

import { useCallback, useEffect, useState } from "react";
import { centsToDollars } from "@/lib/pay";
import {
  generatePromotionRuleLabel,
  PROMOTION_RULE_TYPES,
  type PromotionRuleType,
} from "@/lib/promotions";
import { SettingToggle } from "@/components/admin/SettingToggle";

type PromoSettings = {
  loyaltyEnabled: boolean;
  discountsEnabled: boolean;
  loyaltyPointsPerDollar: number;
  loyaltyCentsPerPoint: number;
  loyaltyMaxRedeemPercent: number;
  promoBoardEnabled: boolean;
  promoBoardIntervalSec: number;
  promoBoardShowSec: number;
  promoBoardSlideSec: number;
};

type Rule = {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  discountBps: number | null;
  discountCents: number | null;
  minVisits: number | null;
  minSpendCents: number | null;
  membersOnly: boolean;
  sortOrder: number;
};

export function PromotionsSettings() {
  const [settings, setSettings] = useState<PromoSettings>({
    loyaltyEnabled: false,
    discountsEnabled: false,
    loyaltyPointsPerDollar: 1,
    loyaltyCentsPerPoint: 5,
    loyaltyMaxRedeemPercent: 50,
    promoBoardEnabled: false,
    promoBoardIntervalSec: 90,
    promoBoardShowSec: 24,
    promoBoardSlideSec: 8,
  });
  const [rules, setRules] = useState<Rule[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [ruleMsg, setRuleMsg] = useState("");
  const [ruleErr, setRuleErr] = useState("");
  const [boardMsg, setBoardMsg] = useState("");
  const [boardErr, setBoardErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [boardBusy, setBoardBusy] = useState(false);
  const [draftType, setDraftType] = useState<PromotionRuleType>("MEMBER_PERCENT");
  const [draftBps, setDraftBps] = useState(1000);
  const [draftCents, setDraftCents] = useState(0);
  const [draftMinVisits, setDraftMinVisits] = useState(5);
  const [draftMinSpend, setDraftMinSpend] = useState(8000);
  const [draftName, setDraftName] = useState(() =>
    generatePromotionRuleLabel({
      type: "MEMBER_PERCENT",
      discountBps: 1000,
      discountCents: 0,
      minVisits: 5,
      minSpendCents: 8000,
    })
  );
  const [labelCustomized, setLabelCustomized] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/promotions");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error || "Could not load promotion settings");
      return;
    }
    if (data.settings) setSettings(data.settings);
    setRules(data.rules || []);
  }, []);

  async function persistSettings(next?: PromoSettings) {
    const payload = normalizeSettings(next ?? settings);
    const res = await fetch("/api/admin/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Could not save settings (${res.status})`);
    }
    if (data.settings) setSettings(data.settings);
    return data.settings as PromoSettings;
  }

  function normalizeSettings(next: PromoSettings): PromoSettings {
    return {
      loyaltyEnabled: Boolean(next.loyaltyEnabled),
      discountsEnabled: Boolean(next.discountsEnabled),
      loyaltyPointsPerDollar: Math.max(0, Math.round(Number(next.loyaltyPointsPerDollar) || 0)),
      loyaltyCentsPerPoint: Math.max(1, Math.round(Number(next.loyaltyCentsPerPoint) || 1)),
      loyaltyMaxRedeemPercent: Math.min(
        100,
        Math.max(0, Math.round(Number(next.loyaltyMaxRedeemPercent) || 0))
      ),
      promoBoardEnabled: Boolean(next.promoBoardEnabled),
      promoBoardIntervalSec: Math.min(
        600,
        Math.max(30, Math.round(Number(next.promoBoardIntervalSec) || 90))
      ),
      promoBoardShowSec: Math.min(
        300,
        Math.max(5, Math.round(Number(next.promoBoardShowSec) || 24))
      ),
      promoBoardSlideSec: Math.min(
        60,
        Math.max(3, Math.round(Number(next.promoBoardSlideSec) || 8))
      ),
    };
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (labelCustomized) return;
    setDraftName(
      generatePromotionRuleLabel({
        type: draftType,
        discountBps: draftBps,
        discountCents: draftCents,
        minVisits: draftMinVisits,
        minSpendCents: draftMinSpend,
      })
    );
  }, [
    draftType,
    draftBps,
    draftCents,
    draftMinVisits,
    draftMinSpend,
    labelCustomized,
  ]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await persistSettings();
      setMsg("Promotion settings saved.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setRuleErr("");
    setRuleMsg("");
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      setRuleErr("Enter a label for this rule.");
      setBusy(false);
      return;
    }
    try {
      await persistSettings();
      const body: Record<string, unknown> = {
        type: draftType,
        name: trimmedName,
        membersOnly: draftType === "MEMBER_PERCENT",
      };
      if (
        draftType === "MEMBER_PERCENT" ||
        draftType === "FIRST_VISIT" ||
        draftType === "VISIT_MILESTONE" ||
        draftType === "MIN_SPEND_PERCENT"
      ) {
        body.discountBps = draftBps;
      }
      if (draftType === "MIN_SPEND_FLAT" || draftType === "FIRST_VISIT") {
        body.discountCents = draftCents;
      }
      if (draftType === "VISIT_MILESTONE") body.minVisits = draftMinVisits;
      if (draftType === "MIN_SPEND_PERCENT" || draftType === "MIN_SPEND_FLAT") {
        body.minSpendCents = draftMinSpend;
      }
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRuleErr(data.error || "Could not add rule");
        return;
      }
      if (data.rule) {
        setRules((prev) => [...prev.filter((r) => r.id !== data.rule.id), data.rule]);
      } else {
        await load();
      }
      setRuleMsg(data.message || "Rule added.");
      setLabelCustomized(false);
    } catch (error) {
      setRuleErr(error instanceof Error ? error.message : "Could not add rule");
    } finally {
      setBusy(false);
    }
  }

  async function setRuleEnabled(rule: Rule, enabled: boolean) {
    if (rule.enabled === enabled) return;
    await fetch("/api/admin/promotions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, enabled }),
    });
    await load();
  }

  async function removeRule(id: string) {
    await fetch(`/api/admin/promotions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  async function saveBoardSettings(e: React.FormEvent) {
    e.preventDefault();
    setBoardBusy(true);
    setBoardErr("");
    setBoardMsg("");
    try {
      await persistSettings();
      setBoardMsg("Display board settings saved.");
    } catch (error) {
      setBoardErr(error instanceof Error ? error.message : "Could not save board settings");
    } finally {
      setBoardBusy(false);
    }
  }

  const boardRules = rules.filter((r) => r.enabled);

  return (
    <div className="grid gap-6" data-testid="promotions-settings">
      <form
        onSubmit={saveSettings}
        className="grid gap-4 rounded-2xl border border-[#7d6154]/30 bg-[#ffffff] p-5"
      >
        <div>
          <p className="text-sm text-[#6b5b52]">
            Rules auto-apply at checkout on the reception desk. Members earn and redeem points when
            loyalty is enabled.
          </p>
        </div>

        <SettingToggle
          label="Enable loyalty points (members)"
          checked={settings.loyaltyEnabled}
          onChange={(loyaltyEnabled) => setSettings((s) => ({ ...s, loyaltyEnabled }))}
          testId="promo-loyalty-enabled"
        />
        <SettingToggle
          label="Enable automatic discounts"
          checked={settings.discountsEnabled}
          onChange={(discountsEnabled) => setSettings((s) => ({ ...s, discountsEnabled }))}
          testId="promo-discounts-enabled"
        />

        {settings.loyaltyEnabled ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm text-[#6b5b52]">
              Points per $1 spent
              <input
                type="number"
                min={0}
                value={settings.loyaltyPointsPerDollar}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    loyaltyPointsPerDollar: Number(e.target.value),
                  }))
                }
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
              />
            </label>
            <label className="grid gap-1 text-sm text-[#6b5b52]">
              Point value (¢)
              <input
                type="number"
                min={1}
                value={settings.loyaltyCentsPerPoint}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    loyaltyCentsPerPoint: Number(e.target.value),
                  }))
                }
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
              />
            </label>
            <label className="grid gap-1 text-sm text-[#6b5b52]">
              Max redeem % of bill
              <input
                type="number"
                min={0}
                max={100}
                value={settings.loyaltyMaxRedeemPercent}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    loyaltyMaxRedeemPercent: Number(e.target.value),
                  }))
                }
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
              />
            </label>
          </div>
        ) : null}

        {err ? <p className="text-sm text-[#f5a8a8]">{err}</p> : null}
        {msg ? <p className="text-sm text-[#9fe3b8]">{msg}</p> : null}
        <button type="submit" disabled={busy} className="btn-solid w-fit rounded-full px-5 py-2.5">
          Save promotion settings
        </button>
      </form>

      {settings.discountsEnabled ? (
        <>
          <ul className="space-y-2" data-testid="promotion-rules-list">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#7d6154]/25 bg-[#fffcf9] px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-[#2b2521]">{rule.name}</p>
                  <p className="text-sm text-[#6b5b52]">
                    {rule.type.replace(/_/g, " ").toLowerCase()}
                    {rule.discountBps ? ` · ${rule.discountBps / 100}%` : ""}
                    {rule.discountCents ? ` · $${centsToDollars(rule.discountCents)}` : ""}
                    {rule.minVisits ? ` · visit #${rule.minVisits}` : ""}
                    {rule.minSpendCents
                      ? ` · min $${centsToDollars(rule.minSpendCents)}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <SettingToggle
                    label={`${rule.name} ${rule.enabled ? "on" : "off"}`}
                    hideLabel
                    checked={rule.enabled}
                    onChange={(enabled) => void setRuleEnabled(rule, enabled)}
                    testId={`promo-rule-toggle-${rule.id}`}
                  />
                  <button
                    type="button"
                    className="text-xs text-[#f5a8a8] underline"
                    onClick={() => void removeRule(rule.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
            {!rules.length ? (
              <li className="text-sm text-[#6b5b52]">No discount rules yet.</li>
            ) : null}
          </ul>

          <form
            onSubmit={addRule}
            className="grid gap-3 rounded-2xl border border-[#7d6154]/25 bg-[#ffffff] p-5"
            data-testid="promotion-rule-form"
          >
            <h3 className="font-semibold text-[#2b2521]">Add discount rule</h3>
            <label className="grid gap-1 text-sm text-[#6b5b52]">
              Type
              <select
                value={draftType}
                onChange={(e) => {
                  setDraftType(e.target.value as PromotionRuleType);
                  setLabelCustomized(false);
                }}
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
              >
                {PROMOTION_RULE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-[#6b5b52]">
              <span className="flex flex-wrap items-center justify-between gap-2">
                Label (shown at checkout)
                {labelCustomized ? (
                  <button
                    type="button"
                    className="text-xs text-[#7d6154] underline"
                    onClick={() => setLabelCustomized(false)}
                  >
                    Use auto label
                  </button>
                ) : null}
              </span>
              <input
                value={draftName}
                onChange={(e) => {
                  setDraftName(e.target.value);
                  setLabelCustomized(true);
                }}
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
                data-testid="promotion-rule-label"
              />
              {!labelCustomized ? (
                <span className="text-xs text-[#9a8a80]">
                  Generated from type and discount settings
                </span>
              ) : null}
            </label>
            {(draftType === "MEMBER_PERCENT" ||
              draftType === "FIRST_VISIT" ||
              draftType === "VISIT_MILESTONE" ||
              draftType === "MIN_SPEND_PERCENT") && (
              <label className="grid gap-1 text-sm text-[#6b5b52]">
                Discount percent
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={draftBps / 100}
                  onChange={(e) => setDraftBps(Math.round(Number(e.target.value) * 100))}
                  className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
                />
              </label>
            )}
            {(draftType === "MIN_SPEND_FLAT" || draftType === "FIRST_VISIT") && (
              <label className="grid gap-1 text-sm text-[#6b5b52]">
                Flat discount ($)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={(draftCents / 100).toFixed(2)}
                  onChange={(e) => setDraftCents(Math.round(Number(e.target.value) * 100))}
                  className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
                />
              </label>
            )}
            {draftType === "VISIT_MILESTONE" && (
              <label className="grid gap-1 text-sm text-[#6b5b52]">
                Visit number
                <input
                  type="number"
                  min={1}
                  value={draftMinVisits}
                  onChange={(e) => setDraftMinVisits(Number(e.target.value))}
                  className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
                />
              </label>
            )}
            {(draftType === "MIN_SPEND_PERCENT" || draftType === "MIN_SPEND_FLAT") && (
              <label className="grid gap-1 text-sm text-[#6b5b52]">
                Minimum spend ($)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={(draftMinSpend / 100).toFixed(2)}
                  onChange={(e) => setDraftMinSpend(Math.round(Number(e.target.value) * 100))}
                  className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
                />
              </label>
            )}
            {ruleErr ? <p className="text-sm text-[#f5a8a8]">{ruleErr}</p> : null}
            {ruleMsg ? <p className="text-sm text-[#9fe3b8]">{ruleMsg}</p> : null}
            <button type="submit" disabled={busy} className="btn-solid w-fit rounded-full px-5 py-2.5">
              {busy ? "Adding…" : "Add rule"}
            </button>
          </form>
        </>
      ) : null}

      <form
        onSubmit={saveBoardSettings}
        className="grid gap-4 rounded-2xl border border-[#7d6154]/30 bg-[#ffffff] p-5"
        data-testid="promotion-board-settings"
      >
        <div>
          <h3 className="font-semibold text-[#2b2521]">Customer display board</h3>
          <p className="mt-1 text-sm text-[#6b5b52]">
            Shows a styled carousel of your enabled discount rules on the customer TV. Turn a
            rule on above to include it — no image upload needed.
          </p>
        </div>

        <SettingToggle
          label="Show promotion board on customer display"
          checked={settings.promoBoardEnabled}
          onChange={(promoBoardEnabled) => setSettings((s) => ({ ...s, promoBoardEnabled }))}
          testId="promo-board-enabled"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm text-[#6b5b52]">
            Show every (seconds)
            <input
              type="number"
              min={30}
              max={600}
              value={settings.promoBoardIntervalSec}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  promoBoardIntervalSec: Number(e.target.value),
                }))
              }
              className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
            />
            <span className="text-xs text-[#9a8a80]">Time between board appearances</span>
          </label>
          <label className="grid gap-1 text-sm text-[#6b5b52]">
            Board on screen (seconds)
            <input
              type="number"
              min={5}
              max={300}
              value={settings.promoBoardShowSec}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  promoBoardShowSec: Number(e.target.value),
                }))
              }
              className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
              data-testid="promo-board-show-sec"
            />
            <span className="text-xs text-[#9a8a80]">How long the promo board stays visible</span>
          </label>
          <label className="grid gap-1 text-sm text-[#6b5b52]">
            Seconds per slide
            <input
              type="number"
              min={3}
              max={60}
              value={settings.promoBoardSlideSec}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  promoBoardSlideSec: Number(e.target.value),
                }))
              }
              className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
            />
            <span className="text-xs text-[#9a8a80]">How long each promo card stays on screen</span>
          </label>
        </div>

        <div className="rounded-xl border border-[#7d6154]/20 bg-[#fffcf9] px-4 py-3">
          <p className="text-sm font-semibold text-[#2b2521]">
            On the board now ({boardRules.length + (settings.loyaltyEnabled ? 1 : 0)})
          </p>
          {boardRules.length > 0 || settings.loyaltyEnabled ? (
            <ul className="mt-2 space-y-1 text-sm text-[#6b5b52]" data-testid="promo-board-preview">
              {settings.loyaltyEnabled ? (
                <li>
                  Loyalty Rewards ({settings.loyaltyPointsPerDollar} pt per $1)
                </li>
              ) : null}
              {boardRules.map((rule, i) => (
                <li key={rule.id}>
                  {settings.loyaltyEnabled ? i + 2 : i + 1}. {rule.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-[#6b5b52]">
              Enable automatic discounts and turn on at least one rule to populate the board.
            </p>
          )}
        </div>

        {boardErr ? <p className="text-sm text-[#f5a8a8]">{boardErr}</p> : null}
        {boardMsg ? <p className="text-sm text-[#9fe3b8]">{boardMsg}</p> : null}
        <button type="submit" disabled={boardBusy} className="btn-solid w-fit rounded-full px-5 py-2.5">
          Save display board settings
        </button>
      </form>
    </div>
  );
}
