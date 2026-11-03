// Copies partials/*.html into every page between <!-- partial:NAME --> and <!-- /partial --> markers,
// and marks the current page's nav links with aria-current. Pages stay plain HTML for GitHub Pages.
// Run after editing a partial:  node scripts/build.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const pages = readdirSync(root).filter((f) => f.endsWith(".html") && !f.startsWith("google"));

for (const page of pages) {
  const html = read(page);
  const out = html.replace(/<!-- partial:(\w+) -->[\s\S]*?<!-- \/partial -->/g, (_, name) => {
    const part = read(`partials/${name}.html`).replaceAll(`href="${page}"`, `href="${page}" aria-current="page"`);
    return `<!-- partial:${name} -->\n${part}<!-- /partial -->`;
  });
  if (out !== html) { writeFileSync(new URL(page, root), out); console.log("updated", page); }
}
