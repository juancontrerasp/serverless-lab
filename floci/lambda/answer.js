// POST /api/answer  { "id": "q1", "choice": 1 }
const { checkAnswer } = require('./lib/quiz');
const { json, parseBody } = require('./http');

exports.handler = async (event) => {
  let body;
  try {
    body = parseBody(event);
  } catch {
    return json(400, { error: 'El cuerpo debe ser JSON' });
  }

  const result = checkAnswer(body?.id, body?.choice);
  if (!result) return json(400, { error: 'Pregunta u opción inválida' });

  console.log(`Pregunta ${result.id}: ${result.correct ? 'correcta' : 'incorrecta'}`);
  return json(200, result);
};
