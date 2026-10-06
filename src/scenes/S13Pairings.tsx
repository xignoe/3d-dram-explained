import { Scene, type SceneState } from '../components/Scene';
import { PAIRINGS } from '../data/paper';
import { TOY } from '../data/illustrative';
import { P } from '../lib/palette';

function Lane({ y, label, color }: { y: number; label: string; color: string }) {
  return (
    <g>
      <line x1="10" x2="390" y1={y} y2={y} stroke={P.ink} strokeWidth="1.5" />
      <line x1="10" x2="390" y1={y + 96} y2={y + 96} stroke={P.rule} />
      <text x="10" y={y + 20} fontSize="13" fontWeight={600} fill={color}>{label}</text>
    </g>
  );
}

function AFD({ progress }: { progress: number }) {
  const a = progress < 0.33, f = progress >= 0.33 && progress < 0.8;
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
      <Lane y={20} label="GPU (HBM)" color="var(--color-hbm)" />
      <Lane y={170} label="Raptor (3D-DRAM)" color="var(--color-dram3d)" />
      <g className="fade" opacity={a ? 1 : 0.45}>
        <rect x="40" y="46" width="170" height="54" rx="1" fill="var(--color-hbm)" fillOpacity="0.2" stroke="var(--color-hbm)" />
        <text x="125" y="70" textAnchor="middle" fontSize="12" fill="var(--color-ink)">attention</text>
        <text x="125" y="88" textAnchor="middle" fontSize="10" fill="var(--color-muted)">KV cache fits in HBM capacity</text>
      </g>
      <path d="M210 100 C 250 130, 230 160, 260 196" stroke="var(--color-ink)" strokeOpacity={f ? 0.9 : 0.3} fill="none" markerEnd="url(#pa-ah)" className="fade" />
      <text x="250" y="140" fontSize="10" fill="var(--color-muted)">activations</text>
      <g className="fade" opacity={f ? 1 : 0.45}>
        <rect x="190" y="196" width="180" height="54" rx="1" fill="var(--color-dram3d)" fillOpacity="0.2" stroke="var(--color-dram3d)" />
        <text x="280" y="220" textAnchor="middle" fontSize="12" fill="var(--color-ink)">expert / FFN layers</text>
        <text x="280" y="238" textAnchor="middle" fontSize="10" fill="var(--color-muted)">stream weights at ~{PAIRINGS.raptorBandwidthTBs} TB/s</text>
      </g>
      <path d="M190 236 C 110 236, 80 160, 90 104" stroke="var(--color-ink)" strokeOpacity={progress >= 0.8 ? 0.9 : 0.3} fill="none" markerEnd="url(#pa-ah)" className="fade" />
      <text x="40" y="160" fontSize="10" fill="var(--color-muted)">next layer</text>
      <defs><marker id="pa-ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="var(--color-ink)" /></marker></defs>
    </svg>
  );
}

function Spec({ progress }: { progress: number }) {
  const K = TOY.draftTokensShown;
  const drafted = Math.min(K, Math.floor(progress * (K + 2)));
  const verifying = progress > 0.75;
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
      <Lane y={20} label="Raptor (3D-DRAM): draft" color="var(--color-dram3d)" />
      <Lane y={170} label="GPU (HBM): verify" color="var(--color-hbm)" />
      {Array.from({ length: K }, (_, i) => (
        <g key={i} className="fade" opacity={i < drafted ? 1 : 0.15}>
          <rect x={40 + i * 70} y="50" width="58" height="40" rx="1" fill="var(--color-dram3d)" fillOpacity="0.2" stroke="var(--color-dram3d)" />
          <text x={69 + i * 70} y="75" textAnchor="middle" fontSize="12" fill="var(--color-ink)">token {i + 1}</text>
          {i > 0 && <path d={`M${40 + i * 70 - 12} 70 h8`} stroke="var(--color-dram3d)" />}
        </g>
      ))}
      <text x="40" y="108" fontSize="10" fill="var(--color-muted)">one after another: memory-bound, so fast memory helps</text>
      <path d="M200 112 V 196" stroke="var(--color-ink)" strokeOpacity={verifying ? 0.9 : 0.3} markerEnd="url(#pa-ah2)" className="fade" />
      <g className="fade" opacity={verifying ? 1 : 0.35}>
        <rect x="40" y="200" width="320" height="50" rx="1" fill="var(--color-hbm)" fillOpacity="0.2" stroke="var(--color-hbm)" />
        <text x="200" y="222" textAnchor="middle" fontSize="12" fill="var(--color-ink)">check all K drafts in one parallel pass</text>
        <text x="200" y="240" textAnchor="middle" fontSize="10" fill="var(--color-muted)">compute-bound: suits GPU tensor cores</text>
      </g>
      <defs><marker id="pa-ah2" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="var(--color-ink)" /></marker></defs>
    </svg>
  );
}

function Visual({ step, progress }: SceneState) {
  return (
    <div className="flex h-full flex-col">
      <div className="font-serif text-xl italic">{step === 0 ? 'Pairing one: the attention–FFN split' : 'Pairing two: speculative decoding'}</div>
      <div className="min-h-0 flex-1">{step === 0 ? <AFD progress={progress} /> : <Spec progress={progress} />}</div>
    </div>
  );
}

export function S13Pairings() {
  return (
    <Scene
      id="pairings"
      num={13}
      kicker="Raptor plus GPUs"
      title="Each chip does the half it’s best at."
      steps={[
        <p key="0"><strong>Attention–FFN split.</strong> In a mixture-of-experts model, attention mostly needs <em>room</em> for the KV cache, which a GPU’s big HBM provides. The expert layers mostly need to <em>stream weights fast</em>, which is Raptor’s strength. So the GPU runs attention, Raptor runs the experts, and activations pass between them each layer.</p>,
        <p key="1"><strong>Speculative decoding.</strong> A small “draft” model guesses the next K tokens one by one. That is memory-bound, so it runs on Raptor. A big model then checks all K guesses in one parallel pass. That is compute-bound, so it runs on the GPU. The paper notes d-Matrix’s earlier chip, Corsair, already reported sizable speedups with this pairing.</p>,
      ]}
      description={(s) => s.step === 0
        ? 'Swim-lane diagram: the GPU runs attention, sends activations to Raptor, which runs the expert layers and returns results for the next layer.'
        : 'Swim-lane diagram: Raptor drafts several tokens one after another, then the GPU verifies all of them in one parallel pass.'}
      visual={(s) => <Visual {...s} />}
      figure={() => ({ caption: <>Proposed deployments discussed in Sec IX. The paper does not report measurements of Raptor paired with a GPU.</> })}
    />
  );
}
