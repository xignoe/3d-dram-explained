import type { ReactElement } from 'react';
import { scaleLog } from 'd3-scale';
import { Badge, Chef, MEM_COLOR, Note, Term } from '../components/ui';
import { HERO, PROBLEMS, STACKING, STREAM_FLIPPING as SF } from '../data/paper';
import { numberWord } from '../lib/fmt';
import { useDesktop } from '../lib/hooks';
import { CLAIMS, COMPARISON, ENERGY_LADDER, LEVEL_FILL, PRESENTATION, type Level, type MemoryCard } from '../data/dmatrix';
import { P } from '../lib/palette';

/* ---------- small schematics, one per memory (not to scale) ---------- */

function SramTiles() {
  return (
    <svg viewBox="0 0 120 84" className="w-full" aria-hidden>
      {Array.from({ length: 16 }, (_, i) => {
        const x = 2 + (i % 4) * 29.5, y = 2 + Math.floor(i / 4) * 20.5;
        return (
          <g key={i}>
            <rect x={x} y={y} width={26} height={12} fill={P.logic} stroke={P.ink} strokeWidth={0.7} />
            <rect x={x} y={y + 13} width={26} height={4.5} fill={P.sram} fillOpacity={0.75} />
          </g>
        );
      })}
    </svg>
  );
}

function HbmPackage() {
  return (
    <svg viewBox="0 0 120 84" className="w-full" aria-hidden>
      {[2, 104].map((x) => (
        <g key={x}>
          {[0, 1, 2, 3, 4].map((k) => <rect key={k} x={x} y={4 + k * 15.5} width={14} height={13} fill={P.hbmTint} stroke={P.ink} strokeWidth={0.6} />)}
        </g>
      ))}
      {/* the beachfront: the only place memory connects */}
      <rect x={19} y={4} width={3} height={76} fill={P.hbm} />
      <rect x={98} y={4} width={3} height={76} fill={P.hbm} />
      <rect x={25} y={4} width={70} height={76} fill={P.logic} stroke={P.ink} strokeWidth={0.8} />
      <text x={60} y={46} textAnchor="middle" fontSize="9" fill={P.ink}>compute</text>
    </svg>
  );
}

function StackSide() {
  return (
    <svg viewBox="0 0 120 84" className="w-full" aria-hidden>
      <rect x={4} y={4} width={112} height={16} fill={P.logic} stroke={P.ink} strokeWidth={0.8} />
      <text x={60} y={15.5} textAnchor="middle" fontSize="9" fill={P.ink}>compute</text>
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={10 + i * 9.1} x2={10 + i * 9.1} y1={21} y2={31} stroke={P.dram} strokeWidth={1.6} />
      ))}
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x={4} y={32 + k * 12.5} width={112} height={10.5} fill={P.dramTint} fillOpacity={k === 0 ? 1 : 0.55} stroke={P.dram} strokeWidth={0.8} />
      ))}
      <text x={60} y={40.5} textAnchor="middle" fontSize="8" fill={P.dramDeep}>DRAM</text>
    </svg>
  );
}

const SCHEMATIC: Record<MemoryCard['id'], () => ReactElement> = { sram: SramTiles, hbm: HbmPackage, dram3d: StackSide };

function Meter({ label, level, color }: { label: string; level: Level; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[0.78rem]">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted">{level}</span>
      </div>
      <div className="relative mt-1 h-[5px] bg-surface-2">
        <div className="absolute inset-y-0 left-0" style={{ width: `${LEVEL_FILL[level] * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function Card({ m }: { m: MemoryCard }) {
  const Schematic = SCHEMATIC[m.id];
  const color = MEM_COLOR[m.id];
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-5 border-t border-line pt-4 sm:block sm:border-t-0 sm:pt-0">
      <div>
        <div className="font-serif text-2xl font-medium leading-none" style={{ color }}>{m.name}</div>
        <div className="sans mt-1.5 text-[0.78rem] leading-snug text-muted">{m.kind}</div>
        <div className="mt-3 sm:mt-4"><Schematic /></div>
        <div className="sans mt-2 text-[0.72rem] leading-snug text-faint sm:min-h-[2.6em]">{m.layout}</div>
      </div>
      <div className="sans space-y-2.5 sm:mt-5">
        <Meter label="Capacity" level={m.capacity} color={color} />
        <Meter label="Bandwidth" level={m.bandwidth} color={color} />
        <Meter label="Power" level={m.power} color={color} />
      </div>
    </div>
  );
}

/** The energy ladder drawn as a log-scale ladder, with the paper's own measurement on the same axis. */
function EnergyLadder() {
  // Phones draw it in fewer units so the type stays near its true size.
  const narrow = !useDesktop();
  const W = narrow ? 350 : 430, LABEL = narrow ? 138 : 158, X0 = LABEL + 14, X1 = W - 14;
  const x = scaleLog().domain([0.01, 10]).range([X0, X1]);
  const ticks = [{ v: 0.01, t: '10 fJ' }, { v: 0.1, t: '100 fJ' }, { v: 1, t: '1 pJ' }, { v: 10, t: '10 pJ' }];
  const ROW = 40, TOP = 32;
  const tone: Record<string, string> = { sram: P.sram, wire: P.ink3, io3d: P.dram, interposer: P.hbm, hbm4: P.hbm };
  // The paper's measurement sits right after the 3D I/O row it should be compared with.
  const rows = [
    ...ENERGY_LADDER.slice(0, 3).map((r) => ({ ...r, measured: false })),
    { id: 'paper', what: 'Raptor, measured', energy: `${SF.afterPJPerBit}–${SF.beforePJPerBit} pJ`, lo: SF.afterPJPerBit, hi: SF.beforePJPerBit, perMm: false, highlight: false, measured: true },
    ...ENERGY_LADDER.slice(3).map((r) => ({ ...r, measured: false })),
  ];
  const H = TOP + rows.length * ROW + 6;
  return (
    <div>
      <div className="font-serif text-2xl font-medium leading-none text-ink">The energy ladder</div>
      <div className="sans mt-1.5 text-[0.78rem] text-muted">Energy to move one bit, log scale</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" aria-hidden>
        {ticks.map((k) => (
          <g key={k.v}>
            <line x1={x(k.v)} x2={x(k.v)} y1={TOP - 8} y2={H - 4} stroke={P.rule} strokeDasharray="2 3" />
            <text x={x(k.v)} y={TOP - 14} textAnchor="middle" fontSize="11" className="svg-num" fill={P.ink3}>{k.t}</text>
          </g>
        ))}
        <line x1={0} x2={W} y1={TOP - 6} y2={TOP - 6} stroke={P.ink} strokeWidth={1.2} />
        {rows.map((r, i) => {
          const y = TOP + i * ROW + ROW / 2;
          const c = r.measured ? P.ink : tone[r.id];
          return (
            <g key={r.id}>
              {r.highlight && <rect x={0} y={y - ROW / 2 + 1} width={W} height={ROW - 2} fill={P.dramTint} fillOpacity={0.35} />}
              <line x1={0} x2={W} y1={y + ROW / 2} y2={y + ROW / 2} stroke={P.rule} strokeOpacity={0.6} />
              <text x={4} y={y - 2} fontSize="13" fontWeight={r.highlight || r.measured ? 600 : 400} fill={r.highlight ? P.dram : P.ink}>{r.what}</text>
              <text x={4} y={y + 13} fontSize="11.5" className="svg-num" fill={P.ink2}>{r.energy}{r.measured ? '  ■ paper' : ''}</text>
              {r.measured ? (
                [r.lo, r.hi].map((v) => <rect key={v} x={x(v) - 4} y={y - 4} width={8} height={8} fill={P.ink} />)
              ) : r.id === 'hbm4' ? (
                <g>
                  <rect x={x(r.lo)} y={y - 3.5} width={x(r.hi) - x(r.lo)} height={7} fill={c} fillOpacity={0.3} />
                  <circle cx={x(r.lo)} cy={y} r={5} fill={c} />
                  <line x1={x(r.hi)} x2={x(r.hi)} y1={y - 6} y2={y + 6} stroke={c} strokeWidth={1.5} />
                </g>
              ) : r.lo !== r.hi ? (
                <rect x={x(r.lo) - 2} y={y - 5} width={x(r.hi) - x(r.lo) + 4} height={10} rx={5} fill={c} />
              ) : (
                <g>
                  <circle cx={x(r.lo)} cy={y} r={5} fill={r.perMm ? P.paper : c} stroke={c} strokeWidth={1.6} />
                  {r.perMm && !narrow && <text x={x(r.lo) + 9} y={y + 3.5} fontSize="11" fill={P.ink3}>per mm</text>}
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <p className="sans mt-3 text-[0.8rem] leading-relaxed text-muted">
        3D I/O lands about <span className="num font-semibold text-dram3d">{CLAIMS.vsHBMEnergyX}×</span> below HBM: a millimetre-scale vertical path with no <Term k="phy">PHY</Term>, instead of a centimetre-scale interposer trace plus a PHY. Open circles are per millimetre travelled.
      </p>
    </div>
  );
}

export function S14Conclusion() {
  const description = `Comparison from ${PRESENTATION.label}. ${COMPARISON.map((m) => `${m.name}, ${m.kind}: capacity ${m.capacity}, bandwidth ${m.bandwidth}, power ${m.power}`).join('. ')}. Energy per bit: ${ENERGY_LADDER.map((r) => `${r.what} ${r.energy}`).join('; ')}.`;
  return (
    <section id="conclusion" aria-labelledby="conclusion-title" className="px-4 pb-[12svh] pt-[10svh] sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1320px] border-t-[1.5px] border-ink pt-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-20">
          <header>
            <div className="flex items-end gap-4">
              <span className="section-num" aria-hidden>14</span>
              <span className="kicker pb-1.5">Conclusion</span>
            </div>
            <h2 id="conclusion-title" className="mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.015em] lg:text-[2.6rem]">The case for 3D-DRAM</h2>
          </header>
          <div className="step-card is-active max-w-[38rem] lg:pt-2">
            <div className="step-body">
              <p>Decoding reads the model’s weights and a growing KV cache for every token it writes, so a language model runs only as fast as its memory can deliver data, and much of its power goes into moving that data. Raptor’s answer is to put the memory directly underneath the processor.</p>
              <p>That choice created {numberWord(PROBLEMS.length)} challenges, and each had a specific fix:</p>
              <ol className="sans mt-3 border-t border-line text-[0.92rem]">
                {PROBLEMS.map((p, i) => (
                  <li key={p.scene} className="grid grid-cols-[1.6rem_minmax(0,1fr)] gap-x-2 border-b border-line py-2">
                    <span className="font-serif italic text-faint">{i + 1}</span>
                    <span><span className="text-ink">{p.short}</span><span className="text-faint"> → </span><a href={`#${p.scene}`} className="text-ink">{p.fix}</a></span>
                  </li>
                ))}
              </ol>
              <p className="mt-4">The paper reports about <strong className="num">{HERO.bandwidthPerCardTBs} TB/s</strong> per card, with each bit moved between the dies for about <strong className="num">{STACKING.ioPJPerBit} pJ</strong> on early silicon.</p>
              <p>The comparison below, from {PRESENTATION.label}, sums up where that leaves 3D-DRAM against the other two kinds of memory.</p>
            </div>
          </div>
        </div>

        <figure className="mt-14" aria-describedby="conclusion-fig-desc">
          <p id="conclusion-fig-desc" className="sr-only">{description}</p>
          <div className="fig-head">
            <span className="fig-label">Fig. 14</span>
          </div>
          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)] lg:gap-12">
            <div className="grid gap-5 sm:grid-cols-3 sm:gap-8">
              {COMPARISON.map((m) => <Card key={m.id} m={m} />)}
            </div>
            <EnergyLadder />
          </div>

          <div className="mt-10 border-t border-line pb-6 pt-5 text-center">
            <p className="text-[1.05rem] leading-snug text-muted lg:text-[1.15rem]">
              3D-DRAM uses a larger die with <span className="num">{CLAIMS.layers3D}</span> layers, against <span className="num">{CLAIMS.layersHBM}</span> in an HBM stack, which is better for yield.
            </p>
            <p className="mt-1.5 text-[1.05rem] leading-snug text-ink lg:text-[1.15rem]">
              <strong className="font-semibold">SRAM-class bandwidth at about a tenth of HBM’s energy</strong>: short vertical I/O, no sideways data movement, no PHY and no <Term k="beachfront">beachfront</Term> limit.
            </p>
          </div>

          <figcaption className="fig-caption mt-4">
            Ratings and energy figures from {PRESENTATION.label} (“{PRESENTATION.slideTitle}”), not from the paper; schematics are not to scale. For comparison, the paper measured <span className="num">{SF.beforePJPerBit}</span> pJ/bit with every wire switching and <span className="num">{SF.afterPJPerBit}</span> pJ/bit with stream flipping <Badge kind="measured" className="!text-[0.62rem]" />.
          </figcaption>
          <Note>The presentation’s “about 10×” compares against an HBM4 system figure that includes on-chip energy. The paper’s own comparison, about {STACKING.vsHBM3EnergyX}× less than reported figures for HBM3, uses the I/O energy alone.</Note>
        </figure>

        <div className="mt-12 max-w-[38rem]">
          <Chef>To close the kitchen picture: Raptor puts a fridge right under the countertop, so the chef spends far less time fetching ingredients. It holds less than the big pantry down the hall, so the best kitchen may use both: the pantry for whatever takes up the most room, and the fridge under the counter for whatever has to arrive fastest.</Chef>
        </div>
      </div>
    </section>
  );
}
