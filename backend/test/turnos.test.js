const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createDatabase } = require('../src/config/database');
const Turno = require('../src/models/Turno');

function withTemporaryModel(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'turnos-test-'));
  const dbPath = path.join(directory, 'turnos.sqlite');
  const db = createDatabase({ dbPath });

  try {
    return run(new Turno(db));
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('crea un turno con valores iniciales y fechas UTC ISO', () => withTemporaryModel((turnos) => {
  const turno = turnos.crear({ numero: 1, nombre: 'Ana', motivo: 'Consulta' });

  assert.equal(turno.numero, 1);
  assert.equal(turno.nombre, 'Ana');
  assert.equal(turno.motivo, 'Consulta');
  assert.equal(turno.estado, 'pendiente');
  assert.match(turno.creado_en, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(turno.atendido_en, null);
}));

test('consulta un turno por ID y distingue el registro inexistente', () => withTemporaryModel((turnos) => {
  const created = turnos.crear({ numero: 2, nombre: 'Luis', motivo: 'Información' });
  assert.deepEqual(turnos.buscarPorId(created.id), created);
  assert.equal(turnos.buscarPorId(999), null);
}));

test('lista todos los turnos en orden determinista', () => withTemporaryModel((turnos) => {
  turnos.crear({ numero: 2, nombre: 'B', motivo: 'Dos' });
  turnos.crear({ numero: 1, nombre: 'A', motivo: 'Uno' });
  assert.deepEqual(turnos.listarTodos().map(({ id }) => id), [1, 2]);
}));

test('filtra turnos por estado', () => withTemporaryModel((turnos) => {
  turnos.crear({ numero: 1, nombre: 'A', motivo: 'Uno' });
  const segundo = turnos.crear({ numero: 2, nombre: 'B', motivo: 'Dos' });
  turnos.actualizarEstado(segundo.id, 'llamado');

  assert.deepEqual(turnos.listarPorEstado('llamado').map(({ id }) => id), [segundo.id]);
  assert.equal(turnos.listarPorEstado('pendiente').length, 1);
}));

test('devuelve el historial atendido y conserva orden determinista', () => withTemporaryModel((turnos) => {
  const primero = turnos.crear({ numero: 1, nombre: 'A', motivo: 'Uno' });
  const segundo = turnos.crear({ numero: 2, nombre: 'B', motivo: 'Dos' });
  turnos.actualizarEstado(primero.id, 'atendido', { atendidoEn: '2026-01-01T10:00:00.000Z' });
  turnos.actualizarEstado(segundo.id, 'atendido', { atendidoEn: '2026-01-02T10:00:00.000Z' });

  assert.deepEqual(turnos.obtenerHistorialAtendidos().map(({ id }) => id), [segundo.id, primero.id]);
}));

test('rechaza números de turno duplicados', () => withTemporaryModel((turnos) => {
  turnos.crear({ numero: 3, nombre: 'A', motivo: 'Uno' });
  assert.throws(
    () => turnos.crear({ numero: 3, nombre: 'B', motivo: 'Dos' }),
    { code: 'SQLITE_CONSTRAINT_UNIQUE' },
  );
}));

test('rechaza estados inválidos en la base de datos', () => withTemporaryModel((turnos) => {
  const turno = turnos.crear({ numero: 4, nombre: 'A', motivo: 'Uno' });
  assert.throws(
    () => turnos.actualizarEstado(turno.id, 'cancelado'),
    { code: 'SQLITE_CONSTRAINT_CHECK' },
  );
}));

test('actualiza el estado y registra atendido_en al atender', () => withTemporaryModel((turnos) => {
  const turno = turnos.crear({ numero: 5, nombre: 'A', motivo: 'Uno' });
  const resultado = turnos.actualizarEstado(turno.id, 'atendido');

  assert.equal(resultado.changes, 1);
  assert.equal(resultado.turno.estado, 'atendido');
  assert.match(resultado.turno.atendido_en, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
}));

test('devuelve cero cambios y turno nulo al actualizar un ID inexistente', () => withTemporaryModel((turnos) => {
  assert.deepEqual(turnos.actualizarEstado(999, 'llamado'), { changes: 0, turno: null });
}));

test('consulta el siguiente pendiente sin modificar registros', () => withTemporaryModel((turnos) => {
  const posterior = turnos.crear({ numero: 8, nombre: 'B', motivo: 'Dos' });
  const primero = turnos.crear({ numero: 6, nombre: 'A', motivo: 'Uno' });
  const siguiente = turnos.consultarSiguientePendiente();

  assert.equal(siguiente.id, primero.id);
  assert.equal(turnos.buscarPorId(primero.id).estado, 'pendiente');
  assert.equal(turnos.buscarPorId(posterior.id).estado, 'pendiente');
}));

test('la conexión inyectada aplica foreign_keys y no borra datos al reinicializar', () => withTemporaryModel((turnos) => {
  const turno = turnos.crear({ numero: 9, nombre: 'A', motivo: 'Uno' });
  assert.equal(turnos.db.pragma('foreign_keys', { simple: true }), 1);
  turnos.db.exec("CREATE TABLE IF NOT EXISTS conservada (valor TEXT)");
  turnos.db.prepare('INSERT INTO conservada (valor) VALUES (?)').run('dato');

  const { CREATE_TURNOS_TABLE } = require('../src/config/database');
  turnos.db.exec(CREATE_TURNOS_TABLE);

  assert.equal(turnos.buscarPorId(turno.id).numero, 9);
  assert.equal(turnos.db.prepare('SELECT valor FROM conservada').get().valor, 'dato');
}));
