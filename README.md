# 3D-DRAM explained

An independent scrollytelling explainer of the ISCA 2026 paper
**“Early Silicon of Raptor: The First 3D-DRAM Accelerator for Generative Inference”**
(Nair et al., d-Matrix / University of British Columbia, DOI [10.1109/ISCA66397.2026.00183](https://doi.org/10.1109/ISCA66397.2026.00183)).

Not affiliated with or endorsed by d-Matrix. All illustrations and text are original.

- Every number on the page comes from [`src/data/paper.ts`](src/data/paper.ts), each with a section/figure/table citation.
- [`STORYBOARD.md`](STORYBOARD.md) describes each scene; [`ACCURACY.md`](ACCURACY.md) lists the accuracy checks and open questions.

## Develop

```bash
npm install
npm run dev
```

`npm run build` produces a static site in `dist/` that can be hosted anywhere. Pushes to `main` deploy to GitHub Pages.

Built with Vite, React, TypeScript, Tailwind, GSAP ScrollTrigger, react-three-fiber and d3.
