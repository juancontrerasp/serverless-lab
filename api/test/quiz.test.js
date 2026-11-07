// Pruebas unitarias que el pipeline ejecuta ANTES de desplegar.
const test = require('node:test');
const assert = require('node:assert/strict');
const { questions } = require('../src/lib/questions');
const { publicQuestions, checkAnswer, grade, sanitizeName, certificateCode } = require('../src/lib/quiz');

test('las preguntas públicas no filtran la respuesta', () => {
  for (const q of publicQuestions()) {
    assert.equal(q.answer, undefined);
    assert.equal(q.explanation, undefined);
  }
});

test('cada pregunta tiene id único y una respuesta válida', () => {
  const ids = new Set(questions.map((q) => q.id));
  assert.equal(ids.size, questions.length);
  for (const q of questions) {
    assert.ok(q.answer >= 0 && q.answer < q.options.length, `respuesta fuera de rango en ${q.id}`);
  }
});

test('checkAnswer distingue correcta e incorrecta', () => {
  const q = questions[0];
  assert.equal(checkAnswer(q.id, q.answer).correct, true);
  assert.equal(checkAnswer(q.id, (q.answer + 1) % q.options.length).correct, false);
});

test('checkAnswer rechaza entradas inválidas', () => {
  assert.equal(checkAnswer('no-existe', 0), null);
  assert.equal(checkAnswer('q1', 99), null);
  assert.equal(checkAnswer('q1', 'abc'), null);
});

test('grade aprueba con todas correctas y reprueba vacío', () => {
  const all = questions.map((q) => ({ id: q.id, choice: q.answer }));
  assert.deepEqual(grade(all), { score: questions.length, total: questions.length, passed: true, missed: [] });
  assert.equal(grade([]).passed, false);
  assert.equal(grade(null).score, 0);
});

test('sanitizeName limpia y recorta', () => {
  assert.equal(sanitizeName('  <b>Ana</b>  '), 'bAna/b');
  assert.equal(sanitizeName('x'.repeat(100)).length, 60);
  assert.equal(sanitizeName(42), '');
});

test('certificateCode es determinista', () => {
  assert.equal(certificateCode('Ana', 9, 't'), certificateCode('Ana', 9, 't'));
  assert.notEqual(certificateCode('Ana', 9, 't'), certificateCode('Ana', 8, 't'));
});
