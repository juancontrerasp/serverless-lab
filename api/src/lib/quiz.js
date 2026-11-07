// Lógica pura (sin dependencias de Azure) para poder probarla con `npm test`
// dentro del pipeline antes de desplegar.
const crypto = require('node:crypto');
const { questions } = require('./questions');

const PASSING_RATIO = 0.7;

// Lo que ve el navegador: sin `answer` ni `explanation`.
function publicQuestions() {
  return questions.map(({ id, concept, text, options }) => ({ id, concept, text, options }));
}

function checkAnswer(id, choice) {
  const q = questions.find((x) => x.id === id);
  if (!q) return null;
  const n = Number(choice);
  if (!Number.isInteger(n) || n < 0 || n >= q.options.length) return null;
  return {
    id: q.id,
    concept: q.concept,
    correct: n === q.answer,
    correctOption: q.answer,
    explanation: q.explanation
  };
}

function grade(answers) {
  const byId = new Map();
  for (const a of Array.isArray(answers) ? answers : []) {
    if (a && typeof a.id === 'string') byId.set(a.id, a.choice);
  }
  let score = 0;
  const missed = [];
  for (const q of questions) {
    if (Number(byId.get(q.id)) === q.answer) score++;
    else missed.push(q.concept);
  }
  const total = questions.length;
  return { score, total, passed: score / total >= PASSING_RATIO, missed };
}

function sanitizeName(name) {
  if (typeof name !== 'string') return '';
  return name.replace(/[<>]/g, '').trim().slice(0, 60);
}

// Código verificable derivado del contenido del certificado.
function certificateCode(name, score, issuedAt) {
  return crypto
    .createHash('sha256')
    .update(`${name}|${score}|${issuedAt}`)
    .digest('hex')
    .slice(0, 12)
    .toUpperCase();
}

module.exports = { publicQuestions, checkAnswer, grade, sanitizeName, certificateCode, PASSING_RATIO };
