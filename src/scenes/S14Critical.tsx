import type { ReactNode } from 'react';
import { Chef } from '../components/ui';
import { CRITICAL as C, HIERARCHY, MEMORY } from '../data/paper';

const ITEMS: { title: string; body: ReactNode }[] = [
  {
    title: 'The serving results are modeled',
    body: <>The memory system was measured on silicon: its bandwidth, latency, energy and refresh overhead. The serving results (throughput, interactivity and sensitivity to the network) come from a performance model, and the thermal results come from an analytical one.</>,
  },
  {
    title: 'The baselines share Raptor’s compute logic',
    body: <>The SRAM and HBM baselines pair d-Matrix’s own {C.sharedComputePFLOPS} PFLOPS compute logic with a different kind of memory. That is a deliberate choice that isolates the effect of the memory. It also means the baselines are not shipping products.</>,
  },
  {
    title: 'Results are given per card',
    body: <>The paper reports performance per card. It doesn’t compare cost or total system power, so better performance per card doesn’t necessarily mean a cheaper system to run.</>,
  },
  {
    title: 'Capacity per card sits between SRAM and HBM',
    body: <>{C.fastMemoryPerCardGB} GB per card is {MEMORY.dram3d.capacityGB / MEMORY.sram.capacityGB}× the SRAM design’s capacity, while an HBM card holds {MEMORY.hbm.capacityGB / MEMORY.dram3d.capacityGB}× as much again, so large models still span many cards or use the {HIERARCHY.mcm.lpddrGB} GB LPDDR5X tier on each module. The authors report that {C.stacksInTesting} stacks are in testing, and the paper models {C.modeledCapacityX.map((x) => `${x}×`).join(' and ')} capacity variants.</>,
  },
  {
    title: 'Some results fix the batch size',
    body: <>The throughput curves sweep batch size, but the network-sensitivity results fix it at {C.batchSize}. The paper supports that choice with a queueing simulation ({C.arrivalRate} to {C.arrivalRateMax} requests per second) in which batches stay under {C.batchSize}. Heavier or burstier traffic would allow larger batches, which tends to favor higher-capacity memory such as HBM; the paper’s equal-card-count comparison explores this.</>,
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
          <p className="mt-4 text-xl italic leading-snug text-muted">None of this undermines the main idea, but it is worth knowing which results were measured and which are projections. These are our reading of the paper, not points the authors raise.</p>
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
        <Chef>To finish the analogy: the pantry has moved under the kitchen, and the trips are much shorter. The next question is how big a pantry can be built there.</Chef>
      </div>
    </section>
  );
}
