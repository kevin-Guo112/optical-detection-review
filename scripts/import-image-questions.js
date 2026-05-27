const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const inputArg = process.argv[2] || path.join(root, "image_inputs");
const inputPath = path.resolve(inputArg);
const outputPath = path.join(root, "image_inputs", "imported-image-questions.json");
const siteOutputPath = path.join(root, "site", "image-questions.js");
const imageExts = new Set([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"]);

function listImages(target) {
  if (!fs.existsSync(target)) {
    console.error(`Input path does not exist: ${target}`);
    process.exit(1);
  }
  const stat = fs.statSync(target);
  if (stat.isFile()) return imageExts.has(path.extname(target).toLowerCase()) ? [target] : [];
  return fs.readdirSync(target, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(target, entry.name);
      if (entry.isDirectory()) return listImages(full);
      return imageExts.has(path.extname(entry.name).toLowerCase()) ? [full] : [];
    });
}

function commandExists(command) {
  const result = spawnSync("where.exe", [command], { encoding: "utf8" });
  return result.status === 0;
}

function classify(text) {
  const content = text || "";
  if (/CCD|CMOS|MOS|势阱|像素/.test(content)) return "c6";
  if (/光栅|莫尔|Talbot|轮廓/.test(content)) return "c7";
  if (/测距|测速|外差|零差|飞行时间|三角法/.test(content)) return "c8";
  if (/光电|光敏|PMT|二极管|三极管|热释电/.test(content)) return "c5";
  if (/LED|发光二极管|禁带|正向偏置/.test(content)) return "c4";
  if (/激光|He-Ne|DFB|DBR|VCSEL|F-P/.test(content)) return "c3";
  if (/光源|荧光灯|气体放电|场致发光/.test(content)) return "c2";
  return "c1";
}

function inferType(text) {
  if (/A[.．].*B[.．].*C[.．].*D[.．]/s.test(text || "")) return "single";
  if (/填空|____|_{2,}/.test(text || "")) return "blank";
  if (/实验|设计|步骤|误差/.test(text || "")) return "experiment";
  return "short";
}

function tryOcr(image) {
  if (!commandExists("tesseract")) return { available: false, text: "" };
  const result = spawnSync("tesseract", [image, "stdout", "-l", "chi_sim+eng"], { encoding: "utf8" });
  if (result.status !== 0) return { available: true, text: "", error: result.stderr.trim() };
  return { available: true, text: result.stdout.trim() };
}

const images = listImages(inputPath);
const imported = images.map((image, index) => {
  const ocr = tryOcr(image);
  const relativePath = path.relative(root, image).replace(/\\/g, "/");
  const text = ocr.text || "";
  return {
    id: `image-${String(index + 1).padStart(3, "0")}`,
    imagePath: relativePath,
    status: text ? "ocr_ready" : "needs_transcription",
    ocrAvailable: ocr.available,
    ocrError: ocr.error || "",
    rawText: text,
    suggestedChapterId: classify(text || relativePath),
    suggestedType: inferType(text),
    notes: text ? "Review OCR text before adding to the live question bank." : "OCR not available or no text found; transcribe the question text here."
  };
});

const readyQuestions = imported
  .filter((item) => item.status === "ocr_ready")
  .map((item) => ({
    id: `img-${item.id}`,
    chapterId: item.suggestedChapterId,
    type: item.suggestedType,
    sourceType: "image",
    imagePath: item.imagePath,
    coverageTags: ["图片导入", item.suggestedChapterId],
    prompt: item.rawText,
    answer: item.suggestedType === "single" || item.suggestedType === "multiple" ? [0] : "请根据图片原题人工校对标准答案。",
    options: item.suggestedType === "single" || item.suggestedType === "multiple" ? ["待校对选项 A", "待校对选项 B", "待校对选项 C", "待校对选项 D"] : undefined,
    rubric: item.suggestedType === "short" || item.suggestedType === "experiment" ? ["人工校对题干", "补充标准答案", "确认所属章节"] : undefined,
    explanation: "该题由图片 OCR 导入，请人工校对题干、选项和答案后再作为正式题目使用。"
  }));

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), source: inputPath, imported }, null, 2), "utf8");
fs.writeFileSync(siteOutputPath, `COURSE_DATA.imageQuestionImports = ${JSON.stringify(imported, null, 2)};\nCOURSE_DATA.questions.push(...${JSON.stringify(readyQuestions, null, 2)});\n`, "utf8");
console.log(`Imported ${imported.length} image file(s) into ${outputPath}`);
if (!commandExists("tesseract")) {
  console.log("OCR engine tesseract was not found. Entries are marked needs_transcription.");
}
