const http = require('node:http');
const app = require('./app');
const registerTurnoSocket = require('./sockets/turnoSocket');

const server = http.createServer(app);

// La inicialización de Socket.IO se completará al implementar los eventos.
registerTurnoSocket();

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`Servidor preparado en el puerto ${port}`);
  });
}

module.exports = server;
