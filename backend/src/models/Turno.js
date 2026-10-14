const defaultDatabase = require('../config/database');

const ESTADOS_VALIDOS = Object.freeze(['pendiente', 'llamado', 'atendido']);

class Turno {
  constructor(db = defaultDatabase) {
    if (!db || typeof db.prepare !== 'function') {
      throw new TypeError('Turno requiere una conexión SQLite compatible.');
    }
    this.db = db;
  }

  crear({ numero, nombre, motivo }) {
    const result = this.db.prepare(`
      INSERT INTO turnos (numero, nombre, motivo)
      VALUES (@numero, @nombre, @motivo)
    `).run({ numero, nombre, motivo });
    return this.buscarPorId(Number(result.lastInsertRowid));
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
}

Turno.ESTADOS_VALIDOS = ESTADOS_VALIDOS;

module.exports = Turno;
