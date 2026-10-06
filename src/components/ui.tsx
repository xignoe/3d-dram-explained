import { useId, type ReactNode } from 'react';
import type { Evidence } from '../data/paper';
import { GLOSSARY, type GlossaryKey } from '../data/glossary';

const BADGE: Record<Evidence, { label: string; title: string; cls: string }> = {
  measured: { label: 'Measured', title: 'Measured on Raptor silicon (Sec V of the paper)', cls: 'badge-measured' },
  modeled: { label: 'Modeled', title: 'From an analytical or performance model, not a silicon measurement', cls: 'badge-modeled' },
  derived: { label: 'Derived', title: 'Our arithmetic on numbers stated in the paper — not a figure from the paper', cls: 'badge-derived' },
  design: { label: 'Design', title: 'A stated design parameter of the chip', cls: 'badge-design' },
};

export function Badge({ kind, className = '' }: { kind: Evidence; className?: string }) {
  const b = BADGE[kind];
  return (
    <span className={`badge ${b.cls} ${className}`} title={b.title}>
      <span aria-hidden className="badge-dot" />
      {b.label}
      <span className="sr-only">: {b.title}</span>
    </span>
  );
}

export function Term({ k, children }: { k: GlossaryKey; children: ReactNode }) {
  const id = useId();
  return (
    <span className="term" tabIndex={0} aria-describedby={id}>
      {children}
      <span role="tooltip" id={id} className="term-tip">{GLOSSARY[k]}</span>
    </span>
  );
}

export function BigStat({ value, unit, label, color = 'var(--color-ink)', size = 'lg' }: {
  value: ReactNode; unit?: ReactNode; label: ReactNode; color?: string; size?: 'md' | 'lg' | 'xl';
}) {
  const sz = size === 'xl' ? 'text-5xl lg:text-7xl' : size === 'lg' ? 'text-4xl lg:text-6xl' : 'text-2xl lg:text-4xl';
  return (
    <div>
      <div className={`num font-semibold leading-none ${sz}`} style={{ color }}>
        {value}
        {unit && <span className="ml-1 text-[0.45em] font-medium text-muted">{unit}</span>}
      </div>
      <div className="mt-2 text-sm text-muted">{label}</div>
    </div>
  );
}

/** The recurring chef metaphor, used lightly. */
export function Chef({ children }: { children: ReactNode }) {
  return (
    <p className="chef">
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M7 14v5h10v-5" />
        <path d="M7 14a4 4 0 0 1-1-7.6A4 4 0 0 1 12 4a4 4 0 0 1 6 2.4A4 4 0 0 1 17 14Z" />
        <path d="M7 17h10" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs leading-relaxed text-muted">{children}</p>;
}

export function Src({ children }: { children: ReactNode }) {
  return <span className="src">Source: {children}</span>;
}

export const MEM_COLOR = {
  sram: 'var(--color-sram)',
  hbm: 'var(--color-hbm)',
  dram3d: 'var(--color-dram3d)',
} as const;
