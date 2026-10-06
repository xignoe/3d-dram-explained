import type { ReactNode } from 'react';
import { Chef } from '../components/ui';
import { CRITICAL as C, HIERARCHY } from '../data/paper';

const ITEMS: { title: string; body: ReactNode }[] = [
  {
    title: 'The serving results are modeled',
    body: <>The memory system was measured on silicon: its bandwidth, latency, energy and refresh overhead. The serving results (throughput, interactivity and sensitivity to the network) come from a performance model, and the thermal results come from an analytical one.</>,
  },
  {
    title: 'The baselines share Raptor’s compute logic',
    body: <>Every comparison pairs d-Matrix’s own {C.sharedComputePFLOPS} PFLOPS compute logic with a different kind of memory. That isolates the effect of the memory, which is useful, but none of the baselines is an actual GPU or another company’s chip.</>,
  },
  {
    title: 'Results are given per card',
    body: <>The paper reports performance per card. It doesn’t compare cost or total system power, so better performance per card doesn’t necessarily mean a cheaper system to run.</>,
  },
  {
    title: `${C.fastMemoryPerCardGB} GB of fast memory is still not much`,
    body: <>Each card has far less fast memory than an HBM card. Large models still need many cards, or have to rely on the slower {HIERARCHY.mcm.lpddrGB} GB of LPDDR5X on each module.</>,
  },
  {
    title: 'The batch size comes from a short simulation',
    body: <>The batch size of {C.batchSize} used throughout the evaluation is justified by a {C.simulatedSeconds}-second queueing simulation at {C.arrivalRate} requests per second. That is a reasonable choice, but real traffic is burstier and more varied.</>,
  },
];

export function S14Critical() {
  return (
    <section id="critical" aria-labelledby="critical-title" className="px-4 py-[14svh] sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1100px] border-t-[1.5px] border-ink pt-8 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <div className="flex items-end gap-4">
            <span className="section-num" aria-hidden>14</span>
            <span className="kicker pb-1.5">Limitations</span>
          </div>
          <h2 id="critical-title" className="mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.015em] lg:text-[2.6rem]">What the paper doesn’t show yet</h2>
          <p className="mt-4 text-xl italic leading-snug text-muted">None of this undermines the main idea, but it is worth knowing which results were measured and which are projections.</p>
        </div>
        <ol className="mt-10 lg:mt-0">
          {ITEMS.map((it, i) => (
            <li key={it.title} className="grid grid-cols-[2.2rem_1fr] gap-3 border-t border-line py-5 first:border-t-0 first:pt-0">
              <span className="font-serif text-2xl italic leading-none text-faint">{i + 1}</span>
              <div>
                <h3 className="text-xl font-medium leading-snug text-ink">{it.title}</h3>
                <p className="mt-1.5 text-[1.08rem] leading-relaxed text-muted">{it.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="mx-auto mt-10 max-w-[1100px] lg:pl-[calc(22rem+4rem)]">
        <Chef>To finish the analogy: the pantry has moved under the kitchen and the trips are much shorter, but it is still a fairly small pantry.</Chef>
      </div>
    </section>
  );
}
