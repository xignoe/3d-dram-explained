import { useEffect, useMemo, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { ProblemChips } from '../components/Problems';
import { Term } from '../components/ui';
import { BANK_BUDGET as BB, BANKS_SHORT, LAYER_EXAMPLE as LX, STREAM_BLOCKING as SB } from '../data/paper';
import { TOY } from '../data/illustrative';
import { fmt } from '../lib/fmt';

const CHUNK_COLORS = ['#3fd6a4', '#f2b84b', '#c6a0f6', '#5aa9f0', '#ff8f6b', '#9be27a'];
const PIECES = BB.chunkBytes / BB.bytesPerBankRead; // 4 pieces of 32 B per 128 B chunk (derived from Sec IV-C numbers)
const BANKS = BB.banksPerChannel;

/* ---------- Part A: the bank budget ---------- */
function Budget({ step }: { step: number }) {
  const cols = TOY.budgetGridColumns;
  const cells = useMemo(() => {
    let usable = 0;
    return Array.from({ length: BB.banksNeeded }, (_, i) => {
      const real = i < BB.banksOnDie;
      // 72 spares spread evenly through the 840 (exactly 72 indices satisfy this test).
      const spare = real && (i * BB.spares) % BB.banksOnDie < BB.spares;
      const trio = real && !spare ? Math.floor(usable++ / BANKS) : -1;
      return { real, spare, trio };
    });
  }, []);
  const rows = Math.ceil(BB.banksNeeded / cols);
  const P = 12;
  return (
    <svg viewBox={`0 0 ${cols * P} ${rows * P + 64}`} className="h-full w-full" aria-hidden>
      {cells.map((c, i) => {
        const x = (i % cols) * P, y = Math.floor(i / cols) * P;
        let fill = 'transparent', stroke = 'var(--color-faint)', dash: string | undefined;
        if (step >= 1) {
          if (!c.real) { stroke = 'var(--color-danger)'; dash = '2 2'; }
          else { fill = '#2c6b58'; stroke = 'transparent'; }
        }
        if (step >= 2 && c.real) {
          if (c.spare) fill = 'var(--color-spare)';
          else fill = c.trio % 2 ? '#2aa983' : '#3fd6a4';
        }
        return <rect key={i} x={x + 1} y={y + 1} width={P - 2} height={P - 2} rx={2} fill={fill} stroke={stroke} strokeDasharray={dash} className="fade" />;
      })}
      <g transform={`translate(0 ${rows * P + 22})`} fontSize="13">
        {step === 0 && <text className="svg-num" fill="var(--color-ink)">{BB.channelsPerChiplet} channels × {BB.banksPerChannelIdeal} banks = {fmt(BB.banksNeeded)} banks needed</text>}
        {step === 1 && <text className="svg-num" fill="var(--color-ink)">{BB.banksOnDie} on the die · <tspan fill="var(--color-danger)">{BANKS_SHORT} short</tspan></text>}
        {step >= 2 && (
          <text className="svg-num" fill="var(--color-ink)">
            <tspan fill="var(--color-spare)">{BB.spares} spares</tspan> · {BB.usable} usable = {BB.channelsPerChiplet} × <tspan fill="var(--color-dram3d)">{BANKS}</tspan>
          </text>
        )}
        <text y="22" fontSize="11" fill="var(--color-muted)">one square = one bank · Source: Sec IV-C</text>
      </g>
    </svg>
  );
}

/* ---------- Part B: one channel, three banks ---------- */
type Placement = { bank: number; col: number; chunk: number; piece: number; partial: boolean };

function layout(mode: 'naive' | 'blocked', cols: number): Placement[] {
  const out: Placement[] = [];
  const chunks = Math.floor(((cols - 1) * BANKS) / PIECES);
  for (let c = 0; c < chunks; c++) {
    for (let k = 0; k < PIECES; k++) {
      if (mode === 'naive') {
        const s = c * PIECES + k;
        out.push({ bank: s % BANKS, col: Math.floor(s / BANKS), chunk: c, piece: k, partial: false });
      } else if (k < BANKS) {
        out.push({ bank: k, col: c, chunk: c, piece: k, partial: false });
      } else {
        out.push({ bank: c % BANKS, col: cols - 1 - Math.floor(c / BANKS), chunk: c, piece: k, partial: true });
      }
    }
  }
  return out;
}

function Channel({ step, mode, chunk }: { step: number; mode: 'naive' | 'blocked'; chunk: number }) {
  const cols = TOY.channelColumnsShown;
  const CW = 40, CH = 30, X0 = 70, Y0 = 34;
  const items = step === 3 ? [] : layout(mode, cols);
  const nChunks = items.length ? Math.max(...items.map((p) => p.chunk)) + 1 : 1;
  const cur = chunk % nChunks;
  const mine = items.filter((p) => p.chunk === cur);
  const readCols = [...new Set(mine.map((p) => p.col))];
  return (
    <svg viewBox="0 0 420 360" className="h-full w-full" aria-hidden>
      <text x={X0} y={20} className="svg-label">one channel = {BANKS} banks · each square = {BB.bytesPerBankRead} B</text>
      {Array.from({ length: BANKS }, (_, b) => (
        <g key={b}>
          <text x={X0 - 10} y={Y0 + b * (CH + 6) + 20} textAnchor="end" fontSize="11" fill="var(--color-muted)">bank {b}</text>
          {Array.from({ length: cols }, (_, c) => {
            const p = items.find((q) => q.bank === b && q.col === c);
            const hot = step === 3 ? c === 0 : readCols.includes(c);
            return (
              <rect key={c} x={X0 + c * CW} y={Y0 + b * (CH + 6)} width={CW - 4} height={CH} rx={4}
                fill={p ? CHUNK_COLORS[p.chunk % CHUNK_COLORS.length] : step === 3 && c === 0 ? 'var(--color-dram3d)' : 'var(--color-surface-2)'}
                opacity={p ? (p.chunk === cur ? 1 : 0.28) : 1}
                stroke={hot ? 'var(--color-ink)' : 'transparent'} strokeWidth={1.5} className="fade" />
            );
          })}
        </g>
      ))}
      {mode === 'blocked' && step === 5 && (
        <text x={X0 + (cols - 1) * CW + 18} y={Y0 + BANKS * (CH + 6) + 14} textAnchor="middle" fontSize="10" fill="var(--color-muted)">leftovers</text>
      )}

      {step === 3 && (
        <g transform="translate(70 190)">
          <text className="svg-label" y="0">one read across {BANKS} banks = <tspan className="svg-num" fill="var(--color-ink)">{BB.bytesPerThreeBankRead} B</tspan></text>
          <text className="svg-label" y="22">one chunk = <tspan className="svg-num" fill="var(--color-ink)">{BB.chunkBytes} B</tspan></text>
          {Array.from({ length: PIECES }, (_, k) => (
            <g key={k} transform={`translate(${k * 44} 40)`}>
              <rect width={40} height={34} rx={4} fill={k < BANKS ? 'var(--color-dram3d)' : 'transparent'} stroke={k < BANKS ? 'transparent' : 'var(--color-danger)'} strokeDasharray="3 3" />
              {k >= BANKS && <text x={20} y={22} textAnchor="middle" fill="var(--color-danger)" fontSize="15">?</text>}
            </g>
          ))}
          <text y="100" fontSize="12" fill="var(--color-muted)">so every chunk needs {BB.readsPerChunk} reads, and the pieces don’t line up</text>
        </g>
      )}

      {step >= 4 && mode === 'naive' && (
        <g transform="translate(40 180)">
          <text className="svg-label">{SB.naiveBufferBytes} B shifting buffer (+ a different pattern for every address)</text>
          <g style={{ animation: 'shuffle 0.9s ease-in-out infinite' }}>
            {Array.from({ length: SB.naiveBufferBytes / BB.bytesPerBankRead }, (_, k) => {
              const src = readCols.flatMap((c) => Array.from({ length: BANKS }, (_, b) => items.find((q) => q.bank === b && q.col === c)))[k];
              return <rect key={k} x={k * 46} y={14} width={42} height={30} rx={4} fill={src ? CHUNK_COLORS[src.chunk % CHUNK_COLORS.length] : 'var(--color-surface-2)'} opacity={src && src.chunk === cur ? 1 : 0.35} />;
            })}
          </g>
          <path d="M20 56 C 60 90, 150 70, 190 100 M120 56 C 100 90, 40 80, 60 100 M240 56 C 200 80, 250 90, 150 100" stroke="var(--color-danger)" strokeOpacity="0.6" fill="none" />
          <text y="124" fontSize="12" fill="var(--color-muted)">→ extract one {BB.chunkBytes} B chunk at a shifting offset</text>
        </g>
      )}

      {step >= 4 && mode === 'blocked' && (
        <g transform="translate(40 180)">
          <text className="svg-label">read 1: leftovers column → <tspan fill="var(--color-ink)">{SB.smallBufferBytes} B cache</tspan></text>
          <text className="svg-label" y="20">read 2: main column ({SB.alignedBytes} B) + one {SB.partialBytes} B leftover</text>
          {Array.from({ length: PIECES }, (_, k) => (
            <rect key={k} x={k * 46} y={38} width={42} height={30} rx={4} fill={CHUNK_COLORS[cur % CHUNK_COLORS.length]} opacity={k < BANKS ? 1 : 0.7} stroke={k >= BANKS ? 'var(--color-ink)' : 'transparent'} strokeDasharray="3 2" />
          ))}
          <text y="92" fontSize="12" fill="var(--color-muted)">= one {BB.chunkBytes} B chunk · same {BB.readsPerChunk} reads, every time</text>
        </g>
      )}
    </svg>
  );
}

/* ---------- Part C: one layer's KV cache ---------- */
function LayerExample() {
  const rowsFrac = LX.rowsUsed / LX.rowsTotal;
  const rows = [
    <><tspan className="svg-num" fill="var(--color-ink)">{LX.layerMB} MB</tspan> · one layer, {LX.contextLabel} context, {LX.precision}</>,
    <><tspan className="svg-num" fill="var(--color-ink)">{fmt(LX.tiles)}</tspan> tiles of <tspan className="svg-num" fill="var(--color-ink)">{LX.tileKB} KB</tspan></>,
    <><tspan className="svg-num" fill="var(--color-ink)">{LX.channels}</tspan> channels × <tspan className="svg-num" fill="var(--color-ink)">{LX.tilesPerChannel}</tspan> tiles each</>,
  ];
  return (
    <svg viewBox="0 0 420 360" className="h-full w-full" aria-hidden>
      {rows.map((r, i) => (
        <g key={i} transform={`translate(20 ${40 + i * 70})`}>
          <rect width="250" height="44" rx="8" fill="var(--color-surface-2)" stroke="var(--color-line)" />
          <text x="14" y="27" fontSize="13" fill="var(--color-muted)">{r}</text>
          {i < rows.length - 1 && <path d="M125 48 v16" stroke="var(--color-faint)" markerEnd="url(#lx-ah)" />}
        </g>
      ))}
      <g transform="translate(310 30)">
        <rect width="70" height="280" rx="6" fill="var(--color-surface-2)" stroke="var(--color-line)" />
        <rect y={280 - 280 * rowsFrac} width="70" height={280 * rowsFrac} rx="4" fill="var(--color-dram3d)" />
        <text x="35" y="-10" textAnchor="middle" fontSize="11" fill="var(--color-muted)">one bank</text>
        <text x="35" y="300" textAnchor="middle" fontSize="11" className="svg-num" fill="var(--color-dram3d)">~{LX.rowsUsed} / {fmt(LX.rowsTotal)} rows</text>
      </g>
      <text x="20" y="270" fontSize="13" fill="var(--color-ink)">Fills {LX.fillLabel} of each bank.</text>
      <text x="20" y="292" fontSize="11" fill="var(--color-muted)">Source: Sec III-E</text>
      <defs><marker id="lx-ah" viewBox="0 0 6 6" refX="3" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L6 0 L3 6 Z" fill="var(--color-faint)" /></marker></defs>
    </svg>
  );
}

function Visual({ step, progress }: SceneState) {
  const [mode, setMode] = useState<'naive' | 'blocked' | null>(null);
  const [extra, setExtra] = useState(0);
  useEffect(() => { setMode(null); setExtra(0); }, [step]);
  const effMode = mode ?? (step >= 5 ? 'blocked' : 'naive');
  const chunk = Math.floor(progress * 2.99) + extra;

  if (step <= 2) return <Budget step={step} />;
  if (step >= 6) return <LayerExample />;
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1"><Channel step={step} mode={effMode} chunk={chunk} /></div>
      {step >= 4 && (
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <div role="group" aria-label="Layout" className="flex gap-1">
            <button className="chip-btn" aria-pressed={effMode === 'naive'} onClick={() => setMode('naive')}>Naive shuffle</button>
            <button className="chip-btn" aria-pressed={effMode === 'blocked'} onClick={() => setMode('blocked')}>Stream blocking</button>
          </div>
          <button className="chip-btn" onClick={() => setExtra((e) => e + 1)}>Next chunk →</button>
        </div>
      )}
    </div>
  );
}

export function S06StreamBlocking() {
  return (
    <Scene
      id="stream-blocking"
      kicker={<><ProblemChips active={0} /><span className="block">6 · Problem 1: stream blocking</span></>}
      title="An awkward number of banks."
      steps={[
        <p key="0">Each tensor engine takes data in <Term k="chunk">chunks</Term> of <strong className="num">{BB.chunkBytes} bytes</strong>. A bank hands over <strong className="num">{BB.bytesPerBankRead} bytes</strong> per read, so the tidy design is {BB.banksPerChannelIdeal} banks per channel. With <strong className="num">{BB.channelsPerChiplet}</strong> channels per chiplet, that’s <strong className="num">{fmt(BB.banksNeeded)}</strong> banks.</p>,
        <p key="1">The DRAM die has <strong className="num">{BB.banksOnDie}</strong>.</p>,
        <p key="2">Raptor also sets <strong className="num">{BB.spares}</strong> aside as spares (Problem 3 explains why). That leaves <strong className="num">{BB.usable}</strong>: exactly <strong className="num">{BB.banksPerChannel}</strong> banks for each of the {BB.channelsPerChiplet} channels.</p>,
        <p key="3">But {BB.banksPerChannel} banks hand over <strong className="num">{BB.bytesPerThreeBankRead} bytes</strong> per read, not {BB.chunkBytes}. Every chunk now takes {BB.readsPerChunk} reads, and the pieces don’t line up with chunk boundaries.</p>,
        <p key="4">The obvious fix is to shuffle. Read {BB.readsPerChunk} columns ({SB.naiveBufferBytes} bytes) into a buffer, shift the right pieces into place, and track a different pattern for every address. It works, but it’s fiddly circuitry that is hard to run fast.</p>,
        <>
          <p key="5">Raptor fixes it in how the software <em>lays out</em> data. This is <strong>stream blocking</strong>. Each chunk is split into a <strong className="num">{SB.alignedBytes}-byte</strong> part stored straight across the {BB.banksPerChannel} banks, plus a <strong className="num">{SB.partialBytes}-byte</strong> leftover. Leftovers from neighbouring chunks are packed together.</p>
          <p>Every chunk is then read the same way: one read for the leftovers (kept in a small {SB.smallBufferBytes}-byte cache), one for the main part. Two fixed reads, nothing wasted.</p>
        </>,
        <p key="6">Does it waste space? The paper works through one layer of {LX.model} at {LX.contextLabel} context: <strong className="num">{LX.layerMB} MB</strong> of KV cache, split into <strong className="num">{fmt(LX.tiles)}</strong> tiles of {LX.tileKB} KB, {LX.tilesPerChannel} per channel. That fills about {LX.rowsUsed} of a bank’s {fmt(LX.rowsTotal)} rows, <strong>{LX.fillLabel}</strong>.</p>,
      ]}
      description={(s) => [
        `Grid of ${BB.banksNeeded} squares: ${BB.channelsPerChiplet} channels times ${BB.banksPerChannelIdeal} banks would be needed.`,
        `Only ${BB.banksOnDie} squares are filled; ${BANKS_SHORT} are missing.`,
        `${BB.spares} squares turn pink as spares; the remaining ${BB.usable} are grouped in threes, one group per channel.`,
        `One read across ${BB.banksPerChannel} banks gives ${BB.bytesPerThreeBankRead} bytes, but a chunk is ${BB.chunkBytes} bytes, leaving a gap.`,
        `Naive layout: chunk pieces are scattered across columns, and a ${SB.naiveBufferBytes}-byte buffer shuffles them into place.`,
        `Stream blocking: each chunk's ${SB.alignedBytes}-byte part sits in one column across the three banks; its ${SB.partialBytes}-byte leftover is packed with others in a leftovers column. Two fixed reads assemble each chunk.`,
        `One layer's ${LX.layerMB} MB KV cache becomes ${LX.tiles} tiles of ${LX.tileKB} KB, ${LX.tilesPerChannel} per channel, filling about ${LX.rowsUsed} of ${LX.rowsTotal} rows in each bank.`,
      ][Math.min(s.step, 6)]}
      visual={(s) => <Visual {...s} />}
    />
  );
}
