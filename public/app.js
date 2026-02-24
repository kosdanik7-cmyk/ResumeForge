const state = {
  selectedSchool: null,
  selectedProgram: null,
  searchResults: { schools: [], programs: [] },
  courseRows: [],
  activeIndexes: { school: -1, program: -1 }
};

const els = {
  schoolInput: document.getElementById('school-input'),
  programInput: document.getElementById('program-input'),
  schoolList: document.getElementById('school-list'),
  programList: document.getElementById('program-list'),
  snapshot: document.getElementById('snapshot'),
  didYouMean: document.getElementById('did-you-mean'),
  courses: document.getElementById('courses'),
  addCourse: document.getElementById('add-course'),
  breakdown: document.getElementById('breakdown'),
  fitCard: document.getElementById('fit-card'),
  risk: document.getElementById('risk'),
  saveProfile: document.getElementById('save-profile'),
  credential: document.getElementById('filter-credential'),
  coop: document.getElementById('filter-coop'),
  explicitSearch: document.getElementById('explicit-search')
};

const debounce = (fn, ms = 100) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

async function api(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('network');
    return await r.json();
  } catch {
    const cached = localStorage.getItem(url);
    document.getElementById('banner').classList.remove('hidden');
    return cached ? JSON.parse(cached) : { schools: [], programs: [], items: [] };
  }
}

function highlight(text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0 || !q) return text;
  return `${text.slice(0, i)}<mark>${text.slice(i, i + q.length)}</mark>${text.slice(i + q.length)}`;
}

function renderSuggestions(type, items, q) {
  const list = type === 'school' ? els.schoolList : els.programList;
  list.innerHTML = items.map((item, idx) => `<li role="option" data-id="${item.id}" data-idx="${idx}">
      <strong>${item.logo || ''} ${highlight(item.name, q)}</strong>
      <small>${item.location || item.schoolName || ''} · ${item.descriptor || `${item.credential} · ${item.faculty} · ${item.coOp}`}</small>
    </li>`).join('');
}

function bindSuggestionClick() {
  ['school', 'program'].forEach((type) => {
    const list = type === 'school' ? els.schoolList : els.programList;
    list.onclick = (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      selectItem(type, li.dataset.id);
    };
  });
}

function selectItem(type, id) {
  if (type === 'school') {
    state.selectedSchool = state.searchResults.schools.find((s) => s.id === id) || null;
    if (state.selectedSchool) {
      els.schoolInput.value = state.selectedSchool.name;
      searchPrograms(els.programInput.value);
    }
  } else {
    state.selectedProgram = state.searchResults.programs.find((p) => p.id === id) || null;
    if (state.selectedProgram) {
      els.programInput.value = state.selectedProgram.name;
      if (!state.selectedSchool) {
        state.selectedSchool = state.searchResults.schools.find((s) => s.id === state.selectedProgram.schoolId) || null;
      }
      loadSnapshot();
    }
  }
  els.schoolList.innerHTML = '';
  els.programList.innerHTML = '';
}

async function searchSchools(q) {
  const data = await api(`/api/search?type=schools&q=${encodeURIComponent(q)}`);
  localStorage.setItem(`/api/search?type=schools&q=${encodeURIComponent(q)}`, JSON.stringify(data));
  state.searchResults.schools = data.schools;
  renderSuggestions('school', data.schools, q);
  els.didYouMean.textContent = data.didYouMean ? `Did you mean: ${data.didYouMean}?` : '';
}

async function searchPrograms(q) {
  const schoolId = state.selectedSchool?.id || '';
  const data = await api(`/api/search?type=programs&schoolId=${schoolId}&q=${encodeURIComponent(q)}`);
  localStorage.setItem(`/api/search?type=programs&schoolId=${schoolId}&q=${encodeURIComponent(q)}`, JSON.stringify(data));
  let programs = data.programs;
  if (els.credential.value) programs = programs.filter((p) => p.credential === els.credential.value);
  if (els.coop.value) programs = programs.filter((p) => p.coOp === els.coop.value);
  state.searchResults.programs = programs;
  renderSuggestions('program', programs, q);
  els.didYouMean.textContent = data.didYouMean ? `Did you mean: ${data.didYouMean}?` : '';
}

async function loadSnapshot() {
  if (!state.selectedProgram) return;
  els.snapshot.classList.add('loading');
  const data = await api(`/api/program-snapshot?programId=${state.selectedProgram.id}`);
  localStorage.setItem(`/api/program-snapshot?programId=${state.selectedProgram.id}`, JSON.stringify(data));
  const { school, program } = data;
  els.snapshot.classList.remove('loading');
  els.snapshot.innerHTML = `<div class="snapshot-grid">
    <div>
      <h2>${school.logo} ${school.name} — ${program.name}</h2>
      <p>${program.credential} · ${program.faculty} · ${program.campus} · Co-op: ${program.coOp}</p>
      <h3>Program Snapshot</h3>
      ${program.admission.prerequisites.map((p) => `<div class="prereq"><span>${p.course} (${p.code})</span><strong>${p.minimum}% min</strong></div>`).join('')}
      <div class="metric"><strong>Overall minimum average:</strong> ${program.admission.overallMinimum}%</div>
      <div class="metric"><strong>Competitive average (${program.admission.competitiveAverage.cycle}):</strong> ${program.admission.competitiveAverage.value ?? 'Not published'} ${source(program.admission.competitiveAverage)}</div>
      <div class="metric"><strong>Program acceptance:</strong> ${program.admission.programAcceptance.value} (${program.admission.programAcceptance.coverage}) ${source(program.admission.programAcceptance)}</div>
    </div>
    <div>
      <h3>Rankings</h3>
      ${school.worldRankings.length ? school.worldRankings.map((r) => `<div class="metric">${r.system} ${r.year}: #${r.rank} ${source(r)}</div>`).join('') : `<div class="metric">Not published. Polytechnic or regional schools may not be included in global rankings.</div>`}
      <div class="metric">Program ranking: ${program.admission.programRanking ? `${program.admission.programRanking.system} ${program.admission.programRanking.year}: #${program.admission.programRanking.rank} ${source(program.admission.programRanking)}` : 'Not published. Subject-level rankings do not always cover this credential/campus.'}</div>
      <div class="metric">School acceptance: ${school.acceptanceRate.value} (${school.acceptanceRate.coverage}) ${source(school.acceptanceRate)}</div>
      <button id="report-btn">Report incorrect info</button>
    </div>
  </div>`;
  document.getElementById('report-btn').onclick = () => {
    const comment = prompt('Which field looks incorrect?');
    if (!comment) return;
    alert(`Thanks! Captured report for ${program.id}: ${comment}`);
  };
  computeFit();
}

function source(obj) {
  return `<small><a href="${obj.source}" target="_blank" rel="noreferrer">source</a> · last verified ${obj.lastVerified}</small>`;
}

function addCourseRow(prefill = {}) {
  const row = { id: crypto.randomUUID(), code: prefill.code || '', mark: prefill.mark ?? '', inProgress: false, predicted: '' };
  state.courseRows.push(row);
  renderCourses();
}

function renderCourses() {
  els.courses.innerHTML = state.courseRows.map((r) => `<div class="course-row" data-id="${r.id}">
      <input class="course-code" placeholder="Course code (e.g., ENG4U)" value="${r.code}">
      <input class="course-mark" type="number" min="0" max="100" placeholder="Final" value="${r.mark}">
      <input class="course-pred" type="number" min="0" max="100" placeholder="Predicted" value="${r.predicted}">
      <button class="remove" aria-label="Remove course">✕</button>
    </div>`).join('');

  els.courses.querySelectorAll('.course-code').forEach((input) => {
    input.addEventListener('input', debounce(async (e) => {
      const q = e.target.value;
      const data = await api(`/api/courses?q=${encodeURIComponent(q)}`);
      const hint = data.items[0];
      if (hint && q.length >= 2) e.target.title = `Try ${hint.code} ${hint.name}`;
    }, 90));
  });

  els.courses.querySelectorAll('.course-row').forEach((node) => {
    const id = node.dataset.id;
    node.querySelector('.course-code').oninput = (e) => updateRow(id, 'code', e.target.value.toUpperCase());
    node.querySelector('.course-mark').oninput = (e) => updateRow(id, 'mark', Number(e.target.value));
    node.querySelector('.course-pred').oninput = (e) => updateRow(id, 'predicted', Number(e.target.value));
    node.querySelector('.remove').onclick = () => { state.courseRows = state.courseRows.filter((r) => r.id !== id); renderCourses(); computeFit(); };
  });
}

function updateRow(id, key, value) {
  const row = state.courseRows.find((r) => r.id === id);
  if (!row) return;
  row[key] = value;
  computeFit();
}

function computeFit() {
  if (!state.selectedProgram) {
    els.fitCard.textContent = 'Select a program to compute admission fit.';
    return;
  }
  const reqs = state.selectedProgram.admission?.prerequisites || [];
  const courseMap = new Map();
  state.courseRows.forEach((r) => {
    const score = Number.isFinite(r.mark) && r.mark > 0 ? r.mark : r.predicted;
    const existing = courseMap.get(r.code) || 0;
    courseMap.set(r.code, Math.max(existing, Number(score) || 0));
  });

  const missing = [];
  const below = [];
  reqs.forEach((req) => {
    const codes = req.code.split('/');
    const best = Math.max(...codes.map((c) => courseMap.get(c) || 0));
    if (best === 0) missing.push(req.code);
    else if (best < req.minimum) below.push(`${req.code} (${best}% < ${req.minimum}%)`);
  });

  const marks = [...courseMap.values()].filter((m) => m > 0).sort((a, b) => b - a);
  const top6 = marks.slice(0, 6);
  const top6Avg = top6.length ? Math.round(top6.reduce((a, b) => a + b, 0) / top6.length) : 0;
  const prereqMarks = reqs.map((r) => Math.max(...r.code.split('/').map((c) => courseMap.get(c) || 0))).filter((m) => m > 0);
  const prereqAvg = prereqMarks.length ? Math.round(prereqMarks.reduce((a, b) => a + b, 0) / prereqMarks.length) : 0;

  const min = state.selectedProgram.admission.overallMinimum;
  const comp = state.selectedProgram.admission.competitiveAverage.value || min + 5;
  const risk = Number(els.risk.value);
  const score = (top6Avg - min) + (top6Avg - comp) * (risk < 50 ? 1.2 : 0.8) - missing.length * 5 - below.length * 3;
  const chance = score >= 6 ? 'High' : score >= -1 ? 'Medium' : 'Low';

  const meets = !missing.length && !below.length && top6Avg >= min;
  const improve = [];
  if (missing[0]) improve.push(`Add required ${missing[0]} course.`);
  if (below[0]) improve.push(`Raise ${below[0].split(' ')[0]} to exceed prerequisite minimum.`);
  if (top6Avg < comp) improve.push(`Increase top-6 average by ${comp - top6Avg}% to match last cycle competitiveness.`);

  els.breakdown.innerHTML = `<p>Top-6 average: <strong>${top6Avg || 'N/A'}%</strong> (${top6.join(', ') || 'no marks'})</p>
  <p>Prerequisite average: <strong>${prereqAvg || 'N/A'}%</strong></p>
  <p>Program rule average: <strong>${Math.max(top6Avg, prereqAvg) || 'N/A'}%</strong> (higher of top-6/prereq in this demo model)</p>`;

  els.fitCard.innerHTML = `<h3>Admission Fit (estimate only)</h3>
    <p>Meets Minimum Requirements: <strong>${meets ? 'Yes' : 'No'}</strong></p>
    <p>Estimated chance (${risk < 35 ? 'conservative' : risk > 65 ? 'optimistic' : 'balanced'}): <strong>${chance}</strong></p>
    <p>Logic: Δ minimum ${top6Avg - min}%, Δ competitive ${top6Avg - comp}%, missing ${missing.length}, below-prereq ${below.length}.</p>
    ${missing.length || below.length ? `<p>Flags: ${[...missing, ...below].join('; ')}</p>` : '<p>No prerequisite gaps found.</p>'}
    <p><strong>What to improve</strong>: ${improve.join(' ') || 'Maintain or improve current grades and continue strong supplementary profile.'}</p>`;
}

function handleKeyNav(input, list, type) {
  input.addEventListener('keydown', (e) => {
    const items = [...list.querySelectorAll('li')];
    if (!items.length) return;
    if (e.key === 'ArrowDown') state.activeIndexes[type] = Math.min(state.activeIndexes[type] + 1, items.length - 1);
    if (e.key === 'ArrowUp') state.activeIndexes[type] = Math.max(state.activeIndexes[type] - 1, 0);
    if (e.key === 'Enter' && state.activeIndexes[type] >= 0) {
      e.preventDefault();
      selectItem(type, items[state.activeIndexes[type]].dataset.id);
    }
    items.forEach((item, idx) => item.classList.toggle('active', idx === state.activeIndexes[type]));
  });
}

els.schoolInput.addEventListener('input', debounce((e) => searchSchools(e.target.value), 100));
els.programInput.addEventListener('input', debounce((e) => searchPrograms(e.target.value), 100));
els.addCourse.onclick = () => addCourseRow();
els.risk.oninput = () => computeFit();
els.saveProfile.onclick = () => localStorage.setItem('gradeProfiles', JSON.stringify(state.courseRows));
els.credential.onchange = () => searchPrograms(els.programInput.value);
els.coop.onchange = () => searchPrograms(els.programInput.value);
els.explicitSearch.onclick = () => loadSnapshot();

bindSuggestionClick();
handleKeyNav(els.schoolInput, els.schoolList, 'school');
handleKeyNav(els.programInput, els.programList, 'program');

const saved = JSON.parse(localStorage.getItem('gradeProfiles') || '[]');
if (saved.length) {
  state.courseRows = saved;
  renderCourses();
} else {
  addCourseRow({ code: 'ENG4U', mark: 82 });
  addCourseRow({ code: 'MHF4U', mark: 86 });
  addCourseRow({ code: 'MCV4U', predicted: 88 });
}

searchSchools('university');
searchPrograms('computer');
