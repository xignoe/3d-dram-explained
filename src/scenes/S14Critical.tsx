import type { ReactNode } from 'react';
import { Chef } from '../components/ui';
import { CRITICAL as C, HIERARCHY } from '../data/paper';

const ITEMS: { title: string; body: ReactNode }[] = [
  {
    title: 'Modeled, not measured',
    body: <>The memory itself was measured on silicon: bandwidth, latency, energy and refresh. The serving results (throughput, interactivity, network sensitivity) come from a performance model, and the thermal results from an analytical one.</>,
  },
  {
    title: 'Same brain, different pantry',
    body: <>Every comparison uses d-Matrix’s own {C.sharedComputePFLOPS} PFLOPS compute logic paired with different memory. That isolates the memory question nicely, but none of the baselines is a real GPU or another vendor’s chip.</>,
  },
  {
    title: 'Per card, not per dollar or per watt',
    body: <>Results are reported per card. Cost and whole-system power comparisons aren’t given, so “better per card” doesn’t automatically mean cheaper to run.</>,
  },
  {
    title: `${C.fastMemoryPerCardGB} GB is still small`,
    body: <>Fast memory per card is far below HBM’s capacity. Large models still need many cards, or the slower {HIERARCHY.mcm.lpddrGB} GB LPDDR5X tier on each module.</>,
  },
  {
    title: `Batch size ${C.batchSize} rests on a simple simulation`,
    body: <>The operating batch size is justified by a {C.simulatedSeconds}-second queueing simulation at {C.arrivalRate} requests per second. Reasonable, but real traffic is burstier and more varied.</>,
  },
];

export function S14Critical() {
  return (
    <section id="critical" aria-labelledby="critical-title" className="px-4 py-[14svh] sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1100px] border-t-[1.5px] border-ink pt-8 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <div className="flex items-end gap-4">
            <span className="section-num" aria-hidden>14</span>
            <span className="kicker pb-1.5">Read this critically</span>
          </div>
          <h2 id="critical-title" className="mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.015em] lg:text-[2.6rem]">Promising early silicon. Here’s what it doesn’t show yet.</h2>
          <p className="mt-4 text-xl italic leading-snug text-muted">None of this undercuts the core idea. It’s about knowing which claims are measured and which are projections.</p>
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
        <Chef>The chef really does get a pantry under the kitchen. It’s a faster pantry, not a magic one.</Chef>
      </div>
    </section>
  );
}
