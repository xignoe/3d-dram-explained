import { useId, useRef, useState, type ReactNode } from 'react';
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
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; below: boolean }>({ x: 0, below: false });

  // Keep the tooltip inside the text column (it would otherwise slide under the sticky figure),
  // and open it below the word when there isn't room above.
  const place = () => {
    const el = ref.current;
    const tip = el?.querySelector<HTMLElement>('.term-tip');
    if (!el || !tip) return;
    // A term that wraps onto two lines anchors its tooltip to the first line's box.
    const r = el.getClientRects()[0] ?? el.getBoundingClientRect();
    const col = el.closest('.step-card, p, header')?.getBoundingClientRect() ?? { left: 8, right: innerWidth - 8 };
    const tipW = tip.offsetWidth || Math.min(272, innerWidth * 0.78);
    const right = Math.min(col.right, innerWidth - 8);
    const left = Math.max(col.left, 8);
    let x = 0;
    if (r.left + tipW > right) x = right - tipW - r.left;
    if (r.left + x < left) x = left - r.left;
    // Anything sticky above the text (the figure on phones) counts as covering the space above.
    const fig = el.closest('section')?.querySelector('figure')?.getBoundingClientRect();
    const coveredTop = fig && fig.bottom < r.top + 4 && fig.left < r.right && fig.right > r.left ? fig.bottom : 0;
    const below = r.top - (tip.offsetHeight || 80) - 12 < coveredTop;
    setPos({ x: Math.round(x), below });
  };

  return (
    <span ref={ref} className="term" tabIndex={0} aria-describedby={id} onMouseEnter={place} onFocus={place}>
      {children}
      <span role="tooltip" id={id} className={`term-tip ${pos.below ? 'term-tip-below' : ''}`} style={{ left: pos.x }}>{GLOSSARY[k]}</span>
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
