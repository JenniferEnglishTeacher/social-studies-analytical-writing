import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
for (const file of ["index.html","dashboard.html","styles.css","dashboard.js","quiz.js","data.js","config.js","server.mjs","Start Website.cmd"]) {
  if (!fs.existsSync(path.join(root,file))) errors.push(`Missing ${file}`);
}
const context = {window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,"data.js"),"utf8"), context);
const data = context.window.QUIZ_DATA;
if (!data?.units?.length) errors.push("No quiz units found");
const codes = new Set();
let prompts = 0;
for (const unit of data?.units || []) {
  if (codes.has(unit.code)) errors.push(`Duplicate unit code ${unit.code}`);
  codes.add(unit.code);
  if (!unit.items?.length) errors.push(`${unit.code} has no prompts`);
  const page = path.join(root,`${unit.slug}.html`);
  if (!fs.existsSync(page)) errors.push(`Missing page for ${unit.code}`);
  for (const item of unit.items || []) {
    prompts++;
    for (const key of ["term","pos","prompt"]) if (!item[key]) errors.push(`${unit.code} item ${item.id} missing ${key}`);
  }
}
const quiz = fs.readFileSync(path.join(root,"quiz.js"),"utf8");
for (const marker of ["speechSynthesis","SpeechRecognition","getUserMedia","minimumSpeakingScore","wordHints","answerKey.hidden = true","mode:\"no-cors\"","localStorage"]) {
  if (!quiz.includes(marker)) errors.push(`quiz.js missing ${marker}`);
}
const dashboard = fs.readFileSync(path.join(root,"dashboard.html"),"utf8");
if (!dashboard.includes("dashboard.js")) errors.push("Dashboard script is not linked");
if (errors.length) { errors.forEach(error => console.error(`- ${error}`)); process.exit(1); }
console.log(JSON.stringify({units:data.units.length,prompts,pages:data.units.length + 2,dictationGate:true,speakingGate:60,status:"valid"},null,2));
