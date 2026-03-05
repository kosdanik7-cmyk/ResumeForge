const form = document.getElementById('claim-form');
const claimInput = document.getElementById('claim-input');
const statusEl = document.getElementById('status');
const results = document.getElementById('results');
const excludedToggle = document.getElementById('excluded-toggle');

const statuses = [
  'Parsing claim into structural representation…',
  'Running semantic retrieval on trusted repositories…',
  'Classifying source stance with quote extraction…',
  'Computing evidence strength and verdict…',
];

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const claim = claimInput.value.trim();
  if (!claim) return;

  results.classList.add('hidden');
  statusEl.classList.remove('hidden');
  let index = 0;
  statusEl.textContent = statuses[0];
  const timer = setInterval(() => {
    index = Math.min(index + 1, statuses.length - 1);
    statusEl.textContent = statuses[index];
  }, 1700);

  const body = new FormData();
  body.append('claim', claim);

  try {
    const response = await fetch('/api/evaluate', { method: 'POST', body });
    const data = await response.json();
    renderResults(data);
    results.classList.remove('hidden');
    statusEl.textContent = 'Completed: full traceable evidence package generated.';
  } catch (error) {
    statusEl.textContent = 'Evaluation failed. Please retry with a more specific claim.';
  } finally {
    clearInterval(timer);
  }
});

excludedToggle.addEventListener('change', () => {
  document.getElementById('sources-excluded').classList.toggle('hidden', !excludedToggle.checked);
});

function renderResults(data) {
  document.getElementById('verdict-label').textContent = data.verdict;
  document.getElementById('confidence').textContent = `${Math.round(data.confidence * 100)}%`;
  document.getElementById('answer').textContent = data.concise_answer;
  document.getElementById('structured').textContent = JSON.stringify(data.structured_claim, null, 2);
  document.getElementById('support-score').textContent = data.support_score.toFixed(1);
  document.getElementById('contradict-score').textContent = data.contradict_score.toFixed(1);
  document.getElementById('mixed-score').textContent = data.mixed_score.toFixed(1);

  const used = document.getElementById('sources-used');
  const excluded = document.getElementById('sources-excluded');
  used.innerHTML = '';
  excluded.innerHTML = '';

  data.sources_used.forEach((s) => used.appendChild(sourceCard(s)));
  data.excluded_sources.forEach((s) => excluded.appendChild(sourceCard(s, true)));
}

function sourceCard(source, excluded = false) {
  const card = document.createElement('article');
  card.className = 'source';
  card.innerHTML = `
    <h4>${escapeHtml(source.title)}</h4>
    <p class="meta">${escapeHtml(source.publisher)} • ${source.year ?? 'n.d.'} • ${escapeHtml(source.source_type)} • stance: ${source.stance}</p>
    <p class="meta">Evidence Strength Score: ${source.score.toFixed(1)}</p>
    <blockquote>${escapeHtml(source.quote)}</blockquote>
    <p class="meta">${excluded ? escapeHtml(source.inclusion_reason) : 'Included in verdict computation'}</p>
    <a href="${source.link}" target="_blank" rel="noopener">Open source ${source.doi ? `(DOI: ${source.doi})` : ''}</a>
    <details>
      <summary>Scoring breakdown</summary>
      <pre>${escapeHtml(JSON.stringify(source.score_breakdown, null, 2))}</pre>
    </details>
  `;
  return card;
}

function escapeHtml(str) {
  return (str ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}
