import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { Scene, type SceneState } from '../components/Scene';
import { BigStat, Note } from '../components/ui';
import { P } from '../lib/palette';
import { SILICON as S, FIG9_SHAPE, HERO, fig9ShapeAt, BANK_BUDGET } from '../data/paper';

const BANKS_PER_CHANNEL = BANK_BUDGET.banksPerChannel;

function Spark({ series, label, color, rising }: { series: 'latency3Bank' | 'bandwidth3Bank'; label: string; color: string; rising: boolean }) {
  const W = 260, H = 110;
  const x = scaleLinear().domain([S.freqMinMHz, S.freqMaxMHz]).range([10, W - 10]);
  const y = scaleLinear().domain([0, 1]).range([H - 22, 14]);
  const pts = FIG9_SHAPE.freqsMHz.map((f, i) => [x(f), y(FIG9_SHAPE[series][i])] as [number, number]);
  const mx = x(S.designMHz), my = y(fig9ShapeAt(series, S.designMHz));
  return (
    <div>
      <div className="sans mb-1 text-xs text-muted">{label} {rising ? 'rises' : 'falls'} as the DRAM clock rises</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
        <line x1={10} x2={W - 10} y1={H - 22} y2={H - 22} stroke={P.rule} />
        <path d={line()(pts) ?? ''} fill="none" stroke={color} strokeWidth="2" />
        <line x1={mx} x2={mx} y1={8} y2={H - 20} stroke={P.ink} strokeDasharray="2 3" />
        <circle cx={mx} cy={my} r="4" fill={P.paper} stroke={P.ink} strokeWidth="1.5" />
        <text x={10} y={H - 4} fontSize="10" fill={P.ink3}>{S.freqMinMHz} MHz</text>
        <text x={mx} y={H - 4} fontSize="10" textAnchor="middle" fill={P.ink}>{S.designMHz}</text>
        <text x={W - 10} y={H - 4} fontSize="10" textAnchor="end" fill={P.ink3}>{S.freqMaxMHz / 1000} GHz</text>
      </svg>
    </div>
  );
}

/** One chunk travelling from a bank up into a tensor engine's buffer. Illustration. */
function ChunkPath({ reduced }: { reduced: boolean }) {
  const pieces = BANK_BUDGET.chunkBytes / BANK_BUDGET.bytesPerBankRead;
  return (
    <svg viewBox="0 0 520 134" className="w-full" aria-hidden>
      <defs>
        <path id="chunk-route" d="M120 92 C 220 92, 300 40, 392 40" />
        <marker id="cp-ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill={P.ink} /></marker>
      </defs>
      {/* banks of one channel */}
      {Array.from({ length: BANK_BUDGET.banksPerChannel }, (_, b) => (
        <g key={b} transform={`translate(${20 + b * 32} 70)`}>
          <rect width={28} height={44} fill={P.dramTint} stroke={P.ink} strokeWidth={1} />
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={3} x2={25} y1={44 * f} y2={44 * f} stroke={P.dram} strokeOpacity={0.6} />)}
        </g>
      ))}
      <text x={20} y={128} fontSize="11" fill={P.ink2}>banks of one channel</text>
      <use href="#chunk-route" fill="none" stroke={P.ink} strokeWidth={1.2} strokeDasharray="3 3" markerEnd="url(#cp-ah)" />
      <g transform={reduced ? 'translate(270 62)' : undefined}>
        {Array.from({ length: pieces }, (_, q) => <rect key={q} x={-22 + q * 11} y={-6} width={10} height={12} fill={P.dram} stroke={P.ink} strokeWidth={0.6} />)}
        {!reduced && <animateMotion dur="2.4s" repeatCount="indefinite" rotate="0"><mpath href="#chunk-route" /></animateMotion>}
      </g>
      <text x={250} y={36} textAnchor="middle" fontSize="13" style={{ fontFamily: 'var(--font-serif)' }} fontStyle="italic" fill={P.ink}>about {S.flitLatencyNs} ns per chunk</text>
      <g transform="translate(398 14)">
        <rect width={104} height={52} rx={2} fill={P.te} stroke={P.ink} strokeWidth={1.2} />
        <text x={52} y={30} textAnchor="middle" fontSize="12" fill={P.ink}>tensor engine</text>
      </g>
    </svg>
  );
}

function Visual({ step, reduced }: SceneState) {
  return (
    <div className="flex h-full flex-col justify-center-safe gap-5 lg:gap-8">
      <ChunkPath reduced={reduced} />
      <div className="grid grid-cols-2 divide-x divide-line border-y border-line">
        <div className="py-4 pr-4"><BigStat value={`~${S.flitLatencyNs}`} unit="ns" label="average time to deliver one chunk" color="var(--color-dram3d)" /></div>
        <div className="py-4 pl-5"><BigStat value={`~${S.bandwidthPerCardTBs}`} unit="TB/s" label="DRAM bandwidth per card" color="var(--color-dram3d)" /></div>
      </div>
      <div className={`fade grid grid-cols-2 gap-6 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <Spark series="latency3Bank" label="Latency" color={P.sram} rising={false} />
        <Spark series="bandwidth3Bank" label="Bandwidth" color={P.dram} rising />
      </div>
    </div>
  );
}

export function S10Silicon() {
  return (
    <Scene
      id="silicon"
      num={10}
      kicker="Measured on silicon"
      title="Testing on real chips"
      steps={[
        <p key="0">Up to here, this page has described the design: how Raptor is meant to work, and what it should achieve in principle. The figures in this section are different. They were <strong>measured</strong> on early Raptor chips. At the {S.designMHz} MHz design target, a chunk arrived in about <strong className="num">{S.flitLatencyNs} ns</strong> on average, and a card moved about <strong className="num">{S.bandwidthPerCardTBs} TB/s</strong>, in line with the roughly {HERO.bandwidthPerCardTBs} TB/s the rest of the page has been using.</p>,
        <p key="1">The team also varied the DRAM clock between {S.freqMinMHz} MHz and {S.freqMaxMHz / 1000} GHz. A faster clock raised bandwidth and lowered latency, as expected.</p>,
        <>
          <p key="2">Stream blocking contributes to these results. Each row of a bank holds several chunks, so the cost of opening a row is shared among all the chunks that are read from it. Measured on real chips, the ideas from earlier sections hold up.</p>
          <Note>Elsewhere this page uses the paper’s headline figure of {HERO.bandwidthPerCardTBs} TB/s, which the paper quotes for operation with refresh and error scrubbing running (Sec VII-A). The {S.bandwidthPerCardTBs} TB/s here is the measurement shown in its Fig. 9.</Note>
        </>,
      ]}
      description={(s) => `Measured: about ${S.flitLatencyNs} nanoseconds per chunk and about ${S.bandwidthPerCardTBs} terabytes per second per card at ${S.designMHz} megahertz.` + (s.step >= 1 ? ` Two trend lines without values: latency falls and bandwidth rises as DRAM frequency increases from ${S.freqMinMHz} megahertz to ${S.freqMaxMHz / 1000} gigahertz.` : '')}
      visual={(s) => <Visual {...s} />}
      figure={(s) => ({
        evidence: 'measured',
        caption: s.step >= 1
          ? <>Measured at the {S.designMHz} MHz design target. The trend lines show shape only, read from Fig. 9 for the {BANKS_PER_CHANNEL}-bank design; no values are implied. Source: Sec V-1, Fig. 9.</>
          : <>Measured at the {S.designMHz} MHz design target. Source: Sec V-1.</>,
      })}
    />
  );
}
