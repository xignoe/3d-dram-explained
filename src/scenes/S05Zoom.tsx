import { lazy, type ReactNode } from 'react';
import { Scene, scrollToStep, type SceneState } from '../components/Scene';
import { Gate3D } from '../components/Gate3D';
import { Term } from '../components/ui';
import { HIERARCHY as H } from '../data/paper';
import { fmt } from '../lib/fmt';
import { P } from '../lib/palette';

const Zoom3D = lazy(() => import('../three/Zoom'));
const LEVELS = ['Card', 'MCM', 'Chiplet', 'Gang', 'Slice', 'Bank'] as const;

const LEDGER: ReactNode[][] = [
  [<><b className="num">{H.card.mcmsMin}–{H.card.mcmsMax}</b> multi-chip modules per card</>],
  [<><b className="num">{H.mcm.chiplets}</b> chiplets</>, <><b className="num">{H.mcm.powerW} W</b> per module</>, <><b className="num">{H.mcm.lpddrDevices}</b> × {H.mcm.lpddrType} = <b className="num">{H.mcm.lpddrGB} GB</b> overflow</>],
  [<><b className="num">{fmt(H.chiplet.banks)}</b> DRAM banks</>, <><b className="num">{H.chiplet.channels}</b> independent channels</>, <><b className="num">{H.chiplet.clockGHz} GHz</b> logic</>],
  [<><b className="num">{H.chiplet.gangs}</b> gangs per chiplet</>, <><b className="num">{H.gang.slices}</b> slices per gang</>],
  [<><b className="num">{H.slice.teRows}×{H.slice.teCols}</b> tensor engines</>, <><b className="num">{H.slice.simdCores}</b> SIMD core</>, <><b className="num">{H.slice.channels}</b> private DRAM channels</>],
  [<><b className="num">{fmt(H.bank.rows)}</b> rows × <b className="num">{H.bank.columns}</b> columns</>, <><b className="num">{H.bank.bytesPerColumnRead} bytes</b> per column read</>],
];

const grid = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Hand-built SVG for every level (used for levels 3–5 always, 0–2 as the 3D fallback). */
function ZoomSvg({ level }: { level: number }) {
  const g = Math.round(Math.sqrt(H.chiplet.gangs));
  const sl = Math.round(Math.sqrt(H.gang.slices));
  return (
    <svg viewBox="0 0 400 320" className="h-full w-full" aria-hidden>
      {level === 0 && (
        <g>
          <rect x="16" y="90" width="368" height="140" rx="2" fill={P.board} stroke={P.ink} />
          {grid(H.card.mcmsMax).map((i) => {
            const ghost = i >= H.card.mcmsMin;
            return (
              <g key={i} transform={`translate(${34 + i * 88} 120)`}>
                <rect width="72" height="72" rx="2" fill={ghost ? 'none' : P.plate} stroke={ghost ? P.ink3 : P.ink} strokeDasharray={ghost ? '4 4' : undefined} />
                <text x="36" y="42" textAnchor="middle" fontSize="12" fill={ghost ? P.ink3 : P.ink}>{ghost ? 'optional' : 'MCM'}</text>
              </g>
            );
          })}
          <text x="200" y="260" textAnchor="middle" className="svg-label">one accelerator card</text>
        </g>
      )}
      {level === 1 && (
        <g transform="translate(90 40)">
          <rect width="220" height="220" rx="2" fill={P.board} stroke={P.ink} />
          {grid(H.mcm.chiplets).map((i) => (
            <g key={i} transform={`translate(${60 + (i % 2) * 54} ${60 + Math.floor(i / 2) * 54})`}>
              <rect width="46" height="46" rx="1" fill={P.dramTint} stroke={P.ink} />
            </g>
          ))}
          {grid(H.mcm.lpddrDevices).map((i) => {
            const half = H.mcm.lpddrDevices / 2;
            return <rect key={i} x={i < half ? 12 : 180} y={22 + (i % half) * 46} width="28" height="38" rx="3" fill={P.lpddr} />;
          })}
          <text x="110" y="200" textAnchor="middle" fontSize="11" fill={P.ink2}>chiplets (center) · LPDDR5X (sides)</text>
        </g>
      )}
      {level === 2 && (
        <g>
          <g transform="translate(24 70)">
            <rect width="140" height="22" rx="3" fill={P.logic} />
            <text x="70" y="15" textAnchor="middle" fontSize="11" fill={P.ink}>logic die</text>
            {grid(12).map((i) => <line key={i} x1={8 + i * 11.3} x2={8 + i * 11.3} y1="24" y2="40" stroke={P.ink3} strokeOpacity="0.6" />)}
            <rect y="42" width="140" height="22" rx="3" fill={P.dramTint} stroke={P.dram} />
            <text x="70" y="57" textAnchor="middle" fontSize="11" fill={P.ink}>3D-DRAM die</text>
            <text x="70" y="92" textAnchor="middle" className="svg-label">side view</text>
          </g>
          <g transform="translate(196 40)">
            {grid(H.chiplet.banks).map((i) => {
              const cols = Math.ceil(Math.sqrt(H.chiplet.banks));
              return <rect key={i} x={(i % cols) * 6.4} y={Math.floor(i / cols) * 6.4} width="5" height="5" fill={P.dram} opacity="0.8" />;
            })}
            <text x="93" y="215" textAnchor="middle" className="svg-label">DRAM die from above: {fmt(H.chiplet.banks)} banks</text>
          </g>
        </g>
      )}
      {level === 3 && (
        <g transform="translate(80 20)">
          {grid(H.chiplet.gangs).map((i) => (
            <g key={i} transform={`translate(${(i % g) * 124} ${Math.floor(i / g) * 124})`}>
              <rect width="116" height="116" rx="2" fill={i === 0 ? P.plate : 'transparent'} stroke={i === 0 ? P.dram : P.rule} strokeWidth={i === 0 ? 2 : 1} />
              {grid(H.gang.slices).map((j) => (
                <rect key={j} x={10 + (j % sl) * 50} y={10 + Math.floor(j / sl) * 50} width="46" height="46" rx="3" fill="none" stroke={P.ink3} />
              ))}
              <text x="58" y="66" textAnchor="middle" fontSize="12" fill={i === 0 ? P.ink : P.ink3}>gang</text>
            </g>
          ))}
          <text x="120" y="270" textAnchor="middle" className="svg-label">logic die from above · small squares are slices</text>
        </g>
      )}
      {level === 4 && (
        <g transform="translate(60 14)">
          <rect width="280" height="160" rx="2" fill={P.plate} stroke={P.dram} />
          {grid(H.slice.teRows * H.slice.teCols).map((i) => (
            <rect key={i} x={20 + (i % H.slice.teCols) * 44} y={14 + Math.floor(i / H.slice.teCols) * 30} width="38" height="24" rx="3" fill={P.te} opacity="0.85" />
          ))}
          <text x="98" y="148" textAnchor="middle" fontSize="11" fill={P.ink2}>tensor engines</text>
          <rect x="206" y="14" width="56" height="114" rx="2" fill={P.logicDark} />
          <text x="234" y="76" textAnchor="middle" fontSize="11" fill={P.ink}>SIMD</text>
          {grid(H.slice.channels).map((i) => (
            <line key={i} x1={14 + i * 16.8} x2={14 + i * 16.8} y1="162" y2="232" stroke={P.dram} strokeWidth="2" opacity="0.85" style={{ animation: 'pulse-soft 1.6s ease-in-out infinite', animationDelay: `${i * 0.08}s` }} />
          ))}
          <rect y="234" width="280" height="30" rx="2" fill={P.dramTint} stroke={P.dram} />
          <text x="140" y="254" textAnchor="middle" fontSize="11" fill={P.ink}>DRAM directly below · {H.slice.channels} channels</text>
        </g>
      )}
      {level === 5 && (
        <g transform="translate(70 30)">
          {grid(20 * 26).map((i) => (
            <rect key={i} x={(i % 26) * 10} y={Math.floor(i / 26) * 11} width="9" height="10" fill={i % 26 === 9 ? P.dram : P.plate} />
          ))}
          <text x="130" y="-8" textAnchor="middle" className="svg-label">{H.bank.columns} columns →</text>
          <text transform="translate(-10 110) rotate(-90)" textAnchor="middle" className="svg-label">{fmt(H.bank.rows)} rows →</text>
          <line x1="95" x2="95" y1="222" y2="252" stroke={P.dram} strokeWidth="2" />
          <text x="95" y="268" textAnchor="middle" fontSize="13" className="svg-num" fill={P.dram}>{H.bank.bytesPerColumnRead} bytes per column read</text>
          <text x="262" y="232" textAnchor="end" fontSize="10" fill={P.ink3}>(drawn at reduced scale)</text>
        </g>
      )}
    </svg>
  );
}

function Visual({ step, reduced, inView }: SceneState) {
  const level = Math.min(step, LEVELS.length - 1);
  const use3D = level <= 2;
  return (
    <div className="flex h-full flex-col gap-2">
      <nav aria-label="Zoom level" className="sans flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.82rem]">
        {LEVELS.map((l, i) => (
          <span key={l} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-faint">›</span>}
            <button
              className={i === level ? 'font-semibold text-ink underline decoration-[1.5px] underline-offset-4' : 'text-faint hover:text-ink'}
              aria-current={i === level ? 'step' : undefined}
              onClick={() => scrollToStep('zoom', i, reduced)}
            >{l}</button>
          </span>
        ))}
      </nav>
      <div className="relative min-h-0 flex-1">
        {use3D ? (
          <Gate3D fallback={<div className="absolute inset-0"><ZoomSvg level={level} /></div>}>
            <Zoom3D level={level} active={inView} />
          </Gate3D>
        ) : (
          <div className="absolute inset-0"><ZoomSvg level={level} /></div>
        )}
      </div>
      <ul className="sans flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-2 text-xs text-muted lg:text-sm [&_b]:font-semibold [&_b]:text-ink">
        {LEDGER[level].map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </div>
  );
}

export function S05Zoom() {
  return (
    <Scene
      id="zoom"
      num={5}
      kicker="Powers of ten"
      title="From a whole card down to a single bank."
      steps={[
        <p key="0">Start with the whole thing. One Raptor accelerator card carries <strong className="num">{H.card.mcmsMin} to {H.card.mcmsMax}</strong> <Term k="mcm">multi-chip modules</Term> (MCMs).</p>,
        <p key="1">Each MCM holds <strong className="num">{H.mcm.chiplets}</strong> <Term k="chiplet">chiplets</Term> and is designed around <strong className="num">{H.mcm.powerW} W</strong>. Beside them sit <strong className="num">{H.mcm.lpddrDevices}</strong> ordinary {H.mcm.lpddrType} memory chips, <strong className="num">{H.mcm.lpddrGB} GB</strong> of slower overflow space for whatever doesn’t fit in the stacked DRAM.</p>,
        <p key="2">Each chiplet is the stack from the last scene: a logic die bonded onto a DRAM die. The DRAM die is divided into <strong className="num">{fmt(H.chiplet.banks)}</strong> <Term k="bank">banks</Term>, organized into <strong className="num">{H.chiplet.channels}</strong> independent <Term k="channel">channels</Term>.</p>,
        <p key="3">The logic die is split into <strong className="num">{H.chiplet.gangs}</strong> gangs. A gang is a neighborhood: its slices can team up on a larger piece of the model without involving the whole chip.</p>,
        <p key="4">Each gang has <strong className="num">{H.gang.slices}</strong> slices, the basic unit of the design. A slice has a <strong className="num">{H.slice.teRows}×{H.slice.teCols}</strong> grid of tensor engines for matrix math, a SIMD core for everything else, and <strong className="num">{H.slice.channels}</strong> private DRAM channels feeding it from directly below. Upkeep on one channel never stalls another.</p>,
        <p key="5">At the bottom is a single bank: a grid of <strong className="num">{fmt(H.bank.rows)}</strong> rows by <strong className="num">{H.bank.columns}</strong> columns, where each column read returns <strong className="num">{H.bank.bytesPerColumnRead} bytes</strong>. Keep those numbers in mind. All four problems ahead start here.</p>,
      ]}
      description={(s) => {
        const l = Math.min(s.step, LEVELS.length - 1);
        return `Zoom level ${l + 1} of ${LEVELS.length}: ${LEVELS[l]}. ` + [
          `A card with ${H.card.mcmsMin} to ${H.card.mcmsMax} multi-chip modules.`,
          `A module with ${H.mcm.chiplets} chiplets and ${H.mcm.lpddrDevices} LPDDR5X chips giving ${H.mcm.lpddrGB} GB; ${H.mcm.powerW} watts.`,
          `A chiplet: logic die on a DRAM die with ${H.chiplet.banks} banks in ${H.chiplet.channels} channels.`,
          `The logic die divided into ${H.chiplet.gangs} gangs of ${H.gang.slices} slices.`,
          `A slice: ${H.slice.teRows} by ${H.slice.teCols} tensor engines, a SIMD core, and ${H.slice.channels} DRAM channels running straight down.`,
          `A bank: ${H.bank.rows} rows by ${H.bank.columns} columns; each column read returns ${H.bank.bytesPerColumnRead} bytes.`,
        ][l];
      }}
      visual={(s) => <Visual {...s} />}
      figure={(s) => ({ caption: <>Raptor’s hierarchy, one level at a time: {LEVELS.slice(0, Math.min(s.step, LEVELS.length - 1) + 1).join(' › ')}. Lower levels are drawn schematically, not to scale. Source: Sec IV-A to IV-C.</> })}
    />
  );
}
