// POST /api/certificate  { "name": "Ana", "answers": [{ "id": "q1", "choice": 1 }, ...] }
// Califica el formulario completo en el servidor y emite un certificado.
const { app } = require('@azure/functions');
const { grade, sanitizeName, certificateCode } = require('../lib/quiz');

app.http('certificate', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'certificate',
  handler: async (request, context) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: 'El cuerpo debe ser JSON' } };
    }

    const name = sanitizeName(body?.name);
    if (name.length < 2) {
      return { status: 400, jsonBody: { error: 'Escribe tu nombre (mínimo 2 caracteres)' } };
    }

    const result = grade(body?.answers);
    const issuedAt = new Date().toISOString();
    context.log(`Certificado para "${name}": ${result.score}/${result.total}`);

    return {
      jsonBody: {
        name,
        ...result,
        issuedAt,
        code: result.passed ? certificateCode(name, result.score, issuedAt) : null
      }
    };
  }
});
