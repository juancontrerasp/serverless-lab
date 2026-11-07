// Adaptador HTTP para API Gateway (HTTP API, payload 2.0).
// Es el equivalente a lo que @azure/functions hace por ti en Azure.

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      // El sitio (S3) y la API (API Gateway) son orígenes distintos. La API ya tiene
      // corsConfiguration para el preflight; este encabezado cubre la respuesta real.
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  if (!event.body) return undefined;
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  return JSON.parse(raw);
}

module.exports = { json, parseBody };
