import { PROBLEMS } from '../data/paper';
import { numberWord } from '../lib/fmt';

/** A small typographic index of the four challenges, with the current one marked. */
export function ProblemChips({ active }: { active: number }) {
  return (
    <ol className="sans flex flex-wrap gap-x-4 gap-y-1 text-[0.78rem]" aria-label={`Challenge ${active + 1} of ${PROBLEMS.length}`}>
      {PROBLEMS.map((p, i) => (
        <li key={p.short} className={i === active ? 'font-semibold text-ink underline decoration-[1.5px] underline-offset-4' : 'text-faint'}>
          <span className="num">{i + 1}</span> {p.short}
        </li>
      ))}
    </ol>
  );
}

export function ProblemsBridge() {
  return (
    <section aria-labelledby="problems-title" className="px-4 py-[16svh] sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1100px] border-t-[1.5px] border-ink pt-8">
        <p className="kicker">Interlude</p>
        <h2 id="problems-title" className="mt-3 max-w-[20ch] text-4xl font-medium leading-[1.05] tracking-tight lg:text-6xl">
          Stacking memory under logic created {numberWord(PROBLEMS.length)} new challenges
        </h2>
        <p className="mt-5 max-w-[52ch] text-xl italic leading-snug text-muted">The paper is organized around lessons from early silicon. Each of these challenges needed its own solution, and the next {numberWord(PROBLEMS.length)} sections take them in turn.</p>
        <ol className="mt-12 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p, i) => (
            <li key={p.short} className="border-t border-line py-5">
              <a href={`#${p.scene}`} className="block no-underline">
                <div className="section-num !text-5xl">{i + 1}</div>
                <div className="mt-3 text-xl font-medium text-ink">{p.short}</div>
                <div className="sans mt-2 text-sm leading-snug text-muted">In the paper’s words: “{p.paper}.”</div>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
