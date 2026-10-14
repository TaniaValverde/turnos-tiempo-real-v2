const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');

const { createDatabase, resolveDatabasePath } = require('../src/config/database');
const Turno = require('../src/models/Turno');
const crearTurnoService = require('../src/services/turnoService');
const {
  ErrorValidacion,
  ErrorPersistencia,
  NumeroTurnoDuplicadoError,
  TransicionEstadoInvalidaError,
  TurnoNoEncontradoError,
} = crearTurnoService;

function withTemporaryService(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'turnos-test-'));
  const dbPath = path.join(directory, 'turnos.sqlite');
  let db;

  try {
    db = createDatabase({ dbPath });
    const modelo = new Turno(db);
    return run({ db, dbPath, directory, modelo, service: crearTurnoService({ modelo }) });
  } finally {
    if (db?.open) db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('crea un turno válido con valores iniciales y fechas UTC ISO', () => withTemporaryService(({ service }) => {
  const turno = service.crear({ nombre: ' Ana ', motivo: ' Consulta ' });

  assert.equal(turno.numero, 1);
  assert.equal(turno.nombre, 'Ana');
  assert.equal(turno.motivo, 'Consulta');
  assert.equal(turno.estado, 'pendiente');
  assert.match(turno.creado_en, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(turno.atendido_en, null);
}));

test('valida objeto, campos obligatorios y tipos al crear turnos', () => withTemporaryService(({ service }) => {
  for (const datos of [null, [], {}, { nombre: 'Ana', motivo: '' },
    { nombre: 'Ana', motivo: 4 }, { nombre: '', motivo: 'Consulta' }]) {
    assert.throws(() => service.crear(datos), ErrorValidacion);
  }
}));

test('el servidor ignora cualquier numero enviado y genera una secuencia consecutiva', () => withTemporaryService(({ service }) => {
  const primero = service.crear({ numero: 900, nombre: 'A', motivo: 'Uno' });
  const segundo = service.crear({ nombre: 'B', motivo: 'Dos' });
  assert.equal(primero.numero, 1);
  assert.equal(segundo.numero, 2);
}));

test('lista turnos en orden determinista, busca por ID y devuelve el siguiente pendiente', () => withTemporaryService(({ service }) => {
  const primero = service.crear({ nombre: 'A', motivo: 'Uno' });
  const posterior = service.crear({ nombre: 'B', motivo: 'Dos' });
  assert.deepEqual(service.listarTodos().map(({ id }) => id), [primero.id, posterior.id]);
  assert.deepEqual(service.buscarPorId(posterior.id), posterior);
  assert.equal(service.obtenerSiguientePendiente().id, primero.id);
}));

test('asigna atómicamente el pendiente de menor número y no vuelve a asignar uno llamado', () => withTemporaryService(({ service }) => {
  const primero = service.crear({ nombre: 'A', motivo: 'Uno' });
  const posterior = service.crear({ nombre: 'B', motivo: 'Dos' });

  const asignado = service.llamarSiguientePendiente();
  assert.equal(asignado.id, primero.id);
  assert.equal(asignado.estado, 'llamado');
  assert.equal(service.llamarSiguientePendiente().id, posterior.id);
  assert.throws(() => service.llamarSiguientePendiente(), crearTurnoService.SinTurnosPendientesError);
}));

test('una falla durante la asignación revierte cualquier cambio parcial', () => withTemporaryService(({ db, service, modelo }) => {
  const turno = service.crear({ nombre: 'A', motivo: 'Uno' });
  db.exec(`
    CREATE TRIGGER fallo_asignacion
    BEFORE UPDATE OF estado ON turnos
    WHEN NEW.estado = 'llamado'
    BEGIN
      SELECT RAISE(ABORT, 'fallo simulado de asignación');
    END;
  `);

  assert.throws(() => service.llamarSiguientePendiente(), ErrorPersistencia);
  assert.equal(modelo.buscarPorId(turno.id).estado, 'pendiente');
}));

test('rechaza IDs inválidos y distingue turnos inexistentes', () => withTemporaryService(({ service }) => {
  for (const id of [0, -1, 1.5, '1', NaN]) {
    assert.throws(() => service.buscarPorId(id), ErrorValidacion);
    assert.throws(() => service.actualizarEstado(id, 'llamado'), ErrorValidacion);
  }
  assert.throws(() => service.buscarPorId(999), TurnoNoEncontradoError);
  assert.throws(() => service.actualizarEstado(999, 'llamado'), TurnoNoEncontradoError);
}));

test('permite avanzar pendiente a llamado y llamado a atendido', () => withTemporaryService(({ service }) => {
  const creado = service.crear({ nombre: 'Luis', motivo: 'Información' });
  const llamado = service.actualizarEstado(creado.id, 'llamado');
  assert.equal(llamado.estado, 'llamado');
  assert.equal(llamado.atendido_en, null);

  const atendido = service.actualizarEstado(creado.id, 'atendido');
  assert.equal(atendido.estado, 'atendido');
  assert.match(atendido.atendido_en, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.deepEqual(service.obtenerHistorialAtendidos().map(({ id }) => id), [creado.id]);
}));

test('rechaza estados desconocidos y transiciones fuera de orden o repetidas', () => withTemporaryService(({ service }) => {
  const creado = service.crear({ nombre: 'Ana', motivo: 'Consulta' });
  assert.throws(() => service.actualizarEstado(creado.id, 'cancelado'), ErrorValidacion);
  assert.throws(() => service.actualizarEstado(creado.id, 'atendido'), TransicionEstadoInvalidaError);

  service.actualizarEstado(creado.id, 'llamado');
  assert.throws(() => service.actualizarEstado(creado.id, 'pendiente'), TransicionEstadoInvalidaError);
  service.actualizarEstado(creado.id, 'atendido');
  assert.throws(() => service.actualizarEstado(creado.id, 'atendido'), TransicionEstadoInvalidaError);
}));

test('mantiene UNIQUE(numero) en SQLite aunque el backend asigne los números', () => withTemporaryService(({ db, service }) => {
  const turno = service.crear({ nombre: 'A', motivo: 'Uno' });
  assert.throws(() => db.prepare(`
    INSERT INTO turnos (numero, nombre, motivo) VALUES (?, ?, ?)
  `).run(turno.numero, 'B', 'Dos'), { code: 'SQLITE_CONSTRAINT_UNIQUE' });
}));

test('traduce una colisión UNIQUE de SQLite a error de dominio', () => withTemporaryService(({ modelo }) => {
  modelo.crear = () => {
    const error = new Error('UNIQUE constraint failed: turnos.numero');
    error.code = 'SQLITE_CONSTRAINT_UNIQUE';
    error.numero = 7;
    throw error;
  };
  const service = crearTurnoService({ modelo });
  assert.throws(
    () => service.crear({ nombre: 'A', motivo: 'Uno' }),
    (error) => error instanceof NumeroTurnoDuplicadoError && error.numero === 7,
  );
}));

test('conserva la persistencia al cerrar y reabrir la base temporal', () => withTemporaryService(({ db, dbPath, service }) => {
  const turno = service.crear({ nombre: 'A', motivo: 'Uno' });
  db.close();
  const reabierta = createDatabase({ dbPath });
  try {
    assert.deepEqual(new Turno(reabierta).buscarPorId(turno.id), turno);
  } finally {
    reabierta.close();
  }
}));

test('mantiene las pruebas aisladas y no crea la base de desarrollo al importar configuración y modelo', () => {
  const backendDirectory = path.resolve(__dirname, '..');
  const dataDirectory = path.join(backendDirectory, 'data');
  const existentesAntes = fs.existsSync(dataDirectory) ? fs.readdirSync(dataDirectory) : [];
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(__dirname, '../src/config/database'))}); require(${JSON.stringify(path.join(__dirname, '../src/models/Turno'))});`], {
    cwd: backendDirectory,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  const existentesDespues = fs.existsSync(dataDirectory) ? fs.readdirSync(dataDirectory) : [];
  assert.deepEqual(existentesDespues, existentesAntes);
});

test('resuelve rutas relativas desde backend y conserva :memory:', () => {
  assert.equal(resolveDatabasePath('./data/turnos.sqlite'), path.join(__dirname, '..', 'data', 'turnos.sqlite'));
  assert.equal(resolveDatabasePath(':memory:'), ':memory:');
});

test('mantiene foreign_keys, WAL y creación idempotente de esquema', () => withTemporaryService(({ db, modelo }) => {
  const turno = modelo.crear({ nombre: 'A', motivo: 'Uno' });
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
  assert.equal(String(db.pragma('journal_mode', { simple: true })).toLowerCase(), 'wal');
  db.exec('CREATE TABLE IF NOT EXISTS conservada (valor TEXT)');
  db.prepare('INSERT INTO conservada (valor) VALUES (?)').run('dato');
  const { CREATE_TURNOS_TABLE } = require('../src/config/database');
  db.exec(CREATE_TURNOS_TABLE);
  assert.equal(modelo.buscarPorId(turno.id).numero, 1);
  assert.equal(db.prepare('SELECT valor FROM conservada').get().valor, 'dato');
}));

test('migra una base existente inicializando la secuencia al mayor numero sin alterar turnos', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'turnos-migracion-test-'));
  const dbPath = path.join(directory, 'legacy.sqlite');
  const legacy = new Database(dbPath);
  try {
    const { CREATE_TURNOS_TABLE } = require('../src/config/database');
    legacy.exec(CREATE_TURNOS_TABLE);
    legacy.prepare('INSERT INTO turnos (numero, nombre, motivo) VALUES (?, ?, ?)').run(4, 'A', 'Uno');
    legacy.prepare('INSERT INTO turnos (numero, nombre, motivo) VALUES (?, ?, ?)').run(12, 'B', 'Dos');
  } finally {
    legacy.close();
  }

  let db;
  try {
    db = createDatabase({ dbPath });
    const service = crearTurnoService({ modelo: new Turno(db) });
    assert.deepEqual(service.listarTodos().map(({ numero }) => numero), [4, 12]);
    assert.equal(service.crear({ nombre: 'C', motivo: 'Tres' }).numero, 13);
  } finally {
    if (db?.open) db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('no reutiliza números eliminados y conserva el contador al reabrir la base', () => withTemporaryService(({ db, dbPath, service }) => {
  const primero = service.crear({ nombre: 'A', motivo: 'Uno' });
  db.prepare('DELETE FROM turnos WHERE id = ?').run(primero.id);
  db.close();

  const reabierta = createDatabase({ dbPath });
  try {
    const segundo = crearTurnoService({ modelo: new Turno(reabierta) })
      .crear({ nombre: 'B', motivo: 'Dos' });
    assert.equal(segundo.numero, 2);
  } finally {
    reabierta.close();
  }
}));

test('una inserción fallida revierte el contador y no deja un número consumido', () => withTemporaryService(({ db, service }) => {
  db.exec(`
    CREATE TRIGGER fallo_insercion
    BEFORE INSERT ON turnos
    BEGIN
      SELECT RAISE(ABORT, 'fallo simulado de inserción');
    END;
  `);
  assert.throws(() => service.crear({ nombre: 'A', motivo: 'Uno' }), ErrorPersistencia);
  db.exec('DROP TRIGGER fallo_insercion');
  assert.equal(service.crear({ nombre: 'B', motivo: 'Dos' }).numero, 1);
}));

test('dos conexiones a la misma base comparten números distintos y consecutivos', () => withTemporaryService(({ dbPath, service }) => {
  const otroModelo = new Turno(createDatabase({ dbPath }));
  const otroServicio = crearTurnoService({ modelo: otroModelo });
  try {
    const resultados = Array.from({ length: 12 }, (_, indice) =>
      (indice % 2 ? service : otroServicio).crear({ nombre: `P${indice}`, motivo: 'Consulta' }));
    const numeros = resultados.map(({ numero }) => numero).sort((a, b) => a - b);
    assert.deepEqual(numeros, Array.from({ length: 12 }, (_, indice) => indice + 1));
  } finally {
    otroModelo.db.close();
  }
}));

test('convierte errores inesperados del modelo en error de persistencia', () => {
  const modelo = {
    crear() {},
    listarTodos() { throw new Error('fallo sqlite'); },
    buscarPorId() {},
    actualizarEstado() {},
    consultarSiguientePendiente() {},
    llamarSiguientePendiente() {},
    obtenerHistorialAtendidos() {},
  };
  const service = crearTurnoService({ modelo });
  assert.throws(() => service.listarTodos(), ErrorPersistencia);
});
