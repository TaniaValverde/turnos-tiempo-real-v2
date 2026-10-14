const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'data', 'turnos.sqlite');

const CREATE_TURNOS_TABLE = `
  CREATE TABLE IF NOT EXISTS turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER NOT NULL UNIQUE CHECK (numero > 0),
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) > 0),
    motivo TEXT NOT NULL CHECK (length(trim(motivo)) > 0),
    estado TEXT NOT NULL DEFAULT 'pendiente'
      CHECK (estado IN ('pendiente', 'llamado', 'atendido')),
    creado_en TEXT NOT NULL DEFAULT (
      strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    ) CHECK (
      length(creado_en) = 24
      AND creado_en GLOB '????-??-??T??:??:??.???Z'
    ),
    atendido_en TEXT DEFAULT NULL CHECK (
      atendido_en IS NULL OR (
        length(atendido_en) = 24
        AND atendido_en GLOB '????-??-??T??:??:??.???Z'
      )
    )
  )
`;

const CREATE_SECUENCIA_TURNOS_TABLE = `
  CREATE TABLE IF NOT EXISTS secuencia_turnos (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    ultimo_numero INTEGER NOT NULL CHECK (ultimo_numero >= 0)
  )
`;

// Relative DATABASE_PATH values are resolved from the backend directory.
function resolveDatabasePath(dbPath = process.env.DATABASE_PATH || DEFAULT_DB_PATH) {
  if (dbPath === ':memory:') return dbPath;
  return path.resolve(__dirname, '..', '..', dbPath);
}

function initializeDatabase(db) {
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.exec(CREATE_TURNOS_TABLE);

  // Migration idempotente: conserva los turnos y eleva el contador al
  // menos hasta el mayor número ya existente. La transacción IMMEDIATE
  // serializa inicializaciones simultáneas de una base antigua.
  const migrarSecuencia = db.transaction(() => {
    db.exec(CREATE_SECUENCIA_TURNOS_TABLE);
    db.prepare(`
      INSERT INTO secuencia_turnos (id, ultimo_numero)
      VALUES (1, COALESCE((SELECT MAX(numero) FROM turnos), 0))
      ON CONFLICT(id) DO UPDATE SET ultimo_numero = MAX(
        secuencia_turnos.ultimo_numero,
        excluded.ultimo_numero
      )
    `).run();
  });
  migrarSecuencia.immediate();
  return db;
}

function createDatabase({ dbPath, DatabaseConstructor = Database } = {}) {
  const resolvedPath = resolveDatabasePath(dbPath);
  if (resolvedPath !== ':memory:') {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  const db = new DatabaseConstructor(resolvedPath);
  try {
    return initializeDatabase(db);
  } catch (error) {
    db.close();
    throw error;
  }
}

module.exports = {
  createDatabase,
  resolveDatabasePath,
  CREATE_TURNOS_TABLE,
  CREATE_SECUENCIA_TURNOS_TABLE,
};
