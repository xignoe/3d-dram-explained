import { useLayoutEffect, useMemo, useRef, type ReactElement } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { P } from '../lib/palette';
import { RenderProbe } from './RenderProbe';

/** Which memory to draw; matches the Fig. 14 card ids. */
export type MiniKind = 'sram' | 'hbm' | 'dram3d';

/* Small models for Fig. 14, in the materials of Fig. 0 and Fig. 4. Not to scale. */

/**
 * Dots of data moving along a path, like the motes in Fig. 0. `place` writes
 * mote i at progress u (0–1) into `out`; r is a fixed random number per mote.
 */
function Motes({ count, color, speed, place }: { count: number; color: string; speed: number; place: (i: number, r: number, u: number, out: Float32Array) => void }) {
  const pts = useRef<THREE.Points>(null);
  const { seed, pos } = useMemo(() => {
    const seed = new Float32Array(count * 2);
    for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) place(i, seed[i * 2 + 1], seed[i * 2], pos);
    return { seed, pos };
  }, [count, place]);
  useFrame(({ clock }) => {
    if (!pts.current) return;
    const attr = pts.current.geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime * speed;
    for (let i = 0; i < count; i++) place(i, seed[i * 2 + 1], (seed[i * 2] + t * (0.7 + 0.6 * seed[i * 2 + 1])) % 1, attr.array as Float32Array);
    attr.needsUpdate = true;
  });
  return (
    <points ref={pts}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
      <pointsMaterial color={color} size={3} sizeAttenuation={false} depthWrite={false} />
    </points>
  );
}

const ease = (w: number) => w * w * (3 - 2 * w);

function Box({ size, pos = [0, 0, 0], color, edge }: { size: [number, number, number]; pos?: [number, number, number]; color: string; edge?: string }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshLambertMaterial color={color} />
      {edge && <Edges color={edge} />}
    </mesh>
  );
}

/** Compute and SRAM side by side in every tile of one die. */
const SRAM_D = 3.4, SRAM_T = 0.12, SRAM_N = 4, SRAM_PITCH = SRAM_D / SRAM_N;
// Data hops the short way between each tile's SRAM strip and its compute, and back.
const sramPlace = (i: number, r: number, u: number, out: Float32Array) => {
  const tile = i % (SRAM_N * SRAM_N), N = SRAM_N, p = SRAM_PITCH;
  const w = ease(u < 0.5 ? u * 2 : 2 - u * 2);
  out[i * 3] = ((tile % N) - (N - 1) / 2) * p + (r - 0.5) * p * 0.55;
  out[i * 3 + 1] = SRAM_T / 2 + 0.11;
  out[i * 3 + 2] = (Math.floor(tile / N) - (N - 1) / 2) * p + THREE.MathUtils.lerp(p * 0.25, -p * 0.14, w);
};

function Sram() {
  const D = SRAM_D, T = SRAM_T, N = SRAM_N, pitch = SRAM_PITCH;
  return (
    <group>
      <Box size={[D, T, D]} color={P.logic} edge={P.ink} />
      {Array.from({ length: N * N }, (_, i) => {
        const x = ((i % N) - (N - 1) / 2) * pitch, z = (Math.floor(i / N) - (N - 1) / 2) * pitch;
        return (
          <group key={i} position={[x, T / 2 + 0.03, z]}>
            <Box size={[pitch * 0.8, 0.06, pitch * 0.5]} pos={[0, 0, -pitch * 0.14]} color={P.logic} edge={P.ink} />
            <Box size={[pitch * 0.8, 0.06, pitch * 0.2]} pos={[0, 0, pitch * 0.25]} color={P.sram} />
          </group>
        );
      })}
      <Motes count={32} color={P.sram} speed={0.45} place={sramPlace} />
    </group>
  );
}

/** Compute in the middle of an interposer, HBM stacks along two edges, joined only at those edges. */
const HBM_DIE = 2.2, HBM_S = 0.62, HBM_SX = HBM_DIE / 2 + 0.42 + HBM_S / 2, HBM_Z = [-0.74, 0, 0.74];
// A thin trickle out of each stack, arcing over so it stays in view, down into the beachfront.
const hbmPlace = (i: number, r: number, u: number, out: Float32Array) => {
  const side = i % 2 ? 1 : -1;
  out[i * 3] = side * THREE.MathUtils.lerp(HBM_SX, HBM_DIE / 2 + 0.05, u);
  out[i * 3 + 1] = THREE.MathUtils.lerp(0.47, 0.1, u) + Math.sin(u * Math.PI) * 0.2;
  out[i * 3 + 2] = HBM_Z[Math.floor(i / 2) % 3] + (r - 0.5) * 0.36;
};

function Hbm() {
  const DIE = HBM_DIE, S = HBM_S, LAYERS = 4;
  const sx = HBM_SX;
  return (
    <group>
      <Box size={[DIE + 2 * (S + 0.5), 0.08, DIE + 0.6]} pos={[0, -0.04, 0]} color={P.board} edge={P.ink3} />
      <Box size={[DIE, 0.16, DIE]} pos={[0, 0.08, 0]} color={P.logic} edge={P.ink} />
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* the beachfront: the only place memory meets compute */}
          <mesh position={[side * (DIE / 2 + 0.05), 0.09, 0]}>
            <boxGeometry args={[0.08, 0.18, DIE * 0.95]} />
            <meshBasicMaterial color={P.hbm} />
          </mesh>
          {HBM_Z.map((z) =>
            Array.from({ length: LAYERS }, (_, k) => (
              <Box key={`${z}-${k}`} size={[S, 0.11, S]} pos={[side * sx, 0.06 + k * 0.135, z]} color={P.hbmTint} edge={P.hbm} />
            )),
          )}
        </group>
      ))}
      <Motes count={30} color={P.hbm} speed={0.3} place={hbmPlace} />
    </group>
  );
}

/** Compute stacked on DRAM layers, joined across the whole face by vertical I/O. */
const DR_D = 2.6, DR_L = 0.1, DR_STEP = 0.14, DR_LAYERS = 4, DR_GAP = 0.6;
const DR_TOP = (DR_LAYERS - 1) * DR_STEP + DR_L / 2;
// Data rises across the whole face, from the top DRAM layer into the compute die.
const dramPlace = (i: number, r: number, u: number, out: Float32Array) => {
  const a = (i * 0.618034) % 1;
  out[i * 3] = (a - 0.5) * DR_D * 0.86;
  out[i * 3 + 1] = DR_TOP - 0.04 + u * (DR_GAP + 0.08);
  out[i * 3 + 2] = (r - 0.5) * DR_D * 0.86;
};

function Dram3d() {
  const D = DR_D, L = DR_L, STEP = DR_STEP, LAYERS = DR_LAYERS, GAP = DR_GAP, N = 9;
  const top = DR_TOP;
  const io = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = (i - (N - 1) / 2) * (D * 0.86) / (N - 1), z = (j - (N - 1) / 2) * (D * 0.86) / (N - 1);
      pts.push(x, top, z, x, top + GAP, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [top]);
  return (
    <group>
      {Array.from({ length: LAYERS }, (_, k) => (
        <Box key={k} size={[D, L, D]} pos={[0, k * STEP, 0]} color={P.dramTint} edge={P.dram} />
      ))}
      <lineSegments geometry={io}>
        <lineBasicMaterial color={P.dram} />
      </lineSegments>
      <Box size={[D, 0.16, D]} pos={[0, top + GAP + 0.08, 0]} color={P.logic} edge={P.ink} />
      <Motes count={110} color={P.dram} speed={0.4} place={dramPlace} />
    </group>
  );
}

const MODEL: Record<MiniKind, () => ReactElement> = { sram: Sram, hbm: Hbm, dram3d: Dram3d };

// A lower three-quarter view than Fig. 0, so the layer stacks read as stacks.
const VIEW = new THREE.Vector3(6, 3.9, 6);
// The models rock slowly by ±SWAY around BASE, all three in step.
const BASE = -0.25, SWAY = 0.1;

/** Orthographic three-quarter view, fitted so the model fills the canvas at any size. */
function Fitted({ kind }: { kind: MiniKind }) {
  const group = useRef<THREE.Group>(null);
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    const g = group.current;
    if (!g) return;
    const cam = camera as THREE.OrthographicCamera;
    // Fit the model at both ends of its sway so it never clips.
    const box = new THREE.Box3();
    for (const r of [-SWAY, SWAY]) {
      g.rotation.y = BASE + r;
      g.updateMatrixWorld(true);
      box.union(new THREE.Box3().setFromObject(g));
    }
    const c = box.getCenter(new THREE.Vector3());
    cam.position.copy(c).add(VIEW);
    cam.lookAt(c);
    cam.updateMatrixWorld();
    // Measure the model in screen axes, then centre and zoom to fit.
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const v = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(cam.matrixWorldInverse);
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
    }
    cam.position.add(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, 0).applyQuaternion(cam.quaternion));
    cam.zoom = Math.min(size.width / (x1 - x0), size.height / (y1 - y0)) * 0.94;
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = BASE + SWAY * Math.sin(clock.elapsedTime * 0.35);
  });
  const Model = MODEL[kind];
  return <group ref={group} rotation={[0, BASE, 0]}><Model /></group>;
}

/** `active` runs the animation; otherwise the canvas renders a still frame only when needed. */
export default function MemoryMini({ kind, active }: { kind: MiniKind; active: boolean }) {
  return (
    <Canvas
      flat
      orthographic
      frameloop={active ? 'always' : 'demand'}
      dpr={[1, 2]}
      camera={{ position: [6, 5.2, 6], zoom: 40, near: -50, far: 100 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
    >
      <RenderProbe />
      <ambientLight intensity={1.7} />
      <directionalLight position={[4, 8, 3]} intensity={1.0} />
      <Fitted kind={kind} />
    </Canvas>
  );
}
