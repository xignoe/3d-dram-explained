import { CITATION as C } from '../data/paper';

export function Footer() {
  return (
    <footer className="border-t border-line px-4 py-14 text-sm text-muted lg:px-12">
      <div className="mx-auto max-w-[900px] space-y-4">
        <p className="kicker">Source</p>
        <p className="text-ink">
          {C.authors.join(', ')}. “{C.title}.” <em>{C.venue}</em>, {C.year}, pp. {C.pages}. DOI:{' '}
          <a className="underline decoration-faint underline-offset-2 hover:text-ink" href={`https://doi.org/${C.doi}`}>{C.doi}</a>
        </p>
        <p>Affiliations: {C.affiliations.join(' · ')}. <a className="underline decoration-faint underline-offset-2 hover:text-ink" href={C.pdfUrl}>Read the paper (PDF)</a>.</p>
        <p>This site is an independent explainer. It is not affiliated with or endorsed by d-Matrix. All illustrations and text are original. Numbers come from the paper unless marked <span className="badge badge-derived !py-0">Derived</span>. Badges mark which results were <span className="badge badge-measured !py-0">Measured</span> on silicon and which were <span className="badge badge-modeled !py-0">Modeled</span>.</p>
      </div>
    </footer>
  );
}
