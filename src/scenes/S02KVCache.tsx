import { useEffect, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { Term, Note } from '../components/ui';
import {
  KV_INTRO, KV_BATCH, KV_SLIDERS, KV_BATCH_INFERRED_CONTEXT, kvCacheGB, kvContextSteps, contextLabel,
} from '../data/paper';
import { fmt } from '../lib/fmt';
import { useDesktop } from '../lib/hooks';
import { P } from '../lib/palette';

const CTX_STEPS = kvContextSteps();

const BUBBLES_PER_ROW = 4;
const KV_MAX = kvCacheGB(KV_SLIDERS.contextMax, KV_SLIDERS.usersMax);

/**
 * Memory drawn to scale: each block's area is proportional to its size in GB.
 * The KV block is divided into one cell per user, and a speech bubble per user
 * sits above it, with bubble length growing with the context.
 */
function AreaBlocks({ kv, users, ctx }: { kv: number; users: number; ctx: number }) {
  const narrow = !useDesktop();
  const W = narrow ? 300 : 560, H = narrow ? 222 : 270, base = narrow ? 186 : 248;
  const k = (narrow ? 170 : 225) / Math.sqrt(KV_MAX);
  const perRow = narrow ? 2 : BUBBLES_PER_ROW;
  const wSide = k * Math.sqrt(KV_INTRO.weightsGB);
  const kvSide = Math.max(2, k * Math.sqrt(kv));
  // Square cells, one per user, stacked from the floor up so the total area stays exactly to scale.
  const cols = Math.ceil(Math.sqrt(users));
  const cell = kvSide / Math.sqrt(users);
  const full = Math.floor(users / cols), rest = users % cols;
  const kvW = cols * cell, kvH = (full + (rest ? 1 : 0)) * cell;
  const kvX = narrow ? 96 : 150;
  const fs = narrow ? 13 : 11;
  const bubbleLen = 8 + 22 * (Math.log2(ctx / KV_SLIDERS.contextMin) / Math.log2(KV_SLIDERS.contextMax / KV_SLIDERS.contextMin));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      {/* weights */}
      <rect x={20} y={base - wSide} width={wSide} height={wSide} fill={P.logicDark} stroke={P.ink} strokeWidth={1} />
      {narrow
        ? <text x={20} y={base + 18} fontSize={fs} fill={P.ink2}>weights<tspan x={20} dy={fs + 2}>{KV_INTRO.weightsGB} GB</tspan></text>
        : <text x={20} y={base + 16} fontSize={fs} fill={P.ink2}>weights, {KV_INTRO.weightsGB} GB</text>}
      {/* KV cache, one cell per user */}
      <g className="fade">
        {Array.from({ length: users }, (_, i) => (
          <rect key={i} x={kvX + (i % cols) * cell} y={base - (Math.floor(i / cols) + 1) * cell} width={cell} height={cell}
            fill={(i + Math.floor(i / cols)) % 2 ? P.dram : P.dramMid} stroke={P.paper} strokeWidth={kvSide > 40 ? 0.8 : 0} />
        ))}
        <path d={`M${kvX} ${base} H${kvX + kvW} V${base - full * cell}${rest ? ` H${kvX + rest * cell} V${base - kvH}` : ''} H${kvX} Z`} fill="none" stroke={P.ink} strokeWidth={1} />
      </g>
      <text x={kvX} y={base + (narrow ? 18 : 16)} fontSize={fs} fill={P.dram}>KV cache, {fmt(kv)} GB</text>
      {/* one speech bubble per user; longer bubbles mean longer conversations (desktop only) */}
      {!narrow && <g transform={`translate(${kvX + kvW + (narrow ? 10 : 20)} ${base - Math.ceil(users / perRow) * 13 - 2})`}>
        {Array.from({ length: users }, (_, i) => {
          const bx = (i % perRow) * (bubbleLen + 12), by = Math.floor(i / perRow) * 13;
          return (
            <g key={i} transform={`translate(${bx} ${by})`}>
              <rect width={bubbleLen} height={8} rx={4} fill={P.paper} stroke={P.ink2} strokeWidth={0.8} />
              <path d="M3 8 L2 11 L7 8" fill={P.paper} stroke={P.ink2} strokeWidth={0.8} />
            </g>
          );
        })}
        <text x={0} y={-20} fontSize={10} fill={P.ink3}>one per conversation,<tspan x={0} dy={12}>longer with more context</tspan></text>
      </g>}
      <line x1={10} x2={W - 10} y1={base} y2={base} stroke={P.ink} strokeWidth={1} />
    </svg>
  );
}

function scripted(step: number, progress: number) {
  const anchors = KV_INTRO.anchors;
  if (step === 0) return { ctx: anchors[0].tokens, users: KV_SLIDERS.usersMin };
  if (step === 1) {
    const i = Math.min(anchors.length - 1, Math.floor(progress * anchors.length));
    return { ctx: anchors[i].tokens, users: KV_SLIDERS.usersMin };
  }
  const span = KV_SLIDERS.usersMax - KV_SLIDERS.usersMin;
  const users = step === 2 ? Math.round(KV_SLIDERS.usersMin + progress * span) : KV_SLIDERS.usersMax;
  return { ctx: KV_BATCH_INFERRED_CONTEXT, users };
}

function matchNote(ctx: number, users: number): string | null {
  if (users === KV_SLIDERS.usersMin && KV_INTRO.anchors.some((a) => a.tokens === ctx)) return 'Matches the paper (Sec I)';
  if (ctx === KV_BATCH_INFERRED_CONTEXT && (users === KV_BATCH.batchLow || users === KV_BATCH.batchHigh)) return 'Matches the paper’s example (Sec III-B)';
  return null;
}

function Visual({ step, progress }: SceneState) {
  const [manual, setManual] = useState<{ ctx: number; users: number } | null>(null);
  useEffect(() => setManual(null), [step]);
  const v = manual ?? scripted(step, progress);
  const kv = kvCacheGB(v.ctx, v.users);
  const note = matchNote(v.ctx, v.users);

  return (
    <div className="flex h-full flex-col justify-center-safe gap-3 lg:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <div className="sans text-sm text-muted">KV cache for {v.users} user{v.users > 1 ? 's' : ''} at {contextLabel(v.ctx)} tokens</div>
          <div className="num mt-1 font-serif text-5xl font-medium leading-none tracking-tight text-dram3d lg:text-8xl" aria-live="polite">
            {fmt(kv)}<span className="ml-2 text-2xl font-normal text-muted lg:text-3xl">GB</span>
          </div>
        </div>
        {note && <span className="sans pb-1 text-xs italic text-muted">✓ {note}</span>}
      </div>

      <AreaBlocks kv={kv} users={v.users} ctx={v.ctx} />

      <div className="sans grid grid-cols-2 gap-6 border-t border-line pt-4">
        <label className="text-xs text-muted">
          Context <span className="num ml-1 text-sm text-ink">{contextLabel(v.ctx)}</span> tokens
          <input type="range" min={0} max={CTX_STEPS.length - 1} step={1}
            value={Math.max(0, CTX_STEPS.indexOf(v.ctx))}
            onChange={(e) => setManual({ ctx: CTX_STEPS[+e.target.value], users: v.users })}
            aria-valuetext={`${contextLabel(v.ctx)} tokens`} />
        </label>
        <label className="text-xs text-muted">
          Users <span className="num ml-1 text-sm text-ink">{v.users}</span>
          <input type="range" min={KV_SLIDERS.usersMin} max={KV_SLIDERS.usersMax} step={1} value={v.users}
            onChange={(e) => setManual({ ctx: v.ctx, users: +e.target.value })} />
        </label>
      </div>
    </div>
  );
}

export function S02KVCache() {
  const a = KV_INTRO.anchors;
  return (
    <Scene
      id="kv-cache"
      num={2}
      kicker="The KV cache"
      title="The KV cache grows with every token and every user"
      steps={[
        <p key="a">For each token in a conversation, the model keeps some intermediate results that it will need again later. Together these make up the <Term k="kv">KV cache</Term>. In the paper’s example, a {KV_INTRO.modelLabel} model with {KV_INTRO.precisionLabel} storage, the cache grows by about <strong className="num">{KV_INTRO.mbPerTokenPerUser} MB</strong> per token for each user.</p>,
        <p key="b">That is a small amount per token, but conversations can be long. One user at {a[0].label} tokens needs about <strong className="num">{a[0].gb} GB</strong>, at {a[1].label} about <strong className="num">{a[1].gb} GB</strong>, and at {a[2].label} about <strong className="num">{a[2].gb} GB</strong>.</p>,
        <>
          <p key="c">A server also handles many conversations at the same time, and each has its own cache. The paper gives an example that grows from about <strong className="num">{KV_BATCH.batch1GB} GB</strong> for a single user to <strong className="num">{KV_BATCH.batch32GB} GB</strong> for {KV_BATCH.batchHigh} users, far more than the <strong className="num">{KV_INTRO.weightsGB} GB</strong> taken up by the model’s weights.</p>
          <Note>The paper doesn’t say which context length this example assumes. The numbers match {contextLabel(KV_BATCH_INFERRED_CONTEXT)} tokens exactly, so the figure uses that value, but this is our inference.</Note>
        </>,
        <p key="d">You can change both values in the figure. All of this data has to be read again for every new token, which is why both the amount of memory and its speed matter.</p>,
      ]}
      description={() =>
        `Interactive: sliders for context length and number of users. A bar compares the KV cache size, computed as about ${KV_INTRO.mbPerTokenPerUser} megabytes per token per user, against ${KV_INTRO.weightsGB} gigabytes of model weights. Paper values: ${a.map((x) => `${x.gb} GB at ${x.label}`).join(', ')} for one user; ${KV_BATCH.batch1GB} GB rising to ${KV_BATCH.batch32GB} GB from ${KV_BATCH.batchLow} to ${KV_BATCH.batchHigh} users.`
      }
      visual={(s) => <Visual {...s} />}
      figure={() => ({
        evidence: 'derived',
        caption: <>Block areas are drawn to scale, with one cell per user. KV cache size ≈ {KV_INTRO.mbPerTokenPerUser} MB × tokens × users, for the paper’s {KV_INTRO.modelLabel} example with {KV_INTRO.precisionLabel} storage ({KV_INTRO.layers} layers, {KV_INTRO.kvHeads} KV heads, head size {KV_INTRO.headDim}). A note appears when the values match ones the paper states. Source: Sec I, Sec III-B.</>,
      })}
    />
  );
}
