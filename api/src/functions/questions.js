// GET /api/questions — devuelve las preguntas SIN las respuestas.
const { app } = require('@azure/functions');
const { publicQuestions } = require('../lib/quiz');

app.http('questions', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'questions',
  handler: async (request, context) => {
    context.log(`Invocación ${context.invocationId}: listando preguntas`);
    return {
      jsonBody: publicQuestions(),
      headers: { 'Cache-Control': 'no-store' }
    };
  }
});
