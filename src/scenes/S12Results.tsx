import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Scene, type SceneState } from '../components/Scene';
import { Badge, MEM_COLOR, Src } from '../components/ui';
import { RESULTS as R } from '../data/paper';

function CountUp({ to, run, reduced, digits = 2 }: { to: number; run: boolean; reduced: boolean; digits?: number }) {
  const [v, setV] = useState(reduced ? to : 0);
  const obj = useRef({ v: 0 });
  useEffect(() => {
    if (reduced) { setV(to); return; }
    if (!run) return;
    obj.current.v = 0;
    const tw = gsap.to(obj.current, { v: to, duration: 1.2, ease: 'power2.out', onUpdate: () => setV(obj.current.v) });
    return () => { tw.kill(); };
  }, [run, to, reduced]);
  return <>{v.toFixed(digits)}</>;
}

function Tile({ value, label, color, run, reduced }: { value: number; label: React.ReactNode; color: string; run: boolean; reduced: boolean }) {
  return (
    <div className="panel p-3 lg:p-6">
      <div className="num text-2xl font-semibold leading-none lg:text-6xl" style={{ color }}><CountUp to={value} run={run} reduced={reduced} />×</div>
      <div className="mt-2 text-xs text-muted lg:text-sm">{label}</div>
    </div>
  );
}

function Visual({ step, inView, reduced }: SceneState) {
  const run = inView;
  return (
    <div className="flex h-full flex-col justify-center gap-3 lg:gap-4">
      <div className="flex items-center justify-between"><span className="text-sm text-muted">Averaged across the paper’s models</span><Badge kind="modeled" /></div>
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        <Tile value={R.throughputVsHBM} run={run} reduced={reduced} color={MEM_COLOR.dram3d} label={<>more tokens/s per card than <span style={{ color: MEM_COLOR.hbm }}>HBM</span></>} />
        <Tile value={R.throughputVsSRAM} run={run} reduced={reduced} color={MEM_COLOR.dram3d} label={<>more tokens/s per card than <span style={{ color: MEM_COLOR.sram }}>SRAM</span></>} />
        <Tile value={R.tpotLowerVsHBM} run={run} reduced={reduced} color={MEM_COLOR.dram3d} label={<>less waiting per token than <span style={{ color: MEM_COLOR.hbm }}>HBM</span></>} />
      </div>
      <div className={`fade panel p-3 lg:p-4 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-xs text-muted">One specific scenario: {R.scenario.contextLabel} context, {R.scenario.latencyUs} µs network latency, {R.scenario.bandwidthTBs} TB/s network</div>
        <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1">
          <span><span className="num text-xl text-ink lg:text-2xl">{R.scenario.vsHBM}×</span> <span className="text-sm text-muted">vs HBM</span></span>
          <span><span className="num text-xl text-ink lg:text-2xl">{R.scenario.vsSRAM}×</span> <span className="text-sm text-muted">vs SRAM</span></span>
          <span className="self-end text-xs text-muted">tokens/s per card</span>
        </div>
      </div>
      <div className={`fade panel border-sram/50 p-3 lg:p-4 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-xs uppercase tracking-wider text-sram">The exception</div>
        <p className="mt-1 text-xs text-ink lg:text-sm">Small speech models ({R.speechException.models.join(', ')}) fit on one card and use short {R.speechException.contextTokens}-token contexts. There the ranking is {R.speechException.ranking.join(' > ')}.</p>
      </div>
      <Src>Abstract, Sec I, Sec VIII-C, Sec VIII-D</Src>
    </div>
  );
}

export function S12Results() {
  return (
    <Scene
      id="results"
      kicker="12 · Results"
      title="Faster per card, and faster per user."
      steps={[
        <p key="0">The paper’s performance model pairs the same compute logic with each kind of memory and serves real models with it. Averaged across its models, Raptor’s 3D-DRAM delivers <strong className="num">{R.throughputVsHBM}×</strong> the tokens per second per card of HBM and <strong className="num">{R.throughputVsSRAM}×</strong> that of SRAM, while each user waits <strong className="num">{R.tpotLowerVsHBM}×</strong> less per token than with HBM.</p>,
        <p key="1">In one specific, realistic setting ({R.scenario.contextLabel} context, a {R.scenario.latencyUs} µs, {R.scenario.bandwidthTBs} TB/s network), the gains are <strong className="num">{R.scenario.vsHBM}×</strong> over HBM and <strong className="num">{R.scenario.vsSRAM}×</strong> over SRAM.</p>,
        <p key="2">It doesn’t win everywhere. For small speech models that fit on a single card, capacity doesn’t matter and raw bandwidth does. There, SRAM comes out on top. All of these numbers are <strong>modeled</strong>, not measured on a deployed system.</p>,
      ]}
      description={() => `Modeled results: ${R.throughputVsHBM} times the throughput per card of HBM, ${R.throughputVsSRAM} times that of SRAM, and ${R.tpotLowerVsHBM} times lower time per output token than HBM, averaged across models. In one scenario: ${R.scenario.vsHBM} times over HBM and ${R.scenario.vsSRAM} times over SRAM. Exception: for small speech models SRAM is fastest.`}
      visual={(s) => <Visual {...s} />}
    />
  );
}
