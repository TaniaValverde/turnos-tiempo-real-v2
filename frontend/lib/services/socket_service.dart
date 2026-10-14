import 'package:socket_io_client/socket_io_client.dart' as io;

enum ConnectionStatus { connecting, connected, disconnected }

class SocketService {
  io.Socket? _socket;
  void connect(String url,
      {required void Function(ConnectionStatus) onStatus,
      required void Function() onUpdate,
      required void Function(String) onError}) {
    dispose();
    onStatus(ConnectionStatus.connecting);
    final socket = io.io(
        url,
        io.OptionBuilder()
            .setTransports(['websocket'])
            .disableAutoConnect()
            .enableReconnection()
            .enableForceNew()
            .build());
    _socket = socket;
    socket.onConnect((_) {
      onStatus(ConnectionStatus.connected);
      socket.emit('turnos:solicitar_estado');
    });
    socket.onDisconnect((_) => onStatus(ConnectionStatus.disconnected));
    socket.onConnectError((_) => onStatus(ConnectionStatus.disconnected));
    socket.on('turnos:actualizados', (_) => onUpdate());
    socket.on('turnos:error',
        (_) => onError('El servidor no pudo sincronizar los turnos.'));
    socket.connect();
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
  }
}
