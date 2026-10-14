const http = require('node:http');
const { Server: SocketServer } = require('socket.io');
const crearApp = require('./app');
const crearTurnoService = require('./services/turnoService');
const registrarTurnoSocket = require('./sockets/turnoSocket');
const { getAllowedOrigins } = require('./config/cors');

function crearServidor({ service = crearTurnoService(), SocketServerClass = SocketServer, allowedOrigins = getAllowedOrigins() } = {}) {
  const io = new SocketServerClass({
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  });
  const sockets = registrarTurnoSocket(io, service);
  const app = crearApp({
    service,
    onTurnosActualizados: sockets.notificarActualizados,
    allowedOrigins,
  });
  const server = http.createServer(app);
  io.attach(server);

  return { app, server, io, service };
}

if (require.main === module) {
  const { server } = crearServidor();
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`Servidor preparado en el puerto ${port}`);
  });
}

module.exports = crearServidor;
module.exports.crearServidor = crearServidor;
