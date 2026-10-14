const express = require('express');
const crearTurnoRoutes = require('./routes/turnoRoutes');
const crearTurnoService = require('./services/turnoService');
const { getAllowedOrigins, crearCorsMiddleware } = require('./config/cors');
const {
  ErrorValidacion,
  TurnoNoEncontradoError,
  SinTurnosPendientesError,
  NumeroTurnoDuplicadoError,
  TransicionEstadoInvalidaError,
} = crearTurnoService;

function crearApp({ service = crearTurnoService(), onTurnosActualizados, allowedOrigins = getAllowedOrigins() } = {}) {
  const app = express();

  app.use(crearCorsMiddleware(allowedOrigins));
  app.use(express.json());
  app.get('/api/health', (req, res) => {
    res.status(200).json({ estado: 'ok' });
  });
  app.use('/api/turnos', crearTurnoRoutes(service, { onTurnosActualizados }));

  app.use((req, res) => {
    res.status(404).json({
      error: { codigo: 'RUTA_NO_ENCONTRADA', mensaje: 'La ruta solicitada no existe.' },
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error instanceof ErrorValidacion || error?.type === 'entity.parse.failed') {
      return res.status(400).json({
        error: {
          codigo: error.codigo || 'JSON_INVALIDO',
          mensaje: error.type === 'entity.parse.failed' ? 'El cuerpo JSON no es válido.' : error.message,
        },
      });
    }
    if (error instanceof TurnoNoEncontradoError) {
      return res.status(404).json({ error: { codigo: error.codigo, mensaje: error.message } });
    }
    if (error instanceof SinTurnosPendientesError) {
      return res.status(404).json({ error: { codigo: error.codigo, mensaje: error.message } });
    }
    if (error instanceof NumeroTurnoDuplicadoError || error instanceof TransicionEstadoInvalidaError) {
      return res.status(409).json({ error: { codigo: error.codigo, mensaje: error.message } });
    }

    return res.status(500).json({
      error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error interno.' },
    });
  });

  return app;
}

module.exports = crearApp;
module.exports.crearApp = crearApp;
