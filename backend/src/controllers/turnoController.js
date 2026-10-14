function crearTurnoController(service, { onTurnosActualizados = () => {} } = {}) {
  if (!service) throw new TypeError('Se requiere el servicio de turnos.');

  return {
    listar(req, res, next) {
      try {
        res.status(200).json({ datos: service.listarTodos() });
      } catch (error) { next(error); }
    },

    crear(req, res, next) {
      try {
        const turno = service.crear(req.body);
        onTurnosActualizados();
        res.status(201).json({ datos: turno });
      } catch (error) { next(error); }
    },

    actualizarEstado(req, res, next) {
      try {
        const turno = service.actualizarEstado(Number(req.params.id), req.body?.estado);
        onTurnosActualizados();
        res.status(200).json({ datos: turno });
      } catch (error) { next(error); }
    },

    siguiente(req, res, next) {
      try {
        const turno = service.llamarSiguientePendiente();
        onTurnosActualizados();
        res.status(200).json({ datos: turno });
      } catch (error) { next(error); }
    },

    historial(req, res, next) {
      try {
        res.status(200).json({ datos: service.obtenerHistorialAtendidos() });
      } catch (error) { next(error); }
    },
  };
}

module.exports = crearTurnoController;
module.exports.crearTurnoController = crearTurnoController;
