import { useCallback, useEffect, useRef, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { ProblemChips } from '../components/Problems';
import { BigStat, Term } from '../components/ui';
import { STREAM_FLIPPING as SF } from '../data/paper';
import { TOY } from '../data/illustrative';
import { useDesktop, useTicker } from '../lib/hooks';
import { fmt } from '../lib/fmt';
import { P } from '../lib/palette';

type Pattern = 'random' | 'alternating' | 'similar';
interface Row { bits: Uint8Array; flag: boolean; switches: number }

const hamming = (a: Uint8Array, b: Uint8Array) => { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] ^ b[i]; return d; };
const invert = (a: Uint8Array) => a.map((x) => x ^ 1);

function nextRaw(pattern: Pattern, prev: Uint8Array, i: number): Uint8Array {
  const N = prev.length;
  if (pattern === 'random') return Uint8Array.from({ length: N }, () => (Math.random() < 0.5 ? 1 : 0));
  if (pattern === 'alternating') return new Uint8Array(N).fill(i % 2);
  // "similar": small changes, but values sometimes swing to their opposite (e.g. sign changes)
  const base = Math.random() < 0.3 ? invert(prev) : prev.slice();
  for (let k = 0; k < N; k++) if (Math.random() < TOY.similarFlipFraction) base[k] ^= 1;
  return base;
}

function useBitStream(flipOn: boolean, pattern: Pattern, N: number) {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ actual: 0, baseline: 0, chunks: 0 });
  const st = useRef<{ prevRaw: Uint8Array; prevSent: Uint8Array; i: number }>({ prevRaw: new Uint8Array(N), prevSent: new Uint8Array(N), i: 0 });

  const reset = useCallback(() => {
    st.current = { prevRaw: new Uint8Array(N), prevSent: new Uint8Array(N), i: 0 };
    setRows([]);
    setTotals({ actual: 0, baseline: 0, chunks: 0 });
  }, [N]);
  useEffect(reset, [flipOn, pattern, reset]);

  const step = useCallback(() => {
    const s = st.current;
    const raw = nextRaw(pattern, s.prevRaw, s.i++);
    const baseline = hamming(raw, s.prevRaw);
    const d = hamming(raw, s.prevSent);
    const flag = flipOn && d > N / 2;
    const sent = flag ? invert(raw) : raw;
    const switches = flag ? N - d : d;
    s.prevRaw = raw;
    s.prevSent = sent;
    setRows((r) => [{ bits: sent, flag, switches }, ...r].slice(0, TOY.rowsShown));
    setTotals((t) => ({ actual: t.actual + switches, baseline: t.baseline + baseline, chunks: t.chunks + 1 }));
  }, [flipOn, pattern, N]);

  return { rows, totals, step, reset };
}

function Strip({ rows, flipOn, N }: { rows: Row[]; flipOn: boolean; N: number }) {
  const C = 7, G = 1, RH = 16;
  const W = N * (C + G) + 30;
  return (
    <svg viewBox={`0 0 ${W} ${TOY.rowsShown * RH + 20}`} className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMin meet">
      <text x={0} y={10} fontSize="9" fill="var(--color-muted)">newest chunk ↓ (each row: {N} wires shown, standing in for {fmt(SF.chunkBits)})</text>
      {rows.map((r, ri) => {
        const below = rows[ri + 1];
        return (
          <g key={ri} transform={`translate(0 ${16 + ri * RH})`} opacity={1 - ri * 0.06}>
            {Array.from(r.bits).map((b, k) => {
              const changed = below ? below.bits[k] !== b : false;
              return <rect key={k} x={k * (C + G)} width={C} height={RH - 4} rx={1.5}
                fill={changed ? P.sram : b ? P.ink2 : P.plate2} />;
            })}
            {flipOn && (
              <rect x={N * (C + G) + 10} width={C + 4} height={RH - 4} rx={2} fill={r.flag ? 'var(--color-dram3d)' : 'transparent'} stroke="var(--color-dram3d)" strokeOpacity={0.5} />
            )}
          </g>
        );
      })}
      {flipOn && <text x={N * (C + G) + 16} y={10} fontSize="9" textAnchor="middle" fill="var(--color-dram3d)">flag</text>}
    </svg>
  );
}

/** Side view of the two dies with the vertical connections between them; a few are switching. */
function WiresFigure() {
  const n = TOY.wiresDrawn;
  const switching = (i: number) => (i * 7919) % 5 < 2; // a fixed, irregular pattern of switching wires
  return (
    <div className="flex h-full flex-col justify-center-safe gap-6">
      <svg viewBox="0 0 520 210" className="w-full" aria-hidden>
        <rect x={20} y={20} width={480} height={34} fill={P.logic} stroke={P.ink} strokeWidth={1.2} />
        <text x={30} y={42} fontSize="12" fill={P.ink}>logic die</text>
        <rect x={20} y={150} width={480} height={34} fill={P.dramTint} stroke={P.ink} strokeWidth={1.2} />
        <text x={30} y={172} fontSize="12" fill={P.ink}>DRAM die</text>
        {Array.from({ length: n }, (_, i) => {
          const x = 32 + (i * 456) / (n - 1);
          const on = switching(i);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={54} y2={150} stroke={on ? P.sram : P.ink3} strokeWidth={on ? 2.2 : 1}
                style={on ? { animation: 'pulse-soft 0.9s ease-in-out infinite', animationDelay: `${(i % 7) * 0.13}s` } : undefined} />
              <circle cx={x} cy={54} r={2} fill={P.ink3} />
              <circle cx={x} cy={150} r={2} fill={P.ink3} />
            </g>
          );
        })}
        <text x={260} y={204} textAnchor="middle" fontSize="11" fill={P.ink2}>each orange line is a connection flipping between 0 and 1, which costs energy</text>
      </svg>
      <BigStat size="xl" value={`≈${SF.ioPowerAt100TBsW}`} unit="W" label={<>per card spent just switching these connections at {SF.atBandwidthTBs} TB/s, before any countermeasure</>} />
    </div>
  );
}

/** The measured result as a drawn comparison of energy per bit. */
function EnergyFigure() {
  const max = SF.beforePJPerBit;
  const L = 360;
  const bars = [
    { label: 'every wire switching', v: SF.beforePJPerBit, color: P.ink2 },
    { label: 'with stream flipping', v: SF.afterPJPerBit, color: P.dram },
  ];
  return (
    <div className="flex h-full flex-col justify-center-safe gap-4">
      <div className="sans text-sm text-muted">Energy to move one bit between the dies</div>
      <svg viewBox="0 0 520 196" className="w-full" aria-hidden>
        {bars.map((b, i) => (
          <g key={b.label} transform={`translate(0 ${20 + i * 80})`}>
            <text x={0} y={0} fontSize="12" fill={P.ink2}>{b.label}</text>
            <rect x={0} y={10} width={(b.v / max) * L} height={34} fill={b.color} fillOpacity={0.85} stroke={P.ink} strokeWidth={1} />
            <text x={(b.v / max) * L + 10} y={34} fontSize="20" style={{ fontFamily: 'var(--font-serif)' }} fill={P.ink}>{b.v} <tspan fontSize="12" fill={P.ink2}>pJ/bit</tspan></text>
          </g>
        ))}
        {/* bracket marking the saving */}
        {/* dimension line between the two bar ends */}
        <g stroke={P.dram} strokeWidth={1.2}>
          <line x1={(SF.afterPJPerBit / max) * L} x2={L} y1={172} y2={172} />
          <line x1={(SF.afterPJPerBit / max) * L} x2={(SF.afterPJPerBit / max) * L} y1={164} y2={180} />
          <line x1={L} x2={L} y1={164} y2={180} />
          <line x1={(SF.afterPJPerBit / max) * L} x2={(SF.afterPJPerBit / max) * L} y1={146} y2={160} strokeDasharray="2 3" strokeOpacity={0.6} />
        </g>
        <text x={L + 12} y={180} fontSize="22" style={{ fontFamily: 'var(--font-serif)' }} fill={P.dram}>−{SF.reductionPct}%</text>
      </svg>
      <p className="sans text-sm text-muted">No extra pins, and one flag bit per {SF.chunkBytes}-byte chunk.</p>
    </div>
  );
}

function Visual({ step, inView, reduced }: SceneState) {
  const [manualFlip, setManualFlip] = useState<boolean | null>(null);
  const [pattern, setPattern] = useState<Pattern>('random');
  const [paused, setPaused] = useState(false);
  useEffect(() => setManualFlip(null), [step]);
  const flipOn = manualFlip ?? step >= 2;
  const N = useDesktop() ? TOY.bitWidth : TOY.bitWidthNarrow;
  const { rows, totals, step: tick } = useBitStream(flipOn, pattern, N);
  useTicker(inView && !paused && !reduced && step >= 1 && step < 3, TOY.tickMs, tick);
  useEffect(() => { if (reduced && step >= 1 && rows.length === 0) for (let i = 0; i < TOY.rowsShown; i++) tick(); }, [reduced, step, rows.length, tick]);

  const saved = totals.baseline > 0 ? 1 - totals.actual / totals.baseline : 0;

  if (step === 0) return <WiresFigure />;
  if (step >= 3) return <EnergyFigure />;

  return (
    <div className="flex h-full flex-col gap-2 lg:gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-end gap-4 lg:gap-6">
          <div>
            <div className="sans text-xs text-muted">wire switches</div>
            <div className="num font-serif text-3xl font-medium text-sram-ink lg:text-5xl" aria-live="off">{fmt(totals.actual)}</div>
          </div>
          {flipOn && (
            <div>
              <div className="sans text-xs text-muted">without flipping</div>
              <div className="num font-serif text-3xl text-faint lg:text-5xl">{fmt(totals.baseline)}</div>
            </div>
          )}
          {flipOn && totals.chunks > 0 && <div className="sans num pb-1.5 text-sm text-dram3d">−{fmt(saved * 100, 0)}% here</div>}
        </div>
      </div>
      <div className="min-h-0 flex-1"><Strip rows={rows} flipOn={flipOn} N={N} /></div>
      <div className="sans flex flex-wrap items-center gap-3 border-t border-line pt-3 text-xs">
        <button className="chip-btn" role="switch" aria-checked={flipOn} aria-pressed={flipOn} onClick={() => setManualFlip(!flipOn)}>
          Stream flipping: {flipOn ? 'on' : 'off'}
        </button>
        <label className="flex items-center gap-1.5 text-muted">
          Data
          <select value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}>
            <option value="random">random</option>
            <option value="similar">mostly similar</option>
            <option value="alternating">worst case</option>
          </select>
        </label>
        {reduced ? <button className="chip-btn" onClick={tick}>Next chunk</button> : <button className="chip-btn" onClick={() => setPaused((p) => !p)}>{paused ? 'Play' : 'Pause'}</button>}
      </div>
    </div>
  );
}

export function S07StreamFlipping() {
  return (
    <Scene
      id="stream-flipping"
      num={7}
      kicker="Problem 2 · Stream flipping"
      eyebrow={<ProblemChips active={1} />}
      title="Reducing the energy spent switching wires"
      steps={[
        <p key="0">Each connection between the two dies carries either a 0 or a 1, and a little energy is spent every time a connection changes from one value to the other. There are so many connections that, at {SF.atBandwidthTBs} TB/s, a Raptor card would spend about <strong className="num">{SF.ioPowerAt100TBsW} W</strong> just on switching them.</p>,
        <p key="1">The figure shows a stream of {SF.chunkBytes}-byte chunks crossing the connections, with the newest at the top. Orange cells mark connections whose value changed since the previous chunk, and the counter keeps a running total.</p>,
        <>
          <p key="2">Conventional memory reduces switching with a technique called <Term k="dbi">data bus inversion</Term>, but that relies on an extra signal pin and on data arriving in bursts over several clock cycles. Raptor’s stacked interface has neither, so the same job is done in the memory controller instead. The paper calls this <strong>stream flipping</strong>.</p>
          <p>It works because of stream blocking: chunks are read back in the same order they were written. So the controller decides when it writes. It compares each chunk with the previous one on that channel, stores it inverted if that means fewer connections switch, and records the choice in a single flag bit kept in a small side region of the DRAM. When the stream is read back, the connections see the low-switching version, and the flag says which chunks to flip back. Because the flag lives in memory, no extra pin is needed.</p>
        </>,
        <p key="3">On the chip, the worst case measured <strong className="num">{SF.beforePJPerBit} pJ</strong> per bit. With stream flipping the effective switching rate falls to {SF.effectiveSwitching}, and the energy to <strong className="num">{SF.afterPJPerBit} pJ</strong> per bit, a reduction of {SF.reductionPct}% that needed no additional pins.</p>,
      ]}
      description={(s) =>
        s.step === 0 ? `Large number: about ${SF.ioPowerAt100TBsW} watts of I/O power per card at ${SF.atBandwidthTBs} TB/s.`
          : s.step >= 3 ? `Measured result: ${SF.beforePJPerBit} picojoules per bit worst case, ${SF.afterPJPerBit} with stream flipping, an ${SF.reductionPct} percent reduction.`
            : 'Interactive illustration: rows of bits stream past; bits that switched are highlighted and counted. With stream flipping on, rows that would switch more than half the wires are stored inverted and marked with a flag bit, and the switch counter grows more slowly. Controls: flipping on/off, data pattern, pause.'
      }
      visual={(s) => <Visual {...s} />}
      figure={(s) => s.step === 0
        ? { caption: <>The I/O power a Raptor card would draw at full bandwidth without any countermeasure. Source: Sec IV-D.</> }
        : s.step >= 3
          ? { evidence: 'measured', caption: <>Measured I/O energy at {SF.measuredAtMHz} MHz with {SF.banksAtResult} active banks, every wire switching versus with stream flipping. Source: Sec V-A, Fig. 10.</> }
          : { caption: <>An illustration rather than data. Each row is one chunk, drawn with fewer wires than the real {fmt(SF.chunkBits)}. Orange cells are wires that changed value, and when flipping is on, a filled flag marks chunks stored inverted.</> }}
    />
  );
}
