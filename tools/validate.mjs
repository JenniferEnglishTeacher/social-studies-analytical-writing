import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
for (const file of ["index.html","dashboard.html","styles.css","dashboard.js","quiz.js","data.js","config.js","server.mjs","Start Website.cmd"]) {
  if (!fs.existsSync(path.join(root,file))) errors.push(`Missing ${file}`);
}
const dataFiles = process.argv.slice(2).length ? process.argv.slice(2) : ["data.js"];
const context = {window:{}};
vm.createContext(context);
for (const dataFile of dataFiles) vm.runInContext(fs.readFileSync(path.join(root,dataFile),"utf8"), context);
const data = context.window.QUIZ_DATA;
if (!data?.units?.length) errors.push("No quiz units found");
const codes = new Set();
let prompts = 0;
let blanks = 0;
const normalize = value => (String(value).match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/)?.[0] || "").toLowerCase().replace(/’/g,"'");
const forbidden = new Set([
  "azamgarh","baron","benjamin","browne","calcutta","cambridge","chunder","constantinople","curzon","disraeli","dutt","edward",
  "george","hamilton","hassan","india","john","london","macaulay","mirza","nathaniel","nicholas","paul","queen","reuter","romesh",
  "rothschild","russia","russell","seymour","shah","shirazi","sir","tsar","thomas","victoria",
  "america","asia","britain","burma","cambodia","china","christ","chulalongkorn","cleveland","congress","dole",
  "eduardo","europe","ferry","france","furnivall","galeano","germany","god","hawaii","honolulu","india","indochina",
  "indonesia","james","java","jules","liliuokalani","malaya","malaysia","mckinley","mongkut","netherlands","panama",
  "philippines","portugal","raffles","roosevelt","rusling","saigon","sanford","siam","singapore","somerset","spain",
  "stamford","states","theodore","uruguay","vietnam",
  "january","february","march","april","may","june","july","august","september","october","november","december"
]);
for (const unit of data?.units || []) {
  if (codes.has(unit.code)) errors.push(`Duplicate unit code ${unit.code}`);
  codes.add(unit.code);
  if (unit.kind === "essay" && unit.code !== "17-3-S1" && unit.hintCase !== "source") errors.push(`${unit.code} must preserve source capitalization in hints`);
  if (!unit.items?.length) errors.push(`${unit.code} has no prompts`);
  const page = path.join(root,`${unit.slug}.html`);
  if (!fs.existsSync(page)) errors.push(`Missing page for ${unit.code}`);
  for (const item of unit.items || []) {
    prompts++;
    for (const key of ["term","pos","prompt"]) if (!item[key]) errors.push(`${unit.code} item ${item.id} missing ${key}`);
    if (!item.blankWords?.length) errors.push(`${unit.code} item ${item.id} has no focus-word blanks`);
    if (item.blankWords?.length > 10) errors.push(`${unit.code} item ${item.id} has more than 10 blanks`);
    const promptWords = (item.prompt.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g) || []).map(normalize);
    for (const word of item.blankWords || []) {
      const normalized = normalize(word);
      blanks++;
      if (!promptWords.includes(normalized)) errors.push(`${unit.code} item ${item.id} blank not found: ${word}`);
      if (forbidden.has(normalized) || /^\d+$/.test(normalized)) errors.push(`${unit.code} item ${item.id} blanks a name/date/year: ${word}`);
    }
  }
}
const quiz = fs.readFileSync(path.join(root,"quiz.js"),"utf8");
for (const marker of ["speechSynthesis","SpeechRecognition","getUserMedia","minimumSpeakingScore","clozeSentence","blank-input","answerKey.hidden = true","mode:\"no-cors\"","localStorage"]) {
  if (!quiz.includes(marker)) errors.push(`quiz.js missing ${marker}`);
}
const dashboard = fs.readFileSync(path.join(root,"dashboard.html"),"utf8");
if (!dashboard.includes("dashboard.js")) errors.push("Dashboard script is not linked");
if (errors.length) { errors.forEach(error => console.error(`- ${error}`)); process.exit(1); }
console.log(JSON.stringify({dataFiles,units:data.units.length,prompts,focusWordBlanks:blanks,maxBlanksPerSentence:10,pages:data.units.length + 2,focusWordGate:true,speakingGate:60,status:"valid"},null,2));
