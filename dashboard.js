(() => {
  const { units } = window.QUIZ_DATA;
  const progress = JSON.parse(localStorage.getItem("ssaw-progress") || "{}");
  const nameInput = document.querySelector("#studentName");
  nameInput.value = localStorage.getItem("ssaw-student-name") || "";
  nameInput.addEventListener("input", () => localStorage.setItem("ssaw-student-name", nameInput.value.trim()));

  const completed = units.filter(unit => progress[unit.code]?.completed).length;
  document.querySelector("#stats").innerHTML = `<span class="stat">${units.length} practice ${units.length === 1 ? "unit" : "units"}</span><span class="stat">${units.reduce((n,u)=>n+u.items.length,0)} listening prompts</span><span class="stat">${completed} completed</span>`;
  const sections = [...new Set(units.map(unit => unit.section))];
  document.querySelector("#jump").innerHTML = sections.map((section, index) => `<a href="#section-${index + 1}">${section.replace(/^Part \d+ · /, "")}</a>`).join("");
  const dashboard = document.querySelector("#dashboard");
  dashboard.innerHTML = sections.map((section, sectionIndex) => {
    const cards = units.filter(unit => unit.section === section).map(unit => {
      const saved = progress[unit.code] || {};
      const done = saved.completed ? "Completed" : saved.itemIndex ? `${saved.itemIndex}/${unit.items.length} finished` : "Not started";
      const percent = saved.completed ? 100 : Math.round(((saved.itemIndex || 0) / unit.items.length) * 100);
      return `<a class="quiz-card" href="${unit.slug}.html" data-search="${[unit.code, unit.title, unit.section, ...unit.items.map(i => `${i.term} ${i.definition}`)].join(" ").toLowerCase()}">
        <div class="card-top"><span class="unit-code">${unit.code}</span><span class="status ${saved.completed ? "done" : ""}">${done}</span></div>
        <h3>${unit.title}</h3><p>${unit.items.length} listen → dictate → speak prompts</p>
        <div class="progress-track"><span style="width:${percent}%"></span></div><strong>Open practice →</strong>
      </a>`;
    }).join("");
    return `<section class="zone" id="section-${sectionIndex + 1}" data-section><h2 class="zone-title">${section}</h2><div class="grid">${cards}</div></section>`;
  }).join("");

  const search = document.querySelector("#search");
  search.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll(".quiz-card").forEach(card => card.hidden = query && !card.dataset.search.includes(query));
    document.querySelectorAll("[data-section]").forEach(section => section.hidden = !section.querySelector(".quiz-card:not([hidden])"));
  });
})();

