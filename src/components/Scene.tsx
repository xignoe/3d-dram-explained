import { useLayoutEffect, useRef, useState, useId, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion, useInView } from '../lib/hooks';

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

interface SceneProps {
  id: string;
  kicker?: ReactNode;
  title: ReactNode;
  steps: ReactNode[];
  /** Accessible text description of the visual for the current step. */
  description: (s: SceneState) => string;
  visual: (s: SceneState) => ReactNode;
}

/**
 * Sticky visual + scrolling text steps. ScrollTrigger tracks which step is in
 * focus and scrubs progress through it; CSS `position: sticky` does the pinning
 * so layout stays robust on mobile and on resize.
 */
export function Scene({ id, kicker, title, steps, description, visual }: SceneProps) {
  const stepsRef = useRef<HTMLDivElement>(null);
  const figRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [rawProgress, setRawProgress] = useState(0);
  const reduced = useReducedMotion();
  const inView = useInView(figRef, '0px');
  const descId = useId();

  useLayoutEffect(() => {
    const root = stepsRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 1024px)', narrow: '(max-width: 1023px)' }, (ctx) => {
      const line = ctx.conditions?.wide ? '62%' : '82%';
      const blocks = gsap.utils.toArray<HTMLElement>('[data-step]', root);
      blocks.forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: `top ${line}`,
          end: `bottom ${line}`,
          onToggle: (self) => {
            if (self.isActive) setStep(i);
          },
          onUpdate: (self) => {
            if (self.isActive) setRawProgress(Math.round(self.progress * 100) / 100);
          },
        });
      });
    }, root);
    return () => mm.revert();
  }, [steps.length]);

  const state: SceneState = { step, progress: reduced ? 1 : rawProgress, reduced, inView };
  const last = steps.length - 1;

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="relative border-t border-line/60">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 px-4 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-14 lg:px-12">
        <figure
          ref={figRef}
          aria-describedby={descId}
          className="sticky top-0 z-10 -mx-4 h-[52svh] bg-bg px-4 pt-2 pb-2 lg:col-start-2 lg:row-start-1 lg:mx-0 lg:h-svh lg:px-0 lg:py-[8svh]"
        >
          <p id={descId} className="sr-only" aria-live="polite">{description(state)}</p>
          <div className="relative h-full w-full">{visual(state)}</div>
        </figure>
        <div ref={stepsRef} className="relative z-0 lg:col-start-1 lg:row-start-1">
          {steps.map((s, i) => (
            <div
              key={i}
              id={`${id}-step-${i}`}
              data-step
              className={`flex min-h-[72svh] items-start lg:min-h-[88svh] ${i === 0 ? 'pt-[4svh] lg:pt-[30svh]' : ''} ${i === last ? 'pb-[24svh]' : ''}`}
            >
              <div className={`step-card ${i === step ? 'is-active' : ''}`}>
                {i === 0 && (
                  <header className="mb-4">
                    {kicker && <p className="kicker">{kicker}</p>}
                    <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight text-ink lg:text-[2.1rem] lg:leading-tight">
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
