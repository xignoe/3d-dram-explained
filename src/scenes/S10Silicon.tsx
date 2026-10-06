import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { Scene, type SceneState } from '../components/Scene';
import { Badge, BigStat, Note, Src } from '../components/ui';
import { SILICON as S, FIG9_SHAPE, HERO, fig9ShapeAt } from '../data/paper';

function Spark({ series, label, color, rising }: { series: 'latency3Bank' | 'bandwidth3Bank'; label: string; color: string; rising: boolean }) {
  const W = 260, H = 110;
  const x = scaleLinear().domain([S.freqMinMHz, S.freqMaxMHz]).range([10, W - 10]);
  const y = scaleLinear().domain([0, 1]).range([H - 22, 14]);
  const pts = FIG9_SHAPE.freqsMHz.map((f, i) => [x(f), y(FIG9_SHAPE[series][i])] as [number, number]);
  const mx = x(S.designMHz), my = y(fig9ShapeAt(series, S.designMHz));
  return (
    <figure className="panel p-3">
      <figcaption className="mb-1 text-xs text-muted">{label} {rising ? '↑' : '↓'} as DRAM clock rises</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
        <path d={line()(pts) ?? ''} fill="none" stroke={color} strokeWidth="2.5" />
        <line x1={mx} x2={mx} y1={8} y2={H - 20} stroke="var(--color-ink)" strokeDasharray="3 3" opacity="0.6" />
        <circle cx={mx} cy={my} r="4.5" fill="var(--color-ink)" />
        <text x={10} y={H - 4} fontSize="10" fill="var(--color-faint)">{S.freqMinMHz} MHz</text>
        <text x={mx} y={H - 4} fontSize="10" textAnchor="middle" fill="var(--color-ink)">{S.designMHz}</text>
        <text x={W - 10} y={H - 4} fontSize="10" textAnchor="end" fill="var(--color-faint)">{S.freqMaxMHz / 1000} GHz</text>
      </svg>
    </figure>
  );
}

function Visual({ step }: SceneState) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 lg:gap-6">
      <div className="flex items-center justify-between"><span className="text-sm text-muted">Raptor silicon at its {S.designMHz} MHz design target</span><Badge kind="measured" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="panel p-4 lg:p-6"><BigStat value={`~${S.flitLatencyNs}`} unit="ns" label="average time to deliver one chunk" color="var(--color-dram3d)" /></div>
        <div className="panel p-4 lg:p-6"><BigStat value={`~${S.bandwidthPerCardTBs}`} unit="TB/s" label="DRAM bandwidth per card" color="var(--color-dram3d)" /></div>
      </div>
      <div className={`fade grid grid-cols-2 gap-3 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <Spark series="latency3Bank" label="Latency" color="var(--color-sram)" rising={false} />
        <Spark series="bandwidth3Bank" label="Bandwidth" color="var(--color-dram3d)" rising />
      </div>
      <p className={`fade text-[0.7rem] text-faint ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>Trend only, read from Fig. 9 (approximate shape, no values). <Src>Sec V-1, Fig. 9</Src></p>
    </div>
  );
}

export function S10Silicon() {
  return (
    <Scene
      id="silicon"
      kicker="10 · Measured on silicon"
      title="What the real chip does."
      steps={[
        <p key="0">Everything so far was design. This part was <strong>measured</strong> on the first Raptor silicon. At its {S.designMHz} MHz design target, a chunk arrives in about <strong className="num">{S.flitLatencyNs} ns</strong> on average, and a card moves about <strong className="num">{S.bandwidthPerCardTBs} TB/s</strong>.</p>,
        <p key="1">The team also swept the DRAM clock from {S.freqMinMHz} MHz to {S.freqMaxMHz / 1000} GHz. Faster clocks raise bandwidth and cut latency, as you’d hope.</p>,
        <>
          <p key="2">Part of the reason is stream blocking. Each row of a bank holds several chunks, so opening a row once and streaming through it spreads the cost of opening it across many chunks.</p>
          <Note>Elsewhere this page uses the paper’s headline figure of {HERO.bandwidthPerCardTBs} TB/s, which it quotes for the configuration with refresh and error scrubbing running (Sec VII-A). The {S.bandwidthPerCardTBs} TB/s here is the Fig. 9 measurement.</Note>
        </>,
      ]}
      description={(s) => `Measured: about ${S.flitLatencyNs} nanoseconds per chunk and about ${S.bandwidthPerCardTBs} terabytes per second per card at ${S.designMHz} megahertz.` + (s.step >= 1 ? ` Two trend lines without values: latency falls and bandwidth rises as DRAM frequency increases from ${S.freqMinMHz} megahertz to ${S.freqMaxMHz / 1000} gigahertz.` : '')}
      visual={(s) => <Visual {...s} />}
    />
  );
}
