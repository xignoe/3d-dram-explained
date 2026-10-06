import { lazy, useEffect, useState, type ReactNode } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { Chef, Term } from '../components/ui';
import { P } from '../lib/palette';
import { STACKING } from '../data/paper';
import { Gate3D } from '../components/Gate3D';

const Stacking3D = lazy(() => import('../three/Stacking'));

const LABEL_X = 356;

/** A right-hand label with a hairline leader to the part it names. */
function Callout({ y, to, children, strong = false }: { y: number; to: [number, number]; children: ReactNode; strong?: boolean }) {
  return (
    <g>
      <path d={`M${to[0]} ${to[1]} L${LABEL_X - 26} ${y - 4} L${LABEL_X - 4} ${y - 4}`} fill="none" stroke={P.ink3} strokeWidth={0.6} />
      <text x={LABEL_X} y={y} fontSize="12" fill={strong ? P.ink : P.ink2} fontWeight={strong ? 600 : 400}>{children}</text>
    </g>
  );
}

/** Dots travelling along a path; nothing is drawn when motion is off. */
function Flow({ d, n, dur, color, animate }: { d: string; n: number; dur: number; color: string; animate: boolean }) {
  if (!animate) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} r={2.2} fill={color}>
          <animateMotion dur={`${dur}s`} begin={`${-(i / n) * dur}s`} repeatCount="indefinite" path={d} />
        </circle>
      ))}
    </>
  );
}

/**
 * Two package cross-sections, schematic and not to scale: memory beside the
 * processor on an interposer (HBM-style), and Raptor's logic die bonded face
 * to face on a DRAM die (Sec IV-B, the paper's Fig. 1b and Fig. 4).
 */
function CrossSections({ mix, step, animate }: { mix: number; step: number; animate: boolean }) {
  const sideOn = mix < 0.5;
  const ubumps = Array.from({ length: 46 }, (_, i) => 44 + i * 6);
  const tsvs = Array.from({ length: 10 }, (_, i) => 54 + i * 28);
  const c4 = Array.from({ length: 14 }, (_, i) => 50 + i * 20);
  const rain = Array.from({ length: 20 }, (_, i) => 50 + i * 14);
  const hbmStack = (x: number) => (
    <g>
      <rect x={x} y={120} width={80} height={10} fill={P.hbm} fillOpacity={0.45} stroke={P.ink} strokeWidth={0.8} />
      {[0, 1, 2, 3].map((k) => <rect key={k} x={x} y={111 - k * 8} width={80} height={7} fill={P.hbmTint} stroke={P.ink} strokeWidth={0.8} />)}
      {[16, 40, 64].map((dx) => <line key={dx} x1={x + dx} x2={x + dx} y1={88} y2={130} stroke={P.copper} strokeWidth={0.8} />)}
    </g>
  );
  return (
    <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden>
      {/* ---- A: beside ---- */}
      <g className="fade" opacity={sideOn ? 1 : 0.32}>
        <text x="10" y="20" fontSize="14" fontStyle="italic" fill={P.ink} style={{ fontFamily: 'var(--font-serif)' }}>Side by side, as with HBM</text>
        <g transform="translate(0 -50)">
        <rect x={10} y={150} width={340} height={14} fill={P.board} stroke={P.ink} strokeWidth={0.8} />
        <rect x={18} y={134} width={324} height={14} fill={P.plate2} stroke={P.ink} strokeWidth={0.8} />
        {Array.from({ length: 52 }, (_, i) => 26 + i * 6).filter((x) => (x > 24 && x < 104) || (x > 124 && x < 236) || (x > 256 && x < 336)).map((x) => (
          <circle key={x} cx={x} cy={132} r={1.5} fill={P.ink3} />
        ))}
        {hbmStack(24)}
        {hbmStack(256)}
        <rect x={124} y={104} width={112} height={26} fill={P.logic} stroke={P.ink} strokeWidth={1} />
        <rect x={124} y={104} width={14} height={26} fill={P.hbm} fillOpacity={0.35} />
        <rect x={222} y={104} width={14} height={26} fill={P.hbm} fillOpacity={0.35} />
        <path d="M92 131 V141 H131 V131" fill="none" stroke={P.hbm} strokeWidth={1.4} />
        <path d="M268 131 V141 H229 V131" fill="none" stroke={P.hbm} strokeWidth={1.4} />
        <Flow d="M64 100 V141 H131 V116" n={4} dur={2.6} color={P.hbm} animate={animate && sideOn} />
        <Flow d="M296 100 V141 H229 V116" n={4} dur={2.6} color={P.hbm} animate={animate && sideOn} />
        <Callout y={84} to={[336, 96]}>HBM stack</Callout>
        <Callout y={110} to={[236, 112]}>processor</Callout>
        <Callout y={136} to={[342, 141]}>interposer</Callout>
        <Callout y={162} to={[350, 158]}>substrate</Callout>
        <text x="10" y="190" fontSize="12" fill={P.ink2}>Data runs sideways and enters only along the processor’s edges.</text>
        </g>
      </g>

      {/* ---- B: face to face ---- */}
      <g transform="translate(0 168)" className="fade" opacity={sideOn ? 0.32 : 1}>
        <text x="10" y="20" fontSize="14" fontStyle="italic" fill={P.ink} style={{ fontFamily: 'var(--font-serif)' }}>Face to face, as in Raptor</text>
        <rect x={10} y={136} width={340} height={14} fill={P.board} stroke={P.ink} strokeWidth={0.8} />
        <rect x={18} y={120} width={324} height={14} fill={P.plate2} stroke={P.ink} strokeWidth={0.8} />
        {c4.map((x) => <circle key={x} cx={x} cy={116} r={3.4} fill={P.ink3} />)}
        <rect x={40} y={76} width={280} height={36} fill={P.dramTint} stroke={P.ink} strokeWidth={1} />
        {tsvs.map((x) => <line key={x} x1={x} x2={x} y1={77} y2={112} stroke={P.copper} strokeWidth={1.4} />)}
        {ubumps.map((x) => <circle key={x} cx={x} cy={73} r={1.6} fill={step >= 2 ? P.dram : P.ink3} className="fade" />)}
        <rect x={40} y={36} width={280} height={34} fill={P.logic} stroke={P.ink} strokeWidth={1} />
        {rain.map((x) => (
          <g key={x} fill={P.dram} stroke={P.dram} strokeOpacity={0.6} fillOpacity={0.75}>
            <line x1={x} x2={x} y1={92} y2={58} strokeWidth={1.1} />
            <path d={`M${x - 2.6} 59 L${x} 53 L${x + 2.6} 59 Z`} stroke="none" />
          </g>
        ))}
        {rain.map((x, i) => (
          <Flow key={x} d={`M${x} ${96 - (i % 3) * 3} V52`} n={1} dur={1.1 + (i % 4) * 0.12} color={P.dram} animate={animate && !sideOn} />
        ))}
        <Callout y={50} to={[320, 52]}>logic die, {STACKING.logicProcess}</Callout>
        <Callout y={70} to={[316, 73]} strong={step >= 2}>µbumps, {STACKING.microbumpPitchUm} µm apart</Callout>
        <Callout y={92} to={[320, 90]}>DRAM die</Callout>
        <Callout y={106} to={[306, 104]}>through-silicon vias</Callout>
        <Callout y={122} to={[310, 116]}>C4 bumps, ≥{STACKING.c4MinPitchUm} µm</Callout>
        <Callout y={138} to={[342, 128]}>{STACKING.interposer}</Callout>
        <Callout y={154} to={[350, 144]}>{STACKING.substrate}</Callout>
        <text x="10" y="178" fontSize="12" fill={P.ink2}>Data crosses the whole face of the die, straight up.</text>
      </g>
    </svg>
  );
}

function Visual({ step, progress, inView, reduced }: SceneState) {
  const [manual, setManual] = useState<number | null>(null);
  useEffect(() => setManual(null), [step]);
  const scripted = step === 0 ? 0 : step === 1 ? progress : 1;
  const mix = manual ?? scripted;
  const callouts = step >= 3;

  return (
    <div className="relative h-full w-full">
      <div className={`fade absolute inset-0 ${callouts ? 'pb-36 lg:pb-32' : ''}`}>
        <div className="relative h-full w-full">
          <Gate3D fallback={<CrossSections mix={mix} step={step} animate={inView && !reduced} />}>
            <Stacking3D mix={mix} active={inView} />
            <div className="sans pointer-events-none absolute left-0 top-0 text-xs italic text-muted" aria-hidden>
              {mix < 0.5 ? 'Memory beside the processor' : 'Memory beneath the processor'}
            </div>
          </Gate3D>
        </div>
      </div>
      <div className={`fade absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-bg/90 pt-2 ${callouts ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <dl className="grid grid-cols-3 divide-x divide-line border-y border-line">
          <div className="px-2 py-2 lg:px-4">
            <dd className="num font-serif text-2xl font-medium leading-none lg:text-4xl">{STACKING.microbumpPitchUm}<span className="text-sm text-muted lg:text-lg"> µm</span></dd>
            <dt className="sans mt-1 text-[0.7rem] leading-tight text-muted">between connectors</dt>
          </div>
          <div className="px-2 py-2 lg:px-4">
            <dd className="num font-serif text-2xl font-medium leading-none text-dram3d lg:text-4xl">{STACKING.ioPJPerBit}<span className="text-sm text-muted lg:text-lg"> pJ/bit</span></dd>
            <dt className="sans mt-1 text-[0.7rem] leading-tight text-muted">to move one bit <span aria-hidden>■</span><span className="sr-only">, measured</span></dt>
          </div>
          <div className="px-2 py-2 lg:px-4">
            <dd className="num font-serif text-2xl font-medium leading-none lg:text-4xl">≈{STACKING.vsHBM3EnergyX}×<span className="text-sm text-muted lg:text-lg"> less</span></dd>
            <dt className="sans mt-1 text-[0.7rem] leading-tight text-muted">energy than reported for HBM3</dt>
          </div>
        </dl>
        <div className="pointer-events-auto flex justify-end gap-0" role="group" aria-label="Compare layouts">
          <button className="chip-btn" aria-pressed={mix < 0.5} onClick={() => setManual(0)}>Side by side</button>
          <button className="chip-btn -ml-px" aria-pressed={mix >= 0.5} onClick={() => setManual(1)}>Stacked</button>
        </div>
      </div>
    </div>
  );
}

export function S04Stacking() {
  return (
    <Scene
      id="stacking"
      num={4}
      kicker="Stacking"
      title="Why it helps to put the memory underneath"
      steps={[
        <>
          <p key="a">In most AI accelerators the memory sits beside the processor, and HBM stacks connect to it along one edge. Everything the chip reads from memory has to cross that boundary.</p>
          <Chef>This is the pantry down the hall: there is plenty of space, but everyone uses the same door.</Chef>
        </>,
        <p key="b">Raptor stacks the two instead. Its logic die, made on TSMC’s {STACKING.logicProcess.replace('TSMC ', '')} process, is bonded face to face with a DRAM die, so the memory sits directly beneath the circuits that use it.</p>,
        <>
          <p key="c">The connection between memory and logic now covers the whole area of the die instead of a strip along one edge. A dense array of microscopic solder bumps, called <Term k="ubump">µbumps</Term>, joins the two dies, and each bump carries one bit per clock cycle.</p>
          <Chef>The pantry is now directly below the kitchen, and the trips are short.</Chef>
        </>,
        <>
          <p key="d">The bumps are <strong className="num">{STACKING.microbumpPitchUm} µm</strong> apart. Because each connection is so short, moving a bit costs about <strong className="num">{STACKING.ioPJPerBit} pJ</strong>, which the paper puts at roughly {STACKING.vsHBM3EnergyX}× less than reported figures for HBM3.</p>
          <p>Short connections lower the energy per bit, and the sheer number of them is what provides the bandwidth.</p>
        </>,
      ]}
      description={(s) =>
        (s.step === 0
          ? 'Memory stacks beside the processor on an interposer, with data running sideways and entering only at the processor’s edges.'
          : `Raptor’s logic die (${STACKING.logicProcess}) bonded face to face on a DRAM die through µbumps ${STACKING.microbumpPitchUm} micrometres apart, with through-silicon vias and C4 bumps below, on an interposer and substrate. Data crosses the whole face of the die.`)
        + (s.step >= 3 ? ` Callouts: ${STACKING.microbumpPitchUm} micrometres between connectors; ${STACKING.ioPJPerBit} picojoules per bit, measured; about ${STACKING.vsHBM3EnergyX} times less than HBM3.` : '')
      }
      visual={(s) => <Visual {...s} />}
      figure={(s) => s.step < 3
        ? { caption: <>Two ways of connecting memory to a processor. When the memory sits beside the processor, data crosses one narrow edge; when the two dies are stacked face to face, data crosses the whole die. Schematic and not to scale; on small screens the figure is drawn as cross-sections using the layer names from the paper’s Sec IV-B and Fig. 1b.</> }
        : { evidence: 'measured', caption: <>The energy per bit (■) was measured on Raptor silicon. The bump pitch is a design figure, and the HBM3 comparison is against reported values. Source: Sec IV-B, Sec IV-D.</> }}
    />
  );
}
