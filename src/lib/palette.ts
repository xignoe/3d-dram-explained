/**
 * Print-ink palette for SVG and 3D (CSS uses the same values as tokens in index.css).
 * Memory inks are used identically everywhere: SRAM ochre, HBM slate, 3D-DRAM green.
 */
export const P = {
  paper: '#f4efe5',
  plate: '#ebe4d6',
  plate2: '#e0d7c5',
  board: '#d8ceb9',
  rule: '#cbbfa9',
  ink: '#1d1a15',
  ink2: '#4f483d',
  ink3: '#6f675a',

  sram: '#a86b12',
  sramTint: '#ead3a6',
  hbm: '#33628f',
  hbmTint: '#bccde0',
  dram: '#1f7357',
  dramMid: '#5f9e86',
  dramDeep: '#2d5f4c',
  dramTint: '#b5d4c5',

  logic: '#cfc6b4',
  logicDark: '#9a907e',
  te: '#e4d6b8',
  lpddr: '#c2a670',
  copper: '#b5774a',
  tim: '#b3aa98',
  heat: '#c4532f',
  heatCool: '#d99a5c',
  danger: '#b23a2a',
  spare: '#b5677a',
  spareInk: '#8f4458',
} as const;

/** Muted pigments for telling chunks apart in Scene 6. */
export const CHUNK_INKS = ['#5f9e86', '#d0a04a', '#9580b4', '#6c93bb', '#c67b5c', '#8ea65b'] as const;
