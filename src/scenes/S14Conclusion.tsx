import type { ReactElement } from 'react';
import { Badge, Chef, MEM_COLOR, Note, Term } from '../components/ui';
import { HERO, STACKING, STREAM_FLIPPING as SF } from '../data/paper';
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

function EnergyLadder() {
  return (
    <div>
      <div className="font-serif text-2xl font-medium leading-none text-ink">The energy ladder</div>
      <div className="sans mt-1.5 text-[0.78rem] text-muted">Energy to move one bit</div>
      <table className="sans mt-4 w-full border-y-[1.5px] border-ink text-left text-[0.86rem]">
        <thead>
          <tr className="border-b border-line text-[0.72rem] text-muted">
            <th className="py-2 font-normal">Memory or interconnect</th>
            <th className="py-2 text-right font-normal">Energy per bit</th>
          </tr>
        </thead>
        <tbody>
          {ENERGY_LADDER.map((r) => (
            <tr key={r.what} className={`border-b border-line last:border-b-0 ${r.highlight ? 'bg-dram3d/10' : ''}`}>
              <td className={`py-2.5 pl-2 ${r.highlight ? 'font-semibold text-dram3d' : 'text-ink'}`}>{r.what}</td>
              <td className={`num py-2.5 pr-2 text-right ${r.highlight ? 'font-semibold text-dram3d' : 'text-ink'}`}>{r.energy}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sans mt-3 text-[0.8rem] leading-relaxed text-muted">
        3D I/O lands about <span className="num font-semibold text-dram3d">{CLAIMS.vsHBMEnergyX}×</span> below HBM: a millimetre-scale vertical path with no <Term k="phy">PHY</Term>, instead of a centimetre-scale interposer trace plus a PHY.
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
              <p>That choice created four challenges, from fitting data into three banks to keeping a hot stack reliable, and each had a specific fix. The paper reports about <strong className="num">{HERO.bandwidthPerCardTBs} TB/s</strong> per card, with each bit moved between the dies for about <strong className="num">{STACKING.ioPJPerBit} pJ</strong> on early silicon.</p>
              <p>The comparison below, from {PRESENTATION.label}, sums up where that leaves 3D-DRAM against the other two kinds of memory.</p>
            </div>
          </div>
        </div>

        <figure className="mt-14" aria-describedby="conclusion-fig-desc">
          <p id="conclusion-fig-desc" className="sr-only">{description}</p>
          <div className="fig-head">
            <span className="fig-label">Fig. 14</span>
          </div>
          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:gap-14">
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
