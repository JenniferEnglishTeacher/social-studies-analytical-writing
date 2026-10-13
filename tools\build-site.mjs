import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Usage: node tools/build-site.mjs <toolkit.md>");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const text = fs.readFileSync(sourcePath, "utf8");
const lines = text.split(/\r?\n/);

const clean = value => value
  .replace(/\\([+$()[\].])/g, "$1")
  .replace(/\*\*/g, "")
  .replace(/\*/g, "")
  .replace(/\\_/g, "_")
  .trim();
const cells = line => line.split("|").slice(1, -1).map(value => value.trim());
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 52);

const units = [];
let current = null;
let section = "";
for (const line of lines) {
  if (line.includes("PART 1")) section = "vocabulary";
  if (line.includes("PART 2")) section = "patterns";
  if (line.includes("PART 3")) section = "linking";
  const heading = line.match(/^\*\*(.+)\*\*$/);
  if (heading && !heading[1].includes("PART ")) {
    const title = clean(heading[1]);
    if (section === "vocabulary" && /^\d+\./.test(title)) {
      current = { code: `V${units.filter(u => u.kind === "vocabulary").length + 1}`, kind: "vocabulary", section: "Part 1 · Key Theme Words", title: title.replace(/^\d+\.\s*/, ""), items: [] };
      units.push(current);
    } else if (section === "patterns" && !/^\d+\./.test(title)) {
      current = { code: `P${units.filter(u => u.kind === "patterns").length + 1}`, kind: "patterns", section: "Part 2 · Essay Sentence Patterns", title, items: [] };
      units.push(current);
    }
    continue;
  }
  if (!line.trim().startsWith("|") || /^\|\s*:?-+/.test(line)) continue;
  const row = cells(line);
  if (section === "vocabulary" && current?.kind === "vocabulary" && row.length === 4 && !/^Word$/i.test(row[0])) {
    current.items.push({ id: current.items.length + 1, term: clean(row[0]), pos: clean(row[1]), definition: clean(row[2]), prompt: clean(row[3]) });
  }
  if (section === "patterns" && current?.kind === "patterns" && row.length === 3 && /^\*\*\d+\*\*$/.test(row[0])) {
    const patternMatch = row[1].match(/^\*\*(.*?)\*\*\s*(.*)$/);
    current.items.push({ id: Number(clean(row[0])), term: clean(patternMatch?.[1] || row[1]), pos: "sentence pattern", definition: clean(patternMatch?.[2] || ""), prompt: clean(row[2]) });
  }
  if (section === "linking" && row.length === 3 && !/^Function$/i.test(row[0])) {
    const title = clean(row[0]);
    const expressions = clean(row[1]).split(/,\s*/).filter(Boolean);
    units.push({
      code: `L${units.filter(u => u.kind === "linking").length + 1}`,
      kind: "linking",
      section: "Part 3 · Linking Words",
      title,
      items: expressions.map((prompt, index) => ({ id: index + 1, term: title, pos: "linking expression", definition: clean(row[2]), prompt }))
    });
  }
}

for (const unit of units) {
  unit.slug = `${unit.kind === "vocabulary" ? "vocab" : unit.kind === "patterns" ? "pattern" : "linking"}-${unit.code.toLowerCase()}-${slug(unit.title)}`;
}

const banner = "Generated from Module17_3-4_Writing_Toolkit_Words_and_Patterns.md. Do not edit by hand.";
fs.writeFileSync(path.join(root, "data.js"), `// ${banner}\nwindow.QUIZ_DATA = ${JSON.stringify({ module: "Module 17 · 17-3 & 17-4", title: "Social Studies Analytical Writing Lab", units }, null, 2)};\n`);

const template = unit => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#172554">
  <title>${unit.code} · ${unit.title}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body data-unit="${unit.code}">
  <noscript>This quiz needs JavaScript enabled.</noscript>
  <main id="app"></main>
  <script src="config.js"></script>
  <script src="data.js"></script>
  <script src="quiz.js"></script>
</body>
</html>
`;
for (const unit of units) fs.writeFileSync(path.join(root, `${unit.slug}.html`), template(unit));

const manifest = units.map(unit => `${unit.code}\t${unit.slug}.html\t${unit.items.length}`).join("\n");
fs.writeFileSync(path.join(root, "quiz-manifest.tsv"), `code\tfile\titems\n${manifest}\n`);
console.log(`Built ${units.length} quiz pages with ${units.reduce((sum, unit) => sum + unit.items.length, 0)} prompts.`);
