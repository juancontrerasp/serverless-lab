// Frontend 100 % estático: toda la "inteligencia" vive en /api (Azure Functions).

const $ = (sel) => document.querySelector(sel);
const API_BASE = (window.LAB_API_BASE || '').replace(/\/$/, '');

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}/api/${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Pestañas ----------
const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(id) {
  for (const t of tabs) {
    const on = t.id === id;
    t.setAttribute('aria-selected', on);
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  }
  try { localStorage.setItem('lab-tab', id); } catch {}
}
tabs.forEach((t) => t.addEventListener('click', () => selectTab(t.id)));
document.querySelectorAll('[data-goto]').forEach((b) =>
  b.addEventListener('click', () => { selectTab(b.dataset.goto); window.scrollTo({ top: 0, behavior: 'smooth' }); })
);
try {
  const saved = localStorage.getItem('lab-tab');
  if (saved && document.getElementById(saved)) selectTab(saved);
} catch {}

// ---------- Estado de la API ----------
const status = $('#api-status');
async function checkApi() {
  const t0 = performance.now();
  try {
    const info = await api('info');
    const ms = Math.round(performance.now() - t0);
    status.className = 'status ok';
    status.textContent = `API en línea · instancia ${info.instanceId} · ${ms} ms${info.coldStart ? ' (cold start)' : ''}`;
    logInfo(info, ms);
  } catch (e) {
    status.className = 'status bad';
    status.textContent = `La API no respondió (${e.message}). ¿Desplegaste la carpeta api/?`;
  }
}

// ---------- Laboratorio en vivo ----------
let callNo = 0;
function logInfo(info, ms) {
  callNo++;
  $('#info-out').textContent = JSON.stringify({ ...info, latenciaNavegadorMs: ms }, null, 2);
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${callNo}</td><td>${escapeHtml(info.instanceId)}</td>
    <td class="${info.coldStart ? 'cold' : ''}">${info.coldStart ? 'sí' : 'no'}</td>
    <td>${info.invocationsOnThisInstance}</td><td>${ms} ms</td>`;
  $('#info-log').prepend(tr);
}

async function timedInfo() {
  const t0 = performance.now();
  // URL única por llamada: si no, el navegador pone en fila las peticiones idénticas
  // y la ráfaga nunca llega en paralelo a la función.
  const info = await api(`info?n=${Date.now()}-${Math.random().toString(36).slice(2)}`, { cache: 'no-store' });
  return { info, ms: Math.round(performance.now() - t0) };
}

$('#btn-info').addEventListener('click', async (e) => {
  e.target.disabled = true;
  try {
    const { info, ms } = await timedInfo();
    logInfo(info, ms);
  } catch (err) {
    $('#info-out').textContent = `Error: ${err.message}`;
  } finally {
    e.target.disabled = false;
  }
});

$('#btn-burst').addEventListener('click', async (e) => {
  e.target.disabled = true;
  $('#burst-summary').textContent = 'Lanzando 15 invocaciones en paralelo…';
  const results = await Promise.allSettled(Array.from({ length: 15 }, timedInfo));
  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  ok.forEach(({ info, ms }) => logInfo(info, ms));
  const instances = new Set(ok.map((r) => r.info.instanceId));
  const avg = ok.length ? Math.round(ok.reduce((s, r) => s + r.ms, 0) / ok.length) : 0;
  $('#burst-summary').textContent =
    `${ok.length}/15 respuestas · ${instances.size} instancia(s) distinta(s) · latencia media ${avg} ms`;
  e.target.disabled = false;
});

// ---------- Preguntas ----------
const answers = new Map(); // id -> { choice, correct }
let total = 0;

function updateProgress() {
  const done = answers.size;
  const right = [...answers.values()].filter((a) => a.correct).length;
  $('#progress-bar').style.width = total ? `${(done / total) * 100}%` : '0';
  $('#progress-text').textContent = `${done} de ${total} respondidas · ${right} correctas`;
}

function renderQuestion(q, i) {
  const form = document.createElement('form');
  form.className = 'qform';
  form.innerHTML = `
    <fieldset>
      <span class="concept">${escapeHtml(q.concept)}</span>
      <legend>${i + 1}. ${escapeHtml(q.text)}</legend>
      ${q.options.map((o, k) => `
        <label class="opt"><input type="radio" name="choice" value="${k}" required> <span>${escapeHtml(o)}</span></label>`).join('')}
      <button type="submit">Enviar a /api/answer</button>
      <div class="feedback" hidden></div>
    </fieldset>`;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const choice = Number(new FormData(form).get('choice'));
    const btn = form.querySelector('button');
    const fb = form.querySelector('.feedback');
    btn.disabled = true;
    try {
      const r = await api('answer', { method: 'POST', body: JSON.stringify({ id: q.id, choice }) });
      answers.set(q.id, { choice, correct: r.correct });
      form.querySelectorAll('.opt').forEach((el, k) => {
        el.classList.toggle('right', k === r.correctOption);
        el.classList.toggle('wrong', k === choice && !r.correct);
      });
      fb.hidden = false;
      fb.className = `feedback ${r.correct ? 'ok' : 'bad'}`;
      fb.innerHTML = `<strong>${r.correct ? '✔ Correcto' : '✘ No exactamente'}.</strong> ${escapeHtml(r.explanation)}`;
      updateProgress();
      saveAnswers();
    } catch (err) {
      fb.hidden = false;
      fb.className = 'feedback bad';
      fb.textContent = `Error llamando a la función: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  });
  return form;
}

function saveAnswers() {
  try { localStorage.setItem('lab-answers', JSON.stringify([...answers])); } catch {}
}

async function loadQuiz() {
  const box = $('#quiz');
  box.textContent = 'Cargando preguntas desde /api/questions…';
  try {
    const qs = await api('questions');
    total = qs.length;
    box.textContent = '';
    qs.forEach((q, i) => box.appendChild(renderQuestion(q, i)));
    // Solo restauramos qué opción elegiste; la corrección vuelve a pedirse al servidor.
    try {
      for (const [id, a] of JSON.parse(localStorage.getItem('lab-answers') || '[]')) {
        const form = [...box.children][qs.findIndex((q) => q.id === id)];
        const input = form?.querySelector(`input[value="${Number(a.choice)}"]`);
        if (input) { input.checked = true; form.requestSubmit(); }
      }
    } catch {}
    updateProgress();
  } catch (err) {
    box.textContent = `No se pudieron cargar las preguntas: ${err.message}`;
  }
}

// ---------- Autoevaluación del pipeline (solo cliente) ----------
$('#pipeline-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const okWhere = f.get('where') === 'secret';
  const okApi = f.get('api') === 'api';
  $('#pipeline-out').innerHTML =
    (okWhere ? '✔ El token va como <em>secret</em>; nunca en el código.' : '✘ Un token en el repositorio queda expuesto: usa un secreto de GitHub.') +
    '<br>' +
    (okApi ? '✔ <code>api_location: api</code>.' : '✘ Las funciones están en la carpeta <code>api</code>.') +
    '<br><small>Nota: esta revisión corre en tu navegador, no en una función. ¿Qué diferencia hay en seguridad?</small>';
});

// ---------- Certificado ----------
$('#cert-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const out = $('#cert-out');
  const name = new FormData(e.target).get('name');
  const payload = { name, answers: [...answers].map(([id, a]) => ({ id, choice: a.choice })) };
  out.textContent = 'Calificando en /api/certificate…';
  try {
    const r = await api('certificate', { method: 'POST', body: JSON.stringify(payload) });
    out.innerHTML = r.passed
      ? `<div class="cert">
          <p class="muted">Certificado de laboratorio</p>
          <h3>${escapeHtml(r.name)}</h3>
          <p>completó el <strong>Laboratorio Serverless</strong> con ${r.score}/${r.total}</p>
          <p class="code-id">${escapeHtml(r.code)}</p>
          <p class="muted">Emitido ${new Date(r.issuedAt).toLocaleString('es')}</p>
        </div>`
      : `<div class="cert fail">
          <h3>${r.score}/${r.total}: aún no alcanzas el 70 %</h3>
          <p>Repasa: ${r.missed.map(escapeHtml).join(', ')}.</p>
        </div>`;
  } catch (err) {
    out.textContent = `Error: ${err.message}`;
  }
});

checkApi();
loadQuiz();
