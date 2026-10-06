import { PROBLEMS } from '../data/paper';
import { numberWord } from '../lib/fmt';

/** Chips showing the four integration problems, with the current one highlighted. */
export function ProblemChips({ active }: { active: number }) {
  return (
    <span className="mb-3 flex flex-wrap gap-1.5" aria-label={`Problem ${active + 1} of ${PROBLEMS.length}`}>
      {PROBLEMS.map((p, i) => (
        <span key={p.short} className={`rounded-full border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider ${i === active ? 'border-ink bg-ink text-bg' : 'border-line text-faint'}`}>
          {i + 1} · {p.short}
        </span>
      ))}
    </span>
  );
}

export function ProblemsBridge() {
  return (
    <section aria-labelledby="problems-title" className="border-t border-line/60 px-4 py-[18svh] lg:px-12">
      <div className="mx-auto max-w-[1100px]">
        <p className="kicker">Interlude</p>
        <h2 id="problems-title" className="max-w-[22ch] text-3xl font-semibold tracking-tight lg:text-5xl">
          Stacking memory under logic creates {numberWord(PROBLEMS.length)} new problems.
        </h2>
        <p className="mt-4 max-w-[60ch] text-lg text-muted">The paper is a set of lessons from the first silicon. Each problem below got its own fix.</p>
        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p, i) => (
            <li key={p.short} className="panel p-4">
              <a href={`#${p.scene}`} className="block">
                <div className="num text-3xl text-faint">{i + 1}</div>
                <div className="mt-2 font-semibold text-ink">{p.short}</div>
                <div className="mt-1 text-sm text-muted">Paper: “{p.paper}”</div>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
