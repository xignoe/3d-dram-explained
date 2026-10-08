import { lazy, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Gate3D } from '../components/Gate3D';
import { Badge, Chef, Term } from '../components/ui';
import { CITATION, HERO, HIERARCHY, PROBLEMS } from '../data/paper';
import { numberWord, fmt } from '../lib/fmt';
import { useInView } from '../lib/hooks';
import { P } from '../lib/palette';

gsap.registerPlugin(ScrollTrigger);
const HeroChiplet = lazy(() => import('../three/HeroChiplet'));

/** Line-drawn exploded chiplet (fallback and first paint). */
function HeroSvg() {
  const bumps = Array.from({ length: 17 }, (_, i) => i);
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
      <g transform="translate(200 150)" stroke={P.ink} strokeWidth="1.1" strokeLinejoin="round">
        <path d="M-150 -70 L0 -125 L150 -70 L0 -15 Z" fill={P.logic} />
        <path d="M-150 -70 L0 -15 L0 -5 L-150 -60 Z" fill={P.logicDark} />
        <path d="M150 -70 L0 -15 L0 -5 L150 -60 Z" fill={P.logicDark} />
        {bumps.map((i) => {
          const x = -136 + (i / (bumps.length - 1)) * 272;
          const y = 0 - Math.abs(x) * 0.36;
          return <line key={i} x1={x} y1={y - 20} x2={x} y2={y + 46} stroke={P.ink3} strokeWidth="0.8" />;
        })}
        <path d="M-150 40 L0 -15 L150 40 L0 95 Z" fill={P.dramTint} />
        <g stroke={P.dramMid} strokeWidth="0.5" opacity="0.7">
          {Array.from({ length: 13 }, (_, i) => {
            const t = (i + 1) / 14;
            return (
              <g key={i}>
                <line x1={-150 + 150 * t} y1={40 - 55 * t} x2={0 + 150 * t} y2={95 - 55 * t} />
                <line x1={-150 + 150 * t} y1={40 + 55 * t} x2={0 + 150 * t} y2={-15 + 55 * t} />
              </g>
            );
          })}
        </g>
        <path d="M-150 40 L0 95 L0 105 L-150 50 Z" fill={P.dramMid} />
        <path d="M150 40 L0 95 L0 105 L150 50 Z" fill={P.dramMid} />
      </g>
      <g className="svg-label" fontStyle="italic">
        <text x="360" y="58" textAnchor="end">logic die</text>
        <text x="372" y="236" textAnchor="end">DRAM die</text>
      </g>
    </svg>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const explode = useRef(1);
  const inView = useInView(ref, '0px');

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true,
        onUpdate: (self) => { explode.current = 1 - self.progress * 0.85; },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <header ref={ref} className="px-4 sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1320px]">
        <div className="flex items-baseline justify-between border-b border-ink py-3">
          <span className="text-lg italic">Raptor, explained</span>
          <span className="sans hidden text-xs text-muted sm:inline">A reader’s guide to an ISCA {CITATION.year} paper</span>
        </div>

        <div className="grid gap-10 pb-16 pt-10 lg:min-h-[86svh] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pt-6">
          <div>
            <p className="kicker">The memory wall</p>
            <h1 className="mt-4 max-w-[15ch] text-[2.75rem] font-medium leading-[1.02] tracking-[-0.022em] sm:text-6xl lg:text-[5.1rem]">
              Running a language model is largely a memory problem.
            </h1>
            <p className="mt-6 max-w-[36ch] text-[1.35rem] italic leading-snug text-muted">
              Raptor, a chip from d-Matrix, puts its memory directly underneath its processor. This is an independent guide to why that helps, and to how its designers addressed the {numberWord(PROBLEMS.length)} engineering challenges it created.
            </p>
            <p className="sans mt-6 max-w-[52ch] text-sm leading-relaxed text-muted">
              Based on “<a href={`https://doi.org/${CITATION.doi}`}>{CITATION.title}</a>,” by {CITATION.authors[0]} and {numberWord(CITATION.authors.length - 1)} colleagues at {CITATION.affiliations[0]} (Nair is also at the {CITATION.affiliations[1]}), presented at ISCA {CITATION.year}. The paper reports about{' '}
              <span className="num text-ink">{HERO.bandwidthPerCardTBs} TB/s</span> of memory <Term k="bandwidth">bandwidth</Term> per card.
            </p>
            <div className="max-w-[40ch]">
              <Chef>A picture worth keeping in mind: a chef who can cook any dish instantly but has to fetch every ingredient first. How quickly the kitchen works depends almost entirely on where the ingredients are kept.</Chef>
            </div>
            <div className="sans mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
              <span>How to read the figures:</span>
              <Badge kind="measured" /><Badge kind="modeled" /><Badge kind="derived" />
            </div>
          </div>

          <figure className="flex flex-col" aria-label={`Illustration: one Raptor chiplet pulled apart, a logic die floating above a DRAM die with ${fmt(HIERARCHY.chiplet.banks)} memory banks, joined by a dense array of tiny vertical connectors.`}>
            <div className="fig-head"><span className="fig-label">Fig. 0</span></div>
            <div className="relative h-[34svh] lg:h-[52svh]">
              <Gate3D fallback={<div className="absolute inset-0 grid place-items-center p-4"><HeroSvg /></div>}>
                <HeroChiplet explodeRef={explode} active={inView} />
              </Gate3D>
            </div>
            <figcaption className="fig-caption">One Raptor chiplet, with its two dies pulled apart. The logic die sits face to face on a DRAM die whose surface is divided into {fmt(HIERARCHY.chiplet.banks)} banks, and a dense array of microscopic bumps connects the two.</figcaption>
          </figure>
        </div>
      </div>
    </header>
  );
}
