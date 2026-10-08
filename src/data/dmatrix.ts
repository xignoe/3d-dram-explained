/**
 * dmatrix.ts — figures from a d-Matrix presentation ("Why 3D-DRAM?" slide),
 * used only in the conclusion. These are NOT from the ISCA paper; the page labels
 * them as coming from the presentation. Paper numbers stay in paper.ts.
 */

export const PRESENTATION = {
  label: 'a d-Matrix presentation',
  slideTitle: 'Why 3D-DRAM?',
} as const;

export type Level = 'Low' | 'Low–Med' | 'Medium' | 'High';
/** Bar length for each qualitative level, as a fraction of the track (drawing only). */
export const LEVEL_FILL: Record<Level, number> = { Low: 0.25, 'Low–Med': 0.38, Medium: 0.6, High: 0.92 };

export interface MemoryCard {
  id: 'sram' | 'hbm' | 'dram3d';
  name: string;
  kind: string;
  layout: string;
  capacity: Level;
  bandwidth: Level;
  power: Level;
}

/** The slide's three-way comparison (qualitative ratings as shown on the slide). */
export const COMPARISON: MemoryCard[] = [
  { id: 'sram', name: 'SRAM', kind: 'On-die memory', layout: 'Compute and SRAM in every tile', capacity: 'Low', bandwidth: 'High', power: 'Low' },
  { id: 'hbm', name: 'HBM', kind: '2D package with an edge “beachfront”', layout: 'The on-chip network feeds HBM stacks at the edge', capacity: 'High', bandwidth: 'Low', power: 'High' },
  { id: 'dram3d', name: '3D-DRAM', kind: 'Compute stacked on memory', layout: 'Compute on DRAM, with vertical I/O', capacity: 'Medium', bandwidth: 'High', power: 'Low–Med' },
];

/** "The energy ladder": energy to move one bit, as shown on the slide. */
export const ENERGY_LADDER = [
  { what: 'SRAM (on-die)', energy: '~50 fJ', highlight: false },
  { what: 'On-chip wire', energy: '~35 fJ per mm', highlight: false },
  { what: '3D vertical I/O', energy: '0.3–0.4 pJ', highlight: true },
  { what: 'Interposer trace', energy: '~500 fJ per mm', highlight: false },
  { what: '2.5D HBM4 (system)', energy: '2.5 pJ + 3 pJ on chip', highlight: false },
] as const;

export const CLAIMS = {
  vsHBMEnergyX: 10, // slide: "3D IO lands ~10x below HBM"; "~1/10th HBM energy"
  layers3D: '≤4', // slide: "3D DRAM larger die (≤4 layers vs. 12–16 HBM)"
  layersHBM: '12–16', // slide
} as const;
