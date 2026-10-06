import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGateSignals } from '../components/Gate3D';

const GRID = 8; // sample points per side
const MAX_FRAMES = 90; // give up and fall back after this many frames with nothing drawn

/**
 * Checks that the canvas really shows something: after a few frames it samples
 * a grid of pixels and reports `ready` once any of them is non-transparent.
 * Some browser/GPU combinations create a WebGL context but draw nothing; in that
 * case (or if the context is lost) it reports a failure so the SVG stays up.
 * Needs the renderer's `preserveDrawingBuffer` so the last frame can be read.
 */
export function RenderProbe() {
  const { gl } = useThree();
  const { ready, fail } = useGateSignals();
  const frames = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => { e.preventDefault(); fail('WebGL context lost'); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, fail]);

  useFrame(() => {
    if (done.current) return;
    frames.current += 1;
    if (frames.current < 3) return;
    const ctx = gl.getContext();
    const w = ctx.drawingBufferWidth, h = ctx.drawingBufferHeight;
    if (w > 1 && h > 1) {
      const px = new Uint8Array(4);
      for (let i = 1; i < GRID; i++) {
        for (let j = 1; j < GRID; j++) {
          ctx.readPixels(Math.floor((w * i) / GRID), Math.floor((h * j) / GRID), 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
          if (px[3] > 0) {
            done.current = true;
            ready();
            return;
          }
        }
      }
    }
    if (frames.current > MAX_FRAMES) {
      done.current = true;
      fail(w > 1 && h > 1 ? `nothing drawn (${w}×${h})` : `canvas has no size (${w}×${h})`);
    }
  });
  return null;
}
