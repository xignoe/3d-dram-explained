import { Hero } from './scenes/S00Hero';
import { S01PrefillDecode } from './scenes/S01PrefillDecode';
import { S02KVCache } from './scenes/S02KVCache';
import { S03Pantry } from './scenes/S03Pantry';
import { S04Stacking } from './scenes/S04Stacking';
import { S05Zoom } from './scenes/S05Zoom';
import { ProblemsBridge } from './components/Problems';
import { S06StreamBlocking } from './scenes/S06StreamBlocking';
import { S07StreamFlipping } from './scenes/S07StreamFlipping';
import { S08BankChaining } from './scenes/S08BankChaining';
import { S09Heat } from './scenes/S09Heat';
import { S10Silicon } from './scenes/S10Silicon';
import { S11Cards } from './scenes/S11Cards';
import { S12Results } from './scenes/S12Results';
import { S13Pairings } from './scenes/S13Pairings';
import { Footer } from './components/Footer';
import { ProgressBar } from './components/ProgressBar';
import { useScrollRefresh } from './lib/useScrollRefresh';

export default function App() {
  useScrollRefresh();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <ProgressBar />
      <Hero />
      <main id="main">
        <S01PrefillDecode />
        <S02KVCache />
        <S03Pantry />
        <S04Stacking />
        <S05Zoom />
        <ProblemsBridge />
        <S06StreamBlocking />
        <S07StreamFlipping />
        <S08BankChaining />
        <S09Heat />
        <S10Silicon />
        <S11Cards />
        <S12Results />
        <S13Pairings />
      </main>
      <Footer />
    </>
  );
}
