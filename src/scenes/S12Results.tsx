import { Scene, type SceneState } from '../components/Scene';
import { MEM_COLOR, Note } from '../components/ui';
import { PRIOR_WORK, RESULTS as R } from '../data/paper';

function Tile({ value, label, color }: { value: number; label: React.ReactNode; color: string }) {
  return (
    <div className="px-2 py-3 first:pl-0 lg:px-5 lg:py-4">
      <div className="num font-serif text-4xl font-medium leading-none tracking-tight lg:text-7xl" style={{ color }}>{value.toFixed(2)}×</div>
      <div className="sans mt-2 text-[0.7rem] leading-snug text-muted lg:text-sm">{label}</div>
    </div>
  );
}

function PriorWork() {
  return (
    <div className="flex h-full flex-col justify-center-safe gap-4">
      <div className="sans text-sm text-muted">Recent 3D and in-memory designs, as summarized in the paper</div>
      <table className="sans w-full border-y-[1.5px] border-ink text-left text-sm lg:text-base">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="py-2 font-normal">Design</th>
            <th className="py-2 font-normal">Effective bandwidth</th>
            <th className="py-2 font-normal">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {PRIOR_WORK.map((p) => (
            <tr key={p.name} className="border-b border-line last:border-b-0">
              <td className={`py-3 font-serif text-lg lg:text-xl ${p.name === 'Raptor' ? 'text-dram3d' : 'text-ink'}`}>{p.name}</td>
              <td className="num py-3">{p.bandwidth}</td>
              <td className="py-3 text-muted">{p.validation}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sans text-xs text-muted">Stratum’s figure is the paper’s estimate of effective system bandwidth once cross-chip routing is counted.</p>
    </div>
  );
}

function Visual({ step }: SceneState) {
  if (step >= 3) return <PriorWork />;
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
      title="What the performance model predicts"
      steps={[
        <p key="0">The paper’s performance model pairs the same compute logic with each type of memory and simulates serving several real models. Averaged across those models, 3D-DRAM delivers <strong className="num">{R.throughputVsHBM}×</strong> the tokens per second per card of HBM and <strong className="num">{R.throughputVsSRAM}×</strong> those of SRAM, and each user waits <strong className="num">{R.tpotLowerVsHBM}×</strong> less per token than with HBM.</p>,
        <p key="1">In one specific setting, with a {R.scenario.contextLabel} context and a network with {R.scenario.latencyUs} µs latency and {R.scenario.bandwidthTBs} TB/s of bandwidth, the improvement is <strong className="num">{R.scenario.vsHBM}×</strong> over HBM and <strong className="num">{R.scenario.vsSRAM}×</strong> over SRAM.</p>,
        <>
          <p key="2">Raptor doesn’t come out ahead in every case. Small speech models fit on a single card, so capacity stops mattering and raw bandwidth decides the outcome; for those, SRAM is fastest. All of these figures also come from a model rather than from measurements of a working deployment.</p>
          <Note>Because HBM holds more per card, the smallest HBM setups use fewer cards than Raptor. The paper also checks a fairer split, giving every design the same number of cards. HBM then runs larger batches, but at small and medium batch sizes 3D-DRAM stays ahead.</Note>
        </>,
        <p key="3">The paper also compares Raptor with two recent research designs that put memory and compute in 3D stacks, H2-LLM and Stratum. Both were evaluated in simulation, while Raptor’s memory system has been measured on a test chip. The paper argues that Raptor’s single, unified {PRIOR_WORK[2].bandwidth} pool avoids the bottleneck those designs hit when data has to move between chips, and in its model Raptor beats H2-LLM and the largest Stratum configuration at every batch size.</p>,
      ]}
      description={(s) => s.step >= 3 ? `Table: ${PRIOR_WORK.map((p) => `${p.name}, effective bandwidth ${p.bandwidth}, evaluated by ${p.validation}`).join('; ')}.` : `Modeled results: ${R.throughputVsHBM} times the throughput per card of HBM, ${R.throughputVsSRAM} times that of SRAM, and ${R.tpotLowerVsHBM} times lower time per output token than HBM, averaged across models. In one scenario: ${R.scenario.vsHBM} times over HBM and ${R.scenario.vsSRAM} times over SRAM. Exception: for small speech models SRAM is fastest.`}
      visual={(s) => <Visual {...s} />}
      figure={(s) => s.step >= 3
        ? { caption: <>Architectural comparison from the paper’s Table V. Source: Sec X, Table V.</> }
        : { evidence: 'modeled', caption: <>All results come from the paper’s performance model of the decode phase, with the same compute logic paired with each memory. Source: Abstract, Sec I, Sec VIII-C, Sec VIII-D.</> }}
    />
  );
}
