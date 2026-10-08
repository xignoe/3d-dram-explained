import { useLayoutEffect, useMemo, useRef, type ReactElement } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { P } from '../lib/palette';
import { RenderProbe } from './RenderProbe';

/** Which memory to draw; matches the Fig. 14 card ids. */
export type MiniKind = 'sram' | 'hbm' | 'dram3d';

/* Small models for Fig. 14, in the materials of Fig. 0 and Fig. 4. Not to scale. */

/** A soft pulse that peaks once per cycle; p is in cycles. */
function pulse(p: number) {
  const f = p - Math.floor(p);
  const w = Math.max(0, 1 - Math.abs(f - 0.25) / 0.2);
  return w * w * (3 - 2 * w);
}

function Box({ size, pos = [0, 0, 0], color, edge, material }: { size: [number, number, number]; pos?: [number, number, number]; color?: string; edge?: string; material?: THREE.Material }) {
  return (
    <mesh position={pos} material={material}>
      <boxGeometry args={size} />
      {!material && <meshLambertMaterial color={color} />}
      {edge && <Edges color={edge} />}
    </mesh>
  );
}

/** One material per part, so each can glow on its own schedule. */
function useGlowMaterials(count: number, color: string, glow: string) {
  return useMemo(() => Array.from({ length: count }, () => new THREE.MeshLambertMaterial({ color, emissive: glow, emissiveIntensity: 0 })), [count, color, glow]);
}

/** Compute and SRAM side by side in every tile of one die; the SRAM strips glow in a slow wave. */
function Sram() {
  const D = 3.4, T = 0.12, N = 4, pitch = D / N;
  const strips = useGlowMaterials(N * N, P.sram, P.sram);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    strips.forEach((m, i) => {
      const w = 0.5 + 0.5 * Math.sin(t * 1.1 - ((i % N) + Math.floor(i / N)) * 0.7);
      m.emissiveIntensity = 0.5 * w * w;
    });
  });
  return (
    <group>
      <Box size={[D, T, D]} color={P.logic} edge={P.ink} />
      {Array.from({ length: N * N }, (_, i) => {
        const x = ((i % N) - (N - 1) / 2) * pitch, z = (Math.floor(i / N) - (N - 1) / 2) * pitch;
        return (
          <group key={i} position={[x, T / 2 + 0.03, z]}>
            <Box size={[pitch * 0.8, 0.06, pitch * 0.5]} pos={[0, 0, -pitch * 0.14]} color={P.logic} edge={P.ink} />
            <Box size={[pitch * 0.8, 0.06, pitch * 0.2]} pos={[0, 0, pitch * 0.25]} material={strips[i]} />
          </group>
        );
      })}
    </group>
  );
}

/**
 * Compute in the middle of an interposer, HBM stacks along two edges, joined only at those edges.
 * Each stack lights layer by layer toward the board, then the beachfront flashes as the data arrives.
 */
function Hbm() {
  const DIE = 2.2, S = 0.62, LAYERS = 4, Z = [-0.74, 0, 0.74];
  const sx = DIE / 2 + 0.42 + S / 2;
  const layers = useGlowMaterials(2 * Z.length * LAYERS, P.hbmTint, P.hbm);
  const front = useMemo(() => [0, 1].map(() => new THREE.MeshBasicMaterial({ color: P.hbm })), []);
  const base = useMemo(() => new THREE.Color(P.hbm), []);
  const lit = useMemo(() => new THREE.Color(P.hbm).offsetHSL(0, 0.05, 0.2), []);
  const STEP = 0.1, SPEED = 0.42;
  useFrame(({ clock }) => {
    const p = clock.elapsedTime * SPEED;
    layers.forEach((m, i) => {
      const k = i % LAYERS, stack = Math.floor(i / LAYERS) % Z.length;
      m.emissiveIntensity = 0.45 * pulse(p - (LAYERS - 1 - k) * STEP - stack * 0.04);
    });
    const arrive = pulse(p - LAYERS * STEP - 0.04);
    front.forEach((m) => m.color.lerpColors(base, lit, arrive));
  });
  return (
    <group>
      <Box size={[DIE + 2 * (S + 0.5), 0.08, DIE + 0.6]} pos={[0, -0.04, 0]} color={P.board} edge={P.ink3} />
      <Box size={[DIE, 0.16, DIE]} pos={[0, 0.08, 0]} color={P.logic} edge={P.ink} />
      {[-1, 1].map((side, si) => (
        <group key={side}>
          {/* the beachfront: the only place memory meets compute */}
          <mesh position={[side * (DIE / 2 + 0.05), 0.09, 0]} material={front[si]}>
            <boxGeometry args={[0.08, 0.18, DIE * 0.95]} />
          </mesh>
          {Z.map((z, zi) =>
            Array.from({ length: LAYERS }, (_, k) => (
              <Box key={`${z}-${k}`} size={[S, 0.11, S]} pos={[side * sx, 0.06 + k * 0.135, z]} material={layers[(si * Z.length + zi) * LAYERS + k]} edge={P.hbm} />
            )),
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * Compute stacked on DRAM layers, joined across the whole face by vertical I/O.
 * One dot rides up each I/O line at the same steady speed, like Fig. 0.
 */
function Dram3d() {
  const D = 2.6, L = 0.1, STEP = 0.14, LAYERS = 4, GAP = 0.6, N = 9, SPEED = 0.45;
  const top = (LAYERS - 1) * STEP + L / 2;
  const { io, pos, phase } = useMemo(() => {
    const line: number[] = [], pos = new Float32Array(N * N * 3), phase = new Float32Array(N * N);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = (i - (N - 1) / 2) * (D * 0.86) / (N - 1), z = (j - (N - 1) / 2) * (D * 0.86) / (N - 1);
      line.push(x, top, z, x, top + GAP, z);
      const n = i * N + j;
      pos.set([x, top, z], n * 3);
      // Evenly spread start times, so the dots never bunch up.
      phase[n] = (n * 0.618034) % 1;
    }
    const io = new THREE.BufferGeometry();
    io.setAttribute('position', new THREE.Float32BufferAttribute(line, 3));
    return { io, pos, phase };
  }, [top]);
  const dots = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (!dots.current) return;
    const attr = dots.current.geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime * SPEED;
    // Start and end just inside the dies, so a dot never pops in or out in plain view.
    for (let n = 0; n < phase.length; n++) attr.setY(n, top - 0.04 + ((phase[n] + t) % 1) * (GAP + 0.08));
    attr.needsUpdate = true;
  });
  return (
    <group>
      {Array.from({ length: LAYERS }, (_, k) => (
        <Box key={k} size={[D, L, D]} pos={[0, k * STEP, 0]} color={P.dramTint} edge={P.dram} />
      ))}
      <lineSegments geometry={io}>
        <lineBasicMaterial color={P.dram} transparent opacity={0.6} />
      </lineSegments>
      <points ref={dots}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
        <pointsMaterial color={P.dram} size={3} sizeAttenuation={false} depthWrite={false} />
      </points>
      <Box size={[D, 0.16, D]} pos={[0, top + GAP + 0.08, 0]} color={P.logic} edge={P.ink} />
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
