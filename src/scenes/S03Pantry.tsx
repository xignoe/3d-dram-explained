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
const pow10 = (t: number) => Number.isInteger(Math.log10(t));

function Scatter({ step, W }: { step: number; W: number }) {
  const x = scaleLog().domain([1, 1000]).range([M.l, W - M.r]);
  const y = scaleLog().domain([10, 300]).range([H - M.b, M.t]);
  return (
    <g>
      {x.ticks().filter(pow10).map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={M.t} y2={H - M.b} stroke={P.rule} strokeDasharray="2 3" />
          <text x={x(t)} y={H - M.b + 18} textAnchor="middle" className="svg-label svg-num">{fmt(t)}</text>
        </g>
      ))}
      {y.ticks().filter(pow10).map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke={P.rule} strokeDasharray="2 3" />
          <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="svg-label svg-num">{fmt(t)}</text>
        </g>
      ))}
      <text x={(M.l + W - M.r) / 2} y={H - 12} textAnchor="middle" className="svg-label">capacity per card (GB, log scale) →</text>
      <text transform={`translate(16 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" className="svg-label">bandwidth per card (TB/s, log) →</text>
      {ORDER.map((id, i) => {
        const m = MEMORY[id];
        const on = step >= i;
        const cx = x(m.capacityGB), cy = y(m.bandwidthTBs);
        const anchor = id === 'hbm' ? 'end' : 'start';
        const dx = id === 'hbm' ? -14 : 14;
        return (
          <g key={id} className="fade" opacity={on ? 1 : 0}>
            <circle cx={cx} cy={cy} r={step === i ? 9 : 7} fill={MEM_COLOR[id]} stroke={P.paper} strokeWidth={2} className="fade" />
            <text x={cx + dx} y={cy - 6} textAnchor={anchor} fontSize="17" fontWeight={500} style={{ fontFamily: 'var(--font-serif)' }} fill={MEM_COLOR[id]}>{m.label}</text>
            <text x={cx + dx} y={cy + 12} textAnchor={anchor} fontSize="12" className="svg-num" fill={P.ink}>{m.bandwidthTBs} TB/s · {m.capacityGB} GB</text>
            {W >= 600 && <text x={cx + dx} y={cy + 28} textAnchor={anchor} fontSize="11" fontStyle="italic" style={{ fontFamily: 'var(--font-serif)' }} fill={P.ink2}>{CHEF[id]}</text>}
          </g>
        );
      })}
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
        <g className="fade" opacity={bars ? 0 : 1}><Scatter step={step} W={W} /></g>
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
          ? `Scatter chart of bandwidth versus capacity per card. SRAM: ${sram.bandwidthTBs} TB/s, ${sram.capacityGB} GB. HBM: ${hbm.bandwidthTBs} TB/s, ${hbm.capacityGB} GB. 3D-DRAM: ${dram3d.bandwidthTBs} TB/s, ${dram3d.capacityGB} GB.`
          : `Derived bar chart, bandwidth divided by capacity: SRAM about ${fmt(fullMemoryReadsPerSecond('sram'), 0)} full reads per second, 3D-DRAM about ${fmt(fullMemoryReadsPerSecond('dram3d'), 0)}, HBM about ${fmt(fullMemoryReadsPerSecond('hbm'), 0)}.`
      }
      visual={(s) => <Visual {...s} />}
      figure={(s) => s.step < 3
        ? { caption: <>Memory bandwidth against capacity per card, both on log scales. All three pair with the same {XPU_PFLOPS} PFLOPS compute logic. Source: Table III.</> }
        : { evidence: 'derived', caption: <>How many times per second each card could read through its entire memory: bandwidth ÷ capacity, log scale. Our arithmetic on Table III, not a result from the paper.</> }}
    />
  );
}
