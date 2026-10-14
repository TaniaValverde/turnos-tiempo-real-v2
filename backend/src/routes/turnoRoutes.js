const express = require('express');
const crearTurnoController = require('../controllers/turnoController');

function crearTurnoRoutes(service, options) {
  const router = express.Router();
  const controller = crearTurnoController(service, options);

  router.get('/historial', controller.historial);
  router.post('/siguiente', controller.siguiente);
  router.get('/', controller.listar);
  router.post('/', controller.crear);
  router.patch('/:id', controller.actualizarEstado);

  return router;
}

module.exports = crearTurnoRoutes;
module.exports.crearTurnoRoutes = crearTurnoRoutes;
