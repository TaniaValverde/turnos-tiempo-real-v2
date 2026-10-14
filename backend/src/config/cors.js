const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  'http://localhost:8080',
  'http://127.0.0.1:8080',
]);

function normalizeOrigins(value) {
  const origins = Array.isArray(value)
    ? value
    : String(value).split(',');
  return [...new Set(origins.map((origin) => String(origin).trim()).filter(Boolean).map((origin) => {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new TypeError(`Origen CORS no válido: ${origin}`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new TypeError(`El origen CORS debe ser una URL http(s) sin ruta: ${origin}`);
    }
    return origin;
  }))];
}

function getAllowedOrigins(value = process.env.CORS_ORIGINS) {
  if (value === undefined) return [...DEFAULT_ALLOWED_ORIGINS];
  if (Array.isArray(value)) return normalizeOrigins(value);
  if (!String(value).trim()) return [];
  return normalizeOrigins(value);
}

function crearCorsMiddleware(allowedOrigins) {
  const permitidos = new Set(allowedOrigins);
  return (req, res, next) => {
    const origin = req.get('Origin');
    if (origin) res.vary('Origin');

    if (origin && permitidos.has(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
    }

    if (req.method === 'OPTIONS') {
      return origin && !permitidos.has(origin)
        ? res.sendStatus(403)
        : res.status(204).end();
    }
    return next();
  };
}

module.exports = { DEFAULT_ALLOWED_ORIGINS, getAllowedOrigins, crearCorsMiddleware };
