import { scaleLog } from 'd3-scale';
import { Scene, type SceneState } from '../components/Scene';
import { Chef, MEM_COLOR, Note, Term } from '../components/ui';
import { P } from '../lib/palette';
import { KV_INTRO, MEMORY, XPU_PFLOPS, fullMemoryReadsPerSecond, type MemoryId } from '../data/paper';
import { fmt } from '../lib/fmt';
import { useDesktop } from '../lib/hooks';

const H = 420, M = { l: 64, r: 24, t: 28, b: 56 };
const ORDER: MemoryId[] = ['sram', 'hbm', 'dram3d'];
const CHEF: Record<MemoryId, string> = { sram: 'the countertop', hbm: 'the pantry down the hall', dram3d: 'the pantry under the kitchen' };

/**
 * Each memory drawn as a store attached to the same processor. Box area is
 * proportional to capacity; the channel's width at the processor is
 * proportional to bandwidth (both from Table III).
 */
function Pantries({ step, W }: { step: number; W: number }) {
  const narrow = W < 600;
  const colW = W / ORDER.length;
  const chip = narrow ? 50 : 64;
  const chipY = 64, channelLen = narrow ? 34 : 44;
  const maxCap = Math.max(...ORDER.map((id) => MEMORY[id].capacityGB));
  const maxBw = Math.max(...ORDER.map((id) => MEMORY[id].bandwidthTBs));
  const k = Math.min(colW * 0.86, 190) / Math.sqrt(maxCap);
  return (
    <g>
      {ORDER.map((id, i) => {
        const m = MEMORY[id];
        const cx = colW * (i + 0.5);
        const box = k * Math.sqrt(m.capacityGB);
        const band = chip * (m.bandwidthTBs / maxBw);
        const top = chipY + chip + channelLen;
        const bandBottom = Math.min(band, box);
        const on = step >= i;
        return (
          <g key={id} className="fade" opacity={on ? 1 : 0.18}>
            <text x={cx} y={20} textAnchor="middle" fontSize={narrow ? 15 : 18} fontWeight={500} style={{ fontFamily: 'var(--font-serif)' }} fill={MEM_COLOR[id]}>{m.label}</text>
            <text x={cx} y={38} textAnchor="middle" fontSize="11" className="svg-num" fill={P.ink2}>{m.bandwidthTBs} TB/s · {m.capacityGB} GB</text>
            {/* the same processor in every case */}
            <rect x={cx - chip / 2} y={chipY} width={chip} height={chip} fill={P.logic} stroke={P.ink} strokeWidth={1.2} />
            {Array.from({ length: 9 }, (_, j) => (
              <rect key={j} x={cx - chip / 2 + 7 + (j % 3) * ((chip - 14) / 3)} y={chipY + 7 + Math.floor(j / 3) * ((chip - 14) / 3)} width={(chip - 14) / 3 - 4} height={(chip - 14) / 3 - 4} fill={P.te} stroke={P.ink3} strokeWidth={0.6} />
            ))}
            {/* channel: width at the processor encodes bandwidth */}
            <path d={`M${cx - band / 2} ${chipY + chip} L${cx + band / 2} ${chipY + chip} L${cx + bandBottom / 2} ${top} L${cx - bandBottom / 2} ${top} Z`}
              fill={MEM_COLOR[id]} fillOpacity={0.35} stroke={MEM_COLOR[id]} strokeWidth={1} />
            {/* the store: area encodes capacity */}
            <rect x={cx - box / 2} y={top} width={box} height={box} fill={P.paper} stroke={MEM_COLOR[id]} strokeWidth={1.6} />
            {(() => {
              const shelves = Math.max(1, Math.round(box / 14));
              return Array.from({ length: shelves }, (_, j) => (
                <line key={j} x1={cx - box / 2 + 3} x2={cx + box / 2 - 3} y1={top + ((j + 1) * box) / (shelves + 1)} y2={top + ((j + 1) * box) / (shelves + 1)} stroke={MEM_COLOR[id]} strokeOpacity={0.35} />
              ));
            })()}
            {W >= 600 && <text x={cx} y={top + box + 18} textAnchor="middle" fontSize="12" fontStyle="italic" style={{ fontFamily: 'var(--font-serif)' }} fill={P.ink2}>{CHEF[id]}</text>}
          </g>
        );
      })}
      <text x={W / 2} y={H - 10} textAnchor="middle" fontSize="11" fill={P.ink2}>box area ∝ capacity · channel width at the processor ∝ bandwidth</text>
    </g>
  );
}

function Bars({ W }: { W: number }) {
  const sorted = [...ORDER].sort((a, b) => fullMemoryReadsPerSecond(b) - fullMemoryReadsPerSecond(a));
  const x = scaleLog().domain([10, 100000]).range([M.l + 40, W - M.r - 135]);
  const rowH = 74;
  return (
    <g>

      {sorted.map((id, i) => {
        const v = fullMemoryReadsPerSecond(id);
        const yy = 90 + i * rowH;
        return (
          <g key={id}>
            <text x={M.l - 40} y={yy + 20} fontSize="17" fontWeight={500} style={{ fontFamily: 'var(--font-serif)' }} fill={MEM_COLOR[id]}>{MEMORY[id].label}</text>
            <rect x={x(10)} y={yy + 30} width={x(v) - x(10)} height={20} fill={MEM_COLOR[id]} className="fade" />
            <text x={x(v) + 8} y={yy + 46} fontSize="14" className="svg-num" fill={P.ink}>{fmt(v, 0)} times a second</text>
          </g>
        );
      })}

    </g>
  );
}

function Visual({ step }: SceneState) {
  const W = useDesktop() ? 600 : 380;
  const bars = step >= 3;
  return (
    <div className="relative h-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden>
        <g className="fade" opacity={bars ? 0 : 1}><Pantries step={step} W={W} /></g>
        <g className="fade" opacity={bars ? 1 : 0}>{bars && <Bars W={W} />}</g>
      </svg>
    </div>
  );
}

export function S03Pantry() {
  const { sram, hbm, dram3d } = MEMORY;
  return (
    <Scene
      id="pantry"
      num={3}
      kicker="Three kinds of memory"
      title="Memory is usually either fast or large"
      steps={[
        <>
          <p key="a"><strong className="text-sram-ink">SRAM</strong> is built into the processor itself. It is very fast, {sram.bandwidthTBs} TB/s per card in the paper’s comparison, but there is little of it: <strong className="num">{sram.capacityGB} GB</strong>. The paper’s {KV_INTRO.modelLabel} example, with {KV_INTRO.weightsGB} GB of weights, would have to be spread across many cards.</p>
          <Chef>SRAM is like a countertop. Everything is within reach, but there isn’t much room.</Chef>
        </>,
        <>
          <p key="b"><strong style={{ color: MEM_COLOR.hbm }}>HBM</strong> places stacks of memory chips next to the processor. It holds much more, <strong className="num">{hbm.capacityGB} GB</strong> per card, but delivers <strong className="num">{hbm.bandwidthTBs} TB/s</strong>.</p>
          <Chef>HBM is a large pantry down the hall with a single door.</Chef>
        </>,
        <>
          <p key="c"><strong style={{ color: MEM_COLOR.dram3d }}>Raptor’s 3D-DRAM</strong> sits directly underneath the processor and provides <strong className="num">{dram3d.bandwidthTBs} TB/s</strong> and <strong className="num">{dram3d.capacityGB} GB</strong> per card. It is neither the fastest nor the largest of the three, but it comes much closer to offering both.</p>
          <Chef>3D-DRAM is a pantry built directly beneath the kitchen, with a trapdoor under every workstation.</Chef>
        </>,
        <>
          <p key="d">One way to compare them is to divide <Term k="bandwidth">bandwidth</Term> by <Term k="capacity">capacity</Term>. The result is the number of times per second a card could read through all of its memory, which is roughly the kind of work that decoding asks for.</p>
          <Note>This calculation is ours rather than the paper’s. In the paper’s comparison, all three memories are paired with the same {XPU_PFLOPS} PFLOPS compute logic.</Note>
        </>,
      ]}
      description={(s) =>
        s.step < 3
          ? `Drawing of three memories attached to the same processor, with box area proportional to capacity and channel width proportional to bandwidth. SRAM: ${sram.bandwidthTBs} TB/s, ${sram.capacityGB} GB. HBM: ${hbm.bandwidthTBs} TB/s, ${hbm.capacityGB} GB. 3D-DRAM: ${dram3d.bandwidthTBs} TB/s, ${dram3d.capacityGB} GB.`
          : `Derived bar chart, bandwidth divided by capacity: SRAM about ${fmt(fullMemoryReadsPerSecond('sram'), 0)} full reads per second, 3D-DRAM about ${fmt(fullMemoryReadsPerSecond('dram3d'), 0)}, HBM about ${fmt(fullMemoryReadsPerSecond('hbm'), 0)}.`
      }
      visual={(s) => <Visual {...s} />}
      figure={(s) => s.step < 3
        ? { caption: <>The three memories attached to the same {XPU_PFLOPS} PFLOPS compute logic, drawn to scale: each box’s area is proportional to capacity per card, and each channel’s width where it meets the processor is proportional to bandwidth. Source: Table III.</> }
        : { evidence: 'derived', caption: <>How many times per second each card could read through its entire memory: bandwidth ÷ capacity, log scale. Our arithmetic on Table III, not a result from the paper.</> }}
    />
  );
}
