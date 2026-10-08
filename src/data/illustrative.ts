/**
 * illustrative.ts — tuning for illustrations and toys ONLY.
 * Nothing here comes from the paper and nothing here is ever presented as
 * data. Paper numbers live exclusively in paper.ts.
 */

export const TOY = {
  // Scene 1: example words for the prefill/decode animation
  promptTokens: ['Why', 'is', 'decoding', 'slow', '?'],
  replyTokens: ['Every', 'new', 'word', 'needs', 'a', 'memory', 'trip', '.'],

  // Scene 4: particle counts and speeds for the trickle vs rain (3D view)
  trickleParticles: 90,
  rainParticles: 1400,
  particleSpeed: 0.35,

  // Scene 5: how many rows/columns to draw inside the zoomed-in bank (the real bank is 1,364 x 124)
  bankRowsDrawn: 26,
  bankColsDrawn: 12,
  bankColHighlighted: 4,
  zoomMs: 1100,

  // Scene 6: columns drawn per bank in the channel close-up
  channelColumnsShown: 8,
  budgetGridColumns: 32,

  // Scene 7: bit-flip toy
  wiresDrawn: 40,
  bitWidth: 64, // stands in for a 1,024-bit chunk
  bitWidthNarrow: 32, // same, on phones
  rowsShown: 12,
  tickMs: 420,
  similarFlipFraction: 0.12,

  // Scene 8: scripted fault positions for the auto demo
  scriptedFaults: [7, 16, 20],

  // Scene 9: temperatures used by the scroll script, and slider floor
  coolDemoC: 70,
  hotDemoC: 95,
  tempSliderMinC: 40,
  raceDurationMs: 6000,
  chargeRowsDrawn: 10,
  chargeCellsDrawn: 18,
  refreshSecondsPerMs: 0.25, // animation seconds per real millisecond of refresh interval
  thermoMinC: 30,
  thermoMaxC: 120,

  // Scene 13: number of draft tokens drawn (the paper calls it K)
  draftTokensShown: 4,
  pairingBeatMs: 900, // pace of the build-up animation in Scene 13
} as const;
