import { useId, type ReactNode } from 'react';
import type { Evidence } from '../data/paper';
import { GLOSSARY, type GlossaryKey } from '../data/glossary';

/** Typographic evidence marks, explained once in the introduction. */
const MARK: Record<Evidence, { glyph: string; label: string; title: string }> = {
  measured: { glyph: '■', label: 'Measured on silicon', title: 'Measured on Raptor silicon (Sec V of the paper)' },
  modeled: { glyph: '□', label: 'Modeled', title: 'From an analytical or performance model, not a silicon measurement' },
  derived: { glyph: '◇', label: 'Our arithmetic', title: 'Derived from numbers stated in the paper — not a figure from the paper' },
  design: { glyph: '–', label: 'Design parameter', title: 'A stated design parameter of the chip' },
};

export function Badge({ kind, className = '' }: { kind: Evidence; className?: string }) {
  const m = MARK[kind];
  return (
    <span className={`evidence ${className}`} title={m.title}>
      <span aria-hidden className="evidence-glyph">{m.glyph}</span>
      {m.label}
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
  const sz = size === 'xl' ? 'text-6xl lg:text-8xl' : size === 'lg' ? 'text-4xl lg:text-7xl' : 'text-3xl lg:text-5xl';
  return (
    <div>
      <div className={`num font-serif font-medium leading-[0.95] tracking-tight ${sz}`} style={{ color }}>
        {value}
        {unit && <span className="ml-1.5 text-[0.4em] font-normal text-muted">{unit}</span>}
      </div>
      <div className="sans mt-2 text-sm leading-snug text-muted">{label}</div>
    </div>
  );
}

/** The recurring kitchen analogy, set as a marginal note. */
export function Chef({ children }: { children: ReactNode }) {
  return (
    <p className="chef">
      <span className="chef-label smallcaps">In the kitchen</span>
      {children}
    </p>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="sans mt-4 text-[0.82rem] leading-relaxed text-muted">{children}</p>;
}

export function Src({ children }: { children: ReactNode }) {
  return <span className="src">Source: {children}</span>;
}

export const MEM_COLOR = {
  sram: 'var(--color-sram)',
  hbm: 'var(--color-hbm)',
  dram3d: 'var(--color-dram3d)',
} as const;
