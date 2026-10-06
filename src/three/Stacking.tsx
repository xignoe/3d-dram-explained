import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { P } from '../lib/palette';
import { TOY } from '../data/illustrative';

/**
 * mix = 0: HBM-style layout (memory beside the processor, data squeezes through an edge).
 * mix = 1: Raptor's face-to-face stack (data crosses the whole die surface).
 */
interface Props { mix: number; active: boolean }

const DIE = 2.4, T = 0.22, GAP = 0.42;
const tmp = new THREE.Vector3();

function useParticles(count: number) {
  return useMemo(() => {
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
    return { seed, pos: new Float32Array(count * 3) };
  }, [count]);
}

function Rig({ mixRef }: { mixRef: { current: number } }) {
  const { camera } = useThree();
  useFrame((_, dt) => {
    const m = mixRef.current;
    const k = 1 - Math.exp(-dt * 5);
    tmp.set(THREE.MathUtils.lerp(0, 4.6, m), THREE.MathUtils.lerp(5.6, 2.5, m), THREE.MathUtils.lerp(11, 5.6, m));
    camera.position.lerp(tmp, k);
    camera.lookAt(0, THREE.MathUtils.lerp(0.1, 0.45, m), 0);
  });
  return null;
}

function World({ target }: { target: number }) {
  const mixRef = useRef(target);
  const logic = useRef<THREE.Mesh>(null);
  const dram = useRef<THREE.Mesh>(null);
  const dramMat = useRef<THREE.MeshLambertMaterial>(null);
  const hbmL = useRef<THREE.Group>(null);
  const hbmR = useRef<THREE.Group>(null);
  const hbmMaterial = useMemo(() => new THREE.MeshLambertMaterial({ color: P.hbmTint, transparent: true }), []);
  const edgeMat = useRef<THREE.MeshBasicMaterial>(null);
  const ptsA = useRef<THREE.Points>(null);
  const ptsB = useRef<THREE.Points>(null);
  const A = useParticles(TOY.trickleParticles);
  const B = useParticles(TOY.rainParticles);
  const clock = useRef(0);

  useFrame((_, dt) => {
    mixRef.current = THREE.MathUtils.lerp(mixRef.current, target, 1 - Math.exp(-dt * 4));
    const m = mixRef.current;
    clock.current += dt * TOY.particleSpeed;
    const t = clock.current;

    if (logic.current) logic.current.position.y = THREE.MathUtils.lerp(T / 2, T + GAP + T / 2, m);
    if (dram.current && dramMat.current) {
      dram.current.scale.y = Math.max(0.001, m);
      dram.current.position.y = (T * m) / 2;
      dramMat.current.opacity = m;
    }
    const sx = THREE.MathUtils.lerp(2.35, 3.6, m);
    if (hbmL.current) hbmL.current.position.x = -sx;
    if (hbmR.current) hbmR.current.position.x = sx;
    hbmMaterial.opacity = 1 - m;
    hbmMaterial.visible = m < 0.99;
    if (edgeMat.current) edgeMat.current.opacity = (1 - m) * 0.85;

    // A: trickle from each HBM stack, through a thin strip at the processor edge.
    if (ptsA.current) {
      const p = ptsA.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < TOY.trickleParticles; i++) {
        const s = A.seed;
        const side = s[i * 4] < 0.5 ? -1 : 1;
        const u = (s[i * 4 + 1] + t * (0.6 + s[i * 4 + 2] * 0.4)) % 1;
        const x = side * THREE.MathUtils.lerp(sx - 0.55, DIE / 2 - 0.05, u);
        const squeeze = 1 - Math.sin(u * Math.PI) * 0.75;
        p.setXYZ(i, x, 0.06 + s[i * 4 + 3] * 0.05, (s[i * 4 + 2] - 0.5) * 1.1 * squeeze);
      }
      p.needsUpdate = true;
      (ptsA.current.material as THREE.PointsMaterial).opacity = 1 - m;
    }
    // B: dense rain across the whole die footprint (DRAM up into logic).
    if (ptsB.current) {
      const p = ptsB.current.geometry.attributes.position as THREE.BufferAttribute;
      const y0 = T, y1 = T + GAP;
      for (let i = 0; i < TOY.rainParticles; i++) {
        const s = B.seed;
        const u = (s[i * 4 + 1] + t * (1.1 + s[i * 4 + 2] * 0.6)) % 1;
        p.setXYZ(i, (s[i * 4] - 0.5) * DIE * 0.92, THREE.MathUtils.lerp(y0, y1, u), (s[i * 4 + 3] - 0.5) * DIE * 0.92);
      }
      p.needsUpdate = true;
      (ptsB.current.material as THREE.PointsMaterial).opacity = m * 0.9;
    }
  });

  const stack = (
    <>
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} position={[0, 0.1 + k * 0.17, 0]} material={hbmMaterial}>
          <boxGeometry args={[1.05, 0.14, 1.5]} />
          <Edges color={P.hbm} />
        </mesh>
      ))}
    </>
  );

  return (
    <>
      <Rig mixRef={mixRef} />
      {/* substrate */}
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[9, 0.08, 3.6]} />
        <meshLambertMaterial color={P.board} />
        <Edges color={P.ink3} />
      </mesh>
      <group ref={hbmL}>{stack}</group>
      <group ref={hbmR}>{stack}</group>
      {/* the narrow edge interface, glowing */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (DIE / 2 + 0.02), 0.08, 0]}>
          <boxGeometry args={[0.04, 0.06, 1.2]} />
          <meshBasicMaterial ref={side === 1 ? edgeMat : undefined} color={P.hbm} transparent opacity={0.85} />
        </mesh>
      ))}
      <mesh ref={dram}>
        <boxGeometry args={[DIE, T, DIE]} />
        <meshLambertMaterial ref={dramMat} color={P.dramTint} transparent opacity={0} />
      </mesh>
      <mesh ref={logic}>
        <boxGeometry args={[DIE, T, DIE]} />
        <meshLambertMaterial color={P.logic} />
        <Edges color={P.ink} />
      </mesh>
      <points ref={ptsA}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[A.pos, 3]} /></bufferGeometry>
        <pointsMaterial color={P.hbm} size={0.055} transparent opacity={1} depthWrite={false} />
      </points>
      <points ref={ptsB}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[B.pos, 3]} /></bufferGeometry>
        <pointsMaterial color={P.dram} size={0.03} transparent opacity={0} depthWrite={false} />
      </points>
    </>
  );
}

export default function Stacking({ mix, active }: Props) {
  return (
    <Canvas flat frameloop={active ? 'always' : 'never'} dpr={[1, 2]} camera={{ position: [0, 4.4, 6.6], fov: 34 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.6} />
      <directionalLight position={[4, 7, 5]} intensity={1.1} />
      <World target={mix} />
    </Canvas>
  );
}
