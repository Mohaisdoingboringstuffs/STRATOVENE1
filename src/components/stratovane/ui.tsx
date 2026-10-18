"use client";

import { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Uppercase kicker label used above every section title. */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">{children}</p>
  );
}

/** STRATOVANE mark: a finned enclosure with one hot fin. */
export function VaneMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("shrink-0", className)}>
      <rect width="24" height="24" rx="2.5" fill="#09090b" />
      <path d="M3 13 L13 3" stroke="#fafafa" strokeWidth="1.8" fill="none" />
      <path d="M7 21 L21 7" stroke="#fafafa" strokeWidth="1.8" fill="none" />
      <path d="M14 22 L22 14" stroke="#fafafa" strokeWidth="1.8" fill="none" />
      <path d="M10 16 L16 10" stroke="#f97316" strokeWidth="2.4" fill="none" />
    </svg>
  );
}

/**
 * Instrument-style numeric field: type a value, press Enter (or blur) to commit,
 * ArrowUp/ArrowDown to step, Shift for x10. Out-of-range input snaps to the
 * nearest step inside [min, max]. Pairs with a slider above or below it.
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step,
  unit,
  decimals,
  label,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  label: string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const d = decimals ?? (step >= 1 ? 0 : step >= 0.1 ? 1 : 2);
  const show = (v: number) => v.toFixed(d);

  const commit = (raw: string) => {
    const parsed = Number(raw.trim().replace(",", "."));
    if (!Number.isFinite(parsed)) return; // invalid input: keep previous value
    const snapped = Math.round(parsed / step) * step;
    const clamped = Math.min(max, Math.max(min, Number(snapped.toFixed(4))));
    if (clamped !== value) onChange(clamped);
  };

  const bump = (dir: 1 | -1, mult: number) => {
    const next = value + dir * step * mult;
    const clamped = Math.min(max, Math.max(min, Number(next.toFixed(4))));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={draft ?? show(value)}
        aria-label={label}
        title="Type a value, press Enter. Arrow keys step, Shift+Arrow steps x10."
        onFocus={(e) => {
          setDraft(show(value));
          e.target.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null) commit(draft);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (draft !== null) commit(draft);
            setDraft(null);
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            bump(1, e.shiftKey ? 10 : 1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            bump(-1, e.shiftKey ? 10 : 1);
          }
        }}
        className={cn(
          "h-8 w-[92px] rounded-[3px] border border-zinc-300 bg-white pr-[46px] text-right font-mono text-[13px] tabular-nums text-zinc-950 outline-none transition-colors",
          "hover:border-zinc-400 focus:border-zinc-900 focus:bg-white"
        )}
      />
      {unit ? (
        <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zinc-400">
          {unit}
        </span>
      ) : null}
      <span className="absolute right-0 top-0 flex h-full w-6 flex-col overflow-hidden rounded-r-[3px] border-l border-zinc-200">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => bump(1, 1)}
          className="flex h-1/2 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => bump(-1, 1)}
          className="flex h-1/2 items-center justify-center border-t border-zinc-200 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">{children}</h2>
      {sub ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{sub}</p> : null}
    </div>
  );
}

/** Small labeled number used in stat rows; tabular figures keep it steady. */
export function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-950">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-zinc-400">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-xs leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function MonoStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-24">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-zinc-900">{value}</p>
      {hint ? <p className="text-[11px] text-zinc-400">{hint}</p> : null}
    </div>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700",
        className
      )}
    />
  );
}

export function TagChip({ tag }: { tag: string }) {
  const styles: Record<string, string> = {
    AUDIT: "bg-zinc-900 text-white",
    SIM: "bg-orange-600 text-white",
    DOC: "bg-emerald-700 text-white",
    SITE: "bg-zinc-500 text-white",
    EXPERIMENT: "bg-amber-500 text-white",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-wider",
        styles[tag] ?? "bg-zinc-300 text-zinc-800"
      )}
    >
      {tag}
    </span>
  );
}

export function ChartFrame({
  title,
  caption,
  children,
  right,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <figure className="rounded-lg border border-zinc-200 bg-white">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <span className="text-sm font-medium text-zinc-800">{title}</span>
        {right}
      </figcaption>
      <div className="px-2 py-3">{children}</div>
      {caption ? (
        <p className="border-t border-zinc-100 px-4 py-2.5 text-xs leading-relaxed text-zinc-500">
          {caption}
        </p>
      ) : null}
    </figure>
  );
}
