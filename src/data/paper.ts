/**
 * paper.ts — the single source of truth for every number shown on the site.
 *
 * Source: P. J. Nair et al., "Early Silicon of Raptor: The First 3D-DRAM
 * Accelerator for Generative Inference", ISCA 2026, pp. 2632–2647,
 * DOI 10.1109/ISCA66397.2026.00183.
 *
 * Conventions
 * - Every value has a comment citing where it appears in the paper.
 * - STATED values are copied from the text or tables.
 * - DERIVED values are computed here from stated values, with the formula
 *   shown. The UI labels them "derived" and never presents them as paper results.
 * - TRACED values were read off a plotted figure by pixel measurement. Only
 *   FIG9_TRACED is traced, and it is used for curve *shape* only: no axis
 *   values from it are ever rendered.
 * - Components import from this file and contain no paper numbers or
 *   arithmetic on paper numbers. Illustration-only tuning (particle counts,
 *   toy bit widths) lives in illustrative.ts and is never shown as data.
 */

// ---------------------------------------------------------------------------
// Evidence badges
// ---------------------------------------------------------------------------

export type Evidence = 'measured' | 'modeled' | 'design' | 'derived';
/**
 * measured: silicon characterization (Sec V: Fig. 9, Fig. 10, Table I).
 * modeled:  analytical/performance model (Fig. 12 thermal; all of Sec VIII).
 * design:   a stated design parameter (e.g. bank counts, bump pitch).
 * derived:  arithmetic we did on stated values (always labeled on screen).
 */

// ---------------------------------------------------------------------------
// Bibliographic (footer)
// ---------------------------------------------------------------------------

export const CITATION = {
  title: 'Early Silicon of Raptor: The First 3D-DRAM Accelerator for Generative Inference', // p. 2632 title
  venue: '2026 ACM/IEEE 53rd Annual International Symposium on Computer Architecture (ISCA)', // p. 2632 header
  authors: [
    'Prashant J. Nair', 'Ramyad Hadidi', 'Subramani Ganesh', 'Sangamesh Kodge',
    'Shubhankit Rathore', 'Neil Thanawala', 'Nikitha Reddy', 'Gyanesh Saharia',
    'Vinayak Patankar', 'Arun Tiruvur', 'Nithesh Kurella', 'Sudeep Bhoja',
  ], // p. 2632 byline
  affiliations: ['d-Matrix Inc.', 'University of British Columbia'], // p. 2632 byline
  doi: '10.1109/ISCA66397.2026.00183', // p. 2632 footer
  pages: '2632–2647', // printed page numbers
  year: 2026, // p. 2632 header
  pdfUrl: 'https://ramyadhadidi.github.io/files/dMatrix-Raptor-ISCA.pdf', // provided by user
} as const;

// ---------------------------------------------------------------------------
// The four integration challenges (bridge card before Scenes 6–9)
// ---------------------------------------------------------------------------

export const PROBLEMS = [
  { short: 'Mapping data to banks', paper: 'workload-aware mapping to exploit parallelism', scene: 'stream-blocking' }, // Abstract (1)
  { short: 'Switching energy', paper: 'power optimization without burst-based data bus inversion (DBI)', scene: 'stream-flipping' }, // Abstract (2)
  { short: 'Faulty banks', paper: 'resilience with high bank counts', scene: 'bank-chaining' }, // Abstract (3)
  { short: 'Heat and refresh', paper: 'thermal reliability at elevated junction temperatures', scene: 'heat' }, // Abstract (4)
] as const;

// ---------------------------------------------------------------------------
// Scene 0 · Hero
// ---------------------------------------------------------------------------

export const HERO = {
  claim: 'Generative inference is largely memory-bound', // Abstract (paraphrase source)
  bandwidthPerCardTBs: 100, // Abstract ("sustaining up to 100 TB/s per card")
} as const;

// ---------------------------------------------------------------------------
// Scene 1 · Prefill vs decode (Sec I, II-A) — qualitative, no numbers needed
// ---------------------------------------------------------------------------

export const PHASES = {
  prefill: 'compute-bound, large parallel matrix multiplications', // Sec I, II-A
  decode: 'one token at a time; each step reads and writes the KV cache', // Sec I, II-A
} as const;

// ---------------------------------------------------------------------------
// Scene 2 · The KV cache grows (Sec I, Sec III-B)
// ---------------------------------------------------------------------------

/** Llama-class 70B example from the Introduction (8-bit KV storage). */
export const KV_INTRO = {
  modelLabel: 'Llama-class 70B', // Sec I ("For a Llama-class 70B-parameter model")
  precisionLabel: '8-bit', // Sec I ("at 8-bit precision", "8-bit storage")
  layers: 80, // Sec I ("With 80 layers")
  kvHeads: 8, // Sec I ("roughly 8 KV heads")
  headDim: 128, // Sec I ("head dimension ~128")
  bytesPerElement: 1, // Sec I ("8-bit storage")
  mbPerTokenPerUser: 0.16, // Sec I ("about 0.16MB per token per user")
  weightsGB: 70, // Sec I ("weights occupy about 70GB at 8-bit precision")
  anchors: [
    { label: '8K', tokens: 8192, gb: 1.25 }, // Sec I ("nearly 1.25GB at 8K")
    { label: '32K', tokens: 32768, gb: 5 }, // Sec I ("5GB at 32K")
    { label: '128K', tokens: 131072, gb: 20 }, // Sec I ("20GB at 128K per user per session")
  ],
} as const;

/** Sec III-B: KV growth with concurrency (context/precision not stated). */
export const KV_BATCH = {
  batch1GB: 10, // Sec III-B ("from 10GB (batch = 1)")
  batch32GB: 320, // Sec III-B ("to 320GB (batch = 32)")
  batchLow: 1, // Sec III-B
  batchHigh: 32, // Sec III-B
} as const;

/** DERIVED: KV bytes per token per user = 2 (K and V) x layers x heads x headDim x bytes. */
export const KV_BYTES_PER_TOKEN = 2 * KV_INTRO.layers * KV_INTRO.kvHeads * KV_INTRO.headDim * KV_INTRO.bytesPerElement; // = 163,840 B ≈ 0.16 MB (Sec I)

/**
 * DERIVED: KV cache size in the paper's "GB" for a context and user count.
 * The paper's anchors (1.25 / 5 / 20 GB) equal tokens x 163,840 B expressed in
 * binary gigabytes (2^30 B), so we use the same unit to match them exactly.
 */
export function kvCacheGB(contextTokens: number, users: number): number {
  return (KV_BYTES_PER_TOKEN * contextTokens * users) / 2 ** 30;
}

/**
 * DERIVED (our inference): the context length behind Sec III-B's example.
 * 10 GB at batch 1 ÷ 163,840 B per token = exactly 65,536 tokens (64K) at 8-bit,
 * and 64K x 32 users gives exactly the stated 320 GB. The paper does not state it.
 */
export const KV_BATCH_INFERRED_CONTEXT = (KV_BATCH.batch1GB * 2 ** 30) / KV_BYTES_PER_TOKEN; // = 65,536

/** Slider ranges for Scene 2 (chosen to span the paper's stated examples). */
export const KV_SLIDERS = {
  contextMin: 1024, // Fig. 2 legend smallest context (1K)
  contextMax: 131072, // Sec I largest example (128K)
  usersMin: KV_BATCH.batchLow, // Sec III-B
  usersMax: KV_BATCH.batchHigh, // Sec III-B
} as const;

// ---------------------------------------------------------------------------
// Scene 3 · Three kinds of pantry (Table III)
// ---------------------------------------------------------------------------

export type MemoryId = 'sram' | 'hbm' | 'dram3d';

export const MEMORY = {
  sram: { label: 'SRAM', bandwidthTBs: 150, capacityGB: 4 }, // Table III ("XPU + SRAM 150 | 4 | 10")
  hbm: { label: 'HBM', bandwidthTBs: 18, capacityGB: 192 }, // Table III ("HBM 18 | 192 | 10")
  dram3d: { label: '3D-DRAM', bandwidthTBs: 100, capacityGB: 32 }, // Table III ("RP + 3D-DRAM 100 | 32 | 10")
} as const satisfies Record<MemoryId, { label: string; bandwidthTBs: number; capacityGB: number }>;

export const XPU_PFLOPS = 10; // Table III caption ("fixed at 10 PFLOPS")

/**
 * DERIVED: how many times per second a card could read its entire memory
 * = bandwidth / capacity (TB/s ÷ GB, with 1 TB = 1000 GB as Table III's units imply).
 * SRAM 37,500/s; HBM ~94/s; 3D-DRAM 3,125/s. Not a number from the paper.
 */
export function fullMemoryReadsPerSecond(id: MemoryId): number {
  return (MEMORY[id].bandwidthTBs * 1000) / MEMORY[id].capacityGB;
}

// ---------------------------------------------------------------------------
// Scene 4 · Why stacking wins (Sec I, III-D, IV-B, IV-D)
// ---------------------------------------------------------------------------

export const STACKING = {
  microbumpPitchUm: 36, // Sec IV-B ("36 µm-pitch µbump array")
  ioPJPerBit: 0.45, // Sec IV-D ("reduce per-bit I/O energy to 0.45 pJ/bit")
  vsHBM3EnergyX: 6, // Sec IV-D ("~6x lower than HBM3")
  logicProcess: 'TSMC N4P', // Sec I, IV-B
  bonding: 'face-to-face (F2F)', // Sec I, IV-B
  bitsPerBumpPerCycle: 1, // Sec I(ii) ("one bit per µbump per cycle")
  hbm4InterfaceBits: 2048, // Sec III-D ("HBM4 doubles the interface width to 2,048 bits")
  c4MinPitchUm: 110, // Sec IV-B ("mixed-pitch C4 bumps (minimum 110µm)")
  interposer: 'CoWoS interposer', // Sec IV-B ("a 3D CoWoS interposer")
  substrate: 'organic substrate', // Sec IV-B ("a 9-4-9 organic substrate")
} as const;

// ---------------------------------------------------------------------------
// Scene 5 · Powers-of-ten zoom (Sec IV-A, IV-B, IV-C)
// ---------------------------------------------------------------------------

export const HIERARCHY = {
  card: {
    mcmsMin: 2, // Sec IV-A ("2-4 multi-chip modules")
    mcmsMax: 4, // Sec IV-A, IV-B ("up to four identical MCMs")
  },
  mcm: {
    chiplets: 4, // Sec IV-A
    powerW: 422, // Sec I, IV-B ("~422 W")
    lpddrDevices: 8, // Sec IV-B ("eight on-package LPDDR5X-9600 devices")
    lpddrType: 'LPDDR5X-9600', // Sec IV-B
    lpddrGB: 128, // Sec IV-B ("128 GB per MCM as a secondary memory tier")
  },
  chiplet: {
    clockGHz: 1.2, // Sec IV-A ("four 1.2 GHz chiplets")
    gangs: 4, // Sec IV-A
    banks: 840, // Sec IV-A(c), IV-B, Fig. 4
    channels: 256, // Sec IV-A(c)
  },
  gang: {
    slices: 4, // Sec IV-A
  },
  slice: {
    teRows: 4, // Sec IV-A ("4x4 tensor-engine (TE) array")
    teCols: 4, // Sec IV-A
    simdCores: 1, // Sec IV-A ("and a SIMD core")
    channels: 16, // Sec IV-A(c), IV-C(1)
  },
  bank: {
    rows: 1364, // Sec IV-C ("1364 x 124 array")
    columns: 124, // Sec IV-C
    bytesPerColumnRead: 32, // Sec IV-C ("each column access returns 256 bits (32 B)")
  },
} as const;

// ---------------------------------------------------------------------------
// Scene 6 · Problem 1: stream blocking (Sec IV-C, Sec III-E)
// ---------------------------------------------------------------------------

export const BANK_BUDGET = {
  channelsPerChiplet: 256, // Sec IV-C(1)
  banksPerChannelIdeal: 4, // Sec IV-C(1) ("requires four co-accessed banks")
  banksNeeded: 1024, // Sec IV-C(1) ("require 1024 banks")
  banksOnDie: 840, // Sec IV-C(1) ("the die implements only 840")
  spares: 72, // Sec IV-C(1) ("After reserving 72 as spares")
  usable: 768, // Sec IV-C(1) ("768 remain")
  banksPerChannel: 3, // Sec IV-C(1) ("resulting in three per channel")
  chunkBytes: 128, // Sec IV-C(1) ("a 128 B flit")
  bytesPerBankRead: 32, // Sec IV-C(1)
  bytesPerThreeBankRead: 96, // Sec IV-C(1) ("Three co-accessed banks return 96 B")
  readsPerChunk: 2, // Sec IV-C(1) ("requires two accesses")
} as const;

/** DERIVED: banks short of the "clean" 4-per-channel design (1,024 − 840). */
export const BANKS_SHORT = BANK_BUDGET.banksNeeded - BANK_BUDGET.banksOnDie; // = 184

export const STREAM_BLOCKING = {
  naiveBufferBytes: 192, // Sec IV-C(2) ("buffer 192 B")
  alignedBytes: 96, // Sec IV-C(3) ("a 96 B aligned portion")
  partialBytes: 32, // Sec IV-C(3) ("a 32 B partial")
  smallBufferBytes: 96, // Sec IV-C(3) ("small buffers (96 B each)")
} as const;

/** DERIVED: one 96 B read of the partial region caches the 32 B partials of 3 consecutive chunks
 *  (Sec IV-C(3): "caching 96 B of 32 B fragments for consecutive flits"). 96 / 32 = 3. */
export const CHUNKS_PER_PARTIAL_READ = STREAM_BLOCKING.smallBufferBytes / STREAM_BLOCKING.partialBytes;

/** Sec III-E worked example: one Llama-3.1-70B attention layer, FP16, 4K context. */
export const LAYER_EXAMPLE = {
  model: 'Llama-3.1-70B', // Sec III-E ("one attention layer of Llama-3.1-70B")
  bytesPerTokenKB: 4, // Sec III-E ("2 x 8 x 128 x 2 B = 4 KB")
  contextLabel: '4K', // Sec III-E
  layerMB: 16, // Sec III-E ("a 16 MB layer cache at 4K context")
  tiles: 1024, // Sec III-E ("1,024 stream-blocked tiles")
  tileKB: 16, // Sec III-E ("of 16 KB")
  channels: 16, // Sec III-E ("the slice's 16 channels")
  tilesPerChannel: 64, // Sec III-E ("64 tiles/channel")
  rowsUsed: 128, // Sec III-E ("~128 of 1364 rows per bank")
  rowsTotal: 1364, // Sec III-E
  fillLabel: 'less than 10%', // Sec III-E ("(<10%)")
  precision: 'FP16', // Sec III-E
  pageKBMin: 4, // Sec III-E ("matches paged-attention page sizes (≥4 KB)")
} as const;

// ---------------------------------------------------------------------------
// Scene 7 · Problem 2: stream flipping (Sec I(ii), IV-D, V-A, Fig. 7, Fig. 10)
// ---------------------------------------------------------------------------

export const STREAM_FLIPPING = {
  chunkBytes: 128, // Sec IV-D ("128 B flit")
  chunkBits: 1024, // Fig. 7 ("1024 Bit (128Byte) Data")
  flagBitsPerChunk: 1, // Sec IV-D ("a single metadata bit per flit")
  ioPowerAt100TBsW: 360, // Sec IV-D ("~360 W in 3D-DRAM I/O alone")
  atBandwidthTBs: 100, // Sec IV-D ("At 100 TB/s")
  reductionPct: 18, // Sec IV-D, V-A ("18% reduction")
  beforePJPerBit: 0.455, // Sec V-A ("0.455 pJ/bit (100% switching)") — measured, 8 banks
  afterPJPerBit: 0.376, // Sec V-A ("yielding 0.376 pJ/bit") — measured, 8 banks
  effectiveSwitching: '40–48%', // Sec V-A
  noPinChange: true, // Sec IV-D ("without changes to the DRAM PHY")
  measuredAtMHz: 500, // Fig. 10 caption ("Measured I/O energy vs. number of active banks at 500 MHz")
  banksAtResult: 8, // Sec V-A ("At 8 banks, the worst-case energy is 0.455 pJ/bit")
  evidence: 'measured' as Evidence, // Fig. 10 ("Measured I/O energy")
} as const;

// ---------------------------------------------------------------------------
// Scene 8 · Problem 3: bank chaining (Sec IV-E, Fig. 8, Sec V-B)
// ---------------------------------------------------------------------------

export const BANK_CHAINING = {
  functional: 24, // Sec IV-E(3A) ("N=24")
  redundant: 2, // Sec IV-E(3A) ("M=2")
  chainLength: 26, // Sec IV-E(3A) ("a chain of 26")
  channels: 8, // Sec IV-E(3A) ("eight channels")
  banksPerChannel: 3, // Sec IV-E(3A) ("of three banks each")
  maxFaults: 2, // Sec IV-E(3A) ("tolerating up to two faulty banks")
  yieldDisclosed: false, // Sec V-B ("we cannot disclose absolute yield figures")
} as const;

// ---------------------------------------------------------------------------
// Scene 9 · Problem 4: heat, refresh, rowhammer (Sec IV-E, V-B, V-C, Table I, Fig. 12)
// ---------------------------------------------------------------------------

export const REFRESH = {
  hotThresholdC: 85, // Sec V-B ("required at Tj > 85°C")
  maxJunctionC: 105, // Sec I, IV-B, IV-E(3B)
  coolIntervalMs: 16, // Sec V-B ("switching from 16 ms to 4 ms refresh"); the paper's comparison point, not a stated operating mode
  evalIntervalMs: 2, // Sec VII-A ("100 TB/s of bandwidth (with 2 ms refresh and scrubbing)")
  hotIntervalMs: 4, // Sec IV-E(3B), V-B
  hbmNominalMs: 32, // Sec IV-E(3B) ("nominal 32 ms refresh used in HBM devices")
  moreFrequentX: 8, // Sec IV-E(3B) ("8x more frequent")
  rowsPerBank: 1364, // Sec IV-E(3B)
  fewerRowsLabel: '16–32×', // Sec IV-E(3B), V-B ("16–32x fewer rows")
  fewerRowsMin: 16, // Sec IV-E(3B)
  fewerRowsMax: 32, // Sec IV-E(3B)
  evidence: 'measured' as Evidence, // Table I ("measured refresh-induced bandwidth loss", Sec V-B)
} as const;

/**
 * DERIVED from Sec V-B's wording ("switching from 16 ms to 4 ms refresh (required
 * at Tj > 85°C)"): the refresh interval the paper implies for a junction temperature.
 */
export function refreshIntervalMs(tempC: number): number {
  return tempC > REFRESH.hotThresholdC ? REFRESH.hotIntervalMs : REFRESH.coolIntervalMs;
}

export const TABLE1_FREQ_MHZ = 700; // Table I caption ("Refresh overhead at 700MHz")

/** Table I: refresh overhead at 700 MHz (measured). */
export const TABLE1 = [
  { intervalMs: 1, overheadPct: 5.46, bandwidthTBs: 99.2628 }, // Table I (0.0546)
  { intervalMs: 2, overheadPct: 2.7, bandwidthTBs: 102.1314 }, // Table I (0.0270)
  { intervalMs: 4, overheadPct: 1.37, bandwidthTBs: 103.5657 }, // Table I (0.0137)
] as const;

export const ROWHAMMER = {
  threshold: 200_000, // Sec V-B ("RowHammer threshold of 200K")
  thresholdNote: 'reflects an older technology node', // Sec V-B ("as we use an older technology node")
  tRCns: 44, // Sec V-B ("tRC = 44 ns")
  attackMs: 8.8, // Sec V-B ("take 8.8 ms")
  refreshMs: 4, // Sec V-B
} as const;

/** DERIVED: activations an attacker can issue since the last refresh, at time tMs (resets every refresh). */
export function activationsSinceRefresh(tMs: number): number {
  const sinceRefreshMs = tMs % ROWHAMMER.refreshMs;
  return Math.floor((sinceRefreshMs * 1e6) / ROWHAMMER.tRCns); // ms -> ns
}
/** DERIVED: the most activations possible inside one refresh window (4 ms ÷ 44 ns ≈ 90,909). */
export const MAX_ACTIVATIONS_PER_WINDOW = Math.floor((ROWHAMMER.refreshMs * 1e6) / ROWHAMMER.tRCns);

export const THERMAL = {
  evidence: 'modeled' as Evidence, // Fig. 12 caption ("analytical resistor-network model")
  chipletW: 106, // Sec V-C ("~106 W per chiplet")
  mcmW: 422, // Sec V-C ("422 W per MCM ÷ 4 chiplets")
  limitC: 105, // Sec V-C, Fig. 12b
  dramCoolerC: 3.5, // Sec V-C ("keeps the DRAM ~3.5°C cooler")
  coolingShareRthetaPct: 80, // Sec V-C ("~80% of total thermal resistance")
  dieStackShareRthetaPct: 1.5, // Sec V-C ("adds only ~1.5%")
  cooling: [
    { id: 'air', label: 'Baseline air', rTheta: 0.16, ambientC: 55, maxChipletW: 63 }, // Sec V-C ("only 63 W per chiplet stays below the 105°C limit")
    { id: 'opt', label: 'Optimized heatsink', rTheta: 0.1, ambientC: 35, peakAt106C: 93, headroomW: 140 }, // Sec V-C ("peak Tj of ~93°C at 106 W ... headroom to ~140 W")
    { id: 'liquid', label: 'Liquid cooling', rTheta: 0.02, belowC: 60 }, // Sec V-C ("Tj < 60°C at 106 W"); ambient not stated
  ],
} as const;

export const ECC = {
  code: '[144, 140] Reed–Solomon', // Sec IV-E(3C)
  columns: 8, // Sec IV-E(3C) ("The last eight columns")
} as const;

// ---------------------------------------------------------------------------
// Scene 10 · Measured on silicon (Sec V-1, Fig. 9)
// ---------------------------------------------------------------------------

export const SILICON = {
  evidence: 'measured' as Evidence, // Fig. 9 caption ("(measured)")
  designMHz: 700, // Sec V-1, Fig. 10 caption ("The design target frequency is 700 MHz")
  flitLatencyNs: 2.5, // Sec V-1 ("2.5ns average flit latency")
  bandwidthPerCardTBs: 105, // Sec V-1 ("105TB/s of 3D-DRAM bandwidth per card")
  freqMinMHz: 500, // Sec V-1 ("from 500MHz to 1GHz")
  freqMaxMHz: 1000, // Sec V-1
} as const;

/**
 * Fig. 9 — TRACED, used for curve SHAPE ONLY (no axis values rendered).
 * Markers sit at 500/600/750/850/1000 MHz; the 700 MHz anchor in SILICON is
 * stated in the text and falls between markers. Values normalized 0–1 per panel.
 */
export const FIG9_SHAPE = {
  freqsMHz: [500, 600, 750, 850, 1000], // Fig. 9 marker positions (traced)
  latency3Bank: [1, 0.72, 0.38, 0.2, 0], // Fig. 9a 3 banks/channel, normalized (traced)
  bandwidth3Bank: [0, 0.2, 0.56, 0.71, 1], // Fig. 9b 3 banks/channel, normalized (traced)
} as const;

/** Linear interpolation along the traced Fig. 9 shape (normalized 0–1). Shape only. */
export function fig9ShapeAt(series: 'latency3Bank' | 'bandwidth3Bank', freqMHz: number): number {
  const xs = FIG9_SHAPE.freqsMHz;
  const ys = FIG9_SHAPE[series];
  for (let i = 0; i < xs.length - 1; i++) {
    if (freqMHz <= xs[i + 1]) {
      const t = (freqMHz - xs[i]) / (xs[i + 1] - xs[i]);
      return ys[i] + t * (ys[i + 1] - ys[i]);
    }
  }
  return ys[ys.length - 1];
}

// ---------------------------------------------------------------------------
// Scene 11 · Fewer cards, less chatter (Table II, Sec VI)
// ---------------------------------------------------------------------------

/** Table II cell: <Attn-TP | FFN-TP | EP | SE | PP, mode, memGB>. */
export interface DeployCell {
  attnTP: number; ffnTP: number; ep: number; se: number; pp: number;
  mode: 'U' | 'D'; memGB: number;
}
const cell = (attnTP: number, ffnTP: number, ep: number, se: number, pp: number, mode: 'U' | 'D', memGB: number): DeployCell =>
  ({ attnTP, ffnTP, ep, se, pp, mode, memGB });

/** Table II, the three memory-technology columns (ablation columns omitted; unused on site). */
export const TABLE2: Record<string, Record<MemoryId, DeployCell>> = {
  'Llama-3.1 70B': { sram: cell(8, 8, 1, 0, 4, 'U', 128), hbm: cell(1, 1, 1, 0, 1, 'U', 192), dram3d: cell(1, 1, 1, 0, 1, 'U', 32) }, // Table II row 1
  'GPT-OSS 20B': { sram: cell(2, 1, 8, 0, 1, 'D', 40), hbm: cell(1, 1, 1, 0, 1, 'D', 384), dram3d: cell(1, 1, 1, 0, 1, 'D', 64) }, // Table II row 2
  'GPT-OSS 120B': { sram: cell(8, 1, 32, 0, 1, 'D', 160), hbm: cell(1, 1, 1, 0, 1, 'D', 384), dram3d: cell(1, 1, 4, 0, 1, 'D', 160) }, // Table II row 3
  'DeepSeek-V3 671B': { sram: cell(8, 1, 64, 4, 4, 'D', 1216), hbm: cell(1, 1, 4, 1, 1, 'D', 1152), dram3d: cell(4, 1, 32, 2, 1, 'D', 1216) }, // Table II row 4
  'Kimi K2 1T': { sram: cell(8, 1, 384, 4, 4, 'D', 6336), hbm: cell(1, 1, 8, 1, 1, 'D', 1920), dram3d: cell(4, 1, 48, 2, 1, 'D', 1728) }, // Table II row 5
  'Canary 1B': { sram: cell(1, 1, 1, 0, 1, 'U', 4), hbm: cell(1, 1, 1, 0, 1, 'U', 192), dram3d: cell(1, 1, 1, 0, 1, 'U', 32) }, // Table II row 6
  'Whisper': { sram: cell(1, 1, 1, 0, 1, 'U', 4), hbm: cell(1, 1, 1, 0, 1, 'U', 192), dram3d: cell(1, 1, 1, 0, 1, 'U', 32) }, // Table II row 7
};

/**
 * DERIVED: cards = total memory ÷ per-card capacity (Table II caption defines
 * memGB as "total cards x per-card capacity"). Verified: Kimi K2 on SRAM gives
 * 1,584, matching the caption. Every cell also satisfies
 * cards = (Attn-TP + EP + SE) x PP (disaggregated) or Attn-TP x PP (unified).
 */
export function cardCount(model: string, mem: MemoryId): number {
  return TABLE2[model][mem].memGB / MEMORY[mem].capacityGB;
}
export const KIMI_SRAM_CARDS_STATED = 1584; // Table II caption ("1,584 cards x 4 GB = 6336 GB")

export const INTERCONNECT = [
  { level: 'Inside a chiplet', link: 'custom on-chip network (NoC)', connects: '4 gangs' }, // Sec VI-A
  { level: 'Inside an MCM', link: 'die-to-die (D2D) links, 32 Gbps per lane', connects: '4 chiplets' }, // Sec IV-A(c), VI-A
  { level: 'Between MCMs / cards', link: 'PCIe Gen 7 or Ethernet Scale-Up Network (ESUN)', connects: 'every MCM to every switch tray' }, // Sec VI-A
] as const;
export const D2D_GBPS_PER_LANE = 32; // Sec IV-A(c), VI-A

export const NETWORK_SENSITIVITY = {
  flatBelowUs: 0.1, // Sec VIII-C ("tok/s/card is flat below 0.1µs")
  sramDegradesFastest: true, // Sec VIII-C ("SRAM degrades fastest")
  hbmInsensitive: true, // Sec VIII-C ("HBM ... is largely insensitive")
} as const;

/** Inconsistency footnote inputs for Scene 11. */
export const LLAMA_FOOTNOTE = {
  dram3dCards: 1, // Table II (Llama-3.1 70B, 3D-DRAM: 1|1|1|0|1, U, 32)
  dram3dMemGB: 32, // Table II
  weightsGB: 70, // Sec I ("about 70GB at 8-bit precision")
  statedTP: 4, // Sec VI-D ("TP = 4 for Llama-70B vs. TP = 8 for SRAM")
  statedSramTP: 8, // Sec VI-D
} as const;

// ---------------------------------------------------------------------------
// Scene 12 · Results (Abstract, Sec I, Sec VIII) — all MODELED
// ---------------------------------------------------------------------------

export const RESULTS = {
  evidence: 'modeled' as Evidence, // Sec VII-A (performance model, decode phase)
  throughputVsHBM: 4.71, // Abstract, Sec I ("4.71x higher tok/s/card than HBM")
  throughputVsSRAM: 2.44, // Abstract ("2.44x higher throughput than ... SRAM")
  tpotLowerVsHBM: 9.96, // Sec I ("9.96x lower TPOT")
  scenario: {
    contextLabel: '4K', // Sec VIII-C ("at 4K context")
    latencyUs: 0.5, // Sec VIII-C ("0.5 µs")
    bandwidthTBs: 1, // Sec VIII-C ("1 TB/s")
    vsHBM: 4.38, // Sec VIII-C ("improves tok/s/card by 4.38x over HBM")
    vsSRAM: 3.15, // Sec VIII-C ("and 3.15x over SRAM")
  },
  speechException: {
    models: ['Whisper', 'Canary-1B'], // Sec VIII-D(3)
    contextTokens: 448, // Sec VIII-D(3) ("short context (448 tokens)")
    ranking: ['SRAM', '3D-DRAM', 'HBM'], // Sec VIII-D(3) ("SRAM delivers the highest tok/s/card, followed by 3D-DRAM, then HBM")
  },
} as const;

// ---------------------------------------------------------------------------
// Scene 13 · Raptor plus GPUs (Sec IX) — qualitative
// ---------------------------------------------------------------------------

export const PAIRINGS = {
  raptorBandwidthTBs: 100, // Sec IX ("Raptor's ~100 TB/s 3D-DRAM substrate")
  afd: { gpu: 'attention (KV cache fits in HBM capacity)', raptor: 'expert / FFN layers (bandwidth-bound weight loading)' }, // Sec IX(1)
  spec: { raptor: 'draft model: K fast sequential steps (memory-bound)', gpu: 'verify K tokens in one parallel pass (compute-bound)' }, // Sec IX(2)
} as const;

/** Table V / Sec X: comparison with recent 3D and processing-in-memory designs. */
export const PRIOR_WORK = [
  { name: 'H2-LLM', bandwidth: '0.4 TB/s', validation: 'simulation' }, // Table V ("Effective BW 0.4 TB/s", "Validation Simulation")
  { name: 'Stratum', bandwidth: '~10–35 TB/s', validation: 'simulation' }, // Table V ("∼10–35 TB/s *", estimated effective system bandwidth)
  { name: 'Raptor', bandwidth: '100 TB/s', validation: 'silicon test chip' }, // Table V ("100 TB/s (Unified)", "Silicon Test Chip")
] as const;

// ---------------------------------------------------------------------------
// Small derived helpers used by interactive controls
// ---------------------------------------------------------------------------

/** DERIVED: context slider stops, doubling from KV_SLIDERS.contextMin to .contextMax (1K…128K). */
export function kvContextSteps(): number[] {
  const steps: number[] = [];
  for (let t = KV_SLIDERS.contextMin; t <= KV_SLIDERS.contextMax; t *= 2) steps.push(t);
  return steps;
}

/** DERIVED: a token count as the paper writes it ("8K", "128K"). */
export function contextLabel(tokens: number): string {
  return `${tokens / 1024}K`;
}
