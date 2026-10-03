"use client";

import { ChevronDownIcon } from "./icons";

export function SelectPill({
  label,
  value,
  options,
  onChange,
  compact,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const active = value !== "all" && value !== "default";

  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`appearance-none rounded-full border bg-surface py-2.5 pl-4 pr-10 text-[14px] font-medium outline-none transition ${
          active ? "border-brand-500 text-brand-600" : "border-line-strong text-ink hover:border-brand-400"
        } ${compact ? "min-w-[128px]" : "min-w-[164px]"}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value === "all" || option.value === "default" ? label : option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        width={17}
        height={17}
        className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 ${
          active ? "text-brand-600" : "text-ink"
        }`}
      />
    </div>
  );
}
