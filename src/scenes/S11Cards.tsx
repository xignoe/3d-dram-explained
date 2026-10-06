import { useEffect, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { MEM_COLOR, Note, Term } from '../components/ui';
import {
  TABLE2, MEMORY, cardCount, KIMI_SRAM_CARDS_STATED, INTERCONNECT, NETWORK_SENSITIVITY as NS, LLAMA_FOOTNOTE as LF,
  type DeployCell, type MemoryId,
} from '../data/paper';
import { fmt } from '../lib/fmt';

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
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={(i % cols) * size} y={H - (Math.floor(i / cols) + 1) * size} width={size * 0.8} height={size * 0.8} fill={color} />
      ))}
    </svg>
  );
}

function Ladder({ step }: { step: number }) {
  return (
    <div className="sans flex h-full flex-col justify-center-safe gap-5">
      <div className="border-[1.5px] border-ink p-3 lg:p-5">
        <div className="text-xs text-muted">{INTERCONNECT[2].level}: <span className="text-ink">{INTERCONNECT[2].link}</span>, {INTERCONNECT[2].connects}</div>
        <div className="mt-3 border border-ink p-3 lg:p-4">
          <div className="text-xs text-muted">{INTERCONNECT[1].level}: <span className="text-ink">{INTERCONNECT[1].link}</span>, {INTERCONNECT[1].connects}</div>
          <div className="mt-3 border border-dram3d bg-[color-mix(in_oklab,var(--color-dram3d)_8%,transparent)] p-3 lg:p-4">
            <div className="text-xs text-muted">{INTERCONNECT[0].level}: <span className="text-ink">{INTERCONNECT[0].link}</span>, {INTERCONNECT[0].connects}</div>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted">Each step outward is slower to cross. The fewer cards a model is split across, the less traffic has to make the longest trips.</p>
      <div className={`fade border-t border-line pt-3 ${step >= 4 ? 'opacity-100' : 'opacity-0'}`}>
        <p className="font-serif text-lg leading-snug text-ink">Throughput stays flat until network latency passes about <span className="num">{NS.flatBelowUs} µs</span>. Beyond that, <span className="text-sram-ink">SRAM</span>, split across the most cards, degrades fastest. <span style={{ color: MEM_COLOR.hbm }}>HBM</span> barely notices.</p>
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
        <>
          <p key="4">With fewer cards, each collective involves fewer participants and less traffic has to cross the slowest links, so performance depends less on the speed of the network.</p>
          <Note>Table II lists Llama-3.1 70B on a single 3D-DRAM card with {LF.dram3dMemGB} GB in total. That seems inconsistent with the roughly {LF.weightsGB} GB of 8-bit weights described in Sec I, and with the mention of TP = {LF.statedTP} on 3D-DRAM in Sec VI-D. We show Table II as printed.</Note>
        </>,
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
