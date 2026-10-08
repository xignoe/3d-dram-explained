/** Plain-language definitions for underlined terms. No numbers. */
export const GLOSSARY = {
  token: 'A small piece of text, roughly a word or part of a word. Models read and write text as tokens.',
  kv: 'The KV (key–value) cache is the model’s working memory of the conversation so far. It is re-read for every new token.',
  bandwidth: 'How much data per second can move between memory and the processor.',
  capacity: 'How much data the memory can hold.',
  bank: 'A DRAM chip is divided into many banks: independent grids of storage cells that can be read in parallel.',
  channel: 'A dedicated path from a group of banks to one compute engine.',
  chunk: 'The paper calls it a “flit”: the fixed-size piece of data delivered to a compute engine in one go.',
  refresh: 'DRAM stores bits as tiny electric charges that leak away. Refresh re-writes every row before it fades.',
  dram3d: 'Memory stacked in three dimensions: here, a DRAM die bonded face to face with the processor die, so the two connect across their whole surface instead of along one edge.',
  ubump: 'Microscopic solder bumps that connect two chips stacked face to face.',
  dbi: 'Data bus inversion: sending data inverted (0s↔1s) when that means fewer wires switch, plus a flag saying so.',
  mcm: 'Multi-chip module: one package holding several chiplets.',
  chiplet: 'A small chip designed to be combined with others in one package.',
  tpot: 'Time per output token: how long each user waits for each new word. Lower is better.',
  collective: 'A group communication step where many cards exchange partial results.',
} as const;
export type GlossaryKey = keyof typeof GLOSSARY;
