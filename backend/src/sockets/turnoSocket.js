const EVENTO_SOLICITAR_ESTADO = 'turnos:solicitar_estado';
const EVENTO_ACTUALIZADOS = 'turnos:actualizados';
const EVENTO_ERROR = 'turnos:error';

function crearPayloadEstado(service) {
  return { datos: service.listarTodos() };
}

function registrarTurnoSocket(io, service) {
  if (!io || typeof io.on !== 'function' || typeof io.emit !== 'function') {
    throw new TypeError('Se requiere una instancia válida de Socket.IO.');
  }
  if (!service || typeof service.listarTodos !== 'function') {
    throw new TypeError('Se requiere el servicio de turnos.');
  }

  io.on('connection', (socket) => {
    socket.on(EVENTO_SOLICITAR_ESTADO, () => {
      try {
        socket.emit(EVENTO_ACTUALIZADOS, crearPayloadEstado(service));
      } catch {
        socket.emit(EVENTO_ERROR, {
          error: {
            codigo: 'ERROR_ESTADO_NO_DISPONIBLE',
            mensaje: 'No se pudo obtener el estado actual de los turnos.',
          },
        });
      }
    });
  });

  return {
    notificarActualizados() {
      try {
        io.emit(EVENTO_ACTUALIZADOS, crearPayloadEstado(service));
      } catch {
        // A committed REST operation must not be turned into a failed response
        // if reading or broadcasting the subsequent snapshot fails.
        console.error('No se pudo emitir la actualización de turnos por Socket.IO.');
      }
    },
  };
}

module.exports = registrarTurnoSocket;
module.exports.registrarTurnoSocket = registrarTurnoSocket;
module.exports.EVENTO_SOLICITAR_ESTADO = EVENTO_SOLICITAR_ESTADO;
module.exports.EVENTO_ACTUALIZADOS = EVENTO_ACTUALIZADOS;
module.exports.EVENTO_ERROR = EVENTO_ERROR;
