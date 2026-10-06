import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { P } from '../lib/palette';
import { HIERARCHY } from '../data/paper';

/** level 0 = card, 1 = MCM, 2 = chiplet. */
interface Props { level: number; active: boolean }

const MCM_X = (i: number, n: number) => (i - (n - 1) / 2) * 2.2;
const CHIP = 0.56, CH_OFF = 0.33;

const VIEWS = [
  { pos: [0, 6.2, 6.6], look: [0, 0, 0] },
  { pos: [-3.3, 2.5, 2.7], look: [-3.3, 0.1, 0] },
  { pos: [-2.95, 1.5, 1.3], look: [-3.63, 0.2, -0.33] },
] as const;

function Rig({ level }: { level: number }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const pos = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 3.5);
    const v = VIEWS[Math.min(level, VIEWS.length - 1)];
    pos.set(v.pos[0], v.pos[1], v.pos[2]);
    tgt.set(v.look[0], v.look[1], v.look[2]);
    camera.position.lerp(pos, k);
    look.current.lerp(tgt, k);
    camera.lookAt(look.current);
  });
  return null;
}

function Chiplet({ x, z, lift }: { x: number; z: number; lift: number }) {
  const logic = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (logic.current) logic.current.position.y = THREE.MathUtils.lerp(logic.current.position.y, 0.23 + lift, 1 - Math.exp(-dt * 5));
  });
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[CHIP, 0.06, CHIP]} />
        <meshLambertMaterial color={P.dramTint} />
        <Edges color={P.ink} />
      </mesh>
      <mesh ref={logic} position={[0, 0.23, 0]}>
        <boxGeometry args={[CHIP, 0.06, CHIP]} />
        <meshLambertMaterial color={P.logic} />
        <Edges color={P.ink} />
      </mesh>
    </group>
  );
}

function MCM({ x, ghost, focus, level }: { x: number; ghost: boolean; focus: boolean; level: number }) {
  const n = HIERARCHY.mcm.chiplets;
  const side = Math.round(Math.sqrt(n));
  const lp = HIERARCHY.mcm.lpddrDevices;
  if (ghost) {
    return (
      <mesh position={[x, 0.09, 0]}>
        <boxGeometry args={[1.9, 0.08, 1.9]} />
        <meshBasicMaterial transparent opacity={0} />
        <Edges color={P.ink3} />
      </mesh>
    );
  }
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[1.9, 0.08, 1.9]} />
        <meshLambertMaterial color={P.plate2} />
        <Edges color={P.ink} />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const cx = ((i % side) - (side - 1) / 2) * CH_OFF * 2;
        const cz = (Math.floor(i / side) - (side - 1) / 2) * CH_OFF * 2;
        return <Chiplet key={i} x={cx} z={cz} lift={focus && level >= 2 && i === 0 ? 0.16 : 0} />;
      })}
      {Array.from({ length: lp }, (_, i) => {
        const half = lp / 2;
        const sx = i < half ? -0.78 : 0.78;
        const zz = ((i % half) - (half - 1) / 2) * 0.42;
        return (
          <mesh key={i} position={[sx, 0.155, zz]}>
            <boxGeometry args={[0.22, 0.05, 0.34]} />
            <meshLambertMaterial color={P.lpddr} />
            <Edges color={P.ink} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Zoom({ level, active }: Props) {
  const max = HIERARCHY.card.mcmsMax, min = HIERARCHY.card.mcmsMin;
  return (
    <Canvas flat frameloop={active ? 'always' : 'never'} dpr={[1, 2]} camera={{ position: [0, 6.2, 6.6], fov: 38 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 8, 5]} intensity={1.1} />
      <Rig level={level} />
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[max * 2.2 + 0.4, 0.1, 2.6]} />
        <meshLambertMaterial color={P.board} />
        <Edges color={P.ink3} />
      </mesh>
      {Array.from({ length: max }, (_, i) => (
        <MCM key={i} x={MCM_X(i, max)} ghost={i >= min} focus={i === 0} level={level} />
      ))}
    </Canvas>
  );
}
