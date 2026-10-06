import { useEffect, useMemo, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { ProblemChips } from '../components/Problems';
import { Term } from '../components/ui';
import { BANK_BUDGET as BB, BANKS_SHORT, LAYER_EXAMPLE as LX, STREAM_BLOCKING as SB } from '../data/paper';
import { TOY } from '../data/illustrative';
import { fmt, numberWord } from '../lib/fmt';
import { P, CHUNK_INKS } from '../lib/palette';

const CHUNK_COLORS = CHUNK_INKS;
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
  const PX = 12;
  return (
    <svg viewBox={`0 0 ${cols * PX} ${rows * PX + 40}`} className="h-full w-full" aria-hidden>
      {cells.map((c, i) => {
        const x = (i % cols) * PX, y = Math.floor(i / cols) * PX;
        let fill = 'transparent', stroke = 'var(--color-faint)', dash: string | undefined;
        if (step >= 1) {
          if (!c.real) { stroke = 'var(--color-danger)'; dash = '2 2'; }
          else { fill = P.dramTint; stroke = 'transparent'; }
        }
        if (step >= 2 && c.real) {
          if (c.spare) fill = 'var(--color-spare)';
          else fill = c.trio % 2 ? P.dram : P.dramMid;
        }
        return <rect key={i} x={x + 1} y={y + 1} width={PX - 2} height={PX - 2} rx={0.5} fill={fill} stroke={stroke} strokeDasharray={dash} className="fade" />;
      })}
      <g transform={`translate(0 ${rows * PX + 24})`} fontSize="14">
        {step === 0 && <text className="svg-num" fill="var(--color-ink)">{BB.channelsPerChiplet} channels × {BB.banksPerChannelIdeal} banks = {fmt(BB.banksNeeded)} banks needed</text>}
        {step === 1 && <text className="svg-num" fill="var(--color-ink)">{BB.banksOnDie} on the die · <tspan fill="var(--color-danger)">{BANKS_SHORT} short</tspan></text>}
        {step >= 2 && (
          <text className="svg-num" fill="var(--color-ink)">
            <tspan fill="var(--color-spare)">{BB.spares} spares</tspan> · {BB.usable} usable = {BB.channelsPerChiplet} × <tspan fill="var(--color-dram3d)">{BANKS}</tspan>
          </text>
        )}
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
      <text x={X0} y={20} className="svg-label">one channel: {BANKS} banks, each square {BB.bytesPerBankRead} B</text>
      {Array.from({ length: BANKS }, (_, b) => (
        <g key={b}>
          <text x={X0 - 10} y={Y0 + b * (CH + 6) + 20} textAnchor="end" fontSize="11" fill="var(--color-muted)">bank {b}</text>
          {Array.from({ length: cols }, (_, c) => {
            const p = items.find((q) => q.bank === b && q.col === c);
            const hot = step === 3 ? c === 0 : readCols.includes(c);
            return (
              <rect key={c} x={X0 + c * CW} y={Y0 + b * (CH + 6)} width={CW - 4} height={CH} rx={1}
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
              <rect width={40} height={34} rx={1} fill={k < BANKS ? 'var(--color-dram3d)' : 'transparent'} stroke={k < BANKS ? 'transparent' : 'var(--color-danger)'} strokeDasharray="3 3" />
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
              return <rect key={k} x={k * 46} y={14} width={42} height={30} rx={1} fill={src ? CHUNK_COLORS[src.chunk % CHUNK_COLORS.length] : 'var(--color-surface-2)'} opacity={src && src.chunk === cur ? 1 : 0.35} />;
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
            <rect key={k} x={k * 46} y={38} width={42} height={30} rx={1} fill={CHUNK_COLORS[cur % CHUNK_COLORS.length]} opacity={k < BANKS ? 1 : 0.7} stroke={k >= BANKS ? 'var(--color-ink)' : 'transparent'} strokeDasharray="3 2" />
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
          <rect width="250" height="44" rx="1" fill="var(--color-bg)" stroke="var(--color-ink)" />
          <text x="14" y="27" fontSize="13" fill="var(--color-muted)">{r}</text>
          {i < rows.length - 1 && <path d="M125 48 v16" stroke="var(--color-faint)" markerEnd="url(#lx-ah)" />}
        </g>
      ))}
      <g transform="translate(310 30)">
        <rect width="70" height="280" rx="1" fill="var(--color-surface)" stroke="var(--color-ink)" />
        <rect y={280 - 280 * rowsFrac} width="70" height={280 * rowsFrac} fill="var(--color-dram3d)" />
        <text x="35" y="-10" textAnchor="middle" fontSize="11" fill="var(--color-muted)">one bank</text>
        <text x="35" y="300" textAnchor="middle" fontSize="11" className="svg-num" fill="var(--color-dram3d)">~{LX.rowsUsed} / {fmt(LX.rowsTotal)} rows</text>
      </g>
      <text x="20" y="270" fontSize="13" fill="var(--color-ink)">Fills {LX.fillLabel} of each bank.</text>
      
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
          <div role="group" aria-label="Layout" className="flex">
            <button className="chip-btn" aria-pressed={effMode === 'naive'} onClick={() => setMode('naive')}>Naive shuffle</button>
            <button className="chip-btn -ml-px" aria-pressed={effMode === 'blocked'} onClick={() => setMode('blocked')}>Stream blocking</button>
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
      num={6}
      kicker="Problem 1 · Stream blocking"
      eyebrow={<ProblemChips active={0} />}
      title="Fitting 128-byte chunks into three banks"
      steps={[
        <p key="0">Each tensor engine receives data in <Term k="chunk">chunks</Term> of <strong className="num">{BB.chunkBytes} bytes</strong>. A single bank returns <strong className="num">{BB.bytesPerBankRead} bytes</strong> per read, so the natural design would give every channel {BB.banksPerChannelIdeal} banks. With <strong className="num">{BB.channelsPerChiplet}</strong> channels per chiplet, that would take <strong className="num">{fmt(BB.banksNeeded)}</strong> banks.</p>,
        <p key="1">The DRAM die, however, has only <strong className="num">{BB.banksOnDie}</strong> banks.</p>,
        <p key="2">The design also keeps <strong className="num">{BB.spares}</strong> of them in reserve as spares, for reasons covered in the third problem. That leaves <strong className="num">{BB.usable}</strong>, which works out to exactly <strong className="num">{BB.banksPerChannel}</strong> banks for each of the {BB.channelsPerChiplet} channels.</p>,
        <p key="3">Three banks return <strong className="num">{BB.bytesPerThreeBankRead} bytes</strong> per read rather than {BB.chunkBytes}. Every chunk therefore takes {numberWord(BB.readsPerChunk)} reads, and the boundaries between chunks no longer line up with the boundaries between reads.</p>,
        <p key="4">One way to handle this is to read {numberWord(BB.readsPerChunk)} columns into a {SB.naiveBufferBytes}-byte buffer and shift the pieces into place, tracking a different alignment for each address. That works, but the extra circuitry is complicated and makes it harder to run the memory controller at high speed.</p>,
        <>
          <p key="5">Raptor deals with the problem in the way the software lays out data, a technique the paper calls <strong>stream blocking</strong>. Each chunk is split into a <strong className="num">{SB.alignedBytes}-byte</strong> part, stored across the {BB.banksPerChannel} banks at the same column, and a <strong className="num">{SB.partialBytes}-byte</strong> remainder. Remainders from neighboring chunks are packed together in a separate region.</p>
          <p>Every chunk can then be read in the same way. One read brings a column of remainders into a small {SB.smallBufferBytes}-byte cache, and a second read fetches the main part. The access pattern never changes and no bytes are wasted.</p>
        </>,
        <p key="6">The layout doesn’t take up much room. The paper works through one attention layer of {LX.model} at {LX.contextLabel} context, which needs <strong className="num">{LX.layerMB} MB</strong> of KV cache. Stream blocking splits it into <strong className="num">{fmt(LX.tiles)}</strong> tiles of {LX.tileKB} KB, {LX.tilesPerChannel} per channel, and these occupy about {LX.rowsUsed} of each bank’s {fmt(LX.rowsTotal)} rows, {LX.fillLabel}.</p>,
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
      figure={(s) => ({
        caption: s.step <= 2 ? <>Each square represents one DRAM bank on a chiplet. Source: Sec IV-C.</>
          : s.step >= 6 ? <>The paper’s worked example: one attention layer’s KV cache, laid out with stream blocking. Source: Sec III-E.</>
            : <>One channel of {BB.banksPerChannel} banks. Each color is a different chunk, and the outlined columns are the ones read to assemble the highlighted chunk. A schematic of the layouts described in Sec IV-C.</>,
      })}
    />
  );
}
