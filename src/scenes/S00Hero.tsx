import { lazy, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Gate3D } from '../components/Gate3D';
import { Chef, Term } from '../components/ui';
import { CITATION, HERO, PROBLEMS } from '../data/paper';
import { numberWord } from '../lib/fmt';
import { useInView } from '../lib/hooks';

gsap.registerPlugin(ScrollTrigger);
const HeroChiplet = lazy(() => import('../three/HeroChiplet'));

/** Static SVG version of the exploded chiplet (fallback + first paint). */
function HeroSvg() {
  const bumps = Array.from({ length: 19 }, (_, i) => i);
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
      <g transform="translate(200 150)">
        {/* logic die */}
        <path d="M-150 -70 L0 -125 L150 -70 L0 -15 Z" fill="#2a303e" stroke="#4a5266" />
        <path d="M-150 -70 L0 -15 L0 -5 L-150 -60 Z" fill="#1d222d" />
        <path d="M150 -70 L0 -15 L0 -5 L150 -60 Z" fill="#232937" />
        {/* bumps */}
        {bumps.map((i) => {
          const t = i / (bumps.length - 1);
          const x = -140 + t * 280;
          const y = 0 - Math.abs(x) * 0.36;
          return <line key={i} x1={x} y1={y - 22} x2={x} y2={y + 48} stroke="#b9c2d6" strokeOpacity="0.55" strokeWidth="1.5" />;
        })}
        {/* DRAM die */}
        <path d="M-150 40 L0 -15 L150 40 L0 95 Z" fill="#123b31" stroke="#3fd6a4" strokeOpacity="0.5" />
        <path d="M-150 40 L0 95 L0 105 L-150 50 Z" fill="#0d2a23" />
        <path d="M150 40 L0 95 L0 105 L150 50 Z" fill="#0f3029" />
      </g>
      <text x="355" y="62" textAnchor="end" className="svg-label">logic die</text>
      <text x="355" y="208" textAnchor="end" className="svg-label">3D-DRAM die</text>
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
        trigger: ref.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => { explode.current = 1 - self.progress * 0.85; },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <header ref={ref} className="relative isolate min-h-svh overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[30svh] opacity-90 md:inset-y-0 md:left-[38%] md:h-auto" role="img" aria-label="Illustration: a computing chip floating above a memory chip, joined by a field of tiny vertical connectors.">
        <Gate3D fallback={<div className="absolute inset-0 grid place-items-center p-6"><HeroSvg /></div>}>
          <HeroChiplet explodeRef={explode} active={inView} />
        </Gate3D>
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 hidden bg-gradient-to-r from-bg via-bg/40 to-transparent md:block" />
      <div className="mx-auto flex min-h-svh max-w-[1440px] flex-col justify-start px-4 pb-12 pt-[31svh] md:justify-center md:pb-16 md:pt-24 lg:px-12">
        <p className="kicker">An explainer of “{CITATION.title}” · ISCA {CITATION.year}</p>
        <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
          AI inference is limited by moving data, not by math.
        </h1>
        <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-muted">
          Raptor, a chip from d-Matrix, stacks its memory directly underneath its compute, reaching about{' '}
          <span className="num text-dram3d">{HERO.bandwidthPerCardTBs} TB/s</span> of memory{' '}
          <Term k="bandwidth">bandwidth</Term> per card. This page explains why that matters, the {numberWord(PROBLEMS.length)} problems it created,
          and how the first silicon solved them.
        </p>
        <div className="max-w-[46ch]">
          <Chef>Picture a chef who cooks instantly but must fetch every ingredient from a pantry. The cooking is never the slow part.</Chef>
        </div>
        <p className="mt-10 text-sm text-faint" aria-hidden>Scroll ↓</p>
      </div>
    </header>
  );
}
