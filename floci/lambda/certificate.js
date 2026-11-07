// POST /api/certificate  { "name": "Ana", "answers": [{ "id": "q1", "choice": 1 }, ...] }
const { grade, sanitizeName, certificateCode } = require('./lib/quiz');
const { json, parseBody } = require('./http');

exports.handler = async (event) => {
  let body;
  try {
    body = parseBody(event);
  } catch {
    return json(400, { error: 'El cuerpo debe ser JSON' });
  }

  const name = sanitizeName(body?.name);
  if (name.length < 2) return json(400, { error: 'Escribe tu nombre (mínimo 2 caracteres)' });

  const result = grade(body?.answers);
  const issuedAt = new Date().toISOString();
  console.log(`Certificado para "${name}": ${result.score}/${result.total}`);

  return json(200, {
    name,
    ...result,
    issuedAt,
    code: result.passed ? certificateCode(name, result.score, issuedAt) : null
  });
};
