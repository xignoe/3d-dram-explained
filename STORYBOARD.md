# Raptor scrollytelling explainer — Storyboard (v2)

**Paper:** Nair et al., *Early Silicon of Raptor: The First 3D-DRAM Accelerator for Generative Inference*, ISCA 2026, DOI 10.1109/ISCA66397.2026.00183.
**Audience:** technically curious readers who know what an LLM is but are not chip architects.
**Goal:** a reader who has never heard of DRAM leaves able to explain why stacking memory under logic helps, and to name the four problems it creates.

Every number below is a key in `src/data/paper.ts`. Labels used:
- **stated**: copied from the paper.
- **derived**: our arithmetic on stated values; labeled "derived" on screen.
- **illustrative**: toy tuning in `src/data/illustrative.ts`; never shown as data.

---

## Global system

| Concern | Decision |
|---|---|
| **Palette** | *Revised after first publish:* paper editorial rather than dark. Warm paper (`#f4efe5`) with near-black ink, hairline rules, and muted print inks for the memory types, used identically everywhere: **SRAM = ochre**, **HBM = slate blue**, **3D-DRAM = green**. Tokens live in `src/index.css` and `src/lib/palette.ts`. |
| **Typography** | Newsreader (serif, variable optical size) for headlines, body and big numbers; IBM Plex Sans for labels, captions and diagram text. Both self-hosted. Oldstyle figures in prose, lining tabular figures in data. |
| **Figures** | Every sticky visual is a numbered figure (“Fig. N”) with a heavy top rule, a caption and a source line, like a printed feature. |
| **Badges** | Typographic marks in the figure heading, explained once in the hero and footer: ■ Measured on silicon (Sec V), □ Modeled (Fig. 12 thermal and all of Sec VIII), ◇ Our arithmetic. Design parameters carry no mark. |
| **Layout** | Desktop (1440): sticky visual on the right (≈58%), text steps on the left (max ~38ch, one idea per step). Mobile (390): visual pinned at the top (~52svh), steps scroll beneath as cards with a solid backing. 16px gutters, no horizontal scroll. |
| **Scroll engine** | One `<Scene>` wrapper: a ScrollTrigger pins the visual, and step `<section>`s drive a scrubbed GSAP timeline through `progress` and `activeStep`. Each scene defines `endState(step)`. |
| **Reduced motion** | When `prefers-reduced-motion` is set, ScrollTrigger scrubbing is disabled and each step renders its end state with a 0 ms crossfade. Particle and rotation loops stop. Interactive toys still work but snap instead of animating. |
| **3D** | Scenes 0, 4 and 5 use react-three-fiber with drei, loaded through `React.lazy`. While loading, if WebGL is unavailable, below 768px wide, or under reduced motion, the scene shows an equivalent hand-built SVG. That fallback is real content, not a spinner, so the page is fully readable without 3D. Canvases pause rendering (`frameloop="demand"`) when offscreen. |
| **Accessibility** | Every visual has an `aria-describedby` text description that states what it shows and its key numbers. Interactive controls are native inputs or buttons with labels. Live readouts use `aria-live="polite"`. Contrast meets AA. |
| **Metaphor** | The chef appears lightly, as a small pictogram plus one line in Scenes 0, 1, 3, 4 and 14 only. The chef cooks instantly but must fetch every ingredient. **SRAM** is a tiny countertop. **HBM** is a big pantry down the hall with one door. **3D-DRAM** is a fridge built in under the countertop, with a drawer at every workstation (revised from "a pantry under the kitchen"). |
| **Originality** | All diagrams are original compositions, not redraws of the paper's figures. All prose is fresh plain language, with at most a handful of short attributed quotes. |
| **Glossary** | Terms such as KV cache, token, bank, channel, flit/chunk, refresh and µbump get tap/hover definitions. The prose says "chunk" and the glossary maps it to the paper's "flit". |

---

## Scene 0 · Hero *(3D, design)*
- **Idea:** AI inference is limited by moving data, not by doing math.
- **Visual:** A slowly rotating exploded view of one chiplet. The logic die floats above the DRAM die, with a field of thin vertical connectors between them and faint data motes rising through. Headline and subhead sit over it, with a tiny chef pictogram and the line "The chef is fast. The walk to the pantry is not."
- **Scroll:** The dies close together and the camera eases toward a side view as the reader scrolls out. This hands off to Scene 1.
- **Interaction:** None. Rotation pauses on hover and stops under reduced motion.
- **Numbers:** `HERO.bandwidthPerCardTBs` (100 TB/s per card), shown small in the subhead. `CITATION.title`, `CITATION.venue`.
- **A11y text:** "Illustration: a computing chip stacked directly on top of a memory chip, joined by thousands of tiny vertical connectors."

## Scene 1 · Prefill vs decode *(2D)*
- **Idea:** Reading the prompt is one parallel burst. Writing the answer is a long series of one-at-a-time steps, and *every* step is a trip to memory.
- **Visual:** A row of token chips with a "memory" block at the bottom.
  - Prefill: all prompt tokens light up together, with one fat arrow to and from memory.
  - Decode: answer tokens appear one by one. Each one fires a visible round-trip packet down to memory and back, and a "trips to memory" tally ticks up.
- **Scroll:**
  - Step 1: the prompt sits waiting.
  - Step 2: prefill flashes everything at once.
  - Step 3: decode begins, slowly, then speeds up while the trips keep coming.
  - Step 4: caption, "Each new word needs the model's weights *and* its memory of the conversation so far. That memory is the KV cache."
- **Interaction:** None.
- **Numbers:** None (qualitative). Source text: `PHASES` (Sec I, II-A).

## Scene 2 · The KV cache grows *(2D, interactive, derived)*
- **Idea:** The conversation memory grows with every token *and* every user, until it's bigger than the model.
- **Visual:** A stacked "memory tank". The bottom is a fixed 70 GB weights block in grey; above it, KV cache blocks fill, one color band per user. Stated anchors appear as ticks on the side: 1.25 / 5 / 20 GB at 8K / 32K / 128K for one user.
- **Scroll:**
  - Step 1: one user, and context climbs through 8K → 32K → 128K, landing on the stated anchors.
  - Step 2: users go from 1 to 32 at a fixed context, ending on the Sec III-B example of 10 GB → 320 GB.
  - Step 3: the sliders are handed to the reader.
- **Interaction:** Two sliders, context (1K–128K, log-stepped) and users (1–32). The readout is `kvCacheGB(context, users)` with a "derived" badge and the formula "≈ 0.16 MB × tokens × users (8-bit, Llama-class 70B)". When the slider sits on a stated anchor, the readout gets a "stated in paper" tick.
- **Numbers:**
  - stated: `KV_INTRO.mbPerTokenPerUser` (0.16 MB), `KV_INTRO.anchors` (1.25 / 5 / 20 GB), `KV_INTRO.weightsGB` (70 GB), `KV_BATCH` (10 → 320 GB, batch 1 → 32).
  - derived: `kvCacheGB`, `KV_BYTES_PER_TOKEN` (163,840 B).
- **Note on screen:** the paper doesn't state the context length behind the 10 → 320 GB example. It works out to exactly 64K tokens at 8-bit, so the step-2 animation runs at 64K, captioned "our inference".

## Scene 3 · Three kinds of pantry *(2D chart, design + derived)*
- **Idea:** Today's memory forces a trade: fast-but-tiny or big-but-slow. 3D-DRAM sits in between, and is far "faster for its size" than HBM.
- **Visual:**
  - Part A: an original log–log scatter of bandwidth per card vs capacity per card with three labeled dots in the memory colors. Each dot gets its chef label: countertop, pantry down the hall, fridge under the counter.
  - Part B: a horizontal bar chart (log scale) of **bandwidth ÷ capacity**, "how many times per second the card could read its entire memory": SRAM 37,500/s, 3D-DRAM 3,125/s, HBM ~94/s.
- **Scroll:**
  - Step 1: the SRAM dot.
  - Step 2: the HBM dot.
  - Step 3: the 3D-DRAM dot.
  - Step 4: the dots morph into the bars, under a large "Derived — not a number from the paper" badge.
- **Interaction:** Hover or tap a dot or bar for the values. A footnote says all three share the same 10 PFLOPS compute logic.
- **Numbers:** stated `MEMORY` (Table III: 150 TB/s & 4 GB; 18 TB/s & 192 GB; 100 TB/s & 32 GB) and `XPU_PFLOPS` (10). Derived `fullMemoryReadsPerSecond()`.

## Scene 4 · Why stacking wins *(3D centerpiece, design + measured)*
- **Idea:** When memory sits beside the processor, all data squeezes through one narrow edge. Stacked face-to-face, the *entire surface* becomes the doorway, and each trip costs much less energy.
- **Visual:** A single 3D stage with a camera move.
  - Layout A ("HBM-style"): the processor die with memory stacks beside it. Data particles trickle through a thin bright strip along the shared edge.
  - Layout B (Raptor): the logic die lowers onto the DRAM die face-to-face, and particles fall as a dense, even rain across the whole footprint.
  - Callouts are pinned in screen space.
- **Scroll:**
  - Step 1: layout A, the trickle, with chef line "one door to the pantry".
  - Step 2: the camera swings and the dies stack.
  - Step 3: the rain, with chef line "a drawer at every station".
  - Step 4: a callout stack:
    - "36 µm between connectors"
    - "0.45 pJ per bit moved" (Measured badge)
    - "≈ 6× less energy per bit than HBM3"
- **Interaction:** A small A/B toggle to flip between layouts at any time after step 3.
- **Numbers:** `STACKING.microbumpPitchUm` (36), `STACKING.ioPJPerBit` (0.45), `STACKING.vsHBM3EnergyX` (6), `STACKING.logicProcess` (TSMC N4P). Particle counts and rates are illustrative.
- **Fallback:** a two-panel SVG (side-by-side vs stacked) with arrow density showing the same contrast.

## Scene 5 · Powers-of-ten zoom *(2D, design)*
- **Revised:** a single nested 2D drawing with a smooth zoom camera replaced the original 3D-then-SVG version, which cropped badly and jumped between styles.
- **Idea:** Raptor is nested boxes, built so that every small compute engine has its own private pipe into the memory directly beneath it.
- **Visual:** A continuous zoom with a breadcrumb at the top: **Card › MCM › Chiplet › Gang › Slice › Bank**. The first three levels are 3D (geometry and depth matter there). From Gang inward it crossfades to crisp 2D SVG, which is clearer for grids. Each level shows at most three facts in a side ledger.
- **Scroll:** one step per level:
  1. **Card**: 2–4 MCMs.
  2. **MCM**: 4 chiplets, 422 W, 8 LPDDR5X devices giving 128 GB of overflow memory.
  3. **Chiplet**: a logic die on a DRAM die with 840 banks.
  4. **Gang**: 4 per chiplet, each made of 4 slices.
  5. **Slice**: a 4×4 grid of tensor engines plus a SIMD core, with 16 channels glowing straight down.
  6. **Bank**: a 1,364 × 124 grid. One highlighted column read returns 32 bytes.
- **Interaction:** Clicking a breadcrumb scrolls to that level.
- **Numbers:** `HIERARCHY.card` (2–4), `.mcm` (4, 422 W, 8 × LPDDR5X-9600, 128 GB), `.chiplet` (840 banks, 4 gangs; 256 channels mentioned in the step text), `.gang` (4 slices), `.slice` (4×4 TEs, 1 SIMD, 16 channels), `.bank` (1,364 × 124, 32 B).

> **Bridge card before Scene 6:** "Stacking creates four new problems." The four chips (*awkward bank count*, *switching power*, *defective banks*, *heat*) stay docked at the top edge through Scenes 6–9, and each lights up while its scene is active.

## Scene 6 · Problem 1: stream blocking *(2D animated, design)*
- **Idea:** The die has too few banks for the tidy design. Instead of a messy shuffling circuit, Raptor *stores* each 128-byte chunk so it can always be read back in two simple, identical steps.
- **Visual:**
  - Part A, the budget: a field of squares, 840 banks. A ghost outline shows the 1,024 needed and the 184 shortfall is marked. 72 squares turn "spare" and the remaining 768 snap into 256 trios.
  - Part B, one channel: three bank lanes (32 B each, 96 B per read) and an incoming 128 B chunk.
    - Naive: pieces land at shifting offsets, and a 192 B shifting buffer visibly churns, with tangled arrows.
    - Stream blocking: each chunk is split into a 96 B aligned slice (one column across all three banks) plus a 32 B partial. Partials pack together in a shared region, and reads follow a fixed two-beat rhythm through small 96 B buffers.
  - Part C, sidebar: the Sec III-E example drawn as one tall bank. One Llama layer at 4K context (16 MB) becomes 1,024 tiles of 16 KB, 64 per channel, filling under 10% of each bank (~128 of 1,364 rows).
- **Scroll:**
  - Step 1: 4 banks per channel × 256 = 1,024.
  - Step 2: only 840 on the die.
  - Step 3: 72 spares leave 768, exactly 3 per channel.
  - Step 4: 96 B vs 128 B, the mismatch.
  - Step 5: the naive fix.
  - Step 6: stream blocking.
  - Step 7: Part C.
- **Interaction:** In steps 5–6, a "Naive / Stream blocking" toggle and a "next chunk" button.
- **Numbers:** `BANK_BUDGET.*` (256, 4, 1,024, 840, 72, 768, 3, 128 B, 32 B, 96 B, 2 reads), derived `BANKS_SHORT` (184), `STREAM_BLOCKING.*` (192 B, 96 B + 32 B, 96 B buffers), `LAYER_EXAMPLE.*` (16 MB, 1,024 × 16 KB, 64/channel, ~128 of 1,364 rows, <10%, FP16, 4K).

## Scene 7 · Problem 2: stream flipping *(2D interactive, measured)*
- **Idea:** Every time a wire switches between 0 and 1 it burns energy. If a chunk would flip most wires, send it upside-down and store a single flag bit, so fewer wires switch.
- **Visual:** A strip of successive 128-byte chunks drawn as rows of bits, scaled down to a toy width: 64 cells per row stand in for 1,024 bits and are labeled "illustration". Cells that differ from the row above glow, and a big "bit transitions" counter sits beside the strip. With flipping on, inverted rows get a small flag cell at the right edge.
- **Scroll:**
  - Step 1: the stakes. "At 100 TB/s, the wires alone would draw about 360 W per card."
  - Step 2: the stream runs with flipping off and the counter climbs.
  - Step 3: flipping turns on, flag bits appear, and the counter slows.
  - Step 4: the measured result as two big numbers, **0.455 → 0.376 pJ/bit**, "−18%", with a Measured badge and "no extra pins".
- **Interaction:** Stream-flipping on/off switch, a data-pattern picker (random / worst-case alternating / realistic smooth), and a pause button. The toy counter is labeled "illustration"; only the step-4 numbers come from the paper.
- **Numbers:** `STREAM_FLIPPING.ioPowerAt100TBsW` (360 W), `.atBandwidthTBs` (100), `.chunkBytes` (128), `.chunkBits` (1,024), `.flagBitsPerChunk` (1), `.reductionPct` (18), `.beforePJPerBit` (0.455), `.afterPJPerBit` (0.376).

## Scene 8 · Problem 3: bank chaining *(2D interactive, design)*
- **Idea:** Keep spare banks *in line* with the regular ones. When a bank is bad, the channels simply slide past it, so all channels stay full and identical with no detour wiring.
- **Visual:** A horizontal chain of 26 bank tiles, of which the last 2 are spares in a muted hue. Above sit 8 channel brackets, each spanning 3 working banks and tinted green. A faulty bank shows a red ×, and the brackets slide to skip it.
- **Scroll:**
  - Step 1: no faults; the brackets sit on the first 24.
  - Step 2: an auto-demo fault, and the brackets slide.
  - Step 3: a second fault, and they slide again.
  - Step 4: a third fault, and the last bracket can't form. "Limit: 2 faults per chain."
  - Step 5: the reader takes over.
- **Interaction:** Click or tap any tile to toggle it faulty. Keyboard arrows plus Enter work on the tiles. A status line reads "8 of 8 channels intact" or "only 7 channels can form". Reset button.
- **Numbers:** `BANK_CHAINING.*` (26, 24, 2, 8, 3, max 2 faults). Footnote: "The paper does not disclose absolute yield figures (Sec V-B)."

## Scene 9 · Problem 4: heat, refresh, and rowhammer *(2D interactive)*
Three beats, each with its own visual and badge.

**9a · Refresh** *(Measured)*
- **Idea:** Hot memory leaks its charge faster, so it must be refreshed more often. Raptor's banks are small, so frequent refresh barely costs anything.
- **Visual:** A temperature slider (up to 105 °C) drives a refresh-tick timeline. At or below 85 °C the ticks come every 16 ms; above 85 °C they come every 4 ms. A ghost track shows HBM's nominal 32 ms. Beside it, a small original bar chart of the Table I overhead: 1 ms → 5.46%, 2 ms → 2.70%, 4 ms → 1.37% of bandwidth.
- **Scroll:**
  - Step 1: cool, 16 ms.
  - Step 2: the slider crosses 85 °C and the interval drops to 4 ms, "8× more often than HBM's 32 ms".
  - Step 3: "Why it's cheap: each bank has only 1,364 rows, 16–32× fewer than usual."
  - Step 4: the Table I bars.
- **Numbers:** `REFRESH.*` (85 °C, 105 °C, 16 ms, 4 ms, 32 ms, 8×, 1,364, 16–32×), `TABLE1` (5.46 / 2.70 / 1.37%).

**9b · Rowhammer race** *(design)*
- **Idea:** Frequent refresh also defeats a known attack. The attacker runs out of time before they can flip a neighbour's bits.
- **Visual:** Two progress bars race on the same time axis. The attacker's bar fills toward 200,000 activations (44 ns each, 8.8 ms). The refresh bar resets every 4 ms, and the attacker's count resets with it. The attacker never reaches the threshold.
- **Interaction:** A "Run race" button that replays the race.
- **Numbers:** `ROWHAMMER.*` (200,000; 44 ns; 8.8 ms; 4 ms). Footnote: the 200K threshold "reflects an older technology node", per the paper.

**9c · Heat** *(Modeled)*
- **Idea:** Heat leaves upward through the logic die to the heatsink, so the stacked DRAM below stays slightly *cooler* than the logic. The opposite happens in HBM.
- **Visual:** An original vertical cross-section: heatsink, lid, logic die, DRAM die, with heat arrows flowing up. A label notes DRAM is ~3.5 °C cooler than the logic. Below it, a three-row comparison at 106 W per chiplet, drawn from stated anchors only, with no curves:
  - Baseline air: only ~63 W fits under 105 °C.
  - Optimized heatsink: ~93 °C peak, headroom to ~140 W.
  - Liquid: under 60 °C.
- **Numbers:** `THERMAL.*` (106 W, 105 °C, 3.5 °C, 63 W, 93 °C, 140 W, <60 °C, 80% / 1.5% resistance shares in a footnote), `ECC` as a one-line text aside.

## Scene 10 · Measured on silicon *(2D, measured)*
- **Idea:** On the real chip, at its 700 MHz target, a chunk arrives in about 2.5 ns and a card moves about 105 TB/s. Running the DRAM faster raises bandwidth and lowers latency.
- **Visual:** Two big stat tiles, **~2.5 ns** and **~105 TB/s per card**, at 700 MHz. Below them, two small trend sparklines (latency falling, bandwidth rising) over a frequency axis labeled only "500 MHz … 1 GHz", with **no y-axis values**. The curve shapes come from `FIG9_SHAPE`, normalized. A marker at 700 MHz ties the sparklines to the stat tiles.
- **Scroll:**
  - Step 1: the stat tiles count up.
  - Step 2: the sparklines draw.
  - Step 3: caption, "Each row read serves several chunks back-to-back, so opening a row is paid for once."
- **Interaction:** None.
- **Numbers:** `SILICON.*` (700 MHz, 2.5 ns, 105 TB/s, 500–1000 MHz). `FIG9_SHAPE` is shape only and labeled "trend, read from Fig. 9".
- **On-screen note:** "100 TB/s elsewhere on this page is the paper's conservative figure including refresh and scrubbing (Sec VII-A)."

## Scene 11 · Fewer cards, less chatter *(2D, derived + modeled)*
- **Idea:** More memory per card means a model fits on fewer cards. Fewer cards means smaller group conversations between them, so the network matters less.
- **Visual:**
  - Part A: card-count grids, one small square per card, in three columns (SRAM / HBM / 3D-DRAM) colored by memory type. Big numerals sit above each column, with a "derived from Table II" badge.
  - Part B: the interconnect ladder as three nested rings: on-chip network inside a chiplet → die-to-die links at 32 Gbps per lane inside an MCM → PCIe Gen 7 / Ethernet scale-up between MCMs and cards.
- **Scroll:**
  - Step 1: DeepSeek-V3, 304 / 6 / 38.
  - Step 2: Kimi K2, 1,584 (marked "stated in paper") / 10 / 54. The SRAM grid overflows the column and is drawn as a dense block with a count.
  - Step 3: "HBM uses even fewer cards, but each reads memory ~5.6× slower." *(Derived ratio 100/18; see Q2.)*
  - Step 4: the interconnect ladder.
  - Step 5: "Fewer cards → smaller collectives → less sensitive to network speed. In the paper's model, throughput is flat until network latency passes ~0.1 µs, and SRAM degrades fastest." (Modeled badge.)
- **Interaction:** A model picker covering all 7 Table II models. Hovering a grid shows the parallelism in words, e.g. "4-way attention split, 32-way expert split, 2 shared-expert cards".
- **Numbers:** derived `cardCount()` for all 7 models, `KIMI_SRAM_CARDS_STATED` (1,584), `INTERCONNECT`, `D2D_GBPS_PER_LANE` (32), `NETWORK_SENSITIVITY.flatBelowUs` (0.1).
- **Footnote:** "Table II lists Llama-3.1 70B on a single 3D-DRAM card with 32 GB total, which seems inconsistent with ~70 GB of 8-bit weights (Sec I) and with Sec VI-D's mention of TP = 4 on 3D-DRAM." Uses `LLAMA_FOOTNOTE`.

## Scene 12 · Results *(2D, modeled)*
- **Idea:** In the paper's performance model, the same compute paired with 3D-DRAM serves more tokens per card *and* answers each user faster. There is one honest exception.
- **Visual:** Three big-number tiles, each with a Modeled badge:
  - **4.71×** tokens/s per card vs HBM.
  - **2.44×** vs SRAM.
  - **9.96×** lower time per output token vs HBM.
  - Subtitle: "averaged across the paper's models".
  - Below them, a smaller "one specific scenario" row: 4K context, 0.5 µs, 1 TB/s → **4.38×** vs HBM, **3.15×** vs SRAM.
  - Finally an exception card: "Small speech models (Whisper, Canary) fit on one card with a 448-token context. There, SRAM is fastest, then 3D-DRAM, then HBM."
- **Scroll:**
  - Step 1: the three tiles count up.
  - Step 2: the scenario row.
  - Step 3: the exception card.
- **Interaction:** None.
- **Numbers:** `RESULTS.*` (4.71, 2.44, 9.96, 4K, 0.5 µs, 1 TB/s, 4.38, 3.15, 448, ranking).

## Scene 13 · Raptor plus GPUs *(2D diagram, qualitative)*
- **Idea:** Raptor can partner with GPUs, each doing the half of the job it's best at.
- **Visual:** Two original swim-lane diagrams, with a GPU lane in neutral grey and a Raptor lane in green.
  1. **Attention–FFN split:** the GPU holds the KV cache and runs attention, then hands activations to Raptor, which streams expert weights.
  2. **Speculative decoding:** Raptor drafts K tokens in quick sequential steps, then the GPU checks all K in one parallel pass.
- **Scroll:**
  - Step 1: diagram 1 animates one layer.
  - Step 2: diagram 2 animates a draft-then-verify cycle.
- **Interaction:** None.
- **Numbers:** `PAIRINGS.raptorBandwidthTBs` (~100 TB/s), shown once.

## Scene 14 · Read this critically *(removed)*
Cut at the author's request; the page now ends with Scene 13 and the footer.

## Footer
Full citation from `CITATION`: title, all 12 authors, venue, year, pages, DOI 10.1109/ISCA66397.2026.00183, and a link to the PDF. Plus: "An independent explainer. Not affiliated with or endorsed by d-Matrix." and "All illustrations are original; numbers are from the paper unless labeled *derived*."

---

## Accuracy notes carried into the build

1. **100 vs 105 TB/s.** The headline 100 TB/s is the paper's figure "with 2 ms refresh and scrubbing" (Sec VII-A). The 105 TB/s at 700 MHz is the Fig. 9 measurement, whose measured points sit at 500/600/750/850/1000 MHz, so 700 MHz falls between markers. Each value is shown with its context.
2. **Refresh wording.** Sec V-B describes "switching from 16 ms to 4 ms" as costing 1.37%. Table I instead lists 1.37% as the overhead *at* 4 ms and has no 16 ms row. Scene 9a uses Table I's framing, and the 16 ms "cool" interval comes from Sec V-B's sentence.
3. **Thermal headroom.** The text says "headroom to ~140 W" and the site shows that as stated. When I traced Fig. 12b, though, the optimized line crosses 105 °C nearer ~130 W. See Q1.
4. **Metadata overhead.** One flag bit per 1,024-bit chunk is ≈ 0.1%, but Fig. 7's caption says 0.8%. The site says "one bit per chunk" and omits the percentage.
5. **HBM comparisons.** The paper's ratios against HBM use different baselines (3.35 TB/s, 18 TB/s, and an implied ~8.4 TB/s in "12.5×"). The site uses only Table III's 18 TB/s and the stated "~6× lower energy than HBM3". It omits 12.5×, 6.25× and Fig. 3's 4.6×/5.6×.
6. **Llama-70B on one card.** Footnoted in Scene 11, as you specified.
7. **GB vs GiB.** The paper's 1.25 / 5 / 20 GB are exact in binary GB, so the derived slider uses the same unit and lands exactly on the stated anchors.
8. **"Card" composition.** The paper says 2–4 MCMs per card but never maps the evaluated 32 GB / 100 TB/s card to an MCM count. The site never multiplies per-chiplet numbers up to card level.

## Questions before I build

1. **140 W headroom (Scene 9c):** show it as stated (your spec) with a small footnote that the figure suggests closer to ~130 W? Or show it with no footnote? I recommend the footnote.
2. **"~5.6× slower" (Scene 11, step 3):** that's derived from 100 ÷ 18 TB/s. Is that OK with a "derived" badge, or should I say only "much less bandwidth per card"? I recommend the derived badge.
3. **Mobile 3D:** my plan is to always use the SVG fallbacks below 768px, not just when the device seems slow. It's the safest route to 60fps and a Lighthouse score above 90 on mobile. OK?
