// GET /api/questions — misma lógica que api/src/functions/questions.js, ahora como Lambda.
const { publicQuestions } = require('./lib/quiz');
const { json } = require('./http');

exports.handler = async (event, context) => {
  console.log(`Invocación ${context.awsRequestId}: listando preguntas`);
  return json(200, publicQuestions());
};
