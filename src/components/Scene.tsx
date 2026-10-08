import { useEffect, useLayoutEffect, useRef, useState, useId, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion, useInView } from '../lib/hooks';
import type { Evidence } from '../data/paper';
import { Badge } from './ui';

gsap.registerPlugin(ScrollTrigger);

export interface SceneState {
  /** Index of the text step currently in focus. */
  step: number;
  /** Scrub progress (0–1) through the active step. Always 1 under reduced motion. */
  progress: number;
  reduced: boolean;
  /** Whether the visual is on screen (pause loops when false). */
  inView: boolean;
}

export interface FigureInfo {
  caption: ReactNode;
  evidence?: Evidence;
}

interface SceneProps {
  id: string;
  /** Section number shown as a large italic numeral. */
  num: number;
  /** Short section name, set in small caps above the title. */
  kicker: ReactNode;
  /** Optional line above the kicker (e.g. "Challenge 2 of 4"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  steps: ReactNode[];
  /** Accessible text description of the visual for the current step. */
  description: (s: SceneState) => string;
  visual: (s: SceneState) => ReactNode;
  /** Caption and evidence mark for the figure, per step. */
  figure: (s: SceneState) => FigureInfo;
}

/**
 * Sticky figure + scrolling text, laid out like a printed feature: the figure
 * has a numbered heading rule and a caption; the text column carries the story.
 * ScrollTrigger tracks the step in focus; CSS `position: sticky` does the pinning.
 */
export function Scene({ id, num, kicker, eyebrow, title, steps, description, visual, figure }: SceneProps) {
  const stepsRef = useRef<HTMLDivElement>(null);
  const figRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [rawProgress, setRawProgress] = useState(0);
  const reduced = useReducedMotion();
  const inView = useInView(figRef, '0px');
  const descId = useId();
  // Figures render client-side only; the prerendered HTML carries the text, which keeps first paint light.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const root = stepsRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 1024px)', narrow: '(max-width: 1023px)' }, (ctx) => {
      const line = ctx.conditions?.wide ? '62%' : '82%';
      gsap.utils.toArray<HTMLElement>('[data-step]', root).forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: `top ${line}`,
          end: `bottom ${line}`,
          onToggle: (self) => { if (self.isActive) setStep(i); },
          onUpdate: (self) => { if (self.isActive) setRawProgress(Math.round(self.progress * 100) / 100); },
        });
      });
    }, root);
    return () => mm.revert();
  }, [steps.length]);

  const state: SceneState = { step, progress: reduced ? 1 : rawProgress, reduced, inView };
  const fig = figure(state);
  const last = steps.length - 1;

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="relative">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 px-4 sm:px-6 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-20 lg:px-12">
        <figure
          ref={figRef}
          aria-describedby={descId}
          className="sticky top-0 z-10 -mx-4 flex h-[58svh] flex-col bg-bg px-4 pb-2 pt-3 sm:-mx-6 sm:px-6 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:h-svh lg:px-0 lg:py-[7svh]"
        >
          <p id={descId} className="sr-only" aria-live="polite">{description(state)}</p>
          <div className="fig-head">
            <span className="fig-label">Fig. {num}</span>
            {fig.evidence && <Badge kind={fig.evidence} />}
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden py-3 lg:py-5">{mounted && visual(state)}</div>
          <figcaption className="fig-caption line-clamp-3 lg:line-clamp-none">{fig.caption}</figcaption>
        </figure>
        <div ref={stepsRef} className="relative z-0 lg:col-start-1 lg:row-start-1">
          {steps.map((s, i) => (
            <div
              key={i}
              id={`${id}-step-${i}`}
              data-step
              className={`flex min-h-[70svh] items-start lg:min-h-[86svh] ${i === 0 ? 'pt-[4svh] lg:pt-[26svh]' : ''} ${i === last ? 'pb-[22svh]' : ''}`}
            >
              <div className={`step-card ${i === step ? 'is-active' : ''}`}>
                {i === 0 && (
                  <header className="mb-6 text-ink">
                    <div className="flex items-end gap-4">
                      <span className="section-num" aria-hidden>{num}</span>
                      <span className="kicker pb-1.5">{kicker}</span>
                    </div>
                    {eyebrow && <div className="mt-3">{eyebrow}</div>}
                    <h2 id={`${id}-title`} className="mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.015em] lg:text-[2.6rem]">
                      {title}
                    </h2>
                  </header>
                )}
                <div className="step-body">{s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Scroll a scene's step into view (used by breadcrumbs). */
export function scrollToStep(sceneId: string, step: number, reduced: boolean) {
  document.getElementById(`${sceneId}-step-${step}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}
