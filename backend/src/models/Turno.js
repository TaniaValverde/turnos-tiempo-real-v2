const { createDatabase } = require('../config/database');

const ESTADOS_VALIDOS = Object.freeze(['pendiente', 'llamado', 'atendido']);

class Turno {
  constructor(db = createDatabase()) {
    if (!db || typeof db.prepare !== 'function') {
      throw new TypeError('Turno requiere una conexión SQLite compatible.');
    }
    this.db = db;
  }

  crear({ nombre, motivo }) {
    let numeroAsignado;
    const insertar = this.db.transaction(() => {
      const secuencia = this.db.prepare(`
        SELECT ultimo_numero FROM secuencia_turnos WHERE id = 1
      `).get();
      if (!secuencia) throw new Error('No se inicializó la secuencia de turnos.');

      // MAX(numero) también contempla inserciones administrativas directas;
      // el contador persistente evita reutilizar números después de borrar.
      const existente = this.db.prepare('SELECT COALESCE(MAX(numero), 0) AS maximo FROM turnos').get();
      numeroAsignado = Math.max(secuencia.ultimo_numero, existente.maximo) + 1;
      if (!Number.isSafeInteger(numeroAsignado)) throw new RangeError('Se agotó la secuencia de números de turno.');

      this.db.prepare(`
        UPDATE secuencia_turnos SET ultimo_numero = @numero WHERE id = 1
      `).run({ numero: numeroAsignado });
      const result = this.db.prepare(`
        INSERT INTO turnos (numero, nombre, motivo)
        VALUES (@numero, @nombre, @motivo)
      `).run({ numero: numeroAsignado, nombre, motivo });
      return this.buscarPorId(Number(result.lastInsertRowid));
    });

    // IMMEDIATE obtiene la reserva de escritura antes de leer/asignar
    // la secuencia; la actualización del contador y el INSERT son atómicos.
    try {
      return insertar.immediate();
    } catch (error) {
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') error.numero = numeroAsignado;
      throw error;
    }
  }

  buscarPorId(id) {
    return this.db.prepare('SELECT * FROM turnos WHERE id = ?').get(id) ?? null;
  }

  listarTodos() {
    return this.db.prepare('SELECT * FROM turnos ORDER BY id ASC').all();
  }

  listarPorEstado(estado) {
    return this.db.prepare(`
      SELECT * FROM turnos
      WHERE estado = ?
      ORDER BY creado_en ASC, id ASC
    `).all(estado);
  }

  obtenerHistorialAtendidos() {
    return this.db.prepare(`
      SELECT * FROM turnos
      WHERE estado = 'atendido'
      ORDER BY atendido_en DESC, id DESC
    `).all();
  }

  actualizarEstado(id, estado, { atendidoEn } = {}) {
    const ahoraUtc = new Date().toISOString();
    const atendidoEnUtc = estado === 'atendido'
      ? (atendidoEn ?? ahoraUtc)
      : null;
    const result = this.db.prepare(`
      UPDATE turnos
      SET estado = @estado,
          atendido_en = CASE
            WHEN @estado = 'atendido' THEN COALESCE(atendido_en, @atendidoEn)
            ELSE NULL
          END
      WHERE id = @id
    `).run({ id, estado, atendidoEn: atendidoEnUtc });

    return {
      changes: result.changes,
      turno: result.changes > 0 ? this.buscarPorId(id) : null,
    };
  }

  consultarSiguientePendiente() {
    return this.db.prepare(`
      SELECT * FROM turnos
      WHERE estado = 'pendiente'
      ORDER BY numero ASC, id ASC
      LIMIT 1
    `).get() ?? null;
  }

  llamarSiguientePendiente() {
    const asignar = this.db.transaction(() => {
      const siguiente = this.consultarSiguientePendiente();
      if (!siguiente) return null;

      const resultado = this.db.prepare(`
        UPDATE turnos
        SET estado = 'llamado'
        WHERE id = @id AND estado = 'pendiente'
      `).run({ id: siguiente.id });

      if (resultado.changes !== 1) return null;
      return this.buscarPorId(siguiente.id);
    });

    // Acquire SQLite's write reservation before selecting to serialize allocators.
    return asignar.immediate();
  }
}

Turno.ESTADOS_VALIDOS = ESTADOS_VALIDOS;

module.exports = Turno;
