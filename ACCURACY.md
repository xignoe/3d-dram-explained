# Accuracy pass

## Method
1. **Single source.** Every paper number on screen is imported from `src/data/paper.ts`; components contain no paper numbers or arithmetic on them. A grep for unit-bearing literals in `src/scenes`, `src/components` and `src/three` found only axis bounds and illustration geometry.
2. **paper.ts vs PDF.** A script pulled all 116 quoted phrases from the `paper.ts` comments and searched for each one in the PDF's extracted text, after normalizing whitespace and Unicode.
   - 112 matched verbatim.
   - The other 4 were extraction artifacts: Table III's column layout, and "technol-ogy" hyphenated across a line. All 4 were confirmed by hand.
3. **Screen vs paper.ts.** I scrolled through every step of every scene and collected every number in visible text, SVG labels and screen-reader descriptions. Each one traces to a `paper.ts` constant, a labeled derived value, or a labeled illustration.
4. **Derived values** were checked against the paper's own anchors:
   - KV cache: 1.25 / 5 / 20 GB at 8K / 32K / 128K, and 10 → 320 GB.
   - Card counts: Kimi K2 on SRAM = 1,584, matching the Table II caption. Every Table II cell also satisfies the parallelism formula.
   - RowHammer: 200,000 × 44 ns = 8.8 ms.

## Things I was unsure about (and what the site does)
| # | Issue | Site behavior |
|---|---|---|
| 1 | **140 W headroom.** Sec V-C says the optimized heatsink has "headroom to ~140 W". My trace of Fig. 12b puts that line's 105 °C crossing nearer ~130 W. | Shows 140 W as stated, with no footnote (per your instruction). |
| 2 | **100 vs 105 TB/s.** 100 TB/s is the headline (Sec VII-A: "with 2 ms refresh and scrubbing"). 105 TB/s is Fig. 9 at 700 MHz. Table I gives 102.13 at 2 ms and 103.57 at 4 ms. Fig. 9's markers sit at 500/600/750/850/1000 MHz, so 700 MHz falls between measured points. | Each figure is labeled with its context, and Scene 10 notes the difference. |
| 3 | **Refresh wording.** Sec V-B says "switching from 16 ms to 4 ms costs only 1.37%", but Table I lists 1.37% as the overhead *at* 4 ms and has no 16 ms row. | Scene 9 uses Table I's framing. The 16 ms "cool" interval comes from Sec V-B's sentence; the paper doesn't state it elsewhere. |
| 4 | **Llama-70B on one 32 GB card** (Table II). This conflicts with ~70 GB of 8-bit weights (Sec I) and with TP = 4 (Sec VI-D). | Footnoted in Scene 11, as specified. |
| 5 | **Stream-flip overhead.** Fig. 7's caption says 0.8% capacity overhead, but one bit per 1,024-bit chunk is ≈0.1%. | The site says "one flag bit per 128-byte chunk" and omits the percentage. |
| 6 | **The 10 → 320 GB example (Sec III-B)** has no stated context length. | Scene 2 animates it at 64K, which reproduces the numbers exactly, and labels that as our inference. |
| 7 | **GB vs GiB.** The paper's 1.25 / 5 / 20 GB are exact only in binary GB. | The derived KV slider uses the same unit, so it lands exactly on the stated anchors. |
| 8 | **"~6× lower than HBM3"** is stated in Sec IV-D and V-A. Fig. 3 instead says 4.6× vs HBM4. | The site uses only the text's HBM3 claim. It omits Fig. 3's 4.6× / 5.6× and Sec V's 12.5× / 6.25×, because those rest on inconsistent HBM baselines. |
| 9 | **Air cooling at 106 W.** The paper says only that air keeps 63 W under 105 °C. "Over the limit at 106 W" is the direct implication, not a quoted temperature. Liquid cooling's maximum power isn't stated. | Shown as "limit not stated". |
| 10 | **Fig. 9 trend.** The sparklines use the shape traced from Fig. 9 (3 banks/channel), normalized, with no values. | Labeled "trend only, read from Fig. 9". |

## Illustration-only numbers visible on screen
- The bit-flip toy's counters and its 64-wire (32 on phones) strip.
- The bank-chaining demo's scripted fault positions.
- The temperature slider's 40 °C floor and its 70 / 95 °C demo positions.
- The "K = 4" draft tokens.

All are labeled "illustration" or are plainly UI controls. None comes from the paper. They live in `src/data/illustrative.ts`.

## Not verified
- **Reduced motion** was checked by code review only. The browser tool can't emulate `prefers-reduced-motion`.
  - The code paths are: scrub progress pinned to 1, all 3D replaced by SVG, CSS animations and transitions disabled, the race and count-ups shown as static end states, and the bit toy driven by a "Next chunk" button.
- **Lighthouse** audits only the initial viewport.
  - Scores were 99 / 100 / 100 on mobile and 100 / 100 / 100 on desktop (performance / accessibility / best practices).
  - Scroll-time frame rate was not profiled.
