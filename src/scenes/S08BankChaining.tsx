import { useEffect, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { ProblemChips } from '../components/Problems';
import { Note, Term } from '../components/ui';
import { BANK_CHAINING as BC, BANK_BUDGET } from '../data/paper';
import { TOY } from '../data/illustrative';
import { numberWord } from '../lib/fmt';
import { P } from '../lib/palette';
import { useDesktop } from '../lib/hooks';


function scriptedFaults(step: number): number[] {
  if (step >= 1 && step <= 3) return TOY.scriptedFaults.slice(0, step);
  return [];
}

function assign(faults: Set<number>) {
  const working = BC.chainLength - [...faults].filter((i) => i < BC.chainLength).length;
  const formed = Math.min(BC.channels, Math.floor(working / BC.banksPerChannel));
  // Banks left over after the last complete channel stay unused; they can't form a channel on their own.
  const owner: (number | null)[] = Array(BC.chainLength).fill(null);
  let k = 0;
  for (let i = 0; i < BC.chainLength; i++) {
    if (faults.has(i)) continue;
    const ch = Math.floor(k / BC.banksPerChannel);
    if (ch < formed) owner[i] = ch;
    k++;
  }
  return { owner, formed };
}

function Visual({ step }: SceneState) {
  const [manual, setManual] = useState<number[] | null>(null);
  useEffect(() => setManual(null), [step]);
  const faults = new Set(manual ?? scriptedFaults(step));
  const { owner, formed } = assign(faults);
  const ok = formed === BC.channels;
  const narrow = !useDesktop();

  const toggle = (i: number) => {
    const next = new Set(faults);
    if (next.has(i)) next.delete(i); else next.add(i);
    setManual([...next].sort((a, b) => a - b));
  };

  // Layout: the chain of banks (DRAM die) at the bottom, tensor engines (logic die) on top.
  const W = narrow ? 380 : 640;
  const perRow = narrow ? Math.ceil(BC.chainLength / 2) : BC.chainLength;
  const tileW = narrow ? 24 : 20, tileH = 34, gap = narrow ? 4 : 4.4;
  const rowW = perRow * tileW + (perRow - 1) * gap;
  const bankY0 = narrow ? 210 : 230;
  const tile = (i: number) => {
    const r = Math.floor(i / perRow), c = i % perRow;
    return { x: (W - rowW) / 2 + c * (tileW + gap), y: bankY0 + r * (tileH + 30) };
  };
  const teCols = narrow ? BC.channels / 2 : BC.channels;
  const teW = narrow ? 76 : 66, teGap = narrow ? 12 : 11;
  const teRowW = teCols * teW + (teCols - 1) * teGap;
  const te = (k: number) => ({ x: (W - teRowW) / 2 + (k % teCols) * (teW + teGap), y: 40 + Math.floor(k / teCols) * 52 });
  const H = tile(BC.chainLength - 1).y + tileH + 26;

  return (
    <div className="flex h-full flex-col justify-center-safe gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className={`font-serif text-xl italic leading-snug lg:text-2xl ${ok ? 'text-dram3d' : 'text-danger'}`} aria-live="polite">
          {ok ? `All ${BC.channels} channels intact.` : `Only ${formed} of ${BC.channels} channels can form.`}
          <span className="sans ml-2 text-sm not-italic text-muted">{faults.size} faulty</span>
        </p>
        <button className="chip-btn" onClick={() => setManual([])}>Reset</button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="Chain of DRAM banks; activate a bank to toggle a fault">
        <text x={8} y={18} className="svg-label" fontStyle="italic">logic die: one tensor engine per channel</text>
        <text x={8} y={tile(BC.chainLength - 1).y + tileH + 18} className="svg-label" fontStyle="italic">DRAM die: one chain of {BC.chainLength} banks</text>
        {/* wiring from each bank to its channel's engine */}
        {Array.from({ length: BC.chainLength }, (_, i) => {
          const ch = owner[i];
          if (ch === null || faults.has(i)) return null;
          const a = tile(i), b = te(ch);
          const x1 = a.x + tileW / 2, y1 = a.y, x2 = b.x + teW / 2 + ((i % BC.banksPerChannel) - 1) * 10, y2 = b.y + 30;
          return <path key={i} d={`M${x1} ${y1} C ${x1} ${y1 - 60}, ${x2} ${y2 + 60}, ${x2} ${y2}`} fill="none" stroke={ch % 2 ? P.dramDeep : P.dram} strokeWidth={1.1} opacity={0.75} className="fade" />;
        })}
        {Array.from({ length: BC.channels }, (_, k) => {
          const b = te(k);
          const live = k < formed;
          return (
            <g key={k}>
              <rect x={b.x} y={b.y} width={teW} height={30} rx={2} fill={live ? P.te : P.paper} stroke={live ? P.ink : P.danger} strokeDasharray={live ? undefined : '4 3'} className="fade" />
              <text x={b.x + teW / 2} y={b.y + 19} textAnchor="middle" fontSize="11" fill={live ? P.ink : P.danger}>{live ? `channel ${k + 1}` : 'missing'}</text>
            </g>
          );
        })}
        {/* the chain itself */}
        {Array.from({ length: BC.chainLength }, (_, i) => {
          const a = tile(i);
          const bad = faults.has(i);
          const idle = !bad && owner[i] === null;
          const fill = bad ? P.paper : idle ? P.paper : owner[i]! % 2 ? P.dramDeep : P.dram;
          return (
            <g key={i} role="button" tabIndex={0} aria-pressed={bad}
              aria-label={`Bank ${i + 1}: ${bad ? 'faulty' : idle ? 'unused' : `in channel ${(owner[i] ?? 0) + 1}`}. Toggle fault.`}
              onClick={() => toggle(i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); } }}
              style={{ cursor: 'pointer', outline: 'none' }} className="[&:focus-visible>rect]:stroke-[2.5]">
              <rect x={a.x} y={a.y} width={tileW} height={tileH} rx={1.5} fill={fill} stroke={bad ? P.danger : idle ? P.spareInk : P.ink} strokeDasharray={idle ? '3 2' : undefined} strokeWidth={1} className="fade" />
              {!bad && !idle && [0.3, 0.5, 0.7].map((f) => <line key={f} x1={a.x + 3} x2={a.x + tileW - 3} y1={a.y + tileH * f} y2={a.y + tileH * f} stroke={P.paper} strokeOpacity={0.45} />)}
              {bad && <path d={`M${a.x + 4} ${a.y + 8} L${a.x + tileW - 4} ${a.y + tileH - 8} M${a.x + tileW - 4} ${a.y + 8} L${a.x + 4} ${a.y + tileH - 8}`} stroke={P.danger} strokeWidth={2} />}
            </g>
          );
        })}
      </svg>
      <p className="sans text-xs text-muted">Click or tab to a bank and press Enter to break it. Unused banks are drawn dashed.</p>
    </div>
  );
}

export function S08BankChaining() {
  return (
    <Scene
      id="bank-chaining"
      num={8}
      kicker="Problem 3 · Bank chaining"
      eyebrow={<ProblemChips active={2} />}
      title="Working around faulty banks"
      steps={[
        <>
          <p key="0">A die with hundreds of <Term k="bank">banks</Term> is likely to have a few that don’t work, and throwing those dies away would be expensive. Simply switching off a faulty bank isn’t a good answer either. Its channel ends up narrower than the others, and because the tensor engines consume their channels in lockstep, one narrow channel sets the pace for all of them.</p>
          <p>Raptor’s solution is to arrange the banks in chains with spares mixed in among them. These are the {BANK_BUDGET.spares} spare banks mentioned in the first problem.</p>
        </>,
        <p key="1">The figure shows one chain from the paper’s example, with <strong className="num">{BC.functional}</strong> banks and <strong className="num">{BC.redundant}</strong> spares forming <strong className="num">{BC.channels}</strong> channels of {BC.banksPerChannel}. When a bank fails, every channel after it moves over by one position.</p>,
        <p key="2">After a second fault the channels move again, and all {BC.channels} still have their full width. The reassignment is done by simple multiplexers on the logic die, next to the tensor engines, so no long wires are needed to route around the faulty banks.</p>,
        <p key="3">A third fault leaves too few working banks. With {numberWord(BC.redundant)} spares, a chain can tolerate up to <strong>{numberWord(BC.maxFaults)}</strong> faults, wherever along the chain they happen to be.</p>,
        <>
          <p key="4">You can click banks in the figure to mark them as faulty and watch the channels being reassigned.</p>
          <Note>The paper says that bank chaining recovers channels that would otherwise limit yield, but it doesn’t publish yield figures (Sec V-B).</Note>
        </>,
      ]}
      description={() => `Interactive: a row of ${BC.chainLength} bank tiles, ${BC.functional} regular and ${BC.redundant} spare, grouped into ${BC.channels} channels of ${BC.banksPerChannel}. Tapping a tile marks it faulty; channels shift past faulty banks. Up to ${BC.maxFaults} faults keep all ${BC.channels} channels intact; a third breaks one.`}
      visual={(s) => <Visual {...s} />}
      figure={() => ({ caption: <>One chain from the paper’s example: {BC.functional} banks and {BC.redundant} spares forming {BC.channels} channels of {BC.banksPerChannel}. Each bank connects to the tensor engine of the channel it belongs to; dashed tiles are banks not currently in use. Source: Sec IV-E, Fig. 8.</> })}
    />
  );
}
