# Boxi Math

Bilingual (English / 中文) K–12 maths videos, organised by stage rather than school year.
Live at <https://boxi-math.github.io>.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

Episode data lives in `src/data/episodes.json`; stage, seed and UI text in `src/data/site.ts`.
Pushing to `main` deploys through GitHub Actions to GitHub Pages.

## License

- Site code: MIT (`LICENSE`).
- Videos and text (episode titles, ideas, stage and seed descriptions): CC BY 4.0, by Boxi Yu (`LICENSE-CONTENT`).
