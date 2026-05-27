const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const candidates = [
  "D:\\NotebookLM\\OpticalDetectionReview\\02_work\\page_text.json",
  path.join(root, "source_pages.json")
];
const sourcePath = candidates.find((candidate) => fs.existsSync(candidate));

if (!sourcePath) {
  console.error("No PPT page text source found.");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const pages = raw.pages || raw;

const ranges = [
  { chapterId: "c1", start: 1, end: 4, hint: "系统组成、基本方法、技术特色和已有选择题。", tag: "测量系统" },
  { chapterId: "c2", start: 5, end: 10, hint: "光源分类、光谱选择、气体放电、荧光灯、场致发光。", tag: "非相干光源" },
  { chapterId: "c3", start: 11, end: 23, hint: "He-Ne、半导体激光器、F-P、DFB、DBR、VCSEL、可调谐激光器。", tag: "激光器" },
  { chapterId: "c4", start: 24, end: 33, hint: "LED 机理、特点、发光光谱、驱动电路、LED/LD 对比和选择题。", tag: "LED" },
  { chapterId: "c5", start: 34, end: 47, hint: "外光电效应、内光电效应、光敏电阻、二极管、三极管、光电池、PMT、热释电。", tag: "光电效应" },
  { chapterId: "c6", start: 48, end: 53, hint: "CCD 势阱、感光存储、读出、性能指标、CMOS PPS/APS。", tag: "图像传感器" },
  { chapterId: "c7", start: 54, end: 62, hint: "光栅定义分类、莫尔条纹形成和性质、位移测量、偏折法、轮廓术。", tag: "光栅莫尔" },
  { chapterId: "c8", start: 63, end: 68, hint: "光混频、零差/外差、脉冲测距、相位测距、三维测量方法比较。", tag: "测距三维" }
];

const domainTerms = [
  "测量系统", "传感器", "信号调理", "光学测量", "光纤通信",
  "光源", "相干光源", "非相干光源", "低相干光源", "热辐射", "气体放电", "荧光灯", "场致发光", "光谱功率分布",
  "He-Ne", "氦-氖", "激光器", "半导体激光器", "F-P", "DFB", "DBR", "VCSEL", "可调谐激光器", "Bragg", "布拉格", "阈值电流",
  "LED", "发光二极管", "PN结", "正向偏置", "自发辐射", "受激辐射", "禁带宽度", "限流电阻",
  "光电效应", "外光电效应", "内光电效应", "光电导", "光生伏特", "光敏电阻", "光电二极管", "光电三极管", "光电池", "光电倍增管", "PMT", "热释电",
  "CCD", "MOS", "势阱", "量子效率", "暗流", "Bias", "CMOS", "PPS", "APS",
  "光栅", "栅距", "物理光栅", "计量光栅", "莫尔条纹", "Talbot", "莫尔偏折", "莫尔轮廓术",
  "光混频", "零差", "外差", "多普勒", "脉冲测距", "相位测距", "测尺", "三角法", "干涉法", "飞行时间法"
];

function chapterFor(page) {
  return ranges.find((range) => page >= range.start && page <= range.end) || ranges[0];
}

function cleanLines(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/^[-•\s]+/, "").trim())
    .filter(Boolean)
    .filter((line) => line !== "光电检测技术及应用");
}

function firstTitle(lines, page) {
  const meaningful = lines.filter((line) => {
    if (/^\d+$/.test(line)) return false;
    if (/^[●·]+$/.test(line)) return false;
    if (/^[A-D][.．]/.test(line)) return false;
    return line.length >= 4;
  });
  const titleLine = meaningful.find((line) => /^(\d+(\.\d+)*|[（(].+[）)]|[一二三四五六七八九十]、)/.test(line)) || meaningful[0];
  if (titleLine) return titleLine.slice(0, 42);
  return `${chapterFor(page).tag}：第 ${String(page).padStart(2, "0")} 页`;
}

function keywords(text, fallback) {
  const found = domainTerms.filter((term) => text.includes(term));
  return [...new Set(found)].slice(0, 8).concat(found.length ? [] : [fallback]).slice(0, 8);
}

function compactPoints(lines) {
  const points = [];
  for (const line of lines) {
    if (line.length <= 3) continue;
    if (/^[A-D][.．]/.test(line) && points.length > 0) {
      points[points.length - 1] = `${points[points.length - 1]} ${line}`;
    } else {
      points.push(line);
    }
    if (points.length >= 10) break;
  }
  return points;
}

const pageCards = pages.map((page) => {
  const range = chapterFor(page.page);
  const lines = cleanLines(page.text);
  return {
    page: page.page,
    chapterId: range.chapterId,
    title: firstTitle(lines, page.page),
    keywords: keywords(page.text, range.tag),
    points: compactPoints(lines),
    examHint: range.hint
  };
});

const chapterSupplements = ranges.map((range) => ({
  chapterId: range.chapterId,
  items: pageCards
    .filter((card) => card.chapterId === range.chapterId)
    .map((card) => ({
      page: card.page,
      title: card.title,
      points: card.points.slice(0, 4)
    }))
}));

const calculationQuestions = [
  {
    id: "calc-c3-1",
    chapterId: "c3",
    type: "short",
    subtype: "计算/公式应用",
    prompt: "DFB 激光器满足 Bragg 条件 Λ = mλ/2。若 m=1、有源介质中的波长 λ=1.55 μm，求光栅周期 Λ。",
    answer: "Λ = mλ/2 = 1 × 1.55 μm / 2 = 0.775 μm。答：光栅周期约为 0.775 μm。",
    rubric: ["写出 Bragg 条件 Λ=mλ/2", "正确代入 m=1、λ=1.55 μm", "结果和单位正确"],
    explanation: "PPT 明确给出 DFB 的 Bragg 条件，属于很可能出现的公式应用。"
  },
  {
    id: "calc-c3-2",
    chapterId: "c3",
    type: "short",
    subtype: "计算/公式应用",
    prompt: "DFB 激光器温度漂移约 0.1 nm/℃，普通 F-P 腔约 0.5 nm/℃。温度升高 40 ℃ 时，两者中心波长大约分别漂移多少？",
    answer: "DFB：0.1 × 40 = 4 nm；F-P：0.5 × 40 = 20 nm。说明 DFB 的温度稳定性更好。",
    rubric: ["分别写出两个漂移系数", "正确乘以 40 ℃", "能比较 DFB 更稳定"],
    explanation: "这是 PPT 中给出的数值关系，适合出选择或简答计算。"
  },
  {
    id: "calc-c4-1",
    chapterId: "c4",
    type: "short",
    subtype: "计算/公式应用",
    prompt: "LED 发光波长满足 λ = hc/Eg。取 hc≈1.24 eV·μm，GaAs 的 Eg=1.43 eV，估算发光波长。",
    answer: "λ = 1.24 / 1.43 ≈ 0.867 μm，约为 0.87 μm，即 870 nm。",
    rubric: ["写出 λ=hc/Eg", "正确使用 hc≈1.24 eV·μm", "结果约 0.87 μm 或 870 nm"],
    explanation: "PPT 中给出 GaAs Eg=1.43 eV 的例子，因此计算题概率较高。"
  },
  {
    id: "calc-c5-1",
    chapterId: "c5",
    type: "short",
    subtype: "计算/公式应用",
    prompt: "某光敏电阻在入射光通量 Φ=5 lm 时产生光电流 I光=20 μA，外加电压 U=10 V。求电流灵敏度 SI 和比灵敏度 S比。",
    answer: "SI = I光/Φ = 20 μA / 5 lm = 4 μA/lm；S比 = I光/(ΦU)=20/(5×10)=0.4 μA/(lm·V)，也可写 SI/U=4/10=0.4 μA/(lm·V)。",
    rubric: ["写出 SI=I光/Φ", "写出 S比=I光/(ΦU) 或 SI/U", "计算数值和单位正确"],
    explanation: "PPT 列出了光敏电阻灵敏度公式，容易改成填空或计算。"
  },
  {
    id: "calc-c5-2",
    chapterId: "c5",
    type: "short",
    subtype: "计算/公式应用",
    prompt: "外光电效应中材料逸出功 A=2.0 eV。取 h=4.14×10^-15 eV·s，求阈值频率 ν0，并判断 5.0×10^14 Hz 的光能否产生光电子。",
    answer: "ν0=A/h=2.0/(4.14×10^-15)≈4.83×10^14 Hz。5.0×10^14 Hz 大于阈值频率，因此理论上能产生光电子。",
    rubric: ["写出 ν0=A/h", "正确计算约 4.8×10^14 Hz", "会用入射频率和阈值频率比较"],
    explanation: "PPT 强调外光电效应有低频极限，适合概念+计算结合。"
  },
  {
    id: "calc-c6-1",
    chapterId: "c6",
    type: "short",
    subtype: "计算/公式应用",
    prompt: "CCD 暗流约每降低 5-7 ℃减小一半。若温度降低约 14 ℃，暗流约变为原来的多少？",
    answer: "14 ℃ 约等于两个 7 ℃，暗流减半两次，变为原来的 1/4。",
    rubric: ["知道每 5-7 ℃暗流约减半", "把 14 ℃看作约两次减半", "结果为 1/4"],
    explanation: "这类题不复杂，但很适合考冷却 CCD 的意义。"
  },
  {
    id: "calc-c7-1",
    chapterId: "c7",
    type: "short",
    subtype: "计算/公式应用",
    prompt: "光栅读数头记录到莫尔条纹移动数 N=250，若条纹宽度 w=2 μm，求光栅位移 x。",
    answer: "x = Nw = 250 × 2 μm = 500 μm = 0.5 mm。",
    rubric: ["写出 x=Nw", "正确代入 N 和 w", "结果单位换算正确"],
    explanation: "PPT 明确给出 x=Nw，位移计算很可能作为公式应用出现。"
  },
  {
    id: "calc-c8-1",
    chapterId: "c8",
    type: "short",
    subtype: "计算/公式应用",
    prompt: "脉冲激光测距中测得往返时间 t=2 μs，取光速 c=3.0×10^8 m/s，求目标距离 L。",
    answer: "L=ct/2=(3.0×10^8×2×10^-6)/2=300 m。注意 t 是往返时间，所以要除以 2。",
    rubric: ["写出 L=ct/2", "正确进行 μs 到 s 的换算", "结果为 300 m 并说明除以 2"],
    explanation: "PPT 明确给出脉冲测距公式，是最典型的计算题来源。"
  },
  {
    id: "calc-c8-2",
    chapterId: "c8",
    type: "short",
    subtype: "计算/公式应用",
    prompt: "飞行时间测距中，若计时分辨率 Δt=1 ns，则距离分辨率约为多少？取 c=3.0×10^8 m/s。",
    answer: "ΔL=cΔt/2=(3.0×10^8×1×10^-9)/2=0.15 m。说明飞行时间法远距离可用，但要高时间分辨率。",
    rubric: ["知道距离误差也按往返时间除以 2", "正确换算 ns", "结果约 0.15 m"],
    explanation: "PPT 提到飞行时间法用时间分辨率换距离精度，此题能检验理解。"
  }
];

const calculationGuide = {
  conclusion: "建议保留计算/公式应用题。虽然你给出的考试题型没有单独列“计算题”，但 PPT 中有多处明确公式和数值关系，老师很容易把它们放进填空、单选、解答题或实验数据处理里。",
  likely: true,
  sources: [
    "LED：E=hc/λ、λ=hc/Eg，PPT 给出 GaAs Eg=1.43 eV 例子。",
    "外光电效应：hν=A+1/2mv²、ν0=A/h、λ0=hc/A。",
    "光敏电阻：SI=I光/Φ、SV=U光/Φ、S比=I光/(ΦU)、g=τ/τt。",
    "光栅位移：x=Nw。",
    "激光测距：L=ct/2；相位测距有整周模糊和测尺问题。",
    "CCD：暗流随温度每降低 5-7 ℃约减半。"
  ]
};

const output = `// Generated from ${sourcePath.replace(/\\/g, "\\\\")}\n` +
`COURSE_DATA.source = "以课程 PPT PDF 逐页文本为主整理；共 ${pageCards.length} 页，补充逐页覆盖卡和公式应用题。";\n` +
`COURSE_DATA.pageCards = ${JSON.stringify(pageCards, null, 2)};\n` +
`COURSE_DATA.chapterSupplements = ${JSON.stringify(chapterSupplements, null, 2)};\n` +
`for (const supplement of COURSE_DATA.chapterSupplements) {\n` +
`  const chapter = COURSE_DATA.chapters.find((item) => item.id === supplement.chapterId);\n` +
`  if (chapter) chapter.pptKeyPoints = supplement.items;\n` +
`}\n` +
`COURSE_DATA.calculationGuide = ${JSON.stringify(calculationGuide, null, 2)};\n` +
`COURSE_DATA.questions.push(...${JSON.stringify(calculationQuestions, null, 2)});\n`;

fs.writeFileSync(path.join(root, "site", "ppt-enrichment.js"), output, "utf8");
console.log(`Generated ${pageCards.length} page cards and ${calculationQuestions.length} calculation questions.`);
