import { useCallback, useEffect, useRef, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { ProblemChips } from '../components/Problems';
import { Badge, BigStat, Src, Term } from '../components/ui';
import { STREAM_FLIPPING as SF } from '../data/paper';
import { TOY } from '../data/illustrative';
import { useDesktop, useTicker } from '../lib/hooks';
import { fmt } from '../lib/fmt';

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
                fill={changed ? 'var(--color-sram)' : b ? '#7d8aa6' : '#232a38'} />;
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

  if (step === 0 || step >= 3) {
    return (
      <div className="flex h-full flex-col justify-center gap-6 lg:gap-10">
        {step === 0 ? (
          <div className="panel p-5 lg:p-8">
            <BigStat size="xl" value={`≈${SF.ioPowerAt100TBsW}`} unit="W" color="var(--color-sram)" label={<>of power per card spent just switching the memory wires, at {SF.atBandwidthTBs} TB/s, before any fix. <Src>Sec IV-D</Src></>} />
          </div>
        ) : (
          <div className="panel p-5 lg:p-8">
            <div className="mb-4 flex items-center justify-between"><span className="text-sm text-muted">Measured I/O energy, worst case vs. with stream flipping</span><Badge kind="measured" /></div>
            <div className="flex flex-wrap items-end gap-6">
              <BigStat value={SF.beforePJPerBit} unit="pJ/bit" label="every wire switching" color="var(--color-muted)" />
              <span className="num pb-6 text-3xl text-faint">→</span>
              <BigStat value={SF.afterPJPerBit} unit="pJ/bit" label="with stream flipping" color="var(--color-dram3d)" />
            </div>
            <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="num text-5xl font-semibold text-dram3d lg:text-7xl">−{SF.reductionPct}%</span>
              <span className="text-sm text-muted">energy, with no extra pins and one flag bit per {SF.chunkBytes}-byte chunk. <Src>Sec V-A, Fig. 10</Src></span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 lg:gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-end gap-4 lg:gap-6">
          <div>
            <div className="text-[0.7rem] text-muted">wire switches</div>
            <div className="num text-2xl text-sram lg:text-4xl" aria-live="off">{fmt(totals.actual)}</div>
          </div>
          {flipOn && (
            <div>
              <div className="text-[0.7rem] text-muted">without flipping</div>
              <div className="num text-2xl text-faint lg:text-4xl">{fmt(totals.baseline)}</div>
            </div>
          )}
          {flipOn && totals.chunks > 0 && <div className="num pb-1 text-sm text-dram3d">−{fmt(saved * 100, 0)}% here</div>}
        </div>
        <span className="text-[0.65rem] uppercase tracking-wider text-faint">illustration</span>
      </div>
      <div className="min-h-0 flex-1"><Strip rows={rows} flipOn={flipOn} N={N} /></div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button className="chip-btn" role="switch" aria-checked={flipOn} aria-pressed={flipOn} onClick={() => setManualFlip(!flipOn)}>
          Stream flipping: {flipOn ? 'on' : 'off'}
        </button>
        <label className="flex items-center gap-1 text-muted">
          Data
          <select className="rounded-md border border-line bg-surface px-2 py-1 text-ink" value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}>
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
      kicker={<><ProblemChips active={1} /><span className="block">7 · Problem 2: stream flipping</span></>}
      title="Every wire that flips costs energy."
      steps={[
        <p key="0">Each wire between the dies carries a 0 or a 1. Every time a wire <strong>switches</strong> from one to the other, it burns a little energy. Multiply that by the stack’s enormous number of wires, and at {SF.atBandwidthTBs} TB/s a Raptor card would spend about <strong className="num">{SF.ioPowerAt100TBsW} W</strong> on that alone.</p>,
        <p key="1">Here is a stream of {SF.chunkBytes}-byte chunks going over the wires, newest at the top. Orange squares are wires that had to switch. The counter keeps climbing.</p>,
        <>
          <p key="2">Ordinary memory has a trick for this (<Term k="dbi">data bus inversion</Term>), but it needs an extra pin and a multi-cycle burst, and Raptor’s stacked interface has neither. So Raptor does it in the memory controller instead: <strong>stream flipping</strong>.</p>
          <p>If sending a chunk as-is would switch more than half the wires, send it <strong>inverted</strong>, and store a single flag bit saying so. On the way back, the flag says whether to flip it back.</p>
        </>,
        <p key="3">Measured on the chip, the worst case is <strong className="num">{SF.beforePJPerBit} pJ/bit</strong>. Stream flipping brings effective switching down to {SF.effectiveSwitching} and energy to <strong className="num">{SF.afterPJPerBit} pJ/bit</strong>, an <strong>{SF.reductionPct}% cut</strong> with no extra pins.</p>,
      ]}
      description={(s) =>
        s.step === 0 ? `Large number: about ${SF.ioPowerAt100TBsW} watts of I/O power per card at ${SF.atBandwidthTBs} TB/s.`
          : s.step >= 3 ? `Measured result: ${SF.beforePJPerBit} picojoules per bit worst case, ${SF.afterPJPerBit} with stream flipping, an ${SF.reductionPct} percent reduction.`
            : 'Interactive illustration: rows of bits stream past; bits that switched are highlighted and counted. With stream flipping on, rows that would switch more than half the wires are inverted and marked with a flag bit, and the switch counter grows more slowly. Controls: flipping on/off, data pattern, pause.'
      }
      visual={(s) => <Visual {...s} />}
    />
  );
}
