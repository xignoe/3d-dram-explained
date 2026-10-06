import { useEffect, useState } from 'react';
import { Scene, type SceneState } from '../components/Scene';
import { Badge, Term, Note, Src } from '../components/ui';
import {
  KV_INTRO, KV_BATCH, KV_SLIDERS, KV_BATCH_INFERRED_CONTEXT, kvCacheGB, kvContextSteps, contextLabel,
} from '../data/paper';
import { fmt } from '../lib/fmt';

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
    <div className="flex h-full items-center"><div className="panel flex max-h-full w-full flex-col gap-3 overflow-hidden p-4 lg:gap-6 lg:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted lg:text-sm">KV cache for {v.users} user{v.users > 1 ? 's' : ''} at {contextLabel(v.ctx)} tokens</div>
          <div className="num mt-1 text-4xl font-semibold text-dram3d lg:text-6xl" aria-live="polite">
            {fmt(kv)}<span className="ml-1 text-lg text-muted lg:text-2xl">GB</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge kind="derived" />
          {note && <span className="text-[0.7rem] text-measured">✓ {note}</span>}
        </div>
      </div>

      <div className="space-y-2 lg:space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted"><span>Model weights ({KV_INTRO.precisionLabel})</span><span className="num">{weights} GB</span></div>
          <div className="h-4 rounded bg-surface-2 lg:h-6"><div className="fade h-full rounded bg-faint" style={{ width: `${(weights / max) * 100}%` }} /></div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted"><span>KV cache (one band per user)</span><span className="num">{fmt(kv)} GB</span></div>
          <div className="h-4 rounded bg-surface-2 lg:h-6">
            <div className="fade flex h-full overflow-hidden rounded" style={{ width: `${(kv / max) * 100}%` }}>
              {Array.from({ length: segs }, (_, i) => (
                <div key={i} className="h-full flex-1 border-r border-bg/70 last:border-r-0" style={{ background: 'var(--color-dram3d)', opacity: 0.55 + 0.45 * ((i % 2) ? 0.6 : 1) }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-xs text-muted">
          Context: <span className="num text-ink">{contextLabel(v.ctx)}</span> tokens
          <input type="range" min={0} max={CTX_STEPS.length - 1} step={1}
            value={Math.max(0, CTX_STEPS.indexOf(v.ctx))}
            onChange={(e) => setManual({ ctx: CTX_STEPS[+e.target.value], users: v.users })}
            aria-valuetext={`${contextLabel(v.ctx)} tokens`} />
        </label>
        <label className="text-xs text-muted">
          Users: <span className="num text-ink">{v.users}</span>
          <input type="range" min={KV_SLIDERS.usersMin} max={KV_SLIDERS.usersMax} step={1} value={v.users}
            onChange={(e) => setManual({ ctx: v.ctx, users: +e.target.value })} />
        </label>
      </div>
      <p className="hidden text-[0.7rem] leading-snug text-faint lg:block">
        ≈ {KV_INTRO.mbPerTokenPerUser} MB × tokens × users, for the paper’s {KV_INTRO.modelLabel} example with {KV_INTRO.precisionLabel} storage ({KV_INTRO.layers} layers, {KV_INTRO.kvHeads} KV heads, head size {KV_INTRO.headDim}). <Src>Sec I, Sec III-B</Src>
      </p>
    </div></div>
  );
}

export function S02KVCache() {
  const a = KV_INTRO.anchors;
  return (
    <Scene
      id="kv-cache"
      kicker="2 · The KV cache"
      title="The model’s memory of your conversation keeps growing."
      steps={[
        <p key="a">For every token in a conversation, the model stores notes it will need again: the <Term k="kv">KV cache</Term>. For the paper’s {KV_INTRO.modelLabel} example, that is about <strong className="num">{KV_INTRO.mbPerTokenPerUser} MB per token, per user</strong>, at {KV_INTRO.precisionLabel} precision.</p>,
        <p key="b">Small per token, but contexts are long. One user at {a[0].label} tokens needs about <strong className="num">{a[0].gb} GB</strong>. At {a[1].label} it is <strong className="num">{a[1].gb} GB</strong>. At {a[2].label}, <strong className="num">{a[2].gb} GB</strong>, for a single conversation.</p>,
        <>
          <p key="c">Now serve many people at once. The paper’s example grows from about <strong className="num">{KV_BATCH.batch1GB} GB</strong> for one user to <strong className="num">{KV_BATCH.batch32GB} GB</strong> for {KV_BATCH.batchHigh}. The cache quickly dwarfs the <strong className="num">{KV_INTRO.weightsGB} GB</strong> of model weights.</p>
          <Note>The paper doesn’t say which context length that example uses. Working backwards, it matches {contextLabel(KV_BATCH_INFERRED_CONTEXT)} tokens exactly, so that is what the animation shows. That part is our inference.</Note>
        </>,
        <p key="d">Try it yourself. Every one of these bytes has to be read again for every new token, which is why memory <Term k="capacity">capacity</Term> <em>and</em> <Term k="bandwidth">bandwidth</Term> both matter.</p>,
      ]}
      description={() =>
        `Interactive: sliders for context length and number of users. A bar compares the KV cache size, computed as about ${KV_INTRO.mbPerTokenPerUser} megabytes per token per user, against ${KV_INTRO.weightsGB} gigabytes of model weights. Paper values: ${a.map((x) => `${x.gb} GB at ${x.label}`).join(', ')} for one user; ${KV_BATCH.batch1GB} GB rising to ${KV_BATCH.batch32GB} GB from ${KV_BATCH.batchLow} to ${KV_BATCH.batchHigh} users.`
      }
      visual={(s) => <Visual {...s} />}
    />
  );
}
