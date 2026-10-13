(() => {
  const config = window.SITE_CONFIG || {};
  const unit = window.QUIZ_DATA.units.find(item => item.code === document.body.dataset.unit);
  if (!unit) throw new Error("Quiz unit not found.");
  const app = document.querySelector("#app");
  const progressKey = "ssaw-progress";
  const allProgress = JSON.parse(localStorage.getItem(progressKey) || "{}");
  const saved = allProgress[unit.code] || {};
  const state = {
    index: saved.completed ? 0 : Math.min(saved.itemIndex || 0, unit.items.length - 1),
    typingScores: saved.typingScores || [],
    speakingScores: saved.speakingScores || [],
    typingCaptured: false,
    speakingBest: 0,
    listening: false,
    recognition: null,
    finished: false
  };

  const escapeHtml = value => String(value).replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
  const tokens = value => (String(value).match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g) || []).map(token => token.toLowerCase().replace(/’/g, "'"));
  const similarity = (expected, actual) => {
    const a = tokens(expected), b = tokens(actual);
    const dp = Array.from({length:a.length + 1}, (_, i) => Array(b.length + 1).fill(0).map((_, j) => i || j));
    for (let i=1;i<=a.length;i++) for (let j=1;j<=b.length;j++) dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return Math.max(0, Math.round((1 - dp[a.length][b.length] / Math.max(a.length, b.length, 1)) * 100));
  };
  const average = scores => scores.length ? Math.round(scores.reduce((a,b)=>a+b,0) / scores.length) : 0;
  const save = completed => {
    const progress = JSON.parse(localStorage.getItem(progressKey) || "{}");
    progress[unit.code] = { itemIndex: completed ? unit.items.length : state.index, completed: Boolean(completed), typingScores: state.typingScores, speakingScores: state.speakingScores };
    localStorage.setItem(progressKey, JSON.stringify(progress));
  };
  const say = text => {
    if (!("speechSynthesis" in window)) return showFeedback("Audio playback is unavailable in this browser.", "error");
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = config.speechLanguage || "en-US";
    utterance.rate = .82;
    speechSynthesis.speak(utterance);
  };
  const wordHints = text => tokens(text).map(word => `<span class="word-hint" aria-label="word beginning with ${word[0]}">${escapeHtml(word[0].toUpperCase() + "_".repeat(Math.max(1, word.length - 1)))}</span>`).join("");

  function render() {
    stopRecognition();
    const item = unit.items[state.index];
    state.typingCaptured = state.typingScores[state.index] !== undefined;
    state.speakingBest = state.speakingScores[state.index] || 0;
    const wordCount = tokens(item.prompt).length;
    const currentSection = item.essaySection || unit.section;
    const sectionSentence = item.sectionSentence || state.index + 1;
    const sectionCount = item.sectionCount || unit.items.length;
    const nextItem = unit.items[state.index + 1];
    const nextLabel = state.index === unit.items.length - 1 ? "Finish essay" : nextItem?.essaySection && nextItem.essaySection !== currentSection ? `Next section: ${nextItem.essaySection} →` : "Next sentence →";
    app.className = "quiz-shell";
    app.innerHTML = `<header class="quiz-header"><div><a class="back" href="dashboard.html">← Dashboard</a><p class="eyebrow">${escapeHtml(unit.section)} · ${unit.code}</p><h1>${escapeHtml(unit.title)}</h1><div class="quiz-meta">Listen, type every word, then read the completed phrase aloud.</div></div><div class="student-bar"><label for="studentName">Name</label><input id="studentName" autocomplete="name" value="${escapeHtml(localStorage.getItem("ssaw-student-name") || "")}" placeholder="Required"></div></header>
      <section class="progress-panel"><div class="progress-row"><span>${escapeHtml(currentSection)} · Sentence ${sectionSentence} of ${sectionCount}</span><span>Essay ${state.index + 1}/${unit.items.length}</span></div><div class="progress-track"><span style="width:${(state.index / unit.items.length) * 100}%"></span></div><div class="stepper"><div id="dictationStep" class="step active">1 · Listen & dictate</div><div id="speakingStep" class="step">2 · Read aloud ≥ ${config.minimumSpeakingScore || 60}%</div></div></section>
      <article class="prompt-card">
        <div class="hint-grid"><div class="hint"><small>${unit.kind === "essay" ? "Essay section" : unit.kind === "vocabulary" ? "Word / concept" : "Language tool"}</small><strong>${escapeHtml(item.term)}</strong></div><div class="hint"><small>${unit.kind === "essay" ? "Position" : "Part of speech / type"}</small><strong>${escapeHtml(item.pos)}</strong></div><div class="hint"><small>${unit.kind === "essay" ? "Purpose of this sentence" : "Definition / 中文提示"}</small><strong>${escapeHtml(item.definition || "—")}</strong></div></div>
        ${unit.kind === "essay" ? `<p class="section-focus"><strong>Section focus:</strong> ${escapeHtml(item.focus || "")}</p>` : ""}
        <div class="listen-row"><button id="listen" class="button" type="button">🔊 Listen</button><span><strong>${wordCount} words</strong> · replay as many times as needed</span></div>
        <div class="word-hints" aria-label="First-letter hints">${wordHints(item.prompt)}</div>
        <label for="dictation"><strong>Type the complete phrase or sentence</strong></label><textarea id="dictation" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="Write all ${wordCount} words before checking."></textarea>
        <div id="typingFeedback" class="feedback" role="status"></div>
        <div id="answerKey" class="answer-key" hidden aria-live="polite"><small>Answer key — correct the sentence from memory</small><div>${escapeHtml(item.prompt)}</div></div>
        <button id="check" class="button" type="button">Check dictation</button>
        <section id="speechBox" class="speech-box" hidden><h2>Now read it aloud</h2><p>Listen once more if needed, then use a current version of Chrome or Edge and allow microphone access.</p><div class="listen-row"><button id="speakListen" class="button secondary" type="button">🔊 Hear sentence</button><button id="record" class="button success" type="button">🎙 Start speaking</button><button id="stop" class="button secondary" type="button" disabled>Stop</button><span id="speechScore" class="score-pill">Best: ${state.speakingBest}%</span></div><label for="transcript"><strong>Speech transcript</strong></label><textarea id="transcript" placeholder="Your recognized speech appears here. You may correct recognition errors before scoring."></textarea><div id="speechFeedback" class="feedback" role="status"></div><button id="scoreSpeech" class="button" type="button">Score transcript</button></section>
        <div class="nav-row"><button id="restart" class="button secondary" type="button">Restart sentence</button><button id="next" class="button" type="button" disabled>${escapeHtml(nextLabel)}</button></div>
      </article>`;
    bind(item, wordCount);
  }

  function bind(item, wordCount) {
    const $ = selector => app.querySelector(selector);
    $("#studentName").addEventListener("input", event => localStorage.setItem("ssaw-student-name", event.target.value.trim()));
    $("#listen").addEventListener("click", () => say(item.prompt));
    $("#speakListen").addEventListener("click", () => say(item.prompt));
    const answerKey = $("#answerKey");
    ["copy","cut","contextmenu","dragstart"].forEach(type => answerKey.addEventListener(type, event => event.preventDefault()));
    $("#dictation").addEventListener("input", () => { answerKey.hidden = true; $("#typingFeedback").textContent = ""; });
    $("#check").addEventListener("click", () => {
      const name = $("#studentName").value.trim();
      if (!name) { showFeedback("Enter your name before checking your answer.", "warn", "#typingFeedback"); $("#studentName").focus(); return; }
      const response = $("#dictation").value;
      const count = tokens(response).length;
      if (count < wordCount) { answerKey.hidden = true; showFeedback(`Write all ${wordCount} words first. You currently have ${count}.`, "warn", "#typingFeedback"); return; }
      const score = similarity(item.prompt, response);
      if (!state.typingCaptured) { state.typingScores[state.index] = score; state.typingCaptured = true; save(false); }
      if (score === 100) {
        answerKey.hidden = true;
        showFeedback("Dictation complete. Now read the sentence aloud.", "good", "#typingFeedback");
        $("#speechBox").hidden = false; $("#dictationStep").className = "step complete"; $("#speakingStep").className = "step active"; $("#transcript").value = ""; $("#speechBox").scrollIntoView({behavior:"smooth",block:"nearest"});
      } else {
        answerKey.hidden = false;
        showFeedback(`Your word accuracy is ${score}%. Study the answer, then edit your response—the key will disappear while you correct it.`, "error", "#typingFeedback");
      }
    });
    $("#record").addEventListener("click", () => startRecognition(item));
    $("#stop").addEventListener("click", stopRecognition);
    $("#scoreSpeech").addEventListener("click", () => scoreSpeech(item));
    $("#transcript").addEventListener("input", () => $("#speechFeedback").textContent = "");
    $("#restart").addEventListener("click", () => render());
    $("#next").addEventListener("click", async () => {
      if (state.speakingBest < (config.minimumSpeakingScore || 60)) return;
      if (state.index < unit.items.length - 1) { state.index += 1; save(false); render(); window.scrollTo({top:0,behavior:"smooth"}); }
      else await finishQuiz();
    });
    if (state.speakingBest >= (config.minimumSpeakingScore || 60)) {
      $("#speechBox").hidden = false; $("#dictationStep").className = "step complete"; $("#speakingStep").className = "step complete"; $("#next").disabled = false;
    }
  }

  function showFeedback(message, type="", selector="#typingFeedback") {
    const element = app.querySelector(selector);
    if (!element) return;
    element.textContent = message;
    element.className = `feedback ${type}`;
  }

  async function startRecognition(item) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!navigator.mediaDevices?.getUserMedia) return showFeedback("Microphone access is unavailable. Open this page over HTTPS in current Chrome or Edge.", "error", "#speechFeedback");
    if (!SpeechRecognition) return showFeedback("Speech recognition is unavailable in this browser. Try current Chrome or Edge.", "error", "#speechFeedback");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      const message = error.name === "NotAllowedError" ? "Microphone permission was blocked. Allow it in the browser address bar and try again." : error.name === "NotFoundError" ? "No microphone was found." : error.name === "NotReadableError" ? "The microphone may be in use by another app." : "The microphone could not be opened.";
      return showFeedback(message, "error", "#speechFeedback");
    }
    state.listening = true;
    app.querySelector("#record").disabled = true; app.querySelector("#stop").disabled = false;
    app.querySelector("#transcript").value = "";
    const recognition = new SpeechRecognition();
    state.recognition = recognition;
    recognition.lang = config.speechLanguage || "en-US"; recognition.interimResults = true; recognition.continuous = false;
    recognition.onresult = event => {
      let combined = "";
      for (let i=0;i<event.results.length;i++) combined += `${event.results[i][0].transcript} `;
      app.querySelector("#transcript").value = combined.trim();
    };
    recognition.onerror = event => {
      const messages = {"no-speech":"No speech was detected. Try again closer to the microphone.","audio-capture":"The microphone is unavailable.","network":"The speech service had a network error.","not-allowed":"Microphone or speech permission was blocked.","service-not-allowed":"The browser speech service is unavailable."};
      showFeedback(messages[event.error] || `Speech recognition error: ${event.error}.`, "error", "#speechFeedback");
      if (["not-allowed","service-not-allowed","audio-capture","network"].includes(event.error)) state.listening = false;
    };
    recognition.onend = () => {
      if (state.listening) { try { recognition.start(); } catch {} }
      else { app.querySelector("#record").disabled = false; app.querySelector("#stop").disabled = true; }
    };
    recognition.start();
    showFeedback("Listening… read the whole phrase or sentence, then press Stop.", "good", "#speechFeedback");
  }

  function stopRecognition() {
    state.listening = false;
    if (state.recognition) { try { state.recognition.stop(); } catch {} state.recognition = null; }
    if (app.querySelector?.("#record")) { app.querySelector("#record").disabled = false; app.querySelector("#stop").disabled = true; }
  }

  function scoreSpeech(item) {
    stopRecognition();
    const transcript = app.querySelector("#transcript").value.trim();
    if (!transcript) return showFeedback("Record or type the words you spoke before scoring.", "warn", "#speechFeedback");
    const score = similarity(item.prompt, transcript);
    state.speakingBest = Math.max(state.speakingBest, score);
    state.speakingScores[state.index] = state.speakingBest;
    app.querySelector("#speechScore").textContent = `Best: ${state.speakingBest}%`;
    const passed = state.speakingBest >= (config.minimumSpeakingScore || 60);
    showFeedback(passed ? `Passed at ${score}%. You may continue.` : `${score}% accuracy. Listen and try again; you need ${config.minimumSpeakingScore || 60}%.`, passed ? "good" : "warn", "#speechFeedback");
    app.querySelector("#next").disabled = !passed;
    if (passed) app.querySelector("#speakingStep").className = "step complete";
    save(false);
  }

  async function finishQuiz() {
    stopRecognition();
    state.finished = true;
    save(true);
    const payload = {
      timeDate: new Date().toLocaleString("en-CA", {timeZone:"Asia/Taipei", hour12:false}),
      studentName: localStorage.getItem("ssaw-student-name") || "",
      unitNumber: unit.module || "Module17-3-4",
      subquiznumber: unit.title,
      accuracyRateForTyping: average(state.typingScores),
      accuracyRateForPronunciation: average(state.speakingScores)
    };
    const submitted = await submitResult(payload);
    app.innerHTML = `<section class="result-card"><p class="eyebrow">Quiz complete</p><h2>${escapeHtml(unit.code)} · ${escapeHtml(unit.title)}</h2><p>First-attempt dictation average</p><div class="big-score">${payload.accuracyRateForTyping}%</div><p>Best pronunciation average</p><div class="big-score">${payload.accuracyRateForPronunciation}%</div><p class="${submitted ? "feedback good" : "notice"}">${submitted ? "Result sent to the class spreadsheet." : "Result saved on this device. It will be ready to send when the spreadsheet endpoint is connected."}</p><p><a class="button" href="dashboard.html">Return to dashboard</a></p></section>`;
  }

  async function submitResult(payload) {
    if (!config.resultsEndpoint) { queueResult(payload); return false; }
    try {
      await fetch(config.resultsEndpoint, {method:"POST", mode:"no-cors", body:new URLSearchParams(Object.entries(payload).map(([key,value]) => [key,String(value)]))});
      return true;
    } catch { queueResult(payload); return false; }
  }
  function queueResult(payload) {
    const queue = JSON.parse(localStorage.getItem("ssaw-result-queue") || "[]");
    queue.push(payload); localStorage.setItem("ssaw-result-queue", JSON.stringify(queue));
  }
  render();
})();

