const Turno = require('../models/Turno');

const TRANSICIONES_PERMITIDAS = Object.freeze({
  pendiente: Object.freeze(['llamado']),
  llamado: Object.freeze(['atendido']),
  atendido: Object.freeze([]),
});

const METODOS_REQUERIDOS_MODELO = Object.freeze([
  'crear',
  'listarTodos',
  'buscarPorId',
  'actualizarEstado',
  'consultarSiguientePendiente',
  'llamarSiguientePendiente',
  'obtenerHistorialAtendidos',
]);

class ErrorDominio extends Error {
  constructor(mensaje, codigo, options = {}) {
    super(mensaje, options);
    this.name = this.constructor.name;
    this.codigo = codigo;
  }
}

class ErrorValidacion extends ErrorDominio {
  constructor(mensaje) {
    super(mensaje, 'VALIDACION');
  }
}

class TurnoNoEncontradoError extends ErrorDominio {
  constructor(id) {
    super(`No existe un turno con identificador ${id}.`, 'TURNO_NO_ENCONTRADO');
    this.id = id;
  }
}

class SinTurnosPendientesError extends ErrorDominio {
  constructor() {
    super('No hay turnos pendientes para llamar.', 'SIN_TURNOS_PENDIENTES');
  }
}

class NumeroTurnoDuplicadoError extends ErrorDominio {
  constructor(numero, options) {
    super(`El número de turno ${numero} ya existe.`, 'NUMERO_TURNO_DUPLICADO', options);
    this.numero = numero;
  }
}

class TransicionEstadoInvalidaError extends ErrorDominio {
  constructor(actual, solicitado) {
    super(`No se permite cambiar el estado de '${actual}' a '${solicitado}'.`, 'TRANSICION_ESTADO_INVALIDA');
    this.estadoActual = actual;
    this.estadoSolicitado = solicitado;
  }
}

class ErrorPersistencia extends ErrorDominio {
  constructor(mensaje, options) {
    super(mensaje, 'ERROR_PERSISTENCIA', options);
  }
}

function validarId(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ErrorValidacion('El identificador debe ser un entero positivo.');
  }
}

function validarEntradaTurno(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new ErrorValidacion('Los datos del turno deben ser un objeto.');
  }

  const { nombre, motivo } = datos;
  if (typeof nombre !== 'string' || nombre.trim().length === 0) {
    throw new ErrorValidacion('El nombre es obligatorio y debe ser texto no vacío.');
  }
  if (typeof motivo !== 'string' || motivo.trim().length === 0) {
    throw new ErrorValidacion('El motivo es obligatorio y debe ser texto no vacío.');
  }
}

function esErrorNumeroDuplicado(error) {
  return error?.code === 'SQLITE_CONSTRAINT_UNIQUE'
    && /turnos\.numero|UNIQUE constraint failed: turnos\.numero/i.test(error.message);
}

function crearTurnoService({ modelo = new Turno() } = {}) {
  if (!modelo || METODOS_REQUERIDOS_MODELO.some((metodo) => typeof modelo[metodo] !== 'function')) {
    throw new TypeError('turnoService requiere un modelo Turno compatible.');
  }

  return {
    crear(datos) {
      validarEntradaTurno(datos);
      try {
        return modelo.crear({
          nombre: datos.nombre.trim(),
          motivo: datos.motivo.trim(),
        });
      } catch (error) {
        if (esErrorNumeroDuplicado(error)) {
          throw new NumeroTurnoDuplicadoError(error.numero, { cause: error });
        }
        throw new ErrorPersistencia('No se pudo guardar el turno.', { cause: error });
      }
    },

    listarTodos() {
      try {
        return modelo.listarTodos();
      } catch (error) {
        throw new ErrorPersistencia('No se pudieron consultar los turnos.', { cause: error });
      }
    },

    buscarPorId(id) {
      validarId(id);
      try {
        const turno = modelo.buscarPorId(id);
        if (!turno) throw new TurnoNoEncontradoError(id);
        return turno;
      } catch (error) {
        if (error instanceof ErrorDominio) throw error;
        throw new ErrorPersistencia('No se pudo consultar el turno.', { cause: error });
      }
    },

    actualizarEstado(id, estado) {
      validarId(id);
      if (!Turno.ESTADOS_VALIDOS.includes(estado)) {
        throw new ErrorValidacion(`El estado debe ser uno de: ${Turno.ESTADOS_VALIDOS.join(', ')}.`);
      }

      try {
        const actual = modelo.buscarPorId(id);
        if (!actual) throw new TurnoNoEncontradoError(id);
        if (!TRANSICIONES_PERMITIDAS[actual.estado]?.includes(estado)) {
          throw new TransicionEstadoInvalidaError(actual.estado, estado);
        }

        const resultado = modelo.actualizarEstado(id, estado);
        // Conditional update protects against future concurrent writers.
        if (resultado.changes === 0) throw new TurnoNoEncontradoError(id);
        return resultado.turno;
      } catch (error) {
        if (error instanceof ErrorDominio) throw error;
        throw new ErrorPersistencia('No se pudo actualizar el estado del turno.', { cause: error });
      }
    },

    obtenerSiguientePendiente() {
      try {
        return modelo.consultarSiguientePendiente();
      } catch (error) {
        throw new ErrorPersistencia('No se pudo consultar el siguiente turno.', { cause: error });
      }
    },

    llamarSiguientePendiente() {
      try {
        const turno = modelo.llamarSiguientePendiente();
        if (!turno) throw new SinTurnosPendientesError();
        return turno;
      } catch (error) {
        if (error instanceof ErrorDominio) throw error;
        throw new ErrorPersistencia('No se pudo asignar el siguiente turno.', { cause: error });
      }
    },

    obtenerHistorialAtendidos() {
      try {
        return modelo.obtenerHistorialAtendidos();
      } catch (error) {
        throw new ErrorPersistencia('No se pudo consultar el historial.', { cause: error });
      }
    },
  };
}

module.exports = crearTurnoService;
module.exports.crearTurnoService = crearTurnoService;
module.exports.TRANSICIONES_PERMITIDAS = TRANSICIONES_PERMITIDAS;
module.exports.ErrorDominio = ErrorDominio;
module.exports.ErrorValidacion = ErrorValidacion;
module.exports.TurnoNoEncontradoError = TurnoNoEncontradoError;
module.exports.SinTurnosPendientesError = SinTurnosPendientesError;
module.exports.NumeroTurnoDuplicadoError = NumeroTurnoDuplicadoError;
module.exports.TransicionEstadoInvalidaError = TransicionEstadoInvalidaError;
module.exports.ErrorPersistencia = ErrorPersistencia;
