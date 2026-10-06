import { Scene, type SceneState } from '../components/Scene';
import { MEM_COLOR } from '../components/ui';
import { RESULTS as R } from '../data/paper';

function Tile({ value, label, color }: { value: number; label: React.ReactNode; color: string }) {
  return (
    <div className="px-2 py-3 first:pl-0 lg:px-5 lg:py-4">
      <div className="num font-serif text-4xl font-medium leading-none tracking-tight lg:text-7xl" style={{ color }}>{value.toFixed(2)}×</div>
      <div className="sans mt-2 text-[0.7rem] leading-snug text-muted lg:text-sm">{label}</div>
    </div>
  );
}

function Visual({ step }: SceneState) {
  return (
    <div className="flex h-full flex-col justify-center-safe gap-3 lg:gap-8">
      <div className="sans hidden text-sm text-muted lg:block">Averaged across the paper’s models</div>
      <div className="grid grid-cols-3 divide-x divide-line border-y-[1.5px] border-ink">
        <Tile value={R.throughputVsHBM} color={MEM_COLOR.dram3d} label={<>more tokens per second per card than <span style={{ color: MEM_COLOR.hbm }}>HBM</span></>} />
        <Tile value={R.throughputVsSRAM} color={MEM_COLOR.dram3d} label={<>more tokens per second per card than <span className="text-sram-ink">SRAM</span></>} />
        <Tile value={R.tpotLowerVsHBM} color={MEM_COLOR.dram3d} label={<>less waiting per token than <span style={{ color: MEM_COLOR.hbm }}>HBM</span></>} />
      </div>
      <div className={`fade ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="sans text-xs text-muted">One specific scenario: {R.scenario.contextLabel} context, {R.scenario.latencyUs} µs network latency, {R.scenario.bandwidthTBs} TB/s network</div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-8 gap-y-1">
          <span><span className="num font-serif text-2xl font-medium lg:text-3xl">{R.scenario.vsHBM}×</span> <span className="sans text-sm text-muted">vs HBM</span></span>
          <span><span className="num font-serif text-2xl font-medium lg:text-3xl">{R.scenario.vsSRAM}×</span> <span className="sans text-sm text-muted">vs SRAM</span></span>
          <span className="sans text-xs text-muted">tokens per second per card</span>
        </div>
      </div>
      <div className={`fade border-l-2 border-sram pl-4 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="smallcaps text-sram-ink">The exception</div>
        <p className="mt-1 font-serif text-[0.98rem] italic leading-snug text-ink lg:text-lg">Small speech models ({R.speechException.models.join(', ')}) fit on one card and use short {R.speechException.contextTokens}-token contexts. There the ranking is {R.speechException.ranking.join(', then ')}.</p>
      </div>
    </div>
  );
}

export function S12Results() {
  return (
    <Scene
      id="results"
      num={12}
      kicker="Results"
      title="Faster per card, and faster per user."
      steps={[
        <p key="0">The paper’s performance model pairs the same compute logic with each kind of memory and serves real models with it. Averaged across its models, Raptor’s 3D-DRAM delivers <strong className="num">{R.throughputVsHBM}×</strong> the tokens per second per card of HBM and <strong className="num">{R.throughputVsSRAM}×</strong> that of SRAM, while each user waits <strong className="num">{R.tpotLowerVsHBM}×</strong> less per token than with HBM.</p>,
        <p key="1">In one specific, realistic setting ({R.scenario.contextLabel} context, a {R.scenario.latencyUs} µs, {R.scenario.bandwidthTBs} TB/s network), the gains are <strong className="num">{R.scenario.vsHBM}×</strong> over HBM and <strong className="num">{R.scenario.vsSRAM}×</strong> over SRAM.</p>,
        <p key="2">It doesn’t win everywhere. For small speech models that fit on a single card, capacity doesn’t matter and raw bandwidth does. There, SRAM comes out on top. All of these numbers are <strong>modeled</strong>, not measured on a deployed system.</p>,
      ]}
      description={() => `Modeled results: ${R.throughputVsHBM} times the throughput per card of HBM, ${R.throughputVsSRAM} times that of SRAM, and ${R.tpotLowerVsHBM} times lower time per output token than HBM, averaged across models. In one scenario: ${R.scenario.vsHBM} times over HBM and ${R.scenario.vsSRAM} times over SRAM. Exception: for small speech models SRAM is fastest.`}
      visual={(s) => <Visual {...s} />}
      figure={() => ({ evidence: 'modeled', caption: <>All results come from the paper’s performance model of the decode phase, with the same compute logic paired with each memory. Source: Abstract, Sec I, Sec VIII-C, Sec VIII-D.</> })}
    />
  );
}
