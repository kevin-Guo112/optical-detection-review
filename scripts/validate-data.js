const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "site", "data.js");
const imageInputDir = path.join(root, "image_inputs");

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (!fs.existsSync(dataPath)) {
  fail(`Missing data file: ${dataPath}`);
  process.exit();
}

const source = fs.readFileSync(dataPath, "utf8");
const enrichmentPath = path.join(root, "site", "ppt-enrichment.js");
const imageQuestionsPath = path.join(root, "site", "image-questions.js");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${source}\nthis.COURSE_DATA = COURSE_DATA;`, sandbox, { filename: dataPath });
if (fs.existsSync(enrichmentPath)) {
  vm.runInContext(fs.readFileSync(enrichmentPath, "utf8"), sandbox, { filename: enrichmentPath });
}
if (fs.existsSync(imageQuestionsPath)) {
  vm.runInContext(fs.readFileSync(imageQuestionsPath, "utf8"), sandbox, { filename: imageQuestionsPath });
}

const data = sandbox.COURSE_DATA;
if (!data || typeof data !== "object") fail("COURSE_DATA must be an object.");
if (!Array.isArray(data.chapters) || data.chapters.length !== 8) fail("Expected exactly 8 chapters.");
if (!Array.isArray(data.questions) || data.questions.length < 96) fail("Expected at least 96 questions after PPT enrichment.");
if (!Array.isArray(data.pageCards) || data.pageCards.length !== 68) fail("Expected exactly 68 PPT page coverage cards.");
if (!Array.isArray(data.chapterSupplements) || data.chapterSupplements.length !== 8) fail("Expected chapter-level PPT supplements.");
if (!data.calculationGuide || data.calculationGuide.likely !== true) fail("Expected calculation guide with likely=true.");
if (!Array.isArray(data.imageQuestionImports)) fail("Expected imageQuestionImports array.");
if (!fs.existsSync(imageInputDir)) fail("Expected image_inputs directory for image-question imports.");

const chapterIds = new Set((data.chapters || []).map((chapter) => chapter.id));
const typeMinimums = {
  single: 20,
  multiple: 16,
  blank: 20,
  short: 20,
  experiment: 8,
};
const typeCounts = {};
const ids = new Set();
const pageQuestionCoverage = new Map();

for (const chapter of data.chapters || []) {
  if (!chapter.id || !chapter.title || !chapter.pageRange) fail(`Invalid chapter metadata: ${JSON.stringify(chapter)}`);
  if (!Array.isArray(chapter.coreConcepts) || chapter.coreConcepts.length < 3) fail(`${chapter.id} needs core concepts.`);
  if (!Array.isArray(chapter.formulas) || chapter.formulas.length < 1) fail(`${chapter.id} needs formulas or numeric relations.`);
  if (!Array.isArray(chapter.framework) || chapter.framework.length < 2) fail(`${chapter.id} needs theory framework.`);
  if (!Array.isArray(chapter.pptKeyPoints) || chapter.pptKeyPoints.length < 1) fail(`${chapter.id} needs PPT key points.`);
}

for (const card of data.pageCards || []) {
  if (!chapterIds.has(card.chapterId)) fail(`Page card ${card.page} references unknown chapter ${card.chapterId}.`);
  if (!card.page || !card.title || !Array.isArray(card.points) || card.points.length < 1) fail(`Invalid page card ${card.page}.`);
}

for (const question of data.questions || []) {
  if (!question.id || ids.has(question.id)) fail(`Missing or duplicate question id: ${question.id}`);
  ids.add(question.id);
  if (!chapterIds.has(question.chapterId)) fail(`${question.id} references unknown chapter ${question.chapterId}.`);
  if (!question.type) fail(`${question.id} is missing type.`);
  typeCounts[question.type] = (typeCounts[question.type] || 0) + 1;
  if (!question.prompt || !question.explanation) fail(`${question.id} needs prompt and explanation.`);
  if (!Array.isArray(question.coverageTags) || question.coverageTags.length < 1) fail(`${question.id} needs coverageTags.`);
  if (question.sourcePage) {
    pageQuestionCoverage.set(question.sourcePage, (pageQuestionCoverage.get(question.sourcePage) || 0) + 1);
  }

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
    const completenessPrompt = /完整列出|全部|哪些|基本性质|共同特点|主要特点|优点包括|缺点包括|分类包括|方法包括/.test(question.prompt);
    if (completenessPrompt && String(question.answer[0]).length < 8) {
      fail(`${question.id} fill blank asks for a list/concept but answer is too short for exam-style completeness.`);
    }
  }

  if (question.type === "short" || question.type === "experiment") {
    if (!question.answer || !Array.isArray(question.rubric) || question.rubric.length < 2) fail(`${question.id} needs model answer and rubric.`);
  }
}

const calculationCount = (data.questions || []).filter((question) => question.subtype === "计算/公式应用").length;
if (calculationCount < 8) fail(`Expected at least 8 calculation/application questions, got ${calculationCount}.`);

for (const card of data.pageCards || []) {
  if (!pageQuestionCoverage.has(card.page)) fail(`PPT page ${card.page} has no linked question coverage.`);
}

for (const [type, minimum] of Object.entries(typeMinimums)) {
  if ((typeCounts[type] || 0) < minimum) fail(`Expected at least ${minimum} questions for type ${type}, got ${typeCounts[type] || 0}.`);
}

if (!process.exitCode) {
  console.log(`Validated ${data.questions.length} questions across ${data.chapters.length} chapters.`);
  console.log(JSON.stringify(typeCounts));
  console.log(`PPT page coverage: ${pageQuestionCoverage.size}/${data.pageCards.length}`);
  console.log(`Calculation/application questions: ${calculationCount}`);
  console.log(`Image imports tracked: ${data.imageQuestionImports.length}`);
}
