import { useLayoutEffect, useMemo, useRef, type ReactElement } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { P } from '../lib/palette';
import { RenderProbe } from './RenderProbe';

/** Which memory to draw; matches the Fig. 14 card ids. */
export type MiniKind = 'sram' | 'hbm' | 'dram3d';

/* Small static models for Fig. 14, in the materials of Fig. 0 and Fig. 4. Not to scale. */

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
function Sram() {
  const D = 3.4, T = 0.12, N = 4, pitch = D / N;
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
    </group>
  );
}

/** Compute in the middle of an interposer, HBM stacks along two edges, joined only at those edges. */
function Hbm() {
  const DIE = 2.2, S = 0.62, LAYERS = 4;
  const sx = DIE / 2 + 0.2 + S / 2;
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
          {[-0.74, 0, 0.74].map((z) =>
            Array.from({ length: LAYERS }, (_, k) => (
              <Box key={`${z}-${k}`} size={[S, 0.11, S]} pos={[side * sx, 0.06 + k * 0.135, z]} color={P.hbmTint} edge={P.hbm} />
            )),
          )}
        </group>
      ))}
    </group>
  );
}

/** Compute stacked on DRAM layers, joined across the whole face by vertical I/O. */
function Dram3d() {
  const D = 2.6, L = 0.1, STEP = 0.14, LAYERS = 4, GAP = 0.6, N = 9;
  const top = (LAYERS - 1) * STEP + L / 2;
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
    </group>
  );
}

const MODEL: Record<MiniKind, () => ReactElement> = { sram: Sram, hbm: Hbm, dram3d: Dram3d };

// A lower three-quarter view than Fig. 0, so the layer stacks read as stacks.
const VIEW = new THREE.Vector3(6, 3.9, 6);

/** Orthographic three-quarter view, fitted so the model fills the canvas at any size. */
function Fitted({ kind }: { kind: MiniKind }) {
  const group = useRef<THREE.Group>(null);
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    if (!group.current) return;
    const cam = camera as THREE.OrthographicCamera;
    const box = new THREE.Box3().setFromObject(group.current);
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
  const Model = MODEL[kind];
  return <group ref={group} rotation={[0, -0.25, 0]}><Model /></group>;
}

export default function MemoryMini({ kind }: { kind: MiniKind }) {
  return (
    <Canvas
      flat
      orthographic
      frameloop="demand"
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
