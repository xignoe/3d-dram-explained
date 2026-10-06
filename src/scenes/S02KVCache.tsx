import { useEffect, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { Term, Note } from '../components/ui';
import {
  KV_INTRO, KV_BATCH, KV_SLIDERS, KV_BATCH_INFERRED_CONTEXT, kvCacheGB, kvContextSteps, contextLabel,
} from '../data/paper';
import { fmt } from '../lib/fmt';
import { P } from '../lib/palette';

const CTX_STEPS = kvContextSteps();

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
  const weights = KV_INTRO.weightsGB;
  const max = Math.max(kv, weights) * 1.08;
  const note = matchNote(v.ctx, v.users);
  const segs = Math.min(v.users, KV_SLIDERS.usersMax);

  return (
    <div className="flex h-full flex-col justify-center-safe gap-5 lg:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <div className="sans text-sm text-muted">KV cache for {v.users} user{v.users > 1 ? 's' : ''} at {contextLabel(v.ctx)} tokens</div>
          <div className="num mt-1 font-serif text-6xl font-medium leading-none tracking-tight text-dram3d lg:text-8xl" aria-live="polite">
            {fmt(kv)}<span className="ml-2 text-2xl font-normal text-muted lg:text-3xl">GB</span>
          </div>
        </div>
        {note && <span className="sans pb-1 text-xs italic text-muted">✓ {note}</span>}
      </div>

      <div className="sans space-y-3 lg:space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted"><span>Model weights ({KV_INTRO.precisionLabel})</span><span className="num">{weights} GB</span></div>
          <div className="h-4 bg-surface-2 lg:h-5"><div className="fade h-full" style={{ width: `${(weights / max) * 100}%`, background: P.logicDark }} /></div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted"><span>KV cache, one band per user</span><span className="num">{fmt(kv)} GB</span></div>
          <div className="h-4 bg-surface-2 lg:h-5">
            <div className="fade flex h-full overflow-hidden" style={{ width: `${(kv / max) * 100}%` }}>
              {Array.from({ length: segs }, (_, i) => (
                <div key={i} className="h-full flex-1 border-r border-bg last:border-r-0" style={{ background: i % 2 ? P.dram : P.dramMid }} />
              ))}
            </div>
          </div>
        </div>
      </div>

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
        caption: <>KV cache size ≈ {KV_INTRO.mbPerTokenPerUser} MB × tokens × users, for the paper’s {KV_INTRO.modelLabel} example with {KV_INTRO.precisionLabel} storage ({KV_INTRO.layers} layers, {KV_INTRO.kvHeads} KV heads, head size {KV_INTRO.headDim}). Ticks mark values the paper states. Source: Sec I, Sec III-B.</>,
      })}
    />
  );
}
