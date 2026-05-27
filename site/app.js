const STORAGE_KEY = "optical-detection-review-progress-v1";

const state = {
  view: "overview",
  chapterId: "all",
  type: "all",
  currentIndex: 0,
  progress: loadProgress()
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { answers: {}, mistakes: {} };
  } catch {
    return { answers: {}, mistakes: {} };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function getChapter(id) {
  return COURSE_DATA.chapters.find((chapter) => chapter.id === id);
}

function filteredQuestions() {
  return COURSE_DATA.questions.filter((question) => {
    const chapterMatch = state.chapterId === "all" || question.chapterId === state.chapterId;
    const typeMatch = state.type === "all" || question.type === state.type;
    return chapterMatch && typeMatch;
  });
}

function setView(view) {
  state.view = view;
  $$(".tab-button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $$(".view").forEach((section) => section.classList.remove("active"));
  $(`#${view}View`).classList.add("active");
  if (view === "practice") renderQuestion();
  if (view === "mistakes") renderMistakes();
}

function initFilters() {
  const chapterFilter = $("#chapterFilter");
  chapterFilter.innerHTML = [
    `<option value="all">全部章节</option>`,
    ...COURSE_DATA.chapters.map((chapter) => `<option value="${chapter.id}">${chapter.title}</option>`)
  ].join("");

  const typeFilter = $("#typeFilter");
  typeFilter.innerHTML = [
    `<option value="all">全部题型</option>`,
    ...Object.entries(COURSE_DATA.typeLabels).map(([value, label]) => `<option value="${value}">${label}</option>`)
  ].join("");

  chapterFilter.addEventListener("change", () => {
    state.chapterId = chapterFilter.value;
    state.currentIndex = 0;
    renderAll();
  });

  typeFilter.addEventListener("change", () => {
    state.type = typeFilter.value;
    state.currentIndex = 0;
    renderAll();
  });
}

function renderOverview() {
  $("#pageTitle").textContent = COURSE_DATA.title;
  $("#sourceText").textContent = COURSE_DATA.source;
  $("#chapterCount").textContent = `${COURSE_DATA.chapters.length} 个章节`;
  $("#chapterGrid").innerHTML = COURSE_DATA.chapters.map((chapter) => `
    <article class="chapter-card">
      <div class="chapter-card-header">
        <div class="tag">${chapter.pageRange} 页</div>
        <h4>${chapter.title}</h4>
        <p>${chapter.summary}</p>
      </div>
      <details open>
        <summary>核心概念</summary>
        <div class="detail-body">
          <ul>${chapter.coreConcepts.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
      </details>
      <details>
        <summary>公式与数值关系</summary>
        <div class="detail-body">
          ${chapter.formulas.map((formula) => `
            <div class="formula-row">
              <strong>${formula.name}</strong>
              <code class="formula-expression">${formula.expression}</code>
              <span>${formula.note}</span>
            </div>
          `).join("")}
        </div>
      </details>
      <details>
        <summary>理论框架</summary>
        <div class="detail-body">
          <ul>${chapter.framework.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
      </details>
      <details>
        <summary>易错点</summary>
        <div class="detail-body">
          <ul>${chapter.pitfalls.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
      </details>
    </article>
  `).join("");
}

function renderStats() {
  const answers = Object.values(state.progress.answers);
  const done = answers.length;
  const correct = answers.filter((answer) => answer.correct).length;
  const accuracy = done ? Math.round((correct / done) * 100) : 0;
  $("#statTotal").textContent = COURSE_DATA.questions.length;
  $("#statDone").textContent = done;
  $("#statAccuracy").textContent = `${accuracy}%`;
  $("#statMistakes").textContent = Object.keys(state.progress.mistakes).length;
}

function optionLetter(index) {
  return ["A", "B", "C", "D"][index];
}

function normalize(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[，。；：、]/g, "")
    .toLowerCase();
}

function isBlankCorrect(question, value) {
  const normalizedValue = normalize(value);
  return question.answer.some((answer) => normalize(answer) === normalizedValue);
}

function selectedChoiceValues(question) {
  return $$(`input[name="${question.id}"]:checked`).map((input) => Number(input.value)).sort((a, b) => a - b);
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function currentQuestion() {
  const questions = filteredQuestions();
  if (!questions.length) return null;
  state.currentIndex = Math.max(0, Math.min(state.currentIndex, questions.length - 1));
  return questions[state.currentIndex];
}

function renderAnswerArea(question) {
  const saved = state.progress.answers[question.id];
  $("#feedback").hidden = true;
  $("#feedback").className = "feedback";

  if (question.type === "single" || question.type === "multiple") {
    const inputType = question.type === "single" ? "radio" : "checkbox";
    const chosen = saved?.value || [];
    $("#answerArea").innerHTML = question.options.map((option, index) => `
      <label class="option">
        <input type="${inputType}" name="${question.id}" value="${index}" ${chosen.includes(index) ? "checked" : ""}>
        <span>${optionLetter(index)}. ${option}</span>
      </label>
    `).join("");
    if (saved) showChoiceFeedback(question, saved.correct, saved.value);
    return;
  }

  if (question.type === "blank") {
    $("#answerArea").innerHTML = `<input class="blank-input" id="blankAnswer" type="text" autocomplete="off" placeholder="输入答案关键词">`;
    if (saved?.value) $("#blankAnswer").value = saved.value;
    if (saved) showBlankFeedback(question, saved.correct, saved.value);
    return;
  }

  $("#answerArea").innerHTML = `
    <textarea class="essay-input" id="essayAnswer" placeholder="先写自己的答案，再提交查看参考答案。"></textarea>
    <div class="self-score" aria-label="自评">
      <button type="button" data-score="correct">自评正确</button>
      <button type="button" data-score="partial">部分掌握</button>
      <button type="button" data-score="incorrect">需要重练</button>
    </div>
  `;
  if (saved?.value) $("#essayAnswer").value = saved.value;
  $$(".self-score button").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".self-score button").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      recordEssay(question, button.dataset.score);
    });
    if (saved?.score === button.dataset.score) button.classList.add("selected");
  });
  if (saved) showEssayFeedback(question, saved.score || "partial");
}

function renderQuestionList() {
  const questions = filteredQuestions();
  $("#filteredCount").textContent = `${questions.length} 题`;
  $("#questionList").innerHTML = questions.map((question, index) => {
    const saved = state.progress.answers[question.id];
    const dotClass = saved ? (saved.correct ? "correct" : "incorrect") : "";
    return `
      <button type="button" class="${index === state.currentIndex ? "active" : ""}" data-index="${index}">
        <small>${COURSE_DATA.typeLabels[question.type]}</small>
        <span>${question.prompt}</span>
        <i class="status-dot ${dotClass}" aria-hidden="true"></i>
      </button>
    `;
  }).join("");
  $$("#questionList button").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentIndex = Number(button.dataset.index);
      renderQuestion();
    });
  });
}

function renderQuestion() {
  const questions = filteredQuestions();
  const question = currentQuestion();
  renderQuestionList();
  $("#filteredCount").textContent = `${questions.length} 题`;

  if (!question) {
    $("#questionType").textContent = "无题目";
    $("#questionChapter").textContent = "";
    $("#questionProgress").textContent = "";
    $("#questionPrompt").textContent = "当前筛选条件下没有题目。";
    $("#answerArea").innerHTML = "";
    $("#feedback").hidden = true;
    return;
  }

  $("#questionType").textContent = COURSE_DATA.typeLabels[question.type];
  $("#questionChapter").textContent = getChapter(question.chapterId).title;
  $("#questionProgress").textContent = `${state.currentIndex + 1} / ${questions.length}`;
  $("#questionPrompt").textContent = question.prompt;
  renderAnswerArea(question);
}

function feedbackHtml(title, body, extra = "") {
  return `<strong>${title}</strong><div>${body}</div>${extra}`;
}

function showChoiceFeedback(question, correct, value) {
  const answerText = question.answer.map(optionLetter).join("、");
  const chosenText = value.length ? value.map(optionLetter).join("、") : "未选择";
  const feedback = $("#feedback");
  feedback.hidden = false;
  feedback.className = `feedback ${correct ? "correct" : "incorrect"}`;
  feedback.innerHTML = feedbackHtml(
    correct ? "回答正确" : "回答不正确",
    `你的答案：${chosenText}；正确答案：${answerText}。${question.explanation}`
  );
}

function showBlankFeedback(question, correct, value) {
  const feedback = $("#feedback");
  feedback.hidden = false;
  feedback.className = `feedback ${correct ? "correct" : "incorrect"}`;
  feedback.innerHTML = feedbackHtml(
    correct ? "回答正确" : "需要订正",
    `你的答案：${value || "未填写"}；参考答案：${question.answer.join(" / ")}。${question.explanation}`
  );
}

function showEssayFeedback(question, score) {
  const feedback = $("#feedback");
  const correct = score === "correct";
  const partial = score === "partial";
  feedback.hidden = false;
  feedback.className = `feedback ${correct ? "correct" : partial ? "neutral" : "incorrect"}`;
  feedback.innerHTML = feedbackHtml(
    correct ? "自评正确" : partial ? "部分掌握" : "需要重练",
    `<strong>参考答案：</strong>${question.answer}<br><strong>解析：</strong>${question.explanation}`,
    `<ul class="rubric-list">${question.rubric.map((item) => `<li>${item}</li>`).join("")}</ul>`
  );
}

function recordAnswer(question, value, correct) {
  state.progress.answers[question.id] = {
    value,
    correct,
    type: question.type,
    updatedAt: new Date().toISOString()
  };
  if (correct) {
    delete state.progress.mistakes[question.id];
  } else {
    state.progress.mistakes[question.id] = true;
  }
  saveProgress();
  renderStats();
  renderQuestionList();
}

function recordEssay(question, score) {
  const value = $("#essayAnswer")?.value || "";
  const correct = score === "correct";
  state.progress.answers[question.id] = {
    value,
    score,
    correct,
    type: question.type,
    updatedAt: new Date().toISOString()
  };
  if (correct) {
    delete state.progress.mistakes[question.id];
  } else {
    state.progress.mistakes[question.id] = true;
  }
  saveProgress();
  showEssayFeedback(question, score);
  renderStats();
  renderQuestionList();
}

function checkCurrentAnswer() {
  const question = currentQuestion();
  if (!question) return;

  if (question.type === "single" || question.type === "multiple") {
    const value = selectedChoiceValues(question);
    const correct = arraysEqual(value, [...question.answer].sort((a, b) => a - b));
    recordAnswer(question, value, correct);
    showChoiceFeedback(question, correct, value);
    return;
  }

  if (question.type === "blank") {
    const value = $("#blankAnswer").value;
    const correct = isBlankCorrect(question, value);
    recordAnswer(question, value, correct);
    showBlankFeedback(question, correct, value);
    return;
  }

  recordEssay(question, "partial");
}

function renderMistakes() {
  const mistakeIds = new Set(Object.keys(state.progress.mistakes));
  const mistakes = COURSE_DATA.questions.filter((question) => mistakeIds.has(question.id));
  if (!mistakes.length) {
    $("#mistakeList").innerHTML = `<div class="empty-state">还没有错题。练习时答错或主观题标记为“部分掌握/需要重练”后，会出现在这里。</div>`;
    return;
  }
  $("#mistakeList").innerHTML = mistakes.map((question) => `
    <article class="mistake-card">
      <div class="question-meta">
        <span>${COURSE_DATA.typeLabels[question.type]}</span>
        <span>${getChapter(question.chapterId).title}</span>
      </div>
      <h4>${question.prompt}</h4>
      <p><strong>参考答案：</strong>${formatAnswer(question)}</p>
      <p><strong>解析：</strong>${question.explanation}</p>
      <button class="ghost-button" type="button" data-review="${question.id}">去练这题</button>
    </article>
  `).join("");
  $$("[data-review]").forEach((button) => {
    button.addEventListener("click", () => {
      const question = COURSE_DATA.questions.find((item) => item.id === button.dataset.review);
      state.chapterId = "all";
      state.type = "all";
      $("#chapterFilter").value = "all";
      $("#typeFilter").value = "all";
      state.currentIndex = filteredQuestions().findIndex((item) => item.id === question.id);
      setView("practice");
      renderAll();
    });
  });
}

function formatAnswer(question) {
  if (question.type === "single" || question.type === "multiple") {
    return question.answer.map((index) => `${optionLetter(index)}. ${question.options[index]}`).join("；");
  }
  if (question.type === "blank") return question.answer.join(" / ");
  return question.answer;
}

function renderAll() {
  renderOverview();
  renderStats();
  renderQuestion();
  if (state.view === "mistakes") renderMistakes();
}

function bindEvents() {
  $$(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  $("#startPracticeButton").addEventListener("click", () => setView("practice"));
  $("#shuffleButton").addEventListener("click", () => {
    const questions = filteredQuestions();
    if (!questions.length) return;
    state.currentIndex = Math.floor(Math.random() * questions.length);
    setView("practice");
    renderQuestion();
  });
  $("#checkButton").addEventListener("click", checkCurrentAnswer);
  $("#prevButton").addEventListener("click", () => {
    state.currentIndex -= 1;
    renderQuestion();
  });
  $("#nextButton").addEventListener("click", () => {
    state.currentIndex += 1;
    renderQuestion();
  });
  $("#resetProgressButton").addEventListener("click", () => {
    if (!confirm("确定要重置全部练习进度吗？")) return;
    state.progress = { answers: {}, mistakes: {} };
    saveProgress();
    renderAll();
  });
  $("#clearMistakesButton").addEventListener("click", () => {
    state.progress.mistakes = {};
    saveProgress();
    renderStats();
    renderMistakes();
  });
}

initFilters();
bindEvents();
renderAll();
