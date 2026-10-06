import { Scene, type SceneState } from '../components/Scene';
import { Chef, Term } from '../components/ui';
import { TOY } from '../data/illustrative';
import { useDesktop } from '../lib/hooks';

const CHIP_W = 64, CHIP_H = 30, GAP = 6, H = 420;
const MEM_Y = 320;

function rowX(W: number, n: number, i: number) {
  const total = n * CHIP_W + (n - 1) * GAP;
  return (W - total) / 2 + i * (CHIP_W + GAP);
}

function Visual({ step, progress }: SceneState) {
  const narrow = !useDesktop();
  const W = narrow ? 360 : 600;
  const perRow = narrow ? Math.ceil(TOY.replyTokens.length / 2) : TOY.replyTokens.length;
  const replyPos = (i: number) => ({
    x: rowX(W, perRow, i % perRow),
    y: 144 + Math.floor(i / perRow) * (CHIP_H + 12),
  });
  const prompt = TOY.promptTokens, reply = TOY.replyTokens;
  const prefillLit = step >= 1;
  const shown = step < 2 ? 0 : step === 2 ? Math.max(1, Math.ceil(progress * reply.length)) : reply.length;
  const latest = shown - 1;
  const kvFrac = (prompt.length + shown) / (prompt.length + reply.length);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden>
      <text x={20} y={36} className="svg-label">Prompt</text>
      <text x={20} y={136} className="svg-label">Reply</text>
      <text x={W - 20} y={36} textAnchor="end" className="svg-label">
        trips to memory: <tspan className="svg-num" fill="var(--color-ink)" fontSize="15">{(prefillLit ? 1 : 0) + shown}</tspan>
      </text>

      {/* Prefill: one wide band, all tokens at once */}
      <path
        d={`M${rowX(W, prompt.length, 0)} ${74} L${rowX(W, prompt.length, prompt.length - 1) + CHIP_W} ${74} L${W - 70} ${MEM_Y} L${70} ${MEM_Y} Z`}
        fill="var(--color-logic)"
        className="fade"
        opacity={step === 1 ? 0.12 + progress * 0.1 : 0}
      />

      {prompt.map((t, i) => (
        <g key={t + i} transform={`translate(${rowX(W, prompt.length, i)} 44)`}>
          <rect width={CHIP_W} height={CHIP_H} rx={7} className="fade"
            fill={prefillLit ? 'var(--color-surface-2)' : 'transparent'}
            stroke={prefillLit ? 'var(--color-logic)' : 'var(--color-line)'} />
          <text x={CHIP_W / 2} y={20} textAnchor="middle" fontSize="13" fill={prefillLit ? 'var(--color-ink)' : 'var(--color-faint)'}>{t}</text>
        </g>
      ))}

      {/* Decode: one trip per token */}
      {reply.map((t, i) => {
        const { x, y } = replyPos(i);
        const on = i < shown;
        return (
          <g key={t + i}>
            <line x1={x + CHIP_W / 2} y1={y + CHIP_H} x2={x + CHIP_W / 2} y2={MEM_Y} stroke="var(--color-dram3d)" strokeOpacity={on ? (i === latest && step === 2 ? 0.7 : 0.18) : 0} strokeDasharray="3 4" className="fade" />
            <g transform={`translate(${x} ${y})`} className="fade" opacity={on ? 1 : 0.15}>
              <rect width={CHIP_W} height={CHIP_H} rx={7} fill={on ? 'var(--color-surface-2)' : 'transparent'} stroke={on ? 'var(--color-dram3d)' : 'var(--color-line)'} strokeDasharray={on ? undefined : '3 3'} />
              <text x={CHIP_W / 2} y={20} textAnchor="middle" fontSize="13" fill={on ? 'var(--color-ink)' : 'var(--color-faint)'}>{on ? t : ''}</text>
            </g>
            {on && i === latest && step === 2 && (
              <circle cx={x + CHIP_W / 2} cy={y + CHIP_H + 4} r={5} fill="var(--color-dram3d)"
                style={{ animation: 'trip 1.1s ease-in-out infinite', ['--trip-dist' as string]: `${MEM_Y - y - CHIP_H - 12}px` }} />
            )}
          </g>
        );
      })}

      {/* Memory */}
      <g transform={`translate(${narrow ? 10 : 60} ${MEM_Y})`}>
        <rect width={W - (narrow ? 20 : 120)} height={70} rx={12} fill="var(--color-surface)" stroke={step === 3 ? 'var(--color-dram3d)' : 'var(--color-line)'} className="fade" />
        <rect x={10} y={40} width={(W - (narrow ? 40 : 140)) * 0.55} height={18} rx={4} fill="var(--color-faint)" opacity={0.6} />
        <rect x={10 + (W - (narrow ? 40 : 140)) * 0.55 + 4} y={40} width={Math.max(0, ((W - (narrow ? 40 : 140)) * 0.45 - 4) * kvFrac)} height={18} rx={4} fill="var(--color-dram3d)" className="fade" />
        <text x={14} y={26} className="svg-label">Memory</text>
        <text x={10 + (W - (narrow ? 40 : 140)) * 0.55 - 4} y={26} textAnchor="end" fontSize="11" fill="var(--color-muted)">model weights</text>
        <text x={W - (narrow ? 30 : 130)} y={26} textAnchor="end" fontSize="11" fill="var(--color-dram3d)">KV cache (grows)</text>
      </g>
    </svg>
  );
}

export function S01PrefillDecode() {
  return (
    <Scene
      id="phases"
      kicker="1 · Two phases"
      title="Reading the prompt is a burst. Writing the reply is a slog."
      steps={[
        <p key="a">When you send a prompt, a language model does two very different jobs: it first <strong>reads</strong> your prompt, then <strong>writes</strong> a reply one <Term k="token">token</Term> at a time.</p>,
        <p key="b">Reading (“prefill”) handles every prompt token <strong>at the same time</strong>. That is a big, parallel pile of math, and chips are excellent at it. This phase is limited by compute.</p>,
        <p key="c">Writing (“decode”) is sequential. Each new token depends on all the ones before it, so they come out one by one, and <strong>every single token</strong> requires another trip to memory to fetch the model’s weights and its notes on the conversation so far.</p>,
        <>
          <p key="d">Those notes are the <Term k="kv">KV cache</Term>, and it grows with every token. The math per token is quick. The waiting is not: the paper’s opening line is that generative inference is <strong>largely memory-bound</strong>.</p>
          <Chef>The chef plates each dish in an instant, then walks back to the pantry for the next one. All the time goes into walking.</Chef>
        </>,
      ]}
      description={(s) =>
        s.step < 2
          ? 'Diagram: five prompt tokens light up together and share a single wide connection to memory.'
          : 'Diagram: reply tokens appear one at a time; each one draws its own dashed line down to memory, and a counter of memory trips rises. The KV cache bar in memory grows with each token.'
      }
      visual={(s) => <Visual {...s} />}
    />
  );
}
