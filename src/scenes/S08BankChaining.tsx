import { useEffect, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { ProblemChips } from '../components/Problems';
import { Note, Term } from '../components/ui';
import { BANK_CHAINING as BC, BANK_BUDGET } from '../data/paper';
import { TOY } from '../data/illustrative';
import { numberWord } from '../lib/fmt';

const CH_COLORS = ['#3fd6a4', '#2a9d7b'];

function scriptedFaults(step: number): number[] {
  if (step >= 1 && step <= 3) return TOY.scriptedFaults.slice(0, step);
  return [];
}

function assign(faults: Set<number>) {
  const owner: (number | null)[] = Array(BC.chainLength).fill(null);
  let k = 0;
  for (let i = 0; i < BC.chainLength; i++) {
    if (faults.has(i)) continue;
    const ch = Math.floor(k / BC.banksPerChannel);
    if (ch < BC.channels) owner[i] = ch;
    k++;
  }
  const formed = Math.min(BC.channels, Math.floor(k / BC.banksPerChannel));
  return { owner, formed };
}

function Visual({ step }: SceneState) {
  const [manual, setManual] = useState<number[] | null>(null);
  useEffect(() => setManual(null), [step]);
  const faults = new Set(manual ?? scriptedFaults(step));
  const { owner, formed } = assign(faults);
  const ok = formed === BC.channels;

  const toggle = (i: number) => {
    const next = new Set(faults);
    if (next.has(i)) next.delete(i); else next.add(i);
    setManual([...next].sort((a, b) => a - b));
  };

  return (
    <div className="flex h-full flex-col justify-center gap-4 lg:gap-6">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-medium lg:text-base ${ok ? 'text-dram3d' : 'text-danger'}`} aria-live="polite">
          {ok ? `All ${BC.channels} channels intact and identical` : `Only ${formed} of ${BC.channels} channels can form`}
          <span className="ml-2 text-muted">· {faults.size} faulty</span>
        </p>
        <button className="chip-btn" onClick={() => setManual([])}>Reset</button>
      </div>

      <div className="text-xs text-muted">One chain: {BC.functional} banks + {BC.redundant} spares. Tap any bank to break it.</div>
      <div className="grid gap-1 [grid-template-columns:repeat(var(--half),minmax(0,1fr))] lg:[grid-template-columns:repeat(var(--full),minmax(0,1fr))]"
        style={{ ['--half' as string]: Math.ceil(BC.chainLength / 2), ['--full' as string]: BC.chainLength }}>
        {Array.from({ length: BC.chainLength }, (_, i) => {
          const bad = faults.has(i);
          const ch = owner[i];
          const idle = !bad && ch === null;
          const bg = bad ? 'transparent' : idle ? 'var(--color-surface-2)' : CH_COLORS[(ch ?? 0) % 2];
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              aria-pressed={bad}
              aria-label={`Bank ${i + 1}: ${bad ? 'faulty' : idle ? 'unused spare' : `in channel ${(ch ?? 0) + 1}`}. Toggle fault.`}
              className="fade relative flex aspect-[3/5] flex-col items-center justify-end rounded-md border pb-1 text-[0.65rem] font-semibold"
              style={{ background: bg, borderColor: bad ? 'var(--color-danger)' : idle ? 'var(--color-spare)' : 'transparent', color: bad ? 'var(--color-danger)' : idle ? 'var(--color-spare)' : 'var(--color-bg)' }}
            >
              {bad ? <span className="absolute inset-0 grid place-items-center text-lg">×</span> : idle ? 'sp' : `C${(ch ?? 0) + 1}`}
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-1 text-xs text-muted">Channels presented to the tensor engines</div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${BC.channels}, minmax(0, 1fr))` }}>
          {Array.from({ length: BC.channels }, (_, k) => (
            <div key={k} className="fade rounded-md border px-1 py-2 text-center text-[0.7rem]"
              style={{ borderColor: k < formed ? 'var(--color-dram3d)' : 'var(--color-danger)', color: k < formed ? 'var(--color-dram3d)' : 'var(--color-danger)' }}>
              C{k + 1}<div className="text-[0.6rem] text-muted">{k < formed ? `${BC.banksPerChannel} banks` : 'broken'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function S08BankChaining() {
  return (
    <Scene
      id="bank-chaining"
      kicker={<><ProblemChips active={2} /><span className="block">8 · Problem 3: bank chaining</span></>}
      title="Some banks will be broken. Plan for it."
      steps={[
        <>
          <p key="0">With hundreds of <Term k="bank">banks</Term> per die, a few will come out of the factory defective. Throwing the die away is too expensive. Simply switching off a bad bank leaves its channel narrower than the rest, and because channels work in lockstep, the narrowest one slows everybody down.</p>
          <p>Raptor’s answer: chain banks in a row, with spares mixed in (that’s where the {BANK_BUDGET.spares} spares from Problem 1 went).</p>
        </>,
        <p key="1">Here is one chain from the paper’s example: <strong className="num">{BC.functional}</strong> banks plus <strong className="num">{BC.redundant}</strong> spares, forming <strong className="num">{BC.channels}</strong> channels of {BC.banksPerChannel}. When a bank fails, every channel after it simply <strong>slides over by one</strong>.</p>,
        <p key="2">A second fault, and they slide again. All {BC.channels} channels stay full width and identical, and the rewiring is just a little switching logic right next to the tensor engines, with no long detour wires.</p>,
        <p key="3">A third fault is one too many: with only {BC.redundant} spares, the chain can tolerate up to <strong>{numberWord(BC.maxFaults)}</strong> faults anywhere along it.</p>,
        <>
          <p key="4">Your turn. Tap banks to break them and watch the channels re-form.</p>
          <Note>The paper reports that bank chaining recovers channels that would otherwise limit yield, but it does not disclose absolute yield figures (Sec V-B).</Note>
        </>,
      ]}
      description={() => `Interactive: a row of ${BC.chainLength} bank tiles, ${BC.functional} regular and ${BC.redundant} spare, grouped into ${BC.channels} channels of ${BC.banksPerChannel}. Tapping a tile marks it faulty; channels shift past faulty banks. Up to ${BC.maxFaults} faults keep all ${BC.channels} channels intact; a third breaks one.`}
      visual={(s) => <Visual {...s} />}
    />
  );
}
