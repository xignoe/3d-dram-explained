import { useEffect, useRef } from 'react';

/** Thin reading-progress bar; updates via transform only (no React re-render). */
export function ProgressBar() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        if (ref.current) ref.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      });
    };
    on();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); };
  }, []);
  return <div ref={ref} aria-hidden className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left scale-x-0 bg-dram3d/80" />;
}
