import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { HIERARCHY } from '../data/paper';
import { P } from '../lib/palette';

export interface HeroChipletProps {
  /** 1 = fully exploded, 0 = dies touching. Mutated by scroll, read per frame. */
  explodeRef: { current: number };
  active: boolean;
}

const DIE = 3; // die edge length in scene units (illustrative)
const THICK = 0.14;
const BUMPS = 15; // bump columns drawn per side (illustrative; the real array is far denser)

/** Orthographic, drawing-like view that keeps the chiplet filling the frame at any canvas size. */
function Fit() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = Math.min(size.width / 5.4, size.height / 4.4);
    cam.position.set(6, 5.2, 6);
    cam.lookAt(0, 0.62, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Chiplet({ explodeRef }: { explodeRef: { current: number } }) {
  const group = useRef<THREE.Group>(null);
  const logic = useRef<THREE.Mesh>(null);
  const bumps = useRef<THREE.LineSegments>(null);
  const motes = useRef<THREE.Points>(null);

  // One tile per DRAM bank on the die (840, Sec IV-A).
  const banks = HIERARCHY.chiplet.banks;
  const bankGrid = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(banks));
    const rows = Math.ceil(banks / cols);
    const pitch = (DIE * 0.92) / cols;
    const m = new THREE.Matrix4();
    const mats: THREE.Matrix4[] = [];
    for (let i = 0; i < banks; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      m.makeTranslation((c - (cols - 1) / 2) * pitch, THICK / 2 + 0.003, (r - (rows - 1) / 2) * pitch);
      mats.push(m.clone());
    }
    return { mats, size: pitch * 0.7 };
  }, [banks]);

  // Bumps as hairlines from y = 0 to y = 1; the group is scaled to the current gap.
  const bumpGeom = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < BUMPS; i++) for (let j = 0; j < BUMPS; j++) {
      const x = (i - (BUMPS - 1) / 2) * (DIE * 0.86) / BUMPS, z = (j - (BUMPS - 1) / 2) * (DIE * 0.86) / BUMPS;
      pts.push(x, 0, z, x, 1, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  const moteData = useMemo(() => {
    const count = 120;
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * DIE * 0.86;
      pos[i * 3 + 1] = Math.random();
      pos[i * 3 + 2] = (Math.random() - 0.5) * DIE * 0.86;
      speed[i] = 0.25 + Math.random() * 0.35;
    }
    return { pos, speed, count };
  }, []);

  useFrame((_, dt) => {
    const e = explodeRef.current;
    const gap = 0.04 + e * 1.15;
    if (group.current) group.current.rotation.y += dt * 0.06;
    if (logic.current) logic.current.position.y = THICK + gap;
    if (bumps.current) {
      bumps.current.position.y = THICK / 2;
      bumps.current.scale.y = gap;
    }
    if (motes.current) {
      const p = motes.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < moteData.count; i++) {
        let y = moteData.pos[i * 3 + 1] + dt * moteData.speed[i];
        if (y > 1) y -= 1;
        moteData.pos[i * 3 + 1] = y;
        p.setY(i, THICK / 2 + y * gap);
      }
      p.needsUpdate = true;
      (motes.current.material as THREE.PointsMaterial).opacity = 0.2 + e * 0.6;
    }
  });

  return (
    <group ref={group} rotation={[0, -0.25, 0]}>
      {/* DRAM die with its banks */}
      <mesh>
        <boxGeometry args={[DIE, THICK, DIE]} />
        <meshLambertMaterial color={P.dramTint} />
        <Edges color={P.ink} />
      </mesh>
      <instancedMesh args={[undefined, undefined, bankGrid.mats.length]} ref={(im) => {
        if (!im) return;
        bankGrid.mats.forEach((m, i) => im.setMatrixAt(i, m));
        im.instanceMatrix.needsUpdate = true;
      }}>
        <boxGeometry args={[bankGrid.size, 0.004, bankGrid.size]} />
        <meshBasicMaterial color={P.dramMid} />
      </instancedMesh>
      <lineSegments ref={bumps} geometry={bumpGeom}>
        <lineBasicMaterial color={P.ink3} transparent opacity={0.55} />
      </lineSegments>
      {/* logic die */}
      <mesh ref={logic}>
        <boxGeometry args={[DIE, THICK, DIE]} />
        <meshLambertMaterial color={P.logic} />
        <Edges color={P.ink} />
      </mesh>
      <points ref={motes}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[moteData.pos.slice(), 3]} />
        </bufferGeometry>
        <pointsMaterial color={P.dram} size={3} sizeAttenuation={false} transparent opacity={0.6} depthWrite={false} />
      </points>
    </group>
  );
}

export default function HeroChiplet({ explodeRef, active }: HeroChipletProps) {
  return (
    <Canvas
      flat
      orthographic
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 2]}
      camera={{ position: [6, 5.2, 6], zoom: 80, near: -50, far: 100 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Fit />
      <ambientLight intensity={1.7} />
      <directionalLight position={[4, 8, 3]} intensity={1.0} />
      <Chiplet explodeRef={explodeRef} />
    </Canvas>
  );
}
