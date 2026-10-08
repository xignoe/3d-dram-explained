import { CITATION as C } from '../data/paper';
import { Badge } from './ui';

export function Footer() {
  return (
    <footer className="px-4 pb-20 pt-10 sm:px-6 lg:px-12">
      <div className="mx-auto grid max-w-[1100px] gap-10 border-t-[1.5px] border-ink pt-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="kicker">Source</p>
          <p className="mt-3 text-[1.05rem] leading-relaxed">
            {C.authors.join(', ')}. “{C.title}.” <em>{C.venue}</em>, {C.year}, pp. {C.pages}.{' '}
            <a href={`https://doi.org/${C.doi}`}>doi:{C.doi}</a>
          </p>
          <p className="sans mt-3 text-sm text-muted">All authors are at {C.affiliations[0]}; {C.authors[0]} is also at the {C.affiliations[1]}. <a href={C.pdfUrl}>Read the paper (PDF)</a></p>
        </div>
        <div className="sans text-sm leading-relaxed text-muted">
          <p className="kicker">About this page</p>
          <p className="mt-3">This is an independent explainer. It is not affiliated with or endorsed by d-Matrix, the paper’s authors or the University of British Columbia, and any errors are ours. The text and illustrations are original. All data come from the paper; our own arithmetic and illustrations are labeled, and each figure is marked to show where its numbers come from:</p>
          <ul className="mt-3 space-y-1">
            <li><Badge kind="measured" />: measured on the chip</li>
            <li><Badge kind="modeled" />: from the paper’s models</li>
            <li><Badge kind="derived" />: arithmetic we did on the paper’s numbers</li>
          </ul>
          <p className="mt-4">Guide written and designed by Kevin Quimbo.</p>
        </div>
      </div>
    </footer>
  );
}
