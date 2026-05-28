const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const site = path.join(root, "site");
const requiredFiles = ["index.html", "styles.css", "data.js", "app.js"];
const requiredSelectors = [
  'id="chapterFilter"',
  'id="typeFilter"',
  'id="overviewView"',
  'id="practiceView"',
  'id="mistakesView"',
  'id="questionPrompt"',
  'id="answerArea"',
  'id="questionList"'
];

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exitCode = 1;
  }
}

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(site, file)), `Missing ${file}`);
}

const html = fs.readFileSync(path.join(site, "index.html"), "utf8");
for (const marker of requiredSelectors) {
  assert(html.includes(marker), `Missing HTML marker ${marker}`);
}
assert(html.includes('<script src="data.js"></script>'), "index.html must load data.js");
assert(html.includes('<script src="app.js"></script>'), "index.html must load app.js");

const dataSource = fs.readFileSync(path.join(site, "data.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${dataSource}\nthis.COURSE_DATA = COURSE_DATA;`, sandbox, { filename: "data.js" });
assert(sandbox.COURSE_DATA.title.includes("光电检测"), "COURSE_DATA title is unexpected.");
assert(sandbox.COURSE_DATA.questions.some((question) => question.type === "experiment"), "No experiment questions found.");

for (const file of ["data.js", "app.js"]) {
  new vm.Script(fs.readFileSync(path.join(site, file), "utf8"), { filename: file });
}

if (!process.exitCode) {
  console.log("Static smoke test passed.");
}
