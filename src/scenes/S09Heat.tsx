import { useEffect, useRef, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { ProblemChips } from '../components/Problems';
import { Note, Term } from '../components/ui';
import { P } from '../lib/palette';
import {
  REFRESH as R, TABLE1, TABLE1_FREQ_MHZ, ROWHAMMER as RH, THERMAL as TH, ECC,
  refreshIntervalMs, activationsSinceRefresh, MAX_ACTIVATIONS_PER_WINDOW,
} from '../data/paper';
import { TOY } from '../data/illustrative';
import { fmt } from '../lib/fmt';

/* ---------- 9a: refresh timeline ---------- */
function RefreshPanel({ step }: { step: number }) {
  const [manualT, setManualT] = useState<number | null>(null);
  useEffect(() => setManualT(null), [step]);
  const temp = manualT ?? (step === 0 ? TOY.coolDemoC : TOY.hotDemoC);
  const interval = refreshIntervalMs(temp);
  const span = R.hbmNominalMs;
  const ticks = (every: number) => Array.from({ length: Math.floor(span / every) + 1 }, (_, i) => i * every);
  const hot = temp > R.hotThresholdC;
  const X = (ms: number) => 12 + (ms / span) * 376;

  return (
    <div className="flex h-full flex-col justify-center-safe gap-5">
      <label className="block text-sm text-muted">
        Junction temperature: <span className={`num text-xl ${hot ? 'text-danger' : 'text-ink'}`}>{temp} °C</span>
        <input type="range" min={TOY.tempSliderMinC} max={R.maxJunctionC} value={temp} onChange={(e) => setManualT(+e.target.value)} aria-valuetext={`${temp} degrees Celsius`} />
        <span className="flex justify-between text-[0.7rem] text-faint"><span>{TOY.tempSliderMinC} °C</span><span>threshold {R.hotThresholdC} °C</span><span>max {R.maxJunctionC} °C</span></span>
      </label>
      <svg viewBox="0 0 400 150" className="w-full" aria-hidden>
        <text x="12" y="16" fontSize="12" fill="var(--color-dram3d)">Raptor: refresh every <tspan className="svg-num" fontSize="14">{interval} ms</tspan></text>
        <line x1={X(0)} x2={X(span)} y1="44" y2="44" stroke="var(--color-line)" />
        {ticks(interval).map((t) => <rect key={t} x={X(t) - 2} y="30" width="4" height="28" rx="1" fill="var(--color-dram3d)" className="fade" />)}
        <text x="12" y="88" fontSize="12" fill="var(--color-hbm)">Typical HBM: every <tspan className="svg-num" fontSize="14">{R.hbmNominalMs} ms</tspan></text>
        <line x1={X(0)} x2={X(span)} y1="116" y2="116" stroke="var(--color-line)" />
        {ticks(R.hbmNominalMs).map((t) => <rect key={t} x={X(t) - 2} y="102" width="4" height="28" rx="1" fill="var(--color-hbm)" opacity="0.7" />)}
        <text x={X(0)} y="146" fontSize="10" fill="var(--color-faint)">0 ms</text>
        <text x={X(span)} y="146" fontSize="10" textAnchor="end" fill="var(--color-faint)">{span} ms</text>
      </svg>
      {hot && <p className="sans text-sm text-muted"><span className="num text-ink">{R.moreFrequentX}×</span> more often than HBM’s nominal rate.</p>}
    </div>
  );
}

function RowsPanel() {
  const max = R.fewerRowsMax;
  return (
    <div className="flex h-full flex-col justify-center-safe gap-6">
      <div>
        <div className="mb-1 flex justify-between text-sm"><span className="text-dram3d">Raptor bank</span><span className="num text-ink">{fmt(R.rowsPerBank)} rows</span></div>
        <div className="h-6 bg-surface-2"><div className="h-full bg-dram3d" style={{ width: `${100 / max}%` }} /></div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-sm"><span className="text-muted">Conventional DRAM bank</span><span className="num text-ink">{R.fewerRowsLabel} more rows</span></div>
        <div className="relative h-6 bg-surface-2">
          <div className="absolute inset-y-0 left-0 bg-faint" style={{ width: `${(R.fewerRowsMin / max) * 100}%` }} />
          <div className="absolute inset-y-0 " style={{ left: `${(R.fewerRowsMin / max) * 100}%`, right: 0, background: 'repeating-linear-gradient(45deg, var(--color-faint) 0 4px, transparent 4px 9px)' }} />
        </div>
      </div>
      <p className="sans text-sm text-muted">Refresh works row by row, so a bank with far fewer rows finishes a refresh pass far sooner. Frequent refresh stays cheap.</p>
    </div>
  );
}

function TablePanel() {
  const max = Math.max(...TABLE1.map((r) => r.overheadPct));
  return (
    <div className="flex h-full flex-col justify-center-safe gap-4">
      <div className="sans text-sm text-muted">Bandwidth lost to refresh, at {TABLE1_FREQ_MHZ} MHz</div>
      {TABLE1.map((r) => (
        <div key={r.intervalMs}>
          <div className="mb-1 flex justify-between text-sm"><span className="text-ink">every <span className="num">{r.intervalMs} ms</span></span><span className="num text-ink">{r.overheadPct.toFixed(2)}%</span></div>
          <div className="h-5 bg-surface-2"><div className="h-full " style={{ width: `${(r.overheadPct / max) * 100}%`, background: r.intervalMs === R.hotIntervalMs ? 'var(--color-dram3d)' : 'var(--color-faint)' }} /></div>
          <div className="mt-0.5 text-[0.7rem] text-faint">leaves <span className="num">{r.bandwidthTBs}</span> TB/s</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- 9b: rowhammer race ---------- */
function RacePanel({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [t, setT] = useState(reduced ? RH.attackMs : 0);
  const [run, setRun] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!active || reduced) { setT(RH.attackMs); return; }
    const start = performance.now();
    const loop = (now: number) => {
      const f = Math.min(1, (now - start) / TOY.raceDurationMs);
      setT(f * RH.attackMs);
      if (f < 1) raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [active, reduced, run]);

  const ghost = Math.min(1, t / RH.attackMs);
  const now = activationsSinceRefresh(Math.min(t, RH.attackMs - 1e-9));
  const refreshes = Array.from({ length: Math.floor(RH.attackMs / RH.refreshMs) }, (_, i) => (i + 1) * RH.refreshMs);
  return (
    <div className="flex h-full flex-col justify-center-safe gap-5">
      <div className="text-sm text-muted">An attacker activates one row repeatedly, hoping to flip bits in the rows next to it. The attack needs <span className="num text-ink">{fmt(RH.threshold)}</span> activations, at <span className="num text-ink">{RH.tRCns} ns</span> each.</div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted"><span>if nothing interrupted them</span><span className="num">{fmt(Math.round(ghost * RH.threshold))}</span></div>
        <div className="h-5 bg-surface-2"><div className="h-full bg-danger/50" style={{ width: `${ghost * 100}%` }} /></div>
        <div className="mt-0.5 text-[0.7rem] text-faint">reaches the threshold after <span className="num">{RH.attackMs} ms</span></div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted"><span>with a refresh every {RH.refreshMs} ms</span><span className="num">{fmt(reduced ? MAX_ACTIVATIONS_PER_WINDOW : now)}</span></div>
        <div className="relative h-5 bg-surface-2">
          <div className="h-full bg-dram3d" style={{ width: `${((reduced ? MAX_ACTIVATIONS_PER_WINDOW : now) / RH.threshold) * 100}%` }} />
          <div className="absolute inset-y-[-4px] right-0 w-0.5 bg-danger" title="threshold" />
        </div>
        <div className="mt-0.5 text-[0.7rem] text-faint">count resets at every refresh; peaks near <span className="num">{fmt(MAX_ACTIVATIONS_PER_WINDOW)}</span> (derived), never the threshold</div>
      </div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-3 h-px bg-line" />
        {refreshes.map((r) => <div key={r} className="absolute top-0 h-6 w-0.5 bg-dram3d" style={{ left: `${(r / RH.attackMs) * 100}%` }} />)}
        <div className="absolute top-0 h-6 w-0.5 bg-ink" style={{ left: `${ghost * 100}%` }} />
        <div className="absolute -bottom-4 left-0 text-[0.65rem] text-faint">0 ms</div>
        <div className="absolute -bottom-4 right-0 text-[0.65rem] text-faint">{RH.attackMs} ms</div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        {!reduced && <button className="chip-btn" onClick={() => setRun((r) => r + 1)}>Run race again</button>}

      </div>
    </div>
  );
}

/* ---------- 9c: heat ---------- */
function HeatStack() {
  const layers: { name: string; note?: string; h: number; fill: string }[] = [
    { name: 'heatsink', note: `≈${TH.coolingShareRthetaPct}% of the thermal resistance`, h: 70, fill: P.logicDark },
    { name: 'TIM2', h: 10, fill: P.tim },
    { name: 'copper lid', h: 26, fill: P.copper },
    { name: 'TIM1', h: 10, fill: P.tim },
    { name: 'logic die', note: 'hottest layer', h: 26, fill: P.heat },
    { name: 'DRAM die', note: `≈${TH.dramCoolerC} °C cooler than the logic`, h: 26, fill: P.heatCool },
    { name: 'substrate', h: 18, fill: P.board },
  ];
  let y = 16;
  return (
    <svg viewBox="0 0 470 260" className="h-full w-full" aria-hidden>
      {layers.map((l) => {
        const yy = y; y += l.h + 2;
        return (
          <g key={l.name}>
            {l.name === 'heatsink'
              ? Array.from({ length: 11 }, (_, i) => <rect key={i} x={20 + i * 18} y={yy} width="10" height={l.h} fill={l.fill} stroke={P.ink} strokeWidth="0.8" />)
              : <rect x="20" y={yy} width="190" height={l.h} fill={l.fill} stroke={P.ink} strokeWidth="0.8" />}
            <text x="222" y={yy + l.h / 2 + 4} fontSize="12" fill={P.ink}>{l.name}{l.note && <tspan fill={P.ink2} fontStyle="italic"> · {l.note}</tspan>}</text>
          </g>
        );
      })}
      {[46, 82, 118, 154, 190].map((x, i) => (
        <path key={x} d={`M${x} 172 C ${x + 4} 140, ${x - 4} 120, ${x} 92`} stroke={P.ink} strokeWidth="1.2" fill="none" opacity="0.8" style={{ animation: 'pulse-soft 1.8s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} markerEnd="url(#heat-ah)" />
      ))}
      <text x="20" y="246" fontSize="11" fill={P.ink2}>The whole logic-plus-DRAM stack adds only ≈{TH.dieStackShareRthetaPct}% of the thermal resistance.</text>
      <defs><marker id="heat-ah" viewBox="0 0 6 6" refX="3" refY="1" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 6 L3 0 L6 6 Z" fill={P.ink} /></marker></defs>
    </svg>
  );
}

function CoolingPanel() {
  const [air, opt, liquid] = TH.cooling;
  const max = opt.headroomW * 1.1;
  const pct = (w: number) => `${(w / max) * 100}%`;
  const rows = [
    { c: air, w: air.maxChipletW, temp: `over the ${TH.limitC} °C limit`, bar: `fits only ${air.maxChipletW} W` },
    { c: opt, w: opt.headroomW, temp: `≈${opt.peakAt106C} °C peak`, bar: `headroom to ≈${opt.headroomW} W` },
    { c: liquid, w: null, temp: `under ${liquid.belowC} °C`, bar: 'limit not stated' },
  ];
  return (
    <div className="flex h-full flex-col justify-center-safe gap-4">
      <div className="sans text-sm text-muted">Power each chiplet can draw while staying under {TH.limitC} °C</div>
      <div className="relative space-y-4">
        <div className="absolute inset-y-0 border-l border-dashed border-ink/60" style={{ left: pct(TH.chipletW) }}>
          <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[0.65rem] text-ink">Raptor: {TH.chipletW} W</span>
        </div>
        {rows.map(({ c, w, temp, bar }) => (
          <div key={c.id}>
            <div className="mb-1 flex justify-between text-xs"><span className="text-ink">{c.label}</span><span className="text-muted">at {TH.chipletW} W: <span className="num text-ink">{temp}</span></span></div>
            <div className="h-5 bg-surface-2">
              {w !== null
                ? <div className="h-full " style={{ width: pct(w), background: w < TH.chipletW ? 'var(--color-danger)' : 'var(--color-dram3d)' }} />
                : <div className="h-full " style={{ width: '100%', background: 'linear-gradient(90deg, var(--color-dram3d), transparent)' }} />}
            </div>
            <div className="mt-0.5 text-[0.7rem] text-faint">{bar}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Visual({ step, inView, reduced }: SceneState) {
  return (
    <div className="sans relative h-full overflow-hidden">
      {step <= 1 && <RefreshPanel step={step} />}
      {step === 2 && <RowsPanel />}
      {step === 3 && <TablePanel />}
      {step === 4 && <RacePanel active={inView} reduced={reduced} />}
      {step === 5 && <HeatStack />}
      {step >= 6 && <CoolingPanel />}
    </div>
  );
}

export function S09Heat() {
  const [air, opt, liquid] = TH.cooling;
  return (
    <Scene
      id="heat"
      num={9}
      kicker="Problem 4 · Heat and refresh"
      eyebrow={<ProblemChips active={3} />}
      title="Keeping a hot stack reliable"
      steps={[
        <p key="0">DRAM stores each bit as a small electric charge that slowly leaks away, so every row has to be rewritten, or <Term k="refresh">refreshed</Term>, on a regular schedule. Below {R.hotThresholdC} °C, Raptor refreshes every <strong className="num">{R.coolIntervalMs} ms</strong>.</p>,
        <p key="1">Because the DRAM is pressed against the logic, the junction can reach <strong className="num">{R.maxJunctionC} °C</strong>, and charge leaks faster when it’s hot. Above {R.hotThresholdC} °C, Raptor refreshes every <strong className="num">{R.hotIntervalMs} ms</strong>, {R.moreFrequentX}× as often as the {R.hbmNominalMs} ms interval that is typical for HBM. The temperature slider in the figure shows the change.</p>,
        <>
          <p key="2">Refreshing that often would usually be expensive, but Raptor’s banks are small. Each one has <strong className="num">{fmt(R.rowsPerBank)}</strong> rows, {R.fewerRowsLabel} fewer than a conventional DRAM bank, so a full refresh pass finishes quickly.</p>
          <Note>Each bank also stores error-correcting codes ({ECC.code}) in its last {ECC.columns} columns, and the chip scrubs memory in the background to catch errors early.</Note>
        </>,
        <p key="3">Measurements on the chip confirm this. Refreshing every {R.hotIntervalMs} ms costs only <strong className="num">{TABLE1.find((r) => r.intervalMs === R.hotIntervalMs)?.overheadPct}%</strong> of the bandwidth.</p>,
        <p key="4">Frequent refresh also protects against <strong>rowhammer</strong>, an attack that flips bits by activating one row over and over. With this chip’s timing, an attacker needs about {RH.attackMs} ms of continuous activations to reach the threshold, but every row is refreshed every {RH.refreshMs} ms, which resets the count before it gets there.</p>,
        <p key="5">Heat leaves the stack upward, through the logic die, the lid and the heatsink. Since the DRAM is underneath the logic, it runs about <strong className="num">{TH.dramCoolerC} °C cooler</strong> than the logic. In HBM the arrangement is reversed, with the memory sitting on top of hot logic. The stacking itself adds only about {TH.dieStackShareRthetaPct}% to the thermal resistance.</p>,
        <p key="6">Each chiplet draws about {TH.chipletW} W. With ordinary air cooling, only {air.maxChipletW} W per chiplet stays under the {TH.limitC} °C limit, so the paper models an optimized heatsink that keeps the peak near <strong className="num">{opt.peakAt106C} °C</strong>, with headroom up to about {opt.headroomW} W. Liquid cooling would keep it under {liquid.belowC} °C.</p>,
      ]}
      description={(s) => [
        `Refresh timeline at a cool temperature: refresh every ${R.coolIntervalMs} ms, compared with HBM's ${R.hbmNominalMs} ms. A temperature slider is available.`,
        `Refresh timeline above ${R.hotThresholdC} °C: refresh every ${R.hotIntervalMs} ms, ${R.moreFrequentX} times more often than HBM's ${R.hbmNominalMs} ms.`,
        `Bar comparison: a Raptor bank has ${R.rowsPerBank} rows; conventional banks have ${R.fewerRowsLabel} more.`,
        `Measured bandwidth lost to refresh: ${TABLE1.map((r) => `${r.overheadPct}% at ${r.intervalMs} ms`).join(', ')}.`,
        `Race: without refresh, an attacker reaches ${RH.threshold} activations in ${RH.attackMs} ms. With a refresh every ${RH.refreshMs} ms the count resets and never reaches the threshold.`,
        `Modeled cross-section: heat flows up from the logic die through the lid to the heatsink; the DRAM below is about ${TH.dramCoolerC} °C cooler.`,
        `Modeled cooling comparison at ${TH.chipletW} W per chiplet: air cooling fits only ${air.maxChipletW} W; optimized heatsink about ${opt.peakAt106C} °C with headroom to ${opt.headroomW} W; liquid cooling under ${liquid.belowC} °C.`,
      ][Math.min(s.step, 6)]}
      visual={(s) => <Visual {...s} />}
      figure={(s) => [
        { caption: <>Refresh schedule at the slider’s temperature, compared with HBM’s nominal interval. Use the slider to change the temperature. Source: Sec IV-E, Sec V-B.</> },
        { caption: <>Refresh schedule at the slider’s temperature, compared with HBM’s nominal interval. Use the slider to change the temperature. Source: Sec IV-E, Sec V-B.</> },
        { caption: <>Rows per bank, Raptor against a conventional DRAM bank; the hatched range spans {R.fewerRowsLabel}. Source: Sec IV-E.</> },
        { evidence: 'measured' as const, caption: <>Measured bandwidth lost to refresh at three refresh intervals, and the bandwidth left over. Source: Table I.</> },
        { caption: <>A rowhammer attack played out with the chip’s timings. The threshold of {fmt(RH.threshold)} activations {RH.thresholdNote}. The peak count per refresh window is our arithmetic. Source: Sec V-B.</> },
        { evidence: 'modeled' as const, caption: <>Cross-section of the stack, not to scale. Heat flows up to the heatsink; the share of thermal resistance comes from the paper’s analytical model. Source: Sec V-C, Fig. 12.</> },
        { evidence: 'modeled' as const, caption: <>From the paper’s analytical thermal model, not a silicon measurement. The dashed line marks Raptor’s operating point. Source: Sec V-C, Fig. 12.</> },
      ][Math.min(s.step, 6)]}
    />
  );
}
