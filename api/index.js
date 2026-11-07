// Adaptador para Cloud Functions for Firebase (2nd gen) / Cloud Run
// Expone los mismos cuatro endpoints (/api/info, /api/questions, /api/answer, /api/certificate)
// manteniendo intacta la lógica de negocio en src/lib/quiz.js y las funciones originales en src/functions/.
const { onRequest } = require('firebase-functions/v2/https');
const crypto = require('node:crypto');
const { publicQuestions, checkAnswer, grade, sanitizeName, certificateCode } = require('./src/lib/quiz');

// Este código fuera del handler se ejecuta UNA sola vez por instancia (fase de arranque / cold start):
const instanceId = crypto.randomUUID().slice(0, 8);
const instanceStartedAt = new Date().toISOString();
let invocations = 0;

exports.api = onRequest({ region: 'us-east1', cors: false, maxInstances: 10 }, async (req, res) => {
  const path = req.path.replace(/^\/api\/?/, '').replace(/\/$/, '');

  // 1. GET /api/info
  if (req.method === 'GET' && path === 'info') {
    invocations++;
    const started = Date.now();
    const invocationId = req.headers['x-cloud-trace-context']?.split('/')[0] || crypto.randomUUID();
    console.log(`Instancia ${instanceId}, invocación #${invocations}`);

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({
      instanceId,
      instanceStartedAt,
      coldStart: invocations === 1,
      invocationsOnThisInstance: invocations,
      invocationId,
      processUptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      region: process.env.FUNCTION_REGION || process.env.K_SERVICE || 'us-east1',
      serverTimeMs: Date.now() - started
    });
  }

  // 2. GET /api/questions
  if (req.method === 'GET' && path === 'questions') {
    const invocationId = req.headers['x-cloud-trace-context']?.split('/')[0] || crypto.randomUUID();
    console.log(`Invocación ${invocationId}: listando preguntas`);
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(publicQuestions());
  }

  // 3. POST /api/answer
  if (req.method === 'POST' && path === 'answer') {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'El cuerpo debe ser JSON' });
    }
    const result = checkAnswer(body.id, body.choice);
    if (!result) {
      return res.status(400).json({ error: 'Pregunta u opción inválida' });
    }
    console.log(`Pregunta ${result.id}: ${result.correct ? 'correcta' : 'incorrecta'}`);
    return res.status(200).json(result);
  }

  // 4. POST /api/certificate
  if (req.method === 'POST' && path === 'certificate') {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'El cuerpo debe ser JSON' });
    }
    const name = sanitizeName(body.name);
    if (name.length < 2) {
      return res.status(400).json({ error: 'Escribe tu nombre (mínimo 2 caracteres)' });
    }
    const result = grade(body.answers);
    const issuedAt = new Date().toISOString();
    console.log(`Certificado para "${name}": ${result.score}/${result.total}`);
    return res.status(200).json({
      name,
      ...result,
      issuedAt,
      code: result.passed ? certificateCode(name, result.score, issuedAt) : null
    });
  }

  return res.status(404).json({ error: 'Ruta no encontrada' });
});
