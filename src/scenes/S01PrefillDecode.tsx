import { Scene, type SceneState } from '../components/Scene';
import { Chef, Term } from '../components/ui';
import { TOY } from '../data/illustrative';
import { useDesktop } from '../lib/hooks';
import { P } from '../lib/palette';

const TOKEN_H = 26, TOKEN_GAP = 6;

/** Token chips laid out in rows that fit `width`, centred. */
function tokenLayout(words: readonly string[], width: number, x0: number, y0: number) {
  const w = (t: string) => Math.max(34, t.length * 8.2 + 16);
  const rows: { t: string; x: number; y: number; w: number }[][] = [[]];
  let x = 0;
  words.forEach((t) => {
    if (x + w(t) > width && rows[rows.length - 1].length) { rows.push([]); x = 0; }
    rows[rows.length - 1].push({ t, x, y: 0, w: w(t) });
    x += w(t) + TOKEN_GAP;
  });
  return rows.flatMap((r, ri) => {
    const used = r.reduce((a, c) => a + c.w + TOKEN_GAP, -TOKEN_GAP);
    return r.map((c) => ({ ...c, x: x0 + (width - used) / 2 + c.x, y: y0 + ri * (TOKEN_H + 8) }));
  });
}

function Pins({ x, y, w, h, n }: { x: number; y: number; w: number; h: number; n: number }) {
  return (
    <g stroke={P.ink} strokeWidth={1}>
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 1) / (n + 1);
        return (
          <g key={i}>
            <line x1={x + w * t} x2={x + w * t} y1={y - 6} y2={y} />
            <line x1={x + w * t} x2={x + w * t} y1={y + h} y2={y + h + 6} />
            <line y1={y + h * t} y2={y + h * t} x1={x - 6} x2={x} />
            <line y1={y + h * t} y2={y + h * t} x1={x + w} x2={x + w + 6} />
          </g>
        );
      })}
    </g>
  );
}

function Visual({ step, progress, reduced }: SceneState) {
  const narrow = !useDesktop();
  const W = narrow ? 380 : 600, H = 430;
  const prompt = TOY.promptTokens, reply = TOY.replyTokens;
  const prefillLit = step >= 1;
  const shown = step < 2 ? 0 : step === 2 ? Math.max(1, Math.ceil(progress * reply.length)) : reply.length;
  const kvFrac = (prompt.length + shown) / (prompt.length + reply.length);

  // Two chips: processor on the left, memory on the right.
  const proc = { x: narrow ? 28 : 70, y: 150, w: narrow ? 120 : 150, h: 120 };
  const mem = { x: narrow ? 214 : 360, y: 140, w: narrow ? 140 : 180, h: 140 };
  const promptT = tokenLayout(prompt, W - 40, 20, 40);
  const replyT = tokenLayout(reply, W - 40, 20, 340);
  const go = `M${proc.x + proc.w + 8} ${proc.y + 40} C ${proc.x + proc.w + 60} ${proc.y + 10}, ${mem.x - 60} ${mem.y + 20}, ${mem.x - 8} ${mem.y + 45}`;
  const back = `M${mem.x - 8} ${mem.y + 95} C ${mem.x - 60} ${mem.y + 120}, ${proc.x + proc.w + 60} ${proc.y + 110}, ${proc.x + proc.w + 8} ${proc.y + 80}`;
  const busy = step === 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden>
      <defs>
        <path id="trip-go" d={go} />
        <path id="trip-back" d={back} />
        <marker id="ar1" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill={P.ink2} /></marker>
      </defs>

      <text x={20} y={24} className="svg-label">prompt</text>
      {promptT.map((c, i) => (
        <g key={i} className="fade" opacity={prefillLit ? 1 : 0.45}>
          <rect x={c.x} y={c.y} width={c.w} height={TOKEN_H} rx={2} fill={prefillLit ? P.sramTint : P.paper} stroke={P.ink} strokeWidth={1} />
          <text x={c.x + c.w / 2} y={c.y + 17} textAnchor="middle" fontSize="14" fontStyle="italic" style={{ fontFamily: 'var(--font-serif)' }} fill={P.ink}>{c.t}</text>
          {/* prefill: every prompt token flows into the processor together */}
          <path d={`M${c.x + c.w / 2} ${c.y + TOKEN_H} C ${c.x + c.w / 2} ${c.y + 70}, ${proc.x + proc.w / 2} ${proc.y - 50}, ${proc.x + proc.w / 2} ${proc.y - 10}`}
            fill="none" stroke={P.sram} strokeWidth={1.2} className="fade" opacity={step === 1 ? 0.9 : 0} markerEnd="url(#ar1)" />
        </g>
      ))}

      {/* processor */}
      <Pins {...proc} n={6} />
      <rect x={proc.x} y={proc.y} width={proc.w} height={proc.h} rx={3} fill={P.logic} stroke={P.ink} strokeWidth={1.4} />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={proc.x + 14 + (i % 4) * ((proc.w - 28) / 4)} y={proc.y + 16 + Math.floor(i / 4) * 24} width={(proc.w - 28) / 4 - 6} height={18} fill={busy || step === 1 ? P.te : P.plate} stroke={P.ink3} strokeWidth={0.8} className="fade" />
      ))}
      <text x={proc.x + proc.w / 2} y={proc.y + proc.h - 12} textAnchor="middle" fontSize="13" fill={P.ink}>processor</text>

      {/* memory chip with weights and a growing KV cache */}
      <Pins {...mem} n={7} />
      <rect x={mem.x} y={mem.y} width={mem.w} height={mem.h} rx={3} fill={P.paper} stroke={P.ink} strokeWidth={step === 3 ? 2.2 : 1.4} className="fade" />
      <text x={mem.x + mem.w / 2} y={mem.y + 20} textAnchor="middle" fontSize="13" fill={P.ink}>memory</text>
      <rect x={mem.x + 12} y={mem.y + 32} width={mem.w - 24} height={44} fill={P.logicDark} stroke={P.ink} strokeWidth={0.8} />
      <text x={mem.x + mem.w / 2} y={mem.y + 58} textAnchor="middle" fontSize="11" fill={P.paper}>model weights</text>
      <rect x={mem.x + 12} y={mem.y + 84} width={mem.w - 24} height={42} fill={P.plate} stroke={P.ink3} strokeWidth={0.8} strokeDasharray="3 3" />
      <rect x={mem.x + 12} y={mem.y + 84} width={(mem.w - 24) * kvFrac} height={42} fill={P.dramTint} stroke={P.dram} strokeWidth={0.8} className="fade" />
      <text x={mem.x + mem.w / 2} y={mem.y + 109} textAnchor="middle" fontSize="11" fill={P.dram}>KV cache</text>

      {/* the round trip made for every decoded token */}
      <use href="#trip-go" fill="none" stroke={P.ink2} strokeWidth={1.2} strokeDasharray="3 4" opacity={step >= 1 ? 1 : 0.25} markerEnd="url(#ar1)" className="fade" />
      <use href="#trip-back" fill="none" stroke={P.dram} strokeWidth={1.6} opacity={step >= 1 ? 1 : 0.25} markerEnd="url(#ar1)" className="fade" />
      <text x={(proc.x + proc.w + mem.x) / 2} y={proc.y - 2} textAnchor="middle" fontSize="11" fill={P.ink2} fontStyle="italic" style={{ fontFamily: 'var(--font-serif)' }}>request</text>
      <text x={(proc.x + proc.w + mem.x) / 2} y={proc.y + proc.h + 14} textAnchor="middle" fontSize="11" fill={P.dram} fontStyle="italic" style={{ fontFamily: 'var(--font-serif)' }}>{narrow ? 'data' : 'weights and KV cache'}</text>
      {busy && !reduced && (
        <g key={shown}>
          <circle r={4} fill={P.ink2}><animateMotion dur="0.7s" repeatCount="1" fill="freeze"><mpath href="#trip-go" /></animateMotion></circle>
          <circle r={5} fill={P.dram} opacity={0}>
            <animate attributeName="opacity" from="1" to="1" begin="0.7s" dur="0.01s" fill="freeze" />
            <animateMotion dur="0.8s" begin="0.7s" repeatCount="1" fill="freeze"><mpath href="#trip-back" /></animateMotion>
          </circle>
        </g>
      )}

      <text x={W - 20} y={24} textAnchor="end" className="svg-label">
        trips to memory <tspan className="svg-num" fill={P.ink} fontSize="17" fontWeight={600}>{(prefillLit ? 1 : 0) + shown}</tspan>
      </text>

      <text x={20} y={326} className="svg-label">reply</text>
      {replyT.map((c, i) => {
        const on = i < shown;
        return (
          <g key={i} className="fade" opacity={on ? 1 : 0.35}>
            <rect x={c.x} y={c.y} width={c.w} height={TOKEN_H} rx={2} fill={on ? P.dramTint : P.paper} stroke={on ? P.dram : P.rule} strokeDasharray={on ? undefined : '3 3'} />
            <text x={c.x + c.w / 2} y={c.y + 17} textAnchor="middle" fontSize="14" fontStyle="italic" style={{ fontFamily: 'var(--font-serif)' }} fill={P.ink}>{on ? c.t : ''}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function S01PrefillDecode() {
  return (
    <Scene
      id="phases"
      num={1}
      kicker="Two phases"
      title="Reading a prompt and writing a reply are different kinds of work"
      steps={[
        <p key="a">When you send a prompt to a language model, it does two separate jobs. It first reads the whole prompt, and then it writes the reply one <Term k="token">token</Term> at a time. The two jobs make very different demands on the hardware.</p>,
        <p key="b">The first job, called prefill, processes every token of the prompt at once. That amounts to a large batch of matrix multiplication, which is what accelerators are designed for, so this phase is usually limited by how much arithmetic the chip can do.</p>,
        <p key="c">The second job, decode, can’t be parallelized in the same way, because each new token depends on the ones before it. To produce a token, the chip reads the model’s weights and the stored state of the conversation from memory, and then it does the same again for the next token, and the one after that.</p>,
        <>
          <p key="d">That stored state is the <Term k="kv">KV cache</Term>, and it grows as the conversation gets longer. The arithmetic for each token takes very little time; most of the time goes to waiting for data. The paper begins from this observation, describing generative inference as “largely memory-bound.”</p>
          <Chef>In the kitchen analogy, each token is one dish. The chef prepares it almost immediately, then goes back to fetch the ingredients for the next one.</Chef>
        </>,
      ]}
      description={(s) =>
        s.step < 2
          ? 'Diagram: five prompt tokens light up together and share a single wide connection to memory.'
          : 'Diagram: reply tokens appear one at a time; each one draws its own dashed line down to memory, and a counter of memory trips rises. The KV cache bar in memory grows with each token.'
      }
      visual={(s) => <Visual {...s} />}
      figure={(s) => ({
        caption: s.step < 2
          ? <>During prefill, all of the prompt’s tokens are processed together in a single pass.</>
          : <>During decode, each new token needs its own trip to memory, and the KV cache grows with every token.</>,
      })}
    />
  );
}
