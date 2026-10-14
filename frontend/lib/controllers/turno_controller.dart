import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/turno.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class TurnoController extends ChangeNotifier {
  TurnoController({ApiService? api, SocketService? socket})
      : _api = api ?? ApiService(),
        _socket = socket ?? SocketService();
  final ApiService _api;
  final SocketService _socket;
  List<Turno> turnos = [], historial = [];
  bool loading = false, busy = false, _disposed = false, _refreshAgain = false;
  String? error, success;
  Completer<void>? _refreshDone;
  ConnectionStatus connection = ConnectionStatus.connecting;
  void _notify() {
    if (!_disposed) notifyListeners();
  }

  void start() {
    _socket.connect(_api.baseUrl,
        onStatus: (status) {
          connection = status;
          _notify();
        },
        onUpdate: refresh,
        onError: (message) {
          error = message;
          _notify();
        });
    refresh();
  }

  List<Turno> porEstado(String estado) =>
      turnos.where((t) => t.estado == estado).toList()
        ..sort((a, b) => a.numero.compareTo(b.numero));
  Future<void> refresh() async {
    if (_disposed) return;
    if (loading) {
      _refreshAgain = true;
      return _refreshDone!.future;
    }
    final done = Completer<void>();
    _refreshDone = done;
    loading = true;
    _notify();
    do {
      _refreshAgain = false;
      try {
        final lists =
            await Future.wait([_api.listar(), _api.listar(historial: true)]);
        if (_disposed) break;
        // Un evento durante la lectura invalida esa instantánea.
        if (!_refreshAgain) {
          turnos = List.unmodifiable(lists[0]);
          historial = List.unmodifiable(lists[1]
            ..sort((a, b) => (b.atendidoEn ?? b.creadoEn)
                .compareTo(a.atendidoEn ?? a.creadoEn)));
          error = null;
        }
      } catch (e) {
        if (!_disposed) error = e.toString();
      }
    } while (_refreshAgain && !_disposed);
    loading = false;
    done.complete();
    _notify();
  }

  Future<bool> _action(Future<void> Function() action, String message) async {
    if (busy || _disposed) return false;
    busy = true;
    error = null;
    success = null;
    _notify();
    var ok = false;
    try {
      await action();
      ok = true;
      success = message;
    } catch (e) {
      error = e.toString();
    }
    final actionError = error;
    await refresh();
    if (actionError != null) error = actionError;
    busy = false;
    _notify();
    return ok;
  }

  Future<bool> crear(String nombre, String motivo) =>
      _action(() => _api.crear(nombre, motivo), 'Turno registrado.');
  Future<bool> llamarSiguiente() =>
      _action(_api.llamarSiguiente, 'Siguiente turno llamado.');
  Future<bool> atender(int id) =>
      _action(() => _api.atender(id), 'Turno marcado como atendido.');
  @override
  void dispose() {
    _disposed = true;
    _socket.dispose();
    _api.dispose();
    super.dispose();
  }
}
