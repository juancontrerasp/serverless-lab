// POST /api/answer  { "id": "q1", "choice": 1 }
// Califica UNA respuesta en el servidor y devuelve la explicación del concepto.
const { app } = require('@azure/functions');
const { checkAnswer } = require('../lib/quiz');

app.http('answer', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'answer',
  handler: async (request, context) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: 'El cuerpo debe ser JSON' } };
    }

    const result = checkAnswer(body?.id, body?.choice);
    if (!result) {
      return { status: 400, jsonBody: { error: 'Pregunta u opción inválida' } };
    }

    context.log(`Pregunta ${result.id}: ${result.correct ? 'correcta' : 'incorrecta'}`);
    return { jsonBody: result };
  }
});
