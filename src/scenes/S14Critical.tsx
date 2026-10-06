import type { ReactNode } from 'react';
import { Chef } from '../components/ui';
import { CRITICAL as C, HIERARCHY } from '../data/paper';

const icon = (d: string) => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const ITEMS: { icon: ReactNode; title: string; body: ReactNode }[] = [
  {
    icon: icon('M4 19h16M6 16l4-6 4 3 4-7'),
    title: 'Modeled, not measured',
    body: <>The memory itself was measured on silicon: bandwidth, latency, energy and refresh. The serving results (throughput, interactivity, network sensitivity) come from a performance model, and the thermal results from an analytical one.</>,
  },
  {
    icon: icon('M9 3h6v4H9zM5 7h14v14H5zM9 11h6M9 15h6'),
    title: 'Same brain, different pantry',
    body: <>Every comparison uses d-Matrix’s own {C.sharedComputePFLOPS} PFLOPS compute logic paired with different memory. That isolates the memory question nicely, but none of the baselines is a real GPU or another vendor’s chip.</>,
  },
  {
    icon: icon('M12 3v18M7 8h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8'),
    title: 'Per card, not per dollar or per watt',
    body: <>Results are reported per card. Cost and whole-system power comparisons aren’t given, so “better per card” doesn’t automatically mean cheaper to run.</>,
  },
  {
    icon: icon('M4 7h16v10H4zM8 7v10M12 7v10M16 7v10'),
    title: `${C.fastMemoryPerCardGB} GB is still small`,
    body: <>Fast memory per card is far below HBM’s capacity. Large models still need many cards, or the slower {HIERARCHY.mcm.lpddrGB} GB LPDDR5X tier on each module.</>,
  },
  {
    icon: icon('M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'),
    title: `Batch size ${C.batchSize} rests on a simple simulation`,
    body: <>The operating batch size is justified by a {C.simulatedSeconds}-second queueing simulation at {C.arrivalRate} requests per second. Reasonable, but real traffic is burstier and more varied.</>,
  },
];

export function S14Critical() {
  return (
    <section id="critical" aria-labelledby="critical-title" className="border-t border-line/60 px-4 py-[16svh] lg:px-12">
      <div className="mx-auto max-w-[900px]">
        <p className="kicker">14 · Read this critically</p>
        <h2 id="critical-title" className="text-3xl font-semibold tracking-tight lg:text-5xl">Promising early silicon. Here’s what it doesn’t show yet.</h2>
        <p className="mt-4 max-w-[60ch] text-lg text-muted">None of this undercuts the core idea. It’s about knowing which claims are measured and which are projections.</p>
        <ul className="mt-10 space-y-3">
          {ITEMS.map((it) => (
            <li key={it.title} className="panel flex gap-4 p-5">
              {it.icon}
              <div>
                <h3 className="font-semibold text-ink">{it.title}</h3>
                <p className="mt-1 leading-relaxed text-muted">{it.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="max-w-[60ch]">
          <Chef>The chef really does get a pantry under the kitchen. It’s a faster pantry, not a magic one.</Chef>
        </div>
      </div>
    </section>
  );
}
