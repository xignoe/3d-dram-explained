import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
const THICK = 0.16;

function Chiplet({ explodeRef }: { explodeRef: { current: number } }) {
  const group = useRef<THREE.Group>(null);
  const logic = useRef<THREE.Mesh>(null);
  const bumps = useRef<THREE.Group>(null);
  const motes = useRef<THREE.Points>(null);

  // One tile per DRAM bank on the die (840, Sec IV-A).
  const banks = HIERARCHY.chiplet.banks;
  const bankGrid = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(banks));
    const rows = Math.ceil(banks / cols);
    const pitch = (DIE * 0.9) / cols;
    const m = new THREE.Matrix4();
    const mats: THREE.Matrix4[] = [];
    for (let i = 0; i < banks; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      m.makeTranslation((c - (cols - 1) / 2) * pitch, THICK / 2 + 0.004, (r - (rows - 1) / 2) * pitch * (cols / rows));
      mats.push(m.clone());
    }
    return { mats, size: pitch * 0.72 };
  }, [banks]);

  const bumpGrid = useMemo(() => {
    const n = 18, mats: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      m.makeTranslation((i - (n - 1) / 2) * (DIE * 0.86) / n, 0.5, (j - (n - 1) / 2) * (DIE * 0.86) / n);
      mats.push(m.clone());
    }
    return mats;
  }, []);

  const moteData = useMemo(() => {
    const count = 160;
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * DIE * 0.86;
      pos[i * 3 + 1] = Math.random();
      pos[i * 3 + 2] = (Math.random() - 0.5) * DIE * 0.86;
      speed[i] = 0.2 + Math.random() * 0.35;
    }
    return { pos, speed, count };
  }, []);

  useFrame((_, dt) => {
    const e = explodeRef.current;
    const gap = 0.06 + e * 1.1;
    if (group.current) group.current.rotation.y += dt * 0.08;
    if (logic.current) logic.current.position.y = THICK + gap;
    if (bumps.current) {
      bumps.current.position.y = THICK / 2;
      bumps.current.scale.y = gap + THICK / 2;
    }
    if (motes.current) {
      const p = motes.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < moteData.count; i++) {
        let y = moteData.pos[i * 3 + 1] + dt * moteData.speed[i];
        if (y > 1) y -= 1;
        moteData.pos[i * 3 + 1] = y;
        p.setY(i, THICK / 2 + y * (gap + THICK / 2));
      }
      p.needsUpdate = true;
      (motes.current.material as THREE.PointsMaterial).opacity = 0.15 + e * 0.6;
    }
  });

  return (
    <group ref={group} rotation={[0, -0.6, 0]}>
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
        <boxGeometry args={[bankGrid.size, 0.006, bankGrid.size]} />
        <meshBasicMaterial color={P.dram} />
      </instancedMesh>
      <group ref={bumps}>
        <instancedMesh args={[undefined, undefined, bumpGrid.length]} ref={(im) => {
          if (!im) return;
          bumpGrid.forEach((m, i) => im.setMatrixAt(i, m));
          im.instanceMatrix.needsUpdate = true;
        }}>
          <cylinderGeometry args={[0.012, 0.012, 1, 5]} />
          <meshBasicMaterial color={P.ink3} />
        </instancedMesh>
      </group>
      <mesh ref={logic}>
        <boxGeometry args={[DIE, THICK, DIE]} />
        <meshLambertMaterial color={P.logic} />
        <Edges color={P.ink} />
      </mesh>
      <points ref={motes}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[moteData.pos.slice(), 3]} />
        </bufferGeometry>
        <pointsMaterial color={P.dram} size={0.03} transparent opacity={0.6} depthWrite={false} />
      </points>
    </group>
  );
}

export default function HeroChiplet({ explodeRef, active }: HeroChipletProps) {
  return (
    <Canvas
      flat
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 2]}
      camera={{ position: [7.6, 4.6, 9.2], fov: 28 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, 0.45, 0)}
    >
      <ambientLight intensity={1.6} />
      <directionalLight position={[5, 8, 4]} intensity={1.2} />
      <Chiplet explodeRef={explodeRef} />
    </Canvas>
  );
}
