const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "site", "data.js");

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (!fs.existsSync(dataPath)) {
  fail(`Missing data file: ${dataPath}`);
  process.exit();
}

const source = fs.readFileSync(dataPath, "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${source}\nthis.COURSE_DATA = COURSE_DATA;`, sandbox, { filename: dataPath });

const data = sandbox.COURSE_DATA;
if (!data || typeof data !== "object") fail("COURSE_DATA must be an object.");
if (!Array.isArray(data.chapters) || data.chapters.length !== 8) fail("Expected exactly 8 chapters.");
if (!Array.isArray(data.questions) || data.questions.length < 70) fail("Expected at least 70 questions.");

const chapterIds = new Set((data.chapters || []).map((chapter) => chapter.id));
const typeMinimums = {
  single: 20,
  multiple: 16,
  blank: 20,
  short: 12,
  experiment: 8,
};
const typeCounts = {};
const ids = new Set();

for (const chapter of data.chapters || []) {
  if (!chapter.id || !chapter.title || !chapter.pageRange) fail(`Invalid chapter metadata: ${JSON.stringify(chapter)}`);
  if (!Array.isArray(chapter.coreConcepts) || chapter.coreConcepts.length < 3) fail(`${chapter.id} needs core concepts.`);
  if (!Array.isArray(chapter.formulas) || chapter.formulas.length < 1) fail(`${chapter.id} needs formulas or numeric relations.`);
  if (!Array.isArray(chapter.framework) || chapter.framework.length < 2) fail(`${chapter.id} needs theory framework.`);
}

for (const question of data.questions || []) {
  if (!question.id || ids.has(question.id)) fail(`Missing or duplicate question id: ${question.id}`);
  ids.add(question.id);
  if (!chapterIds.has(question.chapterId)) fail(`${question.id} references unknown chapter ${question.chapterId}.`);
  if (!question.type) fail(`${question.id} is missing type.`);
  typeCounts[question.type] = (typeCounts[question.type] || 0) + 1;
  if (!question.prompt || !question.explanation) fail(`${question.id} needs prompt and explanation.`);

  if (question.type === "single" || question.type === "multiple") {
    if (!Array.isArray(question.options) || question.options.length !== 4) fail(`${question.id} must have exactly 4 options.`);
    if (!Array.isArray(question.answer) || question.answer.length < 1) fail(`${question.id} needs answer indexes.`);
    for (const index of question.answer) {
      if (!Number.isInteger(index) || index < 0 || index > 3) fail(`${question.id} has invalid answer index ${index}.`);
    }
    if (question.type === "single" && question.answer.length !== 1) fail(`${question.id} single choice must have one answer.`);
    if (question.type === "multiple" && question.answer.length < 2) fail(`${question.id} multiple choice must have at least two answers.`);
  }

  if (question.type === "blank") {
    if (!Array.isArray(question.answer) || question.answer.length < 1) fail(`${question.id} fill blank needs answer strings.`);
  }

  if (question.type === "short" || question.type === "experiment") {
    if (!question.answer || !Array.isArray(question.rubric) || question.rubric.length < 2) fail(`${question.id} needs model answer and rubric.`);
  }
}

for (const [type, minimum] of Object.entries(typeMinimums)) {
  if ((typeCounts[type] || 0) < minimum) fail(`Expected at least ${minimum} questions for type ${type}, got ${typeCounts[type] || 0}.`);
}

if (!process.exitCode) {
  console.log(`Validated ${data.questions.length} questions across ${data.chapters.length} chapters.`);
  console.log(JSON.stringify(typeCounts));
}
