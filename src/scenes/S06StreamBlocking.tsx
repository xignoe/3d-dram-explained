import { useEffect, useMemo, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { ProblemChips } from '../components/Problems';
import { Term } from '../components/ui';
import { BANK_BUDGET as BB, BANKS_SHORT, CHUNKS_PER_PARTIAL_READ, HIERARCHY, LAYER_EXAMPLE as LX, STREAM_BLOCKING as SB } from '../data/paper';
import { TOY } from '../data/illustrative';
import { fmt, numberWord } from '../lib/fmt';
import { P, CHUNK_INKS } from '../lib/palette';
import { useDesktop } from '../lib/hooks';

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
        return <rect key={i} x={x + 1} y={y + 1} width={PX - 2} height={PX - 2} rx={0.5} fill={fill} stroke={stroke} strokeDasharray={dash} opacity={step >= 2 && !c.real ? 0.3 : 1} className="fade" />;
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
  // Phones draw this figure at about two-thirds size, so its type is set larger there.
  const narrow = !useDesktop();
  const f = (n: number) => (narrow ? n * 1.25 : n);
  const cols = TOY.channelColumnsShown;
  const CW = 40, CH = 30, X0 = 70, Y0 = 34;
  const items = step === 3 ? [] : layout(mode, cols);
  const nChunks = items.length ? Math.max(...items.map((p) => p.chunk)) + 1 : 1;
  const cur = chunk % nChunks;
  const mine = items.filter((p) => p.chunk === cur);
  // Stream blocking reads the leftovers column only once per group of consecutive chunks.
  const group = Math.floor(cur / CHUNKS_PER_PARTIAL_READ);
  const freshLeftovers = cur % CHUNKS_PER_PARTIAL_READ === 0;
  const readCols = [...new Set(mine.filter((p) => mode === 'naive' || !p.partial || freshLeftovers).map((p) => p.col))];
  const ink = CHUNK_COLORS[cur % CHUNK_COLORS.length];
  const fetched = BB.readsPerChunk * BANKS; // 32 B pieces fetched by two plain reads
  // Naive buffer: the two columns read, in order, as 32 B pieces.
  const buffer = readCols.flatMap((c) => Array.from({ length: BANKS }, (_, b) => items.find((q) => q.bank === b && q.col === c)));
  return (
    <svg viewBox="0 0 520 360" className="h-full w-full" aria-hidden>
      <text x={X0} y={20} className="svg-label" style={{ fontSize: f(12) }}>one channel: {BANKS} banks, each square {BB.bytesPerBankRead} B</text>
      {Array.from({ length: BANKS }, (_, b) => (
        <g key={b}>
          <text x={X0 - 10} y={Y0 + b * (CH + 6) + 20} textAnchor="end" fontSize={f(11)} fill="var(--color-muted)">bank {b}</text>
          {Array.from({ length: cols }, (_, c) => {
            const p = items.find((q) => q.bank === b && q.col === c);
            const hot = step === 3 ? c < BB.readsPerChunk : readCols.includes(c);
            const fill3 = step === 3 ? (c === 0 || (c === 1 && b === 0) ? 'var(--color-dram3d)' : c === 1 ? 'var(--color-surface)' : 'var(--color-surface-2)') : 'var(--color-surface-2)';
            return (
              <rect key={c} x={X0 + c * CW} y={Y0 + b * (CH + 6)} width={CW - 4} height={CH} rx={1}
                fill={p ? CHUNK_COLORS[p.chunk % CHUNK_COLORS.length] : fill3}
                opacity={p ? (p.chunk === cur ? 1 : 0.28) : 1}
                stroke={hot ? 'var(--color-ink)' : 'transparent'} strokeWidth={1.5} className="fade" />
            );
          })}
        </g>
      ))}
      {mode === 'blocked' && step === 5 && (
        <text x={X0 + (cols - 1) * CW + 18} y={Y0 + BANKS * (CH + 6) + 14} textAnchor="middle" fontSize={f(10)} fill="var(--color-muted)">leftovers</text>
      )}

      {step === 3 && (
        <g transform="translate(40 180)">
          <text className="svg-label" style={{ fontSize: f(12) }}>{numberWord(BB.readsPerChunk)} reads × {BB.bytesPerThreeBankRead} B = <tspan className="svg-num" fill="var(--color-ink)">{BB.readsPerChunk * BB.bytesPerThreeBankRead} B</tspan> fetched for one <tspan className="svg-num" fill="var(--color-ink)">{BB.chunkBytes} B</tspan> chunk</text>
          {Array.from({ length: fetched }, (_, k) => {
            const used = k < PIECES;
            return (
              <g key={k} transform={`translate(${k * 46 + (k >= BANKS ? 8 : 0)} 14)`}>
                <rect width={42} height={30} rx={1} fill={used ? 'var(--color-dram3d)' : 'transparent'} stroke={used ? 'transparent' : 'var(--color-danger)'} strokeDasharray="3 3" />
                {!used && <path d="M8 22 L34 8" stroke="var(--color-danger)" strokeWidth={1} />}
              </g>
            );
          })}
          <text x={BANKS * 46 / 2 - 2} y="60" textAnchor="middle" fontSize={f(10)} fill="var(--color-faint)">read 1</text>
          <text x={BANKS * 46 * 1.5 + 6} y="60" textAnchor="middle" fontSize={f(10)} fill="var(--color-faint)">read 2</text>
          <text y="90" fontSize={f(12)} fill="var(--color-muted)">The rest is thrown away: a third of each fetch.</text>
        </g>
      )}

      {step >= 4 && mode === 'naive' && (
        <g transform="translate(40 180)">
          <text className="svg-label" style={{ fontSize: f(12) }}>{SB.naiveBufferBytes} B shifting buffer</text>
          {buffer.map((src, k) => (
            <rect key={k} x={k * 46} y={14} width={42} height={30} rx={1} fill={src ? CHUNK_COLORS[src.chunk % CHUNK_COLORS.length] : 'var(--color-surface-2)'} opacity={src && src.chunk === cur ? 1 : 0.35} className="fade" />
          ))}
          {buffer.map((src, k) => {
            if (!src || src.chunk !== cur) return null;
            const j = src.piece;
            return <path key={k} d={`M${k * 46 + 21} 46 C ${k * 46 + 21} 64, ${46 + j * 46 + 21} 62, ${46 + j * 46 + 21} 78`} fill="none" stroke={P.ink3} strokeWidth={1} className="fade" />;
          })}
          {Array.from({ length: PIECES }, (_, j) => (
            <rect key={j} x={46 + j * 46} y={80} width={42} height={26} rx={1} fill={ink} />
          ))}
          <text y="130" fontSize={f(12)} fill="var(--color-muted)">The offset changes with every address.</text>
        </g>
      )}

      {step >= 4 && mode === 'blocked' && (
        <g transform="translate(40 168)">
          <text className="svg-label" style={{ fontSize: f(12) }} opacity={freshLeftovers ? 1 : 0.45}>
            read 1: leftovers column → {SB.smallBufferBytes} B cache{freshLeftovers ? '' : ' (already cached)'}
          </text>
          {Array.from({ length: CHUNKS_PER_PARTIAL_READ }, (_, k) => {
            const c = group * CHUNKS_PER_PARTIAL_READ + k;
            const exists = c < nChunks;
            return (
              <rect key={k} x={k * 30} y={10} width={26} height={20} rx={1}
                fill={exists ? CHUNK_COLORS[c % CHUNK_COLORS.length] : 'var(--color-surface-2)'}
                opacity={c === cur ? 1 : 0.4} stroke={c === cur ? 'var(--color-ink)' : 'transparent'} className="fade" />
            );
          })}
          <text x={CHUNKS_PER_PARTIAL_READ * 30 + 6} y="25" fontSize={f(10)} fill="var(--color-faint)">one leftover for each of the next {numberWord(CHUNKS_PER_PARTIAL_READ)} chunks</text>
          <text className="svg-label" style={{ fontSize: f(12) }} y="54">read 2: main column ({SB.alignedBytes} B), plus this chunk’s leftover</text>
          {Array.from({ length: PIECES }, (_, k) => (
            <rect key={k} x={k * 46} y={64} width={42} height={30} rx={1} fill={ink} opacity={k < BANKS ? 1 : 0.7} stroke={k >= BANKS ? 'var(--color-ink)' : 'transparent'} strokeDasharray="3 2" />
          ))}
          <text y="116" fontSize={f(12)} fill="var(--color-muted)">= one {BB.chunkBytes} B chunk · fixed pattern, nothing discarded</text>
        </g>
      )}
      {/* where the chunk goes: the tensor engine's weight buffer */}
      <g transform="translate(424 196)">
        <rect width="84" height="54" rx="2" fill={P.te} stroke={P.ink} strokeWidth={1.2} />
        <text x="42" y="22" textAnchor="middle" fontSize={f(11)} fill={P.ink}>tensor</text>
        <text x="42" y="36" textAnchor="middle" fontSize={f(11)} fill={P.ink}>engine</text>
        {Array.from({ length: PIECES }, (_, q) => (
          <rect key={q} x={10 + q * 16.5} y={42} width={14} height={7} fill={step >= 4 ? ink : P.paper} stroke={P.ink3} strokeWidth={0.6} className="fade" />
        ))}
      </g>
      {step >= 4 && (
        <path d={mode === 'naive' ? 'M276 273 C 360 273, 380 223, 420 223' : 'M228 247 C 320 247, 360 223, 420 223'}
          fill="none" stroke={P.ink} strokeWidth={1.3} markerEnd="url(#sb-ah)" className="fade" />
      )}
      <text x={508} y={268} textAnchor="end" fontSize={f(10)} fill={P.ink2}>takes {BB.chunkBytes} B at a time</text>
      <defs><marker id="sb-ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill={P.ink} /></marker></defs>
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
          {i < rows.length - 1 && <g stroke="none" fill="var(--color-faint)"><rect x="124.4" y="47" width="1.2" height="13" /><path d="M120.5 59 L129.5 59 L125 66 Z" /></g>}
        </g>
      ))}
      <g transform="translate(310 30)">
        <rect width="70" height="280" rx="1" fill="var(--color-surface)" stroke="var(--color-ink)" />
        <rect y={280 - 280 * rowsFrac} width="70" height={280 * rowsFrac} fill="var(--color-dram3d)" />
        <text x="35" y="-10" textAnchor="middle" fontSize="11" fill="var(--color-muted)">one bank</text>
        <text x="35" y="300" textAnchor="middle" fontSize="11" className="svg-num" fill="var(--color-dram3d)">~{LX.rowsUsed} / {fmt(LX.rowsTotal)} rows</text>
      </g>
      <text x="20" y="262" fontSize="12" fill="var(--color-muted)">Each tile is read as a walk along a row:</text>
      <text x="20" y="280" fontSize="12" fill="var(--color-muted)">open it, stream all {HIERARCHY.bank.columns} columns, move on.</text>
      <text x="20" y="306" fontSize="13" fill="var(--color-ink)">Fills {LX.fillLabel} of each bank.</text>
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
            <button className="chip-btn" aria-pressed={effMode === 'naive'} onClick={() => setMode('naive')}>Staggered</button>
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
      kicker="Challenge 1 · Stream blocking"
      eyebrow={<ProblemChips active={0} />}
      title="Fitting 128-byte chunks into three banks"
      steps={[
        <p key="0">Each tensor engine receives data in <Term k="chunk">chunks</Term> of <strong className="num">{BB.chunkBytes} bytes</strong>. A single bank returns <strong className="num">{BB.bytesPerBankRead} bytes</strong> per read, so the natural design would give every channel {BB.banksPerChannelIdeal} banks. With <strong className="num">{BB.channelsPerChiplet}</strong> channels per chiplet, that would take <strong className="num">{fmt(BB.banksNeeded)}</strong> banks.</p>,
        <p key="1">The DRAM die, however, has only <strong className="num">{BB.banksOnDie}</strong> banks.</p>,
        <p key="2">The design also keeps <strong className="num">{BB.spares}</strong> of them in reserve as spares, for reasons covered in the third challenge. That leaves <strong className="num">{BB.usable}</strong>, which works out to exactly <strong className="num">{BB.banksPerChannel}</strong> banks for each of the {BB.channelsPerChiplet} channels.</p>,
        <p key="3">Three banks return <strong className="num">{BB.bytesPerThreeBankRead} bytes</strong> per read rather than {BB.chunkBytes}. A simple layout would need {numberWord(BB.readsPerChunk)} reads for every chunk, fetching {BB.readsPerChunk * BB.bytesPerThreeBankRead} bytes to use {BB.chunkBytes} and throwing away a third of what it reads. The paper calls this overfetch.</p>,
        <p key="4">One fix is to stagger the data so that pieces of a chunk straddle two columns, read both into a {SB.naiveBufferBytes}-byte buffer, and shift the pieces into place, tracking a different alignment for each address. Nothing is wasted, but the shifting circuitry is complicated and makes it harder to run the memory controller at high speed.</p>,
        <>
          <p key="5">Raptor deals with the problem in the way the software lays out data, a technique the paper calls <strong>stream blocking</strong>. Each chunk is split into a <strong className="num">{SB.alignedBytes}-byte</strong> part, stored across the {BB.banksPerChannel} banks at the same column, and a <strong className="num">{SB.partialBytes}-byte</strong> remainder. Remainders from neighboring chunks are packed together in a separate region.</p>
          <p>One read fetches a column of remainders into a small {SB.smallBufferBytes}-byte cache, which holds the leftovers for the next {numberWord(CHUNKS_PER_PARTIAL_READ)} chunks. Each chunk then needs just one more read for its main part. The pattern is fixed, the buffers are small, and every byte that is read gets used.</p>
        </>,
        <>
          <p key="6">The paper works through real data: one attention layer of {LX.model} at {LX.contextLabel} context, which needs <strong className="num">{LX.layerMB} MB</strong> of KV cache. Stream blocking splits it into <strong className="num">{fmt(LX.tiles)}</strong> tiles of {LX.tileKB} KB, {LX.tilesPerChannel} for each of a slice’s {LX.channels} channels.</p>
          <p>During decode, a tensor engine reads its tiles by opening a row and streaming every column before moving to the next, so each row it opens is used in full. The channels run independently, so a refresh on one doesn’t stall the others, and {LX.tileKB} KB tiles line up with the pages that paged-attention software already uses. The whole layer fills {LX.fillLabel} of each bank, about {LX.rowsUsed} of {fmt(LX.rowsTotal)} rows.</p>
        </>,
      ]}
      description={(s) => [
        `Grid of ${BB.banksNeeded} squares: ${BB.channelsPerChiplet} channels times ${BB.banksPerChannelIdeal} banks would be needed.`,
        `Only ${BB.banksOnDie} squares are filled; ${BANKS_SHORT} are missing.`,
        `${BB.spares} squares turn pink as spares; the remaining ${BB.usable} are grouped in threes, one group per channel.`,
        `Two reads across ${BB.banksPerChannel} banks fetch ${BB.readsPerChunk * BB.bytesPerThreeBankRead} bytes, but a chunk is only ${BB.chunkBytes} bytes; the rest is crossed out as wasted.`,
        `Staggered layout: chunk pieces straddle two columns, and a ${SB.naiveBufferBytes}-byte buffer shifts them into place.`,
        `Stream blocking: each chunk's ${SB.alignedBytes}-byte part sits in one column across the three banks; its ${SB.partialBytes}-byte leftover is packed with others in a leftovers column. One read of that column caches the leftovers for ${CHUNKS_PER_PARTIAL_READ} chunks, and each chunk then needs one read for its main part.`,
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
