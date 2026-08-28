"use client";

import { useCallback, useEffect, useState } from "react";
import { centsToDollars } from "@/lib/pay";
import { PROMOTION_RULE_TYPES, type PromotionRuleType } from "@/lib/promotions";

type PromoSettings = {
  loyaltyEnabled: boolean;
  discountsEnabled: boolean;
  loyaltyPointsPerDollar: number;
  loyaltyCentsPerPoint: number;
  loyaltyMaxRedeemPercent: number;
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
  });
  const [rules, setRules] = useState<Rule[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [ruleMsg, setRuleMsg] = useState("");
  const [ruleErr, setRuleErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftType, setDraftType] = useState<PromotionRuleType>("MEMBER_PERCENT");
  const [draftName, setDraftName] = useState("Member 10% off");
  const [draftBps, setDraftBps] = useState(1000);
  const [draftCents, setDraftCents] = useState(0);
  const [draftMinVisits, setDraftMinVisits] = useState(5);
  const [draftMinSpend, setDraftMinSpend] = useState(8000);

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
    const payload = next ?? settings;
    const res = await fetch("/api/admin/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Could not save settings");
    }
    if (data.settings) setSettings(data.settings);
    return data.settings as PromoSettings;
  }

  useEffect(() => {
    void load();
  }, [load]);

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
    } catch (error) {
      setRuleErr(error instanceof Error ? error.message : "Could not add rule");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRule(rule: Rule) {
    await fetch("/api/admin/promotions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
    });
    await load();
  }

  async function removeRule(id: string) {
    await fetch(`/api/admin/promotions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

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

        <label className="flex items-center justify-between gap-3 text-sm text-[#2b2521]">
          <span>Enable loyalty points (members)</span>
          <input
            type="checkbox"
            checked={settings.loyaltyEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, loyaltyEnabled: e.target.checked }))}
            data-testid="promo-loyalty-enabled"
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-[#2b2521]">
          <span>Enable automatic discounts</span>
          <input
            type="checkbox"
            checked={settings.discountsEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, discountsEnabled: e.target.checked }))}
            data-testid="promo-discounts-enabled"
          />
        </label>

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
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-[#7d6154]/35 px-3 py-1 text-xs"
                    onClick={() => void toggleRule(rule)}
                  >
                    {rule.enabled ? "On" : "Off"}
                  </button>
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
                onChange={(e) => setDraftType(e.target.value as PromotionRuleType)}
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
              Label (shown at checkout)
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="rounded-xl border border-[#7d6154]/35 bg-[#fffcf9] px-3 py-2 text-[#2b2521]"
              />
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
    </div>
  );
}
