// GET /api/info — expone datos de la instancia para OBSERVAR conceptos serverless:
//  - coldStart: true en la primera invocación que atiende esta instancia.
//  - invocationsOnThisInstance: contador EN MEMORIA (se pierde al reciclar = stateless).
//  - instanceId: distinto por instancia (si ves varios, la plataforma escaló).
const { app } = require('@azure/functions');
const crypto = require('node:crypto');

// Este código corre UNA vez, cuando la instancia carga el módulo.
const instanceId = crypto.randomUUID().slice(0, 8);
const instanceStartedAt = new Date().toISOString();
let invocations = 0;

app.http('info', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'info',
  handler: async (request, context) => {
    invocations++;
    const started = Date.now();
    context.log(`Instancia ${instanceId}, invocación #${invocations}`);

    return {
      headers: { 'Cache-Control': 'no-store' },
      jsonBody: {
        instanceId,
        instanceStartedAt,
        coldStart: invocations === 1,
        invocationsOnThisInstance: invocations,
        invocationId: context.invocationId,
        processUptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        region: process.env.REGION_NAME || 'local',
        serverTimeMs: Date.now() - started
      }
    };
  }
});
