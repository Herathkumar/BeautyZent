"use client";

import { ToggleSwitch } from "@/components/ToggleSwitch";

type SettingToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
  disabled?: boolean;
  /** Hide label text visually but keep it for screen readers (rule rows). */
  hideLabel?: boolean;
  description?: string;
};

export function SettingToggle({
  label,
  checked,
  onChange,
  testId,
  disabled,
  hideLabel,
  description,
}: SettingToggleProps) {
  return (
    <label
      className={`flex gap-3 ${description ? "items-start" : "items-center"} ${
        hideLabel ? "justify-end" : "justify-between"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span className={`text-sm text-[#2b2521] ${hideLabel ? "sr-only" : ""}`}>
        {description ? (
          <>
            <span className="font-semibold">{label}</span>
            <span className="mt-1 block text-xs font-normal text-[#6b5b52]/90">{description}</span>
          </>
        ) : (
          label
        )}
      </span>
      <ToggleSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        testId={testId}
        ariaLabel={label}
        variant="admin"
      />
    </label>
  );
}
