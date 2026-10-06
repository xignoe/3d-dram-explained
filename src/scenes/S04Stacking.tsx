import { lazy, useEffect, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { Gate3D } from '../components/Gate3D';
import { Chef, Term } from '../components/ui';
import { P } from '../lib/palette';
import { STACKING } from '../data/paper';

const Stacking3D = lazy(() => import('../three/Stacking'));

/** SVG version: the same contrast, edge vs surface. */
function StackingSvg({ mix }: { mix: number }) {
  const edgeArrows = [0, 1, 2];
  const rain = Array.from({ length: 15 }, (_, i) => i);
  return (
    <svg viewBox="0 0 360 380" className="h-full w-full" aria-hidden>
      <g className="fade" opacity={mix < 0.5 ? 1 : 0.3} stroke={P.ink} strokeWidth="1">
        <text x="16" y="24" stroke="none" fontSize="13" fontStyle="italic" style={{ fontFamily: 'var(--font-serif)' }} fill={P.ink}>Side by side, HBM-style</text>
        <rect x="120" y="70" width="120" height="34" fill={P.logic} />
        <text x="180" y="92" stroke="none" textAnchor="middle" fontSize="12" fill={P.ink}>processor</text>
        {[16, 274].map((x) => (
          <g key={x}>{[0, 1, 2, 3].map((k) => <rect key={k} x={x} y={52 + k * 13} width="70" height="11" fill={P.hbmTint} />)}</g>
        ))}
        <text x="51" y="122" stroke="none" textAnchor="middle" fontSize="11" fill={P.hbm}>HBM</text>
        <text x="309" y="122" stroke="none" textAnchor="middle" fontSize="11" fill={P.hbm}>HBM</text>
        {edgeArrows.map((i) => (
          <g key={i} stroke={P.hbm} strokeWidth="1.3">
            <line x1="88" y1={80 + i * 6} x2="116" y2={80 + i * 6} markerEnd="url(#ah-b)" />
            <line x1="272" y1={80 + i * 6} x2="244" y2={80 + i * 6} markerEnd="url(#ah-b)" />
          </g>
        ))}
        <text x="180" y="140" stroke="none" textAnchor="middle" fontSize="11" fill={P.ink2}>all data squeezes through one edge</text>
      </g>
      <g className="fade" opacity={mix >= 0.5 ? 1 : 0.3} stroke={P.ink} strokeWidth="1">
        <text x="16" y="194" stroke="none" fontSize="13" fontStyle="italic" style={{ fontFamily: 'var(--font-serif)' }} fill={P.ink}>Face to face, Raptor</text>
        <rect x="60" y="216" width="240" height="30" fill={P.logic} />
        <text x="180" y="236" stroke="none" textAnchor="middle" fontSize="12" fill={P.ink}>logic die</text>
        {rain.map((i) => (
          <line key={i} x1={70 + i * 15.7} y1="300" x2={70 + i * 15.7} y2="252" stroke={P.dram} strokeWidth="1.3" markerEnd="url(#ah-g)" />
        ))}
        <rect x="60" y="304" width="240" height="30" fill={P.dramTint} />
        <text x="180" y="324" stroke="none" textAnchor="middle" fontSize="12" fill={P.ink}>DRAM die</text>
        <text x="180" y="358" stroke="none" textAnchor="middle" fontSize="11" fill={P.ink2}>the whole surface is the doorway</text>
      </g>
      <defs>
        <marker id="ah-b" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill={P.hbm} /></marker>
        <marker id="ah-g" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill={P.dram} /></marker>
      </defs>
    </svg>
  );
}

function Visual({ step, progress, inView }: SceneState) {
  const [manual, setManual] = useState<number | null>(null);
  useEffect(() => setManual(null), [step]);
  const scripted = step === 0 ? 0 : step === 1 ? progress : 1;
  const mix = manual ?? scripted;
  const callouts = step >= 3;

  return (
    <div className="relative h-full w-full">
      <Gate3D fallback={<div className={`fade absolute inset-0 p-2 ${callouts ? 'pb-36 lg:pb-32' : ''}`}><StackingSvg mix={mix} /></div>}>
        <Stacking3D mix={mix} active={inView} />
      </Gate3D>
      <div className="sans pointer-events-none absolute left-0 top-0 hidden text-xs italic text-muted lg:block">
        {mix < 0.5 ? 'Memory beside the processor' : 'Memory beneath the processor'}
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
      kicker="Why stacking wins"
      title="Turn the edge into a surface."
      steps={[
        <>
          <p key="a">In most AI accelerators, memory sits <strong>beside</strong> the processor. HBM stacks connect along one edge, so every byte the chip needs has to squeeze through that narrow border.</p>
          <Chef>A big pantry down the hall, with one door. Everyone queues at the door.</Chef>
        </>,
        <p key="b">Raptor flips the arrangement. Its logic die ({STACKING.logicProcess}) is bonded <strong>face to face</strong> onto a DRAM die, so the memory sits directly underneath the compute.</p>,
        <>
          <p key="c">Now the connection isn’t an edge. It’s the <strong>whole surface</strong>. A dense field of microscopic <Term k="ubump">µbumps</Term> runs straight down, each carrying one bit per cycle, all at once.</p>
          <Chef>The pantry is right under the kitchen, with hundreds of trapdoors.</Chef>
        </>,
        <>
          <p key="d">The connectors are just <strong className="num">{STACKING.microbumpPitchUm} µm</strong> apart. Because each wire is so short, moving a bit costs about <strong className="num">{STACKING.ioPJPerBit} pJ</strong>, roughly <strong>{STACKING.vsHBM3EnergyX}× less</strong> than reported for HBM3.</p>
          <p>Short wires cut the energy per bit. Having so many of them is where the bandwidth comes from.</p>
        </>,
      ]}
      description={(s) =>
        s.step === 0
          ? 'Animation: a processor with memory stacks beside it. A thin trickle of data particles flows through a narrow strip along the processor’s edge.'
          : `Animation: the logic die sits face to face on top of a DRAM die, and a dense shower of data particles crosses the entire surface between them. Callouts: ${STACKING.microbumpPitchUm} micrometres between connectors; ${STACKING.ioPJPerBit} picojoules per bit, measured; about ${STACKING.vsHBM3EnergyX} times less than HBM3.`
      }
      visual={(s) => <Visual {...s} />}
      figure={(s) => s.step < 3
        ? { caption: <>Two ways to attach memory. Beside the processor, data crosses one narrow edge. Stacked face to face, it crosses the whole die. Illustration.</> }
        : { evidence: 'measured', caption: <>The energy per bit (■) was measured on Raptor silicon. The bump pitch is a design figure, and the HBM3 comparison is against reported values. Source: Sec IV-B, Sec IV-D.</> }}
    />
  );
}
