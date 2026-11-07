// GET /api/info — mismos campos que la versión de Azure para comparar ambas nubes.
// En Lambda, cada "instancia" es un contenedor (execution environment).
const crypto = require('node:crypto');

// Este código corre UNA vez por contenedor: es la fase "Init" (cold start).
const instanceId = crypto.randomUUID().slice(0, 8);
const instanceStartedAt = new Date().toISOString();
let invocations = 0;

const { json } = require('./http');

exports.handler = async (event, context) => {
  invocations++;
  const started = Date.now();
  console.log(`Instancia ${instanceId}, invocación #${invocations}`);

  return json(200, {
    instanceId,
    instanceStartedAt,
    coldStart: invocations === 1,
    invocationsOnThisInstance: invocations,
    invocationId: context.awsRequestId,
    processUptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    region: process.env.AWS_REGION || 'local',
    memoryMb: Number(context.memoryLimitInMB) || null,
    serverTimeMs: Date.now() - started
  });
};
