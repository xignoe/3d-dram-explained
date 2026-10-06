import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useDesktop, useReducedMotion, hasWebGL } from '../lib/hooks';

/**
 * Renders `children` (a lazily-imported 3D scene) only on desktop-width screens
 * with WebGL and without reduced motion, and only once the slot nears the
 * viewport. Otherwise — and while the 3D chunk loads — shows `fallback`, an
 * equivalent SVG, so the page is fully readable without 3D.
 */
export function Gate3D({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const desktop = useDesktop();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setNear(true);
        io.disconnect();
      }
    }, { rootMargin: '100% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  const use3D = desktop && !reduced && near && hasWebGL();
  return (
    <div ref={ref} className="absolute inset-0">
      {use3D ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}
    </div>
  );
}
