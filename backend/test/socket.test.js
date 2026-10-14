const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { io: createClient } = require('socket.io-client');

const { createDatabase } = require('../src/config/database');
const Turno = require('../src/models/Turno');
const crearTurnoService = require('../src/services/turnoService');
const crearServidor = require('../src/server');

async function withRealtimeServer(run, { allowedOrigins } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'turnos-socket-test-'));
  const db = createDatabase({ dbPath: path.join(directory, 'turnos.sqlite') });
  const service = crearTurnoService({ modelo: new Turno(db) });
  const { server, io } = crearServidor({ service, allowedOrigins });
  const clients = [];

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const connect = () => {
      const client = createClient(baseUrl, { transports: ['websocket'], forceNew: true });
      clients.push(client);
      return client;
    };
    return await run({ baseUrl, db, io, server, service, connect });
  } finally {
    for (const client of clients) client.disconnect();
    await new Promise((resolve) => io.close(resolve));
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    if (db.open) db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function esperarEvento(socket, nombre) {
  return new Promise((resolve) => socket.once(nombre, resolve));
}

function esperarConexion(socket) {
  if (socket.connected) return Promise.resolve();
  return esperarEvento(socket, 'connect');
}

async function request(baseUrl, route, { method = 'GET', body } = {}) {
  return fetch(`${baseUrl}${route}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test('crea una única instancia Socket.IO asociada al servidor HTTP', () => withRealtimeServer(async ({ io, server, connect }) => {
  assert.equal(io.httpServer, server);
  const cliente = connect();
  await esperarConexion(cliente);
  assert.equal(cliente.connected, true);
}));

test('Socket.IO aplica CORS al origen Flutter configurado y no anuncia otros', () => withRealtimeServer(async ({ baseUrl }) => {
  const endpoint = `${baseUrl}/socket.io/?EIO=4&transport=polling`;
  const permitido = await fetch(endpoint, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:8080',
      'Access-Control-Request-Method': 'GET',
    },
  });
  assert.equal(permitido.headers.get('access-control-allow-origin'), 'http://localhost:8080');

  const rechazado = await fetch(endpoint, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://no-autorizado.example',
      'Access-Control-Request-Method': 'GET',
    },
  });
  assert.equal(rechazado.headers.get('access-control-allow-origin'), null);
}, { allowedOrigins: ['http://localhost:8080'] }));

test('importar el módulo del servidor no abre la base de desarrollo ni inicia listeners', () => {
  const backendDirectory = path.resolve(__dirname, '..');
  const dataDirectory = path.join(backendDirectory, 'data');
  const antes = fs.existsSync(dataDirectory) ? fs.readdirSync(dataDirectory) : [];
  const result = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(backendDirectory, 'src/server.js'))});`], {
    cwd: backendDirectory,
    encoding: 'utf8',
  });
  const despues = fs.existsSync(dataDirectory) ? fs.readdirSync(dataDirectory) : [];

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(despues, antes);
});

test('solicitar estado responde solo al solicitante con el formato de REST', () => withRealtimeServer(async ({ connect, service }) => {
  const turno = service.crear({ nombre: 'Ana', motivo: 'Consulta' });
  const solicitante = connect();
  const otro = connect();
  await Promise.all([esperarConexion(solicitante), esperarConexion(otro)]);

  const estadoSolicitado = esperarEvento(solicitante, 'turnos:actualizados');
  let estadoNoSolicitado = false;
  otro.once('turnos:actualizados', () => { estadoNoSolicitado = true; });
  solicitante.emit('turnos:solicitar_estado');

  assert.deepEqual(await estadoSolicitado, { datos: [turno] });
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(estadoNoSolicitado, false);
}));

test('REST emite el snapshot actualizado después de crear, cambiar estado y asignar siguiente', () => withRealtimeServer(async ({ baseUrl, connect }) => {
  const cliente = connect();
  await esperarConexion(cliente);

  const creadoEvento = esperarEvento(cliente, 'turnos:actualizados');
  const creadoRespuesta = await request(baseUrl, '/api/turnos', {
    method: 'POST', body: { nombre: 'Beto', motivo: 'Información' },
  });
  assert.equal(creadoRespuesta.status, 201);
  const creado = (await creadoRespuesta.json()).datos;
  assert.deepEqual(await creadoEvento, { datos: [creado] });

  const llamadoEvento = esperarEvento(cliente, 'turnos:actualizados');
  const llamadoRespuesta = await request(baseUrl, `/api/turnos/${creado.id}`, {
    method: 'PATCH', body: { estado: 'llamado' },
  });
  assert.equal(llamadoRespuesta.status, 200);
  assert.equal((await llamadoRespuesta.json()).datos.estado, 'llamado');
  assert.equal((await llamadoEvento).datos[0].estado, 'llamado');

  const otroCreadoEvento = esperarEvento(cliente, 'turnos:actualizados');
  const otroCreadoRespuesta = await request(baseUrl, '/api/turnos', {
    method: 'POST', body: { nombre: 'Carla', motivo: 'Consulta' },
  });
  assert.equal(otroCreadoRespuesta.status, 201);
  await otroCreadoEvento;

  const siguienteEvento = esperarEvento(cliente, 'turnos:actualizados');
  const siguienteRespuesta = await request(baseUrl, '/api/turnos/siguiente', { method: 'POST' });
  assert.equal(siguienteRespuesta.status, 200);
  const siguiente = (await siguienteRespuesta.json()).datos;
  assert.equal(siguiente.estado, 'llamado');
  assert.deepEqual((await siguienteEvento).datos.map(({ id, estado }) => ({ id, estado })), [
    { id: creado.id, estado: 'llamado' },
    { id: siguiente.id, estado: 'llamado' },
  ]);
}));

test('operaciones REST fallidas no emiten eventos de éxito', () => withRealtimeServer(async ({ baseUrl, connect, service }) => {
  service.crear({ nombre: 'Dani', motivo: 'Consulta' });
  const cliente = connect();
  await esperarConexion(cliente);
  let notificaciones = 0;
  cliente.on('turnos:actualizados', () => { notificaciones += 1; });

  const invalido = await request(baseUrl, '/api/turnos', {
    method: 'POST', body: { nombre: '', motivo: 'Duplicado' },
  });
  assert.equal(invalido.status, 400);

  const transicionInvalida = await request(baseUrl, '/api/turnos/1', {
    method: 'PATCH', body: { estado: 'atendido' },
  });
  assert.equal(transicionInvalida.status, 409);

  const siguiente = await request(baseUrl, '/api/turnos/siguiente', { method: 'POST' });
  assert.equal(siguiente.status, 200);
  // The successful allocation above must notify; consume its one event.
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(notificaciones, 1);

  const sinPendientes = await request(baseUrl, '/api/turnos/siguiente', { method: 'POST' });
  assert.equal(sinPendientes.status, 404);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(notificaciones, 1);
}));

test('los errores al solicitar estado se notifican sin detalles internos', () => withRealtimeServer(async ({ connect, db }) => {
  const cliente = connect();
  await esperarConexion(cliente);
  db.close();

  const errorEstado = esperarEvento(cliente, 'turnos:error');
  cliente.emit('turnos:solicitar_estado');
  const error = await errorEstado;
  assert.deepEqual(error, {
    error: {
      codigo: 'ERROR_ESTADO_NO_DISPONIBLE',
      mensaje: 'No se pudo obtener el estado actual de los turnos.',
    },
  });
  assert.equal(JSON.stringify(error).includes('SQLite'), false);
  assert.equal(JSON.stringify(error).includes('turnoService.js'), false);
}));

test('un cliente reconectado puede solicitar y recibir el estado vigente', () => withRealtimeServer(async ({ connect, service }) => {
  service.crear({ nombre: 'Eva', motivo: 'Revisión' });
  const primerCliente = connect();
  await esperarConexion(primerCliente);
  primerCliente.disconnect();

  const reconectado = connect();
  await esperarConexion(reconectado);
  const estado = esperarEvento(reconectado, 'turnos:actualizados');
  reconectado.emit('turnos:solicitar_estado');
  assert.equal((await estado).datos[0].numero, 1);
}));
