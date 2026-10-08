import { useEffect, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { MEM_COLOR, Term } from '../components/ui';
import {
  TABLE2, MEMORY, cardCount, HIERARCHY as H, D2D_GBPS_PER_LANE, KIMI_SRAM_CARDS_STATED, INTERCONNECT, NETWORK_SENSITIVITY as NS,
  type DeployCell, type MemoryId,
} from '../data/paper';
import { fmt } from '../lib/fmt';
import { P } from '../lib/palette';

const MODELS = Object.keys(TABLE2);
const MEMS: MemoryId[] = ['sram', 'hbm', 'dram3d'];
const DEEPSEEK = 'DeepSeek-V3 671B', KIMI = 'Kimi K2 1T';

function describe(c: DeployCell): string {
  const s = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const pp = c.pp > 1 ? ` · ${c.pp}-stage pipeline` : '';
  if (c.mode === 'U') return `${c.attnTP}-way tensor parallel${pp}`;
  return `attention on ${s(c.attnTP, 'card')} · experts on ${s(c.ep, 'card')}${c.se ? ` · ${s(c.se, 'shared-expert card')}` : ''}${pp}`;
}

function CardGrid({ n, color }: { n: number; color: string }) {
  const W = 100, H = 130;
  const cols = Math.max(1, Math.ceil(Math.sqrt((n * W) / H)));
  const rows = Math.ceil(n / cols);
  const size = Math.min(W / cols, H / rows, 24);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden preserveAspectRatio="xMidYMax meet">
      {Array.from({ length: n }, (_, i) => {
        const x = (i % cols) * size, y = H - (Math.floor(i / cols) + 1) * size, w = size * 0.84, h = size * 0.62;
        // Large enough to read: draw an actual card (board, package, edge connector). Otherwise a plain mark.
        if (size < 7) return <rect key={i} x={x} y={y} width={size * 0.8} height={size * 0.8} fill={color} />;
        return (
          <g key={i}>
            <rect x={x} y={y + size * 0.1} width={w} height={h} rx={size * 0.05} fill={color} stroke={P.ink} strokeWidth={0.3} />
            <rect x={x + w * 0.32} y={y + size * 0.1 + h * 0.2} width={w * 0.36} height={h * 0.5} fill={P.paper} fillOpacity={0.75} />
            <rect x={x + w * 0.15} y={y + size * 0.1 + h} width={w * 0.7} height={size * 0.08} fill={P.gold} />
          </g>
        );
      })}
    </svg>
  );
}

/** Three panels, each one level further out: gangs on a chiplet, chiplets on a module, modules in a rack. */
function Ladder({ step }: { step: number }) {
  const panel = (x: number, title: string, link: string) => (
    <g transform={`translate(${x} 0)`}>
      <text x={0} y={14} fontSize="13" style={{ fontFamily: 'var(--font-serif)' }} fill={P.ink}>{title}</text>
      <text x={0} y={30} fontSize="10" fill={P.ink2}>{link}</text>
    </g>
  );
  const mesh = (x: number, y: number, s: number, n: number, fill: string, linkColor: string) => {
    const k = Math.round(Math.sqrt(n)), c = s / k;
    return (
      <g>
        {Array.from({ length: n }, (_, i) => (
          <rect key={i} x={x + (i % k) * c + 4} y={y + Math.floor(i / k) * c + 4} width={c - 8} height={c - 8} fill={fill} stroke={P.ink} strokeWidth={0.8} />
        ))}
        {Array.from({ length: k }, (_, i) => (
          <g key={i} stroke={linkColor} strokeWidth={2}>
            <line x1={x + c / 2} x2={x + s - c / 2} y1={y + i * c + c / 2} y2={y + i * c + c / 2} />
            <line y1={y + c / 2} y2={y + s - c / 2} x1={x + i * c + c / 2} x2={x + i * c + c / 2} />
          </g>
        ))}
      </g>
    );
  };
  const [noc, d2d, net] = [INTERCONNECT[0], INTERCONNECT[1], INTERCONNECT[2]];
  return (
    <div className="sans flex h-full flex-col justify-center-safe gap-4">
      <svg viewBox="0 0 560 230" className="w-full" aria-hidden>
        {panel(0, 'Inside a chiplet', noc.link)}
        <rect x={0} y={44} width={150} height={150} fill={P.logic} stroke={P.ink} strokeWidth={1.2} />
        {mesh(10, 54, 130, H.chiplet.gangs, P.plate2, P.dram)}
        <text x={75} y={214} textAnchor="middle" fontSize="10" fill={P.ink3}>{noc.connects}</text>

        {panel(190, 'Inside a module', 'die-to-die links')}
        <rect x={190} y={44} width={150} height={150} fill={P.plate2} stroke={P.ink} strokeWidth={1.2} />
        {mesh(200, 54, 130, H.mcm.chiplets, P.logic, P.sram)}
        <text x={265} y={214} textAnchor="middle" fontSize="10" fill={P.ink3}>{d2d.connects}, {D2D_GBPS_PER_LANE} Gbps per lane</text>

        {panel(380, 'Across the rack', 'PCIe Gen 7 or Ethernet')}
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x={380} y={48 + i * 26} width={110} height={20} fill={i === 2 ? P.hbmTint : P.board} stroke={P.ink} strokeWidth={0.9} />
        ))}
        <text x={435} y={113} textAnchor="middle" fontSize="9" fill={P.ink}>switch tray</text>
        {[0, 1, 3, 4].map((i) => <text key={i} x={435} y={62 + i * 26} textAnchor="middle" fontSize="9" fill={P.ink2}>node of cards</text>)}
        {[0, 1, 3, 4].map((i) => <path key={i} d={`M492 ${58 + i * 26} C 520 ${58 + i * 26}, 520 106, 492 106`} fill="none" stroke={P.hbm} strokeWidth={1.4} />)}
        <text x={435} y={214} textAnchor="middle" fontSize="10" fill={P.ink3}>{net.connects}</text>
        <path d="M156 120 h24" stroke={P.ink3} markerEnd="url(#ld-ah)" />
        <path d="M346 120 h24" stroke={P.ink3} markerEnd="url(#ld-ah)" />
        <defs><marker id="ld-ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill={P.ink3} /></marker></defs>
      </svg>
      <p className="text-sm text-muted">Each step outward is slower to cross. The fewer cards a model is split across, the less of its traffic has to make the longest trips.</p>
      <div className={`fade border-t border-line pt-3 ${step >= 4 ? 'opacity-100' : 'opacity-0'}`}>
        <p className="font-serif text-lg leading-snug text-ink">Throughput stays flat until network latency passes about <span className="num">{NS.flatBelowUs} µs</span>. Beyond that, <span className="text-sram-ink">SRAM</span>, which is split across the most cards, degrades fastest, while <span style={{ color: MEM_COLOR.hbm }}>HBM</span> barely changes.</p>
      </div>
    </div>
  );
}

function Visual({ step }: SceneState) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => setPicked(null), [step]);
  if (step >= 3) return <Ladder step={step} />;
  const model = picked ?? (step === 0 ? DEEPSEEK : KIMI);
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <label className="sans flex items-center gap-2 text-xs text-muted">
          Model
          <select className="text-sm" value={model} onChange={(e) => setPicked(e.target.value)}>
            {MODELS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
        {MEMS.map((m) => {
          const n = cardCount(model, m);
          const stated = model === KIMI && m === 'sram' && n === KIMI_SRAM_CARDS_STATED;
          return (
            <div key={m} className="flex min-h-0 flex-col" title={describe(TABLE2[model][m])}>
              <div className="num font-serif text-4xl font-medium leading-none lg:text-6xl" style={{ color: MEM_COLOR[m] }}>{fmt(n)}</div>
              <div className="sans mt-1 text-xs text-muted">{MEMORY[m].label} card{n === 1 ? '' : 's'}{stated && <span className="ml-1 italic">(stated in paper)</span>}</div>
              <div className="min-h-0 flex-1 py-2"><CardGrid n={n} color={MEM_COLOR[m]} /></div>
              <div className="sans text-[0.68rem] leading-snug text-faint">{describe(TABLE2[model][m])}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function S11Cards() {
  const ds = (m: MemoryId) => fmt(cardCount(DEEPSEEK, m));
  const ki = (m: MemoryId) => fmt(cardCount(KIMI, m));
  return (
    <Scene
      id="cards"
      num={11}
      kicker="Fewer cards"
      title="More memory per card means fewer cards"
      steps={[
        <p key="0">Large models are split across many cards, and the number of cards a model needs depends mostly on how much memory each one has. For DeepSeek-V3, the paper’s smallest workable setups need <strong className="num text-sram-ink">{ds('sram')}</strong> SRAM cards, <strong className="num" style={{ color: MEM_COLOR.dram3d }}>{ds('dram3d')}</strong> Raptor cards, or <strong className="num" style={{ color: MEM_COLOR.hbm }}>{ds('hbm')}</strong> HBM cards.</p>,
        <p key="1">For Kimi K2, which has a trillion parameters, the gap is much wider: <strong className="num text-sram-ink">{ki('sram')}</strong> SRAM cards (a figure the paper gives directly), compared with <strong className="num" style={{ color: MEM_COLOR.dram3d }}>{ki('dram3d')}</strong> Raptor cards and <strong className="num" style={{ color: MEM_COLOR.hbm }}>{ki('hbm')}</strong> HBM cards. The menu in the figure lists the other models.</p>,
        <p key="2">HBM needs even fewer cards, but each one reads memory at {MEMORY.hbm.bandwidthTBs} TB/s, compared with {MEMORY.dram3d.bandwidthTBs} TB/s for Raptor. Capacity determines how many cards a model needs, and bandwidth determines how quickly each of them works.</p>,
        <p key="3">The number of cards matters because the cards working on one model constantly exchange partial results, in group operations called <Term k="collective">collectives</Term>. Raptor’s connections form a hierarchy: an on-chip network inside each chiplet, die-to-die links inside each module, and PCIe Gen 7 or Ethernet between modules and cards.</p>,
        <p key="4">With fewer cards, each collective involves fewer participants and less traffic has to cross the slowest links, so Raptor depends less on the network than the SRAM design does. HBM, split across even fewer cards, is the least sensitive of the three. Raptor sits in between, and like SRAM it slows down sharply when network bandwidth is very low.</p>,
      ]}
      description={(s) => s.step >= 3
        ? `Nested boxes showing the interconnect hierarchy: ${INTERCONNECT.map((l) => `${l.level}, ${l.link}`).join('; ')}.`
        : `Card-count grids for ${s.step === 0 ? DEEPSEEK : KIMI}: ${MEMS.map((m) => `${MEMORY[m].label} ${cardCount(s.step === 0 ? DEEPSEEK : KIMI, m)} cards`).join(', ')}. A model picker lets you choose any of ${MODELS.length} models.`}
      visual={(s) => <Visual {...s} />}
      figure={(s) => s.step >= 3
        ? (s.step >= 4
          ? { evidence: 'modeled' as const, caption: <>Raptor’s interconnect hierarchy, from a single chiplet out to the rack. The result on network sensitivity comes from the paper’s performance model. Source: Sec VI-A, Sec VIII-C.</> }
          : { caption: <>Raptor’s interconnect hierarchy, from a single chiplet out to the rack. Source: Sec VI-A.</> })
        : { evidence: 'derived' as const, caption: <>Each square is one card. Card counts are total memory divided by memory per card, from Tables II and III; the paper states the Kimi K2 figure for SRAM directly.</> }}
    />
  );
}
