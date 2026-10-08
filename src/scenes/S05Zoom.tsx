import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Scene, scrollToStep, type SceneState } from '../components/Scene';
import { Term } from '../components/ui';
import { HIERARCHY as H, BANK_BUDGET } from '../data/paper';
import { TOY } from '../data/illustrative';
import { fmt } from '../lib/fmt';
import { useDesktop } from '../lib/hooks';
import { P } from '../lib/palette';

const LEVELS = ['Card', 'MCM', 'Chiplet', 'Gang', 'Slice', 'Bank'] as const;

const LEDGER: ReactNode[][] = [
  [<><b className="num">{H.card.mcmsMin}–{H.card.mcmsMax}</b> multi-chip modules per card</>],
  [<><b className="num">{H.mcm.chiplets}</b> chiplets</>, <><b className="num">{H.mcm.powerW} W</b> per module</>, <><b className="num">{H.mcm.lpddrDevices}</b> × {H.mcm.lpddrType} = <b className="num">{H.mcm.lpddrGB} GB</b> overflow</>],
  [<><b className="num">{fmt(H.chiplet.banks)}</b> DRAM banks</>, <><b className="num">{H.chiplet.channels}</b> independent channels</>, <><b className="num">{H.chiplet.clockGHz} GHz</b> logic</>],
  [<><b className="num">{H.chiplet.gangs}</b> gangs per chiplet</>, <><b className="num">{H.gang.slices}</b> slices per gang</>],
  [<><b className="num">{H.slice.teRows}×{H.slice.teCols}</b> tensor engines</>, <><b className="num">{H.slice.simdCores}</b> SIMD core</>, <><b className="num">{H.slice.channels}</b> private DRAM channels</>],
  [<><b className="num">{fmt(H.bank.rows)}</b> rows × <b className="num">{H.bank.columns}</b> columns</>, <><b className="num">{H.bank.bytesPerColumnRead} bytes</b> per column read</>],
];

/* ------------------------------------------------------------------------- */
/* One drawing, nested to scale. Geometry is illustrative; counts are the    */
/* paper's (modules, chiplets, gangs, slices, engines, channels, banks).     */
/* ------------------------------------------------------------------------- */

type R = { x: number; y: number; w: number; h: number };
const grid = (n: number) => Array.from({ length: n }, (_, i) => i);
/** SVG rect attributes from a rectangle. */
const rp = (r: R) => ({ x: r.x, y: r.y, width: r.w, height: r.h });
const side = (n: number) => Math.round(Math.sqrt(n));

const CARD: R = { x: 0, y: 0, w: 1000, h: 470 };
const MCM_S = 205, MCM_GAP = 30;
const mcmR = (i: number): R => {
  const n = H.card.mcmsMax;
  const x0 = (CARD.w - (n * MCM_S + (n - 1) * MCM_GAP)) / 2;
  return { x: x0 + i * (MCM_S + MCM_GAP), y: 95, w: MCM_S, h: MCM_S };
};
const CH_S = 60, CH_GAP = 8;
const chipR = (m: R, i: number): R => {
  const k = side(H.mcm.chiplets), block = k * CH_S + (k - 1) * CH_GAP;
  return { x: m.x + (m.w - block) / 2 + (i % k) * (CH_S + CH_GAP), y: m.y + (m.h - block) / 2 + Math.floor(i / k) * (CH_S + CH_GAP), w: CH_S, h: CH_S };
};
const subR = (outer: R, n: number, i: number, margin: number, gap: number): R => {
  const k = side(n), s = (outer.w - 2 * margin - (k - 1) * gap) / k;
  return { x: outer.x + margin + (i % k) * (s + gap), y: outer.y + margin + Math.floor(i / k) * (s + gap), w: s, h: s };
};
const gangR = (c: R, i: number) => subR(c, H.chiplet.gangs, i, 2, 2);
const sliceR = (g: R, i: number) => subR(g, H.gang.slices, i, 1, 1);

/** Inside a slice: tensor-engine grid, SIMD core, and a cut-away of the DRAM beneath. */
function sliceParts(s: R) {
  const pad = s.w * 0.04, split = s.w * 0.64, dramTop = s.h * 0.67;
  const te: R = { x: s.x + pad, y: s.y + pad, w: split - 1.5 * pad, h: dramTop - 1.5 * pad };
  const simd: R = { x: s.x + split + pad / 2, y: s.y + pad, w: s.w - split - 1.5 * pad, h: dramTop - 1.5 * pad };
  const dram: R = { x: s.x + pad, y: s.y + dramTop + pad / 2, w: s.w - 2 * pad, h: s.h - dramTop - 1.5 * pad };
  const cw = dram.w / H.slice.channels, rh = dram.h / BANK_BUDGET.banksPerChannel;
  const bank = (ch: number, b: number): R => ({ x: dram.x + ch * cw + cw * 0.08, y: dram.y + b * rh + rh * 0.08, w: cw * 0.84, h: rh * 0.84 });
  return { te, simd, dram, bank };
}

const M0 = mcmR(0), C0 = chipR(M0, 0), G0 = gangR(C0, 0), S0 = sliceR(G0, 0);
const SP = sliceParts(S0);
const B0 = SP.bank(0, 0);
const FOCUS: R[] = [CARD, M0, C0, G0, S0, B0];

/* ---------------- camera ---------------- */

type Cam = { cx: number; cy: number; s: number };
function camFor(r: R, vw: number, vh: number, level: number): Cam {
  const fill = level === LEVELS.length - 1 ? 0.62 : 0.86; // leave room for labels around the bank
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2, s: Math.min(vw / r.w, vh / r.h) * fill };
}
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Zoom that keeps the destination (zooming in) or the origin (zooming out) anchored on screen. */
function interp(a: Cam, b: Cam, u: number, vw: number, vh: number): Cam {
  const s = Math.exp(Math.log(a.s) * (1 - u) + Math.log(b.s) * u);
  const mid = { x: vw / 2, y: vh / 2 };
  if (b.s >= a.s) {
    const p0 = { x: (b.cx - a.cx) * a.s + mid.x, y: (b.cy - a.cy) * a.s + mid.y };
    const p = { x: p0.x + (mid.x - p0.x) * u, y: p0.y + (mid.y - p0.y) * u };
    return { cx: b.cx - (p.x - mid.x) / s, cy: b.cy - (p.y - mid.y) / s, s };
  }
  const p1 = { x: (a.cx - b.cx) * b.s + mid.x, y: (a.cy - b.cy) * b.s + mid.y };
  const p = { x: mid.x + (p1.x - mid.x) * u, y: mid.y + (p1.y - mid.y) * u };
  return { cx: a.cx - (p.x - mid.x) / s, cy: a.cy - (p.y - mid.y) / s, s };
}

function useCamera(level: number, vw: number, vh: number, reduced: boolean) {
  const target = camFor(FOCUS[level], vw, vh, level);
  const [cam, setCam] = useState<Cam>(target);
  const [moving, setMoving] = useState(false);
  const camRef = useRef(cam);
  camRef.current = cam;

  useEffect(() => {
    const from = camRef.current, to = camFor(FOCUS[level], vw, vh, level);
    if (reduced) { setCam(to); setMoving(false); return; }
    const zoomSpan = Math.abs(Math.log(to.s / from.s));
    const dur = TOY.zoomMs * Math.min(1.6, 0.6 + zoomSpan / 3);
    const t0 = performance.now();
    let raf = 0;
    setMoving(true);
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      setCam(interp(from, to, ease(t), vw, vh));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setMoving(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level, vw, vh, reduced]);

  return { cam, moving };
}

/** 0 → 1 as the camera scale passes from `a` to `b` (level of detail). */
const lod = (s: number, a: number, b: number) => Math.min(1, Math.max(0, (s - a) / (b - a)));

/** A detail layer that fades in with zoom. Fully hidden layers are not rendered at all:
 *  their sub-pixel, non-scaling strokes can otherwise paint as stray lines across the figure. */
function Lod({ s, a, b, children }: { s: number; a: number; b: number; children: ReactNode }) {
  const o = lod(s, a, b);
  return o > 0 ? <g opacity={o}>{children}</g> : null;
}

const ns = { vectorEffect: 'non-scaling-stroke' as const };

function World({ s }: { s: number }) {
  const parts = sliceParts(S0);
  const bankRows = TOY.bankRowsDrawn, bankCols = TOY.bankColsDrawn;
  return (
    <g strokeLinejoin="round">
      {/* card */}
      <rect {...rp(CARD)} rx={14} fill={P.board} stroke={P.ink} strokeWidth={1.4} {...ns} />
      {grid(34).map((i) => (
        <rect key={i} x={170 + i * 19} y={CARD.h - 4} width={12} height={26} rx={2} fill={P.gold} stroke={P.ink3} strokeWidth={0.6} {...ns} />
      ))}
      {grid(H.card.mcmsMax).map((i) => {
        const m = mcmR(i);
        const ghost = i >= H.card.mcmsMin;
        if (ghost) return <rect key={i} {...rp(m)} rx={6} fill="none" stroke={P.ink3} strokeDasharray="6 5" strokeWidth={1} {...ns} />;
        return (
          <g key={i}>
            <rect {...rp(m)} rx={6} fill={P.plate2} stroke={P.ink} strokeWidth={1.2} {...ns} />
            {grid(H.mcm.lpddrDevices).map((k) => {
              const half = H.mcm.lpddrDevices / 2;
              const left = k < half;
              return <rect key={k} x={left ? m.x + 9 : m.x + m.w - 29} y={m.y + 24 + (k % half) * 42} width={20} height={32} rx={2} fill={P.lpddr} stroke={P.ink} strokeWidth={0.8} {...ns} />;
            })}
            {grid(H.mcm.chiplets).map((c) => {
              const r = chipR(m, c);
              return (
                <g key={c}>
                  {/* DRAM die peeking out beneath the logic die */}
                  <rect x={r.x + 2.2} y={r.y + 2.2} width={r.w} height={r.h} fill={P.dramMid} stroke={P.ink} strokeWidth={0.8} {...ns} />
                  <rect {...rp(r)} fill={P.logic} stroke={P.ink} strokeWidth={1} {...ns} />
                  <Lod s={s} a={1.4} b={2.6}>
                    {grid(H.chiplet.gangs).map((g) => {
                      const gr = gangR(r, g);
                      return (
                        <g key={g}>
                          <rect {...rp(gr)} fill="none" stroke={P.ink2} strokeWidth={0.8} {...ns} />
                          <Lod s={s} a={4} b={7}>
                            {grid(H.gang.slices).map((k) => <rect key={k} {...rp(sliceR(gr, k))} fill={P.logic} stroke={P.ink3} strokeWidth={0.7} {...ns} />)}
                          </Lod>
                        </g>
                      );
                    })}
                  </Lod>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* detail inside the first slice */}
      <Lod s={s} a={12} b={22}>
        <rect {...rp(S0)} fill={P.paper} stroke={P.ink} strokeWidth={1.2} {...ns} />
        {grid(H.slice.teRows * H.slice.teCols).map((i) => {
          const gap = parts.te.w * 0.05;
          const cw = (parts.te.w - (H.slice.teCols - 1) * gap) / H.slice.teCols;
          const chh = (parts.te.h - (H.slice.teRows - 1) * gap) / H.slice.teRows;
          return <rect key={i} x={parts.te.x + (i % H.slice.teCols) * (cw + gap)} y={parts.te.y + Math.floor(i / H.slice.teCols) * (chh + gap)} width={cw} height={chh} fill={P.te} stroke={P.ink} strokeWidth={0.8} {...ns} />;
        })}
        <rect {...rp(parts.simd)} fill={P.logicDark} stroke={P.ink} strokeWidth={0.8} {...ns} />
        <rect {...rp(parts.dram)} fill={P.dramTint} stroke={P.dram} strokeWidth={1} strokeDasharray="4 3" {...ns} />
        {grid(H.slice.channels).map((ch) => grid(BANK_BUDGET.banksPerChannel).map((b) => (
          <rect key={`${ch}-${b}`} {...rp(parts.bank(ch, b))} fill={ch === 0 && b === 0 ? P.dram : P.dramMid} stroke={P.ink} strokeWidth={0.5} {...ns} />
        )))}
      </Lod>

      {/* inside one bank: rows x columns, one column highlighted, row buffer at the foot */}
      <Lod s={s} a={120} b={240}>
        <rect {...rp(B0)} fill={P.paper} stroke={P.ink} strokeWidth={1.4} {...ns} />
        {grid(bankRows + 1).map((r) => (
          <line key={`r${r}`} x1={B0.x} x2={B0.x + B0.w} y1={B0.y + (r * B0.h * 0.9) / bankRows} y2={B0.y + (r * B0.h * 0.9) / bankRows} stroke={P.rule} strokeWidth={0.6} {...ns} />
        ))}
        {grid(bankCols + 1).map((c) => (
          <line key={`c${c}`} y1={B0.y} y2={B0.y + B0.h * 0.9} x1={B0.x + (c * B0.w) / bankCols} x2={B0.x + (c * B0.w) / bankCols} stroke={P.rule} strokeWidth={0.6} {...ns} />
        ))}
        <rect x={B0.x + (TOY.bankColHighlighted * B0.w) / bankCols} y={B0.y} width={B0.w / bankCols} height={B0.h * 0.9} fill={P.dram} fillOpacity={0.35} stroke={P.dram} strokeWidth={1.2} {...ns} />
        <rect x={B0.x} y={B0.y + B0.h * 0.92} width={B0.w} height={B0.h * 0.08} fill={P.sramTint} stroke={P.ink} strokeWidth={0.8} {...ns} />
      </Lod>
    </g>
  );
}

type Label = { at: [number, number]; text: string; anchor?: 'start' | 'middle' | 'end'; dx?: number; dy?: number };
function labelsFor(level: number): Label[] {
  const parts = sliceParts(S0);
  const half = H.mcm.lpddrDevices / 2;
  switch (level) {
    case 0: return [
      { at: [M0.x + M0.w / 2, M0.y + M0.h], text: 'module', dy: 18 },
      { at: [mcmR(1).x + MCM_S / 2, M0.y + M0.h], text: 'module', dy: 18 },
      { at: [mcmR(2).x + MCM_S + MCM_GAP / 2, M0.y + M0.h], text: `room for up to ${H.card.mcmsMax}`, dy: 18 },
    ];
    case 1: return [
      { at: [C0.x + C0.w / 2, C0.y], text: 'chiplet', dy: -8 },
      { at: [M0.x + 19, M0.y + 24 + half * 42], text: 'LPDDR5X', dy: 8 },
      { at: [M0.x + M0.w / 2, M0.y + M0.h], text: 'one module', dy: 18 },
    ];
    case 2: return [
      { at: [C0.x + C0.w / 2, C0.y], text: 'logic die (the DRAM die is underneath)', dy: -8 },
      { at: [G0.x + G0.w / 2, G0.y + G0.h / 2], text: 'gang' },
    ];
    case 3: return [
      { at: [S0.x + S0.w / 2, S0.y + S0.h / 2], text: 'slice' },
      { at: [G0.x + G0.w / 2, G0.y], text: 'one gang', dy: -8 },
    ];
    case 4: return [
      { at: [parts.te.x + parts.te.w / 2, parts.te.y], text: 'tensor engines', dy: -8 },
      { at: [parts.simd.x + parts.simd.w / 2, parts.simd.y], text: 'SIMD', dy: -8 },
      { at: [parts.dram.x + parts.dram.w / 2, parts.dram.y + parts.dram.h], text: `DRAM beneath: ${H.slice.channels} channels × ${BANK_BUDGET.banksPerChannel} banks`, dy: 18 },
    ];
    default: return [
      { at: [B0.x, B0.y + B0.h * 0.45], text: `${fmt(H.bank.rows)} rows`, anchor: 'end', dx: -10 },
      { at: [B0.x + B0.w / 2, B0.y], text: `${H.bank.columns} columns`, dy: -10 },
      { at: [B0.x + B0.w, B0.y + B0.h * 0.3], text: `column read: ${H.bank.bytesPerColumnRead} B`, anchor: 'start', dx: 10 },
      { at: [B0.x + B0.w, B0.y + B0.h * 0.96], text: 'row buffer', anchor: 'start', dx: 10 },
    ];
  }
}

/** The figure box in CSS pixels, so the drawing fills it and labels render at their true size. */
function useBoxSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: 600, h: 420 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function ZoomFigure({ level, reduced }: { level: number; reduced: boolean }) {
  const narrow = !useDesktop();
  const box = useRef<HTMLDivElement>(null);
  const { w: VW, h: VH } = useBoxSize(box);
  const { cam, moving } = useCamera(level, VW, VH, reduced);
  const toScreen = (x: number, y: number) => [(x - cam.cx) * cam.s + VW / 2, (y - cam.cy) * cam.s + VH / 2];
  const labels = useMemo(() => labelsFor(level), [level]);
  return (
    <div ref={box} className="absolute inset-0">
    <svg viewBox={`0 0 ${VW} ${VH}`} width={VW} height={VH} className="block" aria-hidden>
      <defs><clipPath id="zoom-clip"><rect width={VW} height={VH} /></clipPath></defs>
      <g clipPath="url(#zoom-clip)">
        <g transform={`translate(${VW / 2} ${VH / 2}) scale(${cam.s}) translate(${-cam.cx} ${-cam.cy})`}>
          <World s={cam.s} />
        </g>
      </g>
      <g className="fade" opacity={moving ? 0 : 1} fontSize={narrow ? 12 : 13} fill={P.ink} style={{ fontFamily: 'var(--font-serif)' }} fontStyle="italic">
        {labels.map((l, i) => {
          const [x, y] = toScreen(l.at[0], l.at[1]);
          return (
            <text key={i} x={x + (l.dx ?? 0)} y={y + (l.dy ?? 0)} textAnchor={l.anchor ?? 'middle'} dominantBaseline="middle" paintOrder="stroke" stroke={P.paper} strokeWidth={4}>{l.text}</text>
          );
        })}
      </g>
    </svg>
    </div>
  );
}

function Visual({ step, reduced }: SceneState) {
  const level = Math.min(step, LEVELS.length - 1);
  return (
    <div className="flex h-full flex-col gap-2">
      <nav aria-label="Zoom level" className="sans flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.82rem]">
        {LEVELS.map((l, i) => (
          <span key={l} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-faint">›</span>}
            <button
              className={i === level ? 'font-semibold text-ink underline decoration-[1.5px] underline-offset-4' : 'text-faint hover:text-ink'}
              aria-current={i === level ? 'step' : undefined}
              onClick={() => scrollToStep('zoom', i, reduced)}
            >{l}</button>
          </span>
        ))}
      </nav>
      <div className="relative min-h-0 flex-1"><ZoomFigure level={level} reduced={reduced} /></div>
      <ul className="sans flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-2 text-xs text-muted lg:text-sm [&_b]:font-semibold [&_b]:text-ink">
        {LEDGER[level].map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </div>
  );
}

export function S05Zoom() {
  return (
    <Scene
      id="zoom"
      num={5}
      kicker="Powers of ten"
      title="From a whole card down to a single bank"
      steps={[
        <p key="0">Before getting to the challenges, it helps to see how the chip is organized. A Raptor accelerator card carries <strong className="num">{H.card.mcmsMin} to {H.card.mcmsMax}</strong> <Term k="mcm">multi-chip modules</Term>, or MCMs.</p>,
        <p key="1">Each MCM contains <strong className="num">{H.mcm.chiplets}</strong> <Term k="chiplet">chiplets</Term> and is designed for about <strong className="num">{H.mcm.powerW} W</strong>. Around them are <strong className="num">{H.mcm.lpddrDevices}</strong> conventional {H.mcm.lpddrType} memory chips, which add <strong className="num">{H.mcm.lpddrGB} GB</strong> of slower memory for data that doesn’t fit in the stacked DRAM.</p>,
        <p key="2">A chiplet is the stack from the previous section: a logic die bonded to a DRAM die. The DRAM die is divided into <strong className="num">{fmt(H.chiplet.banks)}</strong> <Term k="bank">banks</Term>. Most of them are grouped into <strong className="num">{H.chiplet.channels}</strong> independent <Term k="channel">channels</Term>, and the rest are held back as spares.</p>,
        <p key="3">The logic die is divided into <strong className="num">{H.chiplet.gangs}</strong> gangs. A gang groups neighboring slices so that they can work together on a larger part of the model without involving the rest of the chip.</p>,
        <p key="4">Each gang contains <strong className="num">{H.gang.slices}</strong> slices, which the paper treats as the basic unit of the design. A slice has a <strong className="num">{H.slice.teRows}×{H.slice.teCols}</strong> array of tensor engines for matrix arithmetic, a SIMD core for other operations, and <strong className="num">{H.slice.channels}</strong> DRAM channels of its own directly underneath. The channels are independent, so maintenance work on one of them doesn’t hold up the others.</p>,
        <p key="5">At the bottom of the hierarchy is a single bank, a grid of <strong className="num">{fmt(H.bank.rows)}</strong> rows by <strong className="num">{H.bank.columns}</strong> columns. Reading one column returns <strong className="num">{H.bank.bytesPerColumnRead} bytes</strong>. These dimensions come up again in each of the challenges that follow.</p>,
      ]}
      description={(s) => {
        const l = Math.min(s.step, LEVELS.length - 1);
        return `Zoom level ${l + 1} of ${LEVELS.length}: ${LEVELS[l]}. ` + [
          `A card with ${H.card.mcmsMin} to ${H.card.mcmsMax} multi-chip modules.`,
          `A module with ${H.mcm.chiplets} chiplets and ${H.mcm.lpddrDevices} LPDDR5X chips giving ${H.mcm.lpddrGB} GB; ${H.mcm.powerW} watts.`,
          `A chiplet: logic die on a DRAM die with ${H.chiplet.banks} banks in ${H.chiplet.channels} channels.`,
          `The logic die divided into ${H.chiplet.gangs} gangs of ${H.gang.slices} slices.`,
          `A slice: ${H.slice.teRows} by ${H.slice.teCols} tensor engines, a SIMD core, and ${H.slice.channels} DRAM channels beneath it.`,
          `A bank: ${H.bank.rows} rows by ${H.bank.columns} columns; each column read returns ${H.bank.bytesPerColumnRead} bytes.`,
        ][l];
      }}
      visual={(s) => <Visual {...s} />}
      figure={(s) => ({ caption: <>A single drawing seen at increasing magnification ({LEVELS.slice(0, Math.min(s.step, LEVELS.length - 1) + 1).join(' › ')}). The counts follow the paper, but shapes and proportions are schematic, and the bank is drawn with far fewer rows than its real {fmt(H.bank.rows)}. Source: Sec IV-A to IV-C.</> })}
    />
  );
}
