import { Component, Suspense, createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useDesktop, useReducedMotion, hasWebGL } from '../lib/hooks';

type Status = 'idle' | 'loading' | 'ready' | 'blank' | 'error';

interface GateSignals {
  /** The canvas has drawn visible pixels. */
  ready: () => void;
  /** The canvas drew nothing, or its WebGL context was lost. */
  fail: (why: string) => void;
}
const GateContext = createContext<GateSignals>({ ready: () => {}, fail: () => {} });
/** Used by 3D scenes to tell the gate whether they actually rendered. */
export const useGateSignals = () => useContext(GateContext);

class Boundary extends Component<{ onError: (why: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { this.props.onError(String(err)); }
  render() { return this.state.failed ? null : this.props.children; }
}


/**
 * Renders `children` (a lazily-imported 3D scene) only on desktop-width screens
 * with WebGL and without reduced motion, and only once the slot nears the
 * viewport. The equivalent SVG `fallback` stays on screen underneath until the
 * 3D scene reports that it has drawn visible pixels, and comes back if the
 * scene errors, draws nothing, or loses its WebGL context. So a browser whose
 * WebGL misbehaves still shows the drawing rather than an empty box.
 */
export function Gate3D({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const desktop = useDesktop();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [why, setWhy] = useState('');
  // Read after hydration so the prerendered HTML matches the first client render.
  const [debug, setDebug] = useState(false);
  useEffect(() => setDebug(/[?&]debug\b/.test(location.search)), []);
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

  const failed = status === 'blank' || status === 'error';
  const use3D = desktop && !reduced && near && hasWebGL() && !failed;
  const signals = useRef<GateSignals>({
    ready: () => setStatus((s) => (s === 'blank' || s === 'error' ? s : 'ready')),
    fail: (w) => { setWhy(w); setStatus('blank'); },
  });
  const onError = (w: string) => { setWhy(w); setStatus('error'); };
  const showing3D = use3D && status === 'ready';

  return (
    <div ref={ref} className="absolute inset-0">
      <div className={`absolute inset-0 transition-opacity duration-500 ${showing3D ? 'opacity-0' : 'opacity-100'}`} aria-hidden={showing3D}>{fallback}</div>
      {use3D && (
        <div className={`absolute inset-0 transition-opacity duration-500 ${showing3D ? 'opacity-100' : 'opacity-0'}`}>
          <Boundary onError={onError}>
            <GateContext.Provider value={signals.current}>
              <Suspense fallback={null}>{children}</Suspense>
            </GateContext.Provider>
          </Boundary>
        </div>
      )}
      {debug && (
        <div className="sans absolute bottom-0 right-0 z-10 bg-bg/90 px-1 text-[10px] text-muted">
          3D: {!desktop ? 'narrow' : reduced ? 'reduced motion' : !hasWebGL() ? 'no WebGL' : !near ? 'waiting' : status}{why ? ` (${why.slice(0, 80)})` : ''}
        </div>
      )}
    </div>
  );
}
