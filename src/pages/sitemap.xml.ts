import type { APIRoute } from "astro";
import { LANGS, STAGES, SEEDS, episodes } from "../data/site";

// Every public page in both languages (the local review area is not listed).
export const GET: APIRoute = ({ site }) => {
  const paths = [
    "",
    "about/",
    ...STAGES.map((s) => `stages/${s.n}/`),
    ...SEEDS.map((s) => `seeds/${s.id}/`),
    ...episodes.map((e) => `ep/${e.slug}/`),
  ];
  const urls = LANGS.flatMap((lang) => paths.map((p) => new URL(`/${lang}/${p}`, site).href));
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
