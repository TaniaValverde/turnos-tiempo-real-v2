const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createDatabase } = require('../src/config/database');
const Turno = require('../src/models/Turno');
const crearTurnoService = require('../src/services/turnoService');
const { crearApp } = require('../src/app');
const { getAllowedOrigins } = require('../src/config/cors');

async function withApi(run, { allowedOrigins } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'turnos-api-test-'));
  const dbPath = path.join(directory, 'api.sqlite');
  const db = createDatabase({ dbPath });
  const app = crearApp({ service: crearTurnoService({ modelo: new Turno(db) }), allowedOrigins });
  const server = http.createServer(app);

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    return await run({ baseUrl: `http://127.0.0.1:${address.port}`, db });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (db.open) db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function request(baseUrl, route, { method = 'GET', body, rawBody, headers = {} } = {}) {
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: {
      ...(body !== undefined || rawBody !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
}

test('health y consulta de turnos responden con formato estable', () => withApi(async ({ baseUrl }) => {
  const health = await request(baseUrl, '/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { estado: 'ok' });

  const lista = await request(baseUrl, '/api/turnos');
  assert.equal(lista.status, 200);
  assert.deepEqual(await lista.json(), { datos: [] });
}));

test('Express permite solo los orígenes CORS configurados y responde preflight', () => withApi(async ({ baseUrl }) => {
  const permitido = await request(baseUrl, '/api/turnos', {
    headers: { Origin: 'http://localhost:8080' },
  });
  assert.equal(permitido.headers.get('access-control-allow-origin'), 'http://localhost:8080');

  const preflight = await request(baseUrl, '/api/turnos', {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:8080',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, POST, PATCH, OPTIONS');

  const rechazado = await request(baseUrl, '/api/turnos', {
    method: 'OPTIONS', headers: { Origin: 'https://no-autorizado.example' },
  });
  assert.equal(rechazado.status, 403);
  assert.equal(rechazado.headers.get('access-control-allow-origin'), null);
}, { allowedOrigins: ['http://localhost:8080'] }));

test('CORS interpreta una lista de orígenes exactos y rechaza rutas o comodines', () => {
  assert.deepEqual(
    getAllowedOrigins('http://localhost:8080, https://turnos.example'),
    ['http://localhost:8080', 'https://turnos.example'],
  );
  assert.throws(() => getAllowedOrigins('https://turnos.example/app'), /sin ruta/);
  assert.throws(() => getAllowedOrigins('*'), /no válido/);
});

test('crea turnos y responde 400 para datos inválidos o JSON mal formado', () => withApi(async ({ baseUrl }) => {
  const creado = await request(baseUrl, '/api/turnos', {
    method: 'POST', body: { nombre: 'Eva', motivo: 'Consulta' },
  });
  assert.equal(creado.status, 201);
  const { datos } = await creado.json();
  assert.equal(datos.numero, 1);
  assert.equal(datos.estado, 'pendiente');

  const invalido = await request(baseUrl, '/api/turnos', {
    method: 'POST', body: { nombre: '', motivo: 'Consulta' },
  });
  assert.equal(invalido.status, 400);
  assert.equal((await invalido.json()).error.codigo, 'VALIDACION');

  const jsonMalformado = await request(baseUrl, '/api/turnos', {
    method: 'POST', rawBody: '{',
  });
  assert.equal(jsonMalformado.status, 400);
  assert.equal((await jsonMalformado.json()).error.codigo, 'JSON_INVALIDO');
}));

test('actualiza estado y traduce inexistencia y transición; el servidor asigna el número', () => withApi(async ({ baseUrl }) => {
  const response = await request(baseUrl, '/api/turnos', {
    method: 'POST', body: { nombre: 'Leo', motivo: 'Ayuda' },
  });
  const turno = (await response.json()).datos;

  const transicionInvalida = await request(baseUrl, `/api/turnos/${turno.id}`, {
    method: 'PATCH', body: { estado: 'atendido' },
  });
  assert.equal(transicionInvalida.status, 409);
  assert.equal((await transicionInvalida.json()).error.codigo, 'TRANSICION_ESTADO_INVALIDA');

  const llamado = await request(baseUrl, `/api/turnos/${turno.id}`, {
    method: 'PATCH', body: { estado: 'llamado' },
  });
  assert.equal(llamado.status, 200);
  assert.equal((await llamado.json()).datos.estado, 'llamado');

  const inexistente = await request(baseUrl, '/api/turnos/999', {
    method: 'PATCH', body: { estado: 'llamado' },
  });
  assert.equal(inexistente.status, 404);

  const segundo = await request(baseUrl, '/api/turnos', {
    method: 'POST', body: { numero: 11, nombre: 'Otra', motivo: 'Ayuda' },
  });
  assert.equal(segundo.status, 201);
  assert.equal((await segundo.json()).datos.numero, 2);
}));

test('historial, siguiente y asignación de estado funcionan por API', () => withApi(async ({ baseUrl }) => {
  const response = await request(baseUrl, '/api/turnos', {
    method: 'POST', body: { nombre: 'Sol', motivo: 'Trámite' },
  });
  const turno = (await response.json()).datos;
  const siguienteLlamado = await request(baseUrl, '/api/turnos/siguiente', { method: 'POST' });
  assert.equal(siguienteLlamado.status, 200);
  assert.equal((await siguienteLlamado.json()).datos.id, turno.id);
  await request(baseUrl, `/api/turnos/${turno.id}`, { method: 'PATCH', body: { estado: 'atendido' } });

  const historial = await request(baseUrl, '/api/turnos/historial');
  assert.equal(historial.status, 200);
  assert.equal((await historial.json()).datos[0].id, turno.id);

  const vacio = await request(baseUrl, '/api/turnos/siguiente', { method: 'POST' });
  assert.equal(vacio.status, 404);
  assert.equal((await vacio.json()).error.codigo, 'SIN_TURNOS_PENDIENTES');
}));

test('solicitudes simultáneas no reciben el mismo turno', () => withApi(async ({ baseUrl, db }) => {
  const turnos = [];
  for (let numero = 20; numero < 25; numero += 1) {
    const response = await request(baseUrl, '/api/turnos', {
      method: 'POST', body: { nombre: `Persona ${numero}`, motivo: 'Consulta' },
    });
    turnos.push((await response.json()).datos);
  }

  const respuestas = await Promise.all(Array.from({ length: 8 }, () =>
    request(baseUrl, '/api/turnos/siguiente', { method: 'POST' })));
  const asignados = [];
  let sinPendientes = 0;
  for (const respuesta of respuestas) {
    const payload = await respuesta.json();
    if (respuesta.status === 200) asignados.push(payload.datos.id);
    else if (respuesta.status === 404) sinPendientes += 1;
  }

  assert.equal(asignados.length, turnos.length);
  assert.equal(new Set(asignados).size, asignados.length);
  assert.equal(sinPendientes, respuestas.length - turnos.length);
  const estados = new Map(new Turno(db).listarTodos().map(({ id, estado }) => [id, estado]));
  for (const id of asignados) assert.equal(estados.get(id), 'llamado');
}));

test('creaciones HTTP simultáneas asignan números únicos y consecutivos', () => withApi(async ({ baseUrl }) => {
  const respuestas = await Promise.all(Array.from({ length: 16 }, (_, indice) =>
    request(baseUrl, '/api/turnos', {
      method: 'POST', body: { nombre: `Persona ${indice}`, motivo: 'Consulta' },
    })));
  const numeros = [];
  for (const respuesta of respuestas) {
    assert.equal(respuesta.status, 201);
    numeros.push((await respuesta.json()).datos.numero);
  }
  assert.deepEqual(numeros.sort((a, b) => a - b), Array.from({ length: 16 }, (_, indice) => indice + 1));
}));

test('no expone errores internos al cliente', () => withApi(async ({ baseUrl, db }) => {
  db.close();
  const response = await request(baseUrl, '/api/turnos');
  assert.equal(response.status, 500);
  const payload = await response.json();
  assert.deepEqual(payload, { error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error interno.' } });
  assert.equal(JSON.stringify(payload).includes('SQLite'), false);
}));
