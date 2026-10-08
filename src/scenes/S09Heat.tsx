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
/** A bank whose rows slowly lose charge and are topped up as the refresh sweeps past. Illustration. */
function ChargeBank({ interval }: { interval: number }) {
  const rows = TOY.chargeRowsDrawn, cells = TOY.chargeCellsDrawn;
  const rowH = 9, W = 400, x0 = 110, cw = (W - x0 - 12) / cells;
  const dur = interval * TOY.refreshSecondsPerMs;
  return (
    <svg viewBox={`0 0 ${W} ${rows * rowH + 24}`} className="w-full" aria-hidden>
      <text x={0} y={14} fontSize="11" fill={P.ink2}>one bank’s rows</text>
      <text x={0} y={30} fontSize="10" fill={P.ink3}>charge fades,</text>
      <text x={0} y={43} fontSize="10" fill={P.ink3}>refresh restores it</text>
      <line x1={0} x2={16} y1={60} y2={60} stroke={P.sram} strokeWidth={2} />
      <text x={21} y={63} fontSize="10" fill={P.sram}>refresh</text>
      <rect x={x0 - 4} y={4} width={W - x0} height={rows * rowH + 8} fill={P.paper} stroke={P.ink} strokeWidth={1} />
      {Array.from({ length: rows }, (_, r) => (
        <g key={`${r}-${interval}`}>
          {Array.from({ length: cells }, (_, c) => (
            <rect key={c} x={x0 + c * cw} y={8 + r * rowH} width={cw - 1.5} height={rowH - 2} fill={P.dram} fillOpacity={0.8}
              style={{ animation: `leak ${dur}s linear infinite`, animationDelay: `${-(1 - r / rows) * dur}s` }} />
          ))}
        </g>
      ))}
      <g key={interval} style={{ animation: `sweep ${dur}s linear infinite`, ['--sweep-dist' as string]: `${rows * rowH}px` }}>
        <line x1={x0 - 4} x2={W - 6} y1={8} y2={8} stroke={P.sram} strokeWidth={2} />
      </g>
    </svg>
  );
}

function RefreshPanel({ step }: { step: number }) {
  const [manualT, setManualT] = useState<number | null>(null);
  useEffect(() => setManualT(null), [step]);
  const temp = manualT ?? (step === 0 ? TOY.coolDemoC : TOY.hotDemoC);
  const interval = refreshIntervalMs(temp);
  const span = R.hbmNominalMs;
  const ticks = (every: number) => Array.from({ length: Math.floor(span / every) + 1 }, (_, i) => i * every);
  const hot = temp > R.hotThresholdC;
  const X = (ms: number) => 12 + (ms / span) * 376;
  // A playhead crosses the whole span every SCAN seconds; each tick pops as it passes.
  const SCAN = 6;
  const flash = (t: number) => ({ animation: `tick-flash ${SCAN}s linear infinite`, animationDelay: `${(t / span - 1) * SCAN}s`, transformBox: 'fill-box' as const, transformOrigin: 'center' });

  return (
    <div className="flex h-full flex-col justify-center-safe gap-5">
      <label className="block text-sm text-muted">
        Junction temperature: <span className={`num text-xl ${hot ? 'text-danger' : 'text-ink'}`}>{temp} °C</span>
        <input type="range" min={TOY.tempSliderMinC} max={R.maxJunctionC} value={temp} onChange={(e) => setManualT(+e.target.value)} aria-valuetext={`${temp} degrees Celsius`} />
        <span className="flex justify-between text-[0.7rem] text-faint"><span>{TOY.tempSliderMinC} °C</span><span>threshold {R.hotThresholdC} °C</span><span>max {R.maxJunctionC} °C</span></span>
      </label>
      <ChargeBank interval={interval} />
      {/* Keyed by interval so the playhead and every tick restart together and stay in step. */}
      <svg key={interval} viewBox="0 0 400 150" className="w-full" aria-hidden>
        <text x="12" y="16" fontSize="12" fill="var(--color-dram3d)">{hot ? 'Required above ' + R.hotThresholdC + ' °C: every ' : 'Cooler reference point: every '}<tspan className="svg-num" fontSize="14">{interval} ms</tspan></text>
        <line x1={X(0)} x2={X(span)} y1="44" y2="44" stroke="var(--color-line)" />
        {ticks(interval).map((t) => <rect key={t} x={X(t) - 2} y="30" width="4" height="28" rx="1" fill="var(--color-dram3d)" className="fade" style={flash(t)} />)}
        <text x="12" y="88" fontSize="12" fill="var(--color-hbm)">Typical HBM: every <tspan className="svg-num" fontSize="14">{R.hbmNominalMs} ms</tspan></text>
        <line x1={X(0)} x2={X(span)} y1="116" y2="116" stroke="var(--color-line)" />
        {ticks(R.hbmNominalMs).map((t) => <rect key={t} x={X(t) - 2} y="102" width="4" height="28" rx="1" fill="var(--color-hbm)" opacity="0.7" style={flash(t)} />)}
        <g style={{ animation: `scan-x ${SCAN}s linear infinite`, ['--scan-dist' as string]: `${X(span) - X(0)}px` }}>
          <line x1={X(0)} x2={X(0)} y1="26" y2="134" stroke={P.ink} strokeOpacity={0.35} />
        </g>
        <text x={X(0)} y="146" fontSize="10" fill="var(--color-faint)">0 ms</text>
        <text x={X(span)} y="146" fontSize="10" textAnchor="end" fill="var(--color-faint)">{span} ms</text>
      </svg>
      {hot && <p className="sans text-sm text-muted"><span className="num text-ink">{R.moreFrequentX}×</span> more often than HBM’s nominal rate.</p>}
    </div>
  );
}

function RowsPanel() {
  const unit = 13, H = 40;
  // Refresh walks the rows at the same pace in both banks, so a pass takes time in proportion to rows.
  const SECONDS_PER_UNIT = 0.8;
  const bank = (x: number, y: number, mult: number, fill: string, dashed = false) => (
    <g>
      <rect x={x} y={y} width={unit * mult} height={H} fill={fill} stroke={P.ink} strokeWidth={1} strokeDasharray={dashed ? '4 3' : undefined} fillOpacity={dashed ? 0.25 : 1} />
      {Array.from({ length: Math.floor(unit * mult / 5) }, (_, i) => (
        <line key={i} x1={x + 2.5 + i * 5} x2={x + 2.5 + i * 5} y1={y + 4} y2={y + H - 4} stroke={P.paper} strokeOpacity={dashed ? 0.4 : 0.5} strokeWidth={1} />
      ))}
      {!dashed && (
        <line x1={x + 1} x2={x + 1} y1={y + 1} y2={y + H - 1} stroke={P.sram} strokeWidth={2}
          style={{ animation: `scan-x ${mult * SECONDS_PER_UNIT}s linear infinite`, ['--scan-dist' as string]: `${unit * mult - 2}px` }} />
      )}
    </g>
  );
  return (
    <div className="flex h-full flex-col justify-center-safe gap-4">
      <svg viewBox={`0 0 ${unit * R.fewerRowsMax + 20} 190`} className="w-full" aria-hidden>
        <text x={0} y={14} fontSize="12" fill={P.dram}>Raptor bank: {fmt(R.rowsPerBank)} rows</text>
        {bank(0, 22, 1, P.dram)}
        <text x={0} y={100} fontSize="12" fill={P.ink2}>conventional DRAM bank: {R.fewerRowsLabel} as many rows</text>
        {bank(0, 108, R.fewerRowsMin, P.logicDark)}
        {bank(unit * R.fewerRowsMin, 108, R.fewerRowsMax - R.fewerRowsMin, P.logicDark, true)}
        <text x={unit * R.fewerRowsMin} y={168} fontSize="10" fill={P.ink3}>{R.fewerRowsMin}×</text>
        <text x={unit * R.fewerRowsMax} y={168} fontSize="10" textAnchor="end" fill={P.ink3}>{R.fewerRowsMax}×</text>
      </svg>
      <p className="sans text-sm text-muted">Each stripe is a slice of rows, drawn to scale. Refresh works through a bank row by row, so a bank with far fewer rows finishes each pass much sooner. The orange line sweeps both banks at the same pace.</p>
    </div>
  );
}

function TablePanel() {
  const max = Math.max(...TABLE1.map((r) => r.overheadPct));
  return (
    <div className="flex h-full flex-col justify-center-safe gap-4">
      <div className="sans text-sm text-muted">Bandwidth lost to refresh, at {TABLE1_FREQ_MHZ} MHz</div>
      {TABLE1.map((r, i) => (
        <div key={r.intervalMs}>
          <div className="mb-1 flex justify-between text-sm"><span className="text-ink">every <span className="num">{r.intervalMs} ms</span></span><span className="num text-ink">{r.overheadPct.toFixed(2)}%</span></div>
          <div className="h-5 bg-surface-2"><div className="h-full origin-left" style={{ width: `${(r.overheadPct / max) * 100}%`, background: r.intervalMs === R.hotIntervalMs ? 'var(--color-dram3d)' : 'var(--color-faint)', animation: `grow-x 0.8s cubic-bezier(.2,.7,.2,1) ${i * 0.12}s both` }} /></div>
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
      <svg viewBox="0 0 400 96" className="w-full" aria-hidden>
        {['victim row', 'aggressor row', 'victim row'].map((label, i) => {
          const aggr = i === 1;
          return (
            <g key={i} transform={`translate(0 ${8 + i * 28})`}>
              <text x={0} y={15} fontSize="11" fill={aggr ? P.danger : P.ink2}>{label}</text>
              {Array.from({ length: 22 }, (_, c) => (
                <rect key={c} x={96 + c * 13.5} y={2} width={11} height={18} fill={aggr ? P.danger : P.dram}
                  fillOpacity={aggr ? 0.75 : 0.9 - ((reduced ? MAX_ACTIVATIONS_PER_WINDOW : now) / RH.threshold) * 0.6}
                  style={aggr && active && !reduced && t < RH.attackMs ? { animation: 'pulse-soft 0.25s linear infinite' } : undefined} />
              ))}
            </g>
          );
        })}
      </svg>
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

/** A thermometer whose column reaches `temp` (or overflows past the top when `over`). */
function Thermometer({ x, y, temp, over, label, delay = 0 }: { x: number; y: number; temp: number; over?: boolean; label: string; delay?: number }) {
  const lo = TOY.thermoMinC, hi = TOY.thermoMaxC, h = 120;
  const yOf = (t: number) => y + h - ((Math.min(t, hi) - lo) / (hi - lo)) * h;
  const top = over ? y - 6 : yOf(temp);
  const hot = over || temp >= TH.limitC;
  return (
    <g>
      <rect x={x - 6} y={y - 8} width={12} height={h + 10} rx={6} fill={P.paper} stroke={P.ink} strokeWidth={1} />
      <circle cx={x} cy={y + h + 8} r={10} fill={hot ? P.danger : P.dram} stroke={P.ink} strokeWidth={1} />
      <rect x={x - 3} y={top} width={6} height={y + h + 6 - top} fill={hot ? P.danger : P.dram}
        style={{ animation: `grow-y 1.1s cubic-bezier(.2,.7,.2,1) ${delay}s both`, transformBox: 'fill-box', transformOrigin: 'bottom' }} />
      <line x1={x - 12} x2={x + 12} y1={yOf(TH.limitC)} y2={yOf(TH.limitC)} stroke={P.danger} strokeDasharray="3 2" />
      <text x={x} y={y + h + 36} textAnchor="middle" fontSize="12" style={{ fontFamily: 'var(--font-serif)' }} fill={P.ink}>{label}</text>
    </g>
  );
}

function CoolingPanel() {
  const [air, opt, liquid] = TH.cooling;
  const col = (i: number) => 70 + i * 150;
  return (
    <div className="flex h-full flex-col justify-center-safe gap-3">
      <div className="sans text-sm text-muted">Peak temperature at {TH.chipletW} W per chiplet; the dashed line is the {TH.limitC} °C limit</div>
      <svg viewBox="0 0 460 306" className="w-full" aria-hidden>
        {/* baseline air: small finned cooler and a fan */}
        <g transform={`translate(${col(0) - 50} 20)`} stroke={P.ink} strokeWidth={1}>
          {Array.from({ length: 6 }, (_, i) => <rect key={i} x={8 + i * 8} y={10} width={4} height={34} fill={P.logicDark} />)}
          <rect x={4} y={44} width={52} height={8} fill={P.logicDark} />
          <circle cx={78} cy={30} r={18} fill={P.paper} />
          <g style={{ animation: 'spin 5s linear infinite', transformOrigin: '78px 30px' }}>
            {[0, 120, 240].map((r) => <path key={r} d="M78 30 q 8 -14 0 -16" transform={`rotate(${r} 78 30)`} fill="none" />)}
          </g>
        </g>
        {/* optimized heatsink: tall, dense fins */}
        <g transform={`translate(${col(1) - 40} 6)`} stroke={P.ink} strokeWidth={1}>
          {Array.from({ length: 11 }, (_, i) => <rect key={i} x={i * 7.5} y={0} width={4} height={52} fill={P.logicDark} />)}
          <rect x={-2} y={52} width={84} height={8} fill={P.copper} />
        </g>
        {/* liquid: cold plate with pipes */}
        <g transform={`translate(${col(2) - 40} 20)`} stroke={P.ink} strokeWidth={1}>
          <rect x={0} y={30} width={80} height={20} rx={3} fill={P.hbmTint} />
          <path d="M18 30 V8 H-6" fill="none" stroke={P.hbm} strokeWidth={4} />
          <path d="M62 30 V8 H86" fill="none" stroke={P.hbm} strokeWidth={4} />
          {/* coolant: in through the left pipe, out through the right */}
          <path d="M18 30 V8 H-6" fill="none" stroke={P.hbmTint} strokeWidth={1.6} strokeDasharray="3 6" style={{ animation: 'flow 1.2s linear infinite reverse' }} />
          <path d="M62 30 V8 H86" fill="none" stroke={P.hbmTint} strokeWidth={1.6} strokeDasharray="3 6" style={{ animation: 'flow 1.2s linear infinite' }} />
        </g>
        <Thermometer x={col(0)} y={100} temp={TH.limitC} over label={air.label} />
        <Thermometer x={col(1)} y={100} temp={opt.peakAt106C} label={opt.label} delay={0.15} />
        <Thermometer x={col(2)} y={100} temp={liquid.belowC} label={liquid.label} delay={0.3} />
        <g fontSize="11" fill={P.ink2} textAnchor="middle">
          <text x={col(0)} y={282}><tspan x={col(0)} fill={P.danger}>over {TH.limitC} °C</tspan><tspan x={col(0)} dy={14}>fits only {air.maxChipletW} W</tspan></text>
          <text x={col(1)} y={282}><tspan x={col(1)} fill={P.ink}>≈{opt.peakAt106C} °C</tspan><tspan x={col(1)} dy={14}>headroom to ≈{opt.headroomW} W</tspan></text>
          <text x={col(2)} y={282}><tspan x={col(2)} fill={P.ink}>under {liquid.belowC} °C</tspan></text>
        </g>
      </svg>
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
      kicker="Challenge 4 · Heat and refresh"
      eyebrow={<ProblemChips active={3} />}
      title="Keeping a hot stack reliable"
      steps={[
        <p key="0">DRAM stores each bit as a small electric charge that slowly leaks away, so every row has to be rewritten, or <Term k="refresh">refreshed</Term>, on a regular schedule. HBM devices nominally do this every <strong className="num">{R.hbmNominalMs} ms</strong>.</p>,
        <>
          <p key="1">Because the DRAM is pressed against the logic, the interface between them can reach <strong className="num">{R.maxJunctionC} °C</strong>, and charge leaks faster when it’s hot. Above {R.hotThresholdC} °C, the paper says, the DRAM needs a refresh every <strong className="num">{R.hotIntervalMs} ms</strong> to hold its data, {R.moreFrequentX}× as often as HBM’s nominal interval.</p>
          <Note>The paper measures the cost of moving from a {R.coolIntervalMs} ms interval to {R.hotIntervalMs} ms, which the slider uses for cooler temperatures. Its performance results assume an even shorter {R.evalIntervalMs} ms interval.</Note>
        </>,
        <>
          <p key="2">Refreshing that often would usually be expensive, but Raptor’s banks are small. Each one has <strong className="num">{fmt(R.rowsPerBank)}</strong> rows, {R.fewerRowsLabel} fewer than a conventional DRAM bank, so a full refresh pass finishes quickly.</p>
          <p>Each bank also protects its data with error-correcting codes. The last {ECC.columns} columns hold a pair of interleaved {ECC.code} codewords, stored alongside the stream-flipping flag bits. On a read, the controller fetches the codes and flags first, then the data, correcting errors before the chunk reaches the tensor engine. Background scrubbing catches errors before they pile up.</p>
        </>,
        <p key="3">Measurements on the chip confirm this. Refreshing every {R.hotIntervalMs} ms costs only <strong className="num">{TABLE1.find((r) => r.intervalMs === R.hotIntervalMs)?.overheadPct}%</strong> of the bandwidth, and even the {R.evalIntervalMs} ms interval used in the performance results costs <strong className="num">{TABLE1.find((r) => r.intervalMs === R.evalIntervalMs)?.overheadPct}%</strong>.</p>,
        <p key="4">Frequent refresh also protects against <strong>rowhammer</strong>, an attack that flips bits by activating one row over and over. With this chip’s timing, an attacker needs about {RH.attackMs} ms of continuous activations to reach the threshold. At a {RH.refreshMs} ms refresh interval, every row is refreshed before its neighbors can get there, so the attack is shut out by the refresh schedule itself.</p>,
        <p key="5">Heat leaves the stack upward, through the logic die, the lid and the heatsink. Since the DRAM is underneath the logic, it runs about <strong className="num">{TH.dramCoolerC} °C cooler</strong> than the logic. In HBM the arrangement is reversed, with the memory sitting on top of hot logic. Most of the resistance to heat flow, about {TH.coolingShareRthetaPct}%, is in the cooling solution; the whole die stack, DRAM included, adds only about {TH.dieStackShareRthetaPct}%.</p>,
        <p key="6">Each chiplet draws about {TH.chipletW} W. With baseline air cooling and {air.ambientC} °C intake air, only {air.maxChipletW} W per chiplet stays under the {TH.limitC} °C limit. The paper’s optimized heatsink, with {opt.ambientC} °C air, keeps the peak near <strong className="num">{opt.peakAt106C} °C</strong>, with headroom up to about {opt.headroomW} W. Liquid cooling would keep it under {liquid.belowC} °C.</p>,
      ]}
      description={(s) => [
        `Refresh timeline below ${R.hotThresholdC} °C, using the paper's ${R.coolIntervalMs} ms comparison point, against HBM's nominal ${R.hbmNominalMs} ms. A temperature slider is available.`,
        `Refresh timeline above ${R.hotThresholdC} °C: refresh every ${R.hotIntervalMs} ms, ${R.moreFrequentX} times more often than HBM's ${R.hbmNominalMs} ms.`,
        `Bar comparison: a Raptor bank has ${R.rowsPerBank} rows; conventional banks have ${R.fewerRowsLabel} more.`,
        `Measured bandwidth lost to refresh at ${TABLE1_FREQ_MHZ} MHz: ${TABLE1.map((r) => `${r.overheadPct}% at ${r.intervalMs} ms`).join(', ')}.`,
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
        { evidence: 'modeled' as const, caption: <>From the paper’s analytical thermal model, not a silicon measurement. Each thermometer shows the peak temperature at Raptor’s operating point of {TH.chipletW} W per chiplet; the dashed line is the {TH.limitC} °C limit. Source: Sec V-C, Fig. 12.</> },
      ][Math.min(s.step, 6)]}
    />
  );
}
