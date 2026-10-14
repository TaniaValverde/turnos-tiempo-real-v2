import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:turnos_tiempo_real/controllers/turno_controller.dart';
import 'package:turnos_tiempo_real/models/turno.dart';
import 'package:turnos_tiempo_real/services/api_service.dart';
import 'package:turnos_tiempo_real/services/socket_service.dart';

Turno turno(int numero) => Turno(id: numero, numero: numero, nombre: 'Ana',
  motivo: 'Consulta', estado: 'pendiente', creadoEn: DateTime.utc(2026));
class FakeApi extends ApiService {
  final requests = <Completer<List<Turno>>>[];
  final creation = Completer<void>();
  int creates = 0;
  @override
  Future<List<Turno>> listar({bool historial = false}) {
    if (historial) return Future.value([]);
    final request = Completer<List<Turno>>();
    requests.add(request);
    return request.future;
  }
  @override
  Future<void> crear(String nombre, String motivo) { creates++; return creation.future; }
}
class FakeSocket extends SocketService {
  late void Function() update;
  late void Function(ConnectionStatus) status;
  bool closed = false;
  @override
  void connect(String url, {required void Function(ConnectionStatus) onStatus,
    required void Function() onUpdate, required void Function(String) onError}) {
    update = onUpdate; status = onStatus;
  }
  @override
  void dispose() { closed = true; }
}
Future<void> flush() => Future<void>.delayed(Duration.zero);
void main() {
  test('descarta lecturas invalidadas y recupera estado al recibir eventos', () async {
    final api = FakeApi(); final socket = FakeSocket();
    final controller = TurnoController(api: api, socket: socket)..start();
    socket.update(); socket.update();
    api.requests[0].complete([turno(1)]);
    await flush();
    expect(controller.turnos, isEmpty);
    expect(api.requests.length, 2);
    api.requests[1].complete([turno(2)]);
    await flush();
    expect(controller.turnos.single.numero, 2);
    socket.status(ConnectionStatus.disconnected);
    expect(controller.connection, ConnectionStatus.disconnected);
    socket.status(ConnectionStatus.connected); socket.update();
    api.requests[2].complete([turno(3)]);
    await flush();
    expect(controller.turnos.single.numero, 3);
    controller.dispose(); expect(socket.closed, isTrue);
  });
  test('conserva datos ante error y permite recuperar', () async {
    final api = FakeApi(); final controller = TurnoController(api: api, socket: FakeSocket());
    var request = controller.refresh();
    api.requests[0].complete([turno(1)]); await request;
    request = controller.refresh();
    api.requests[1].completeError(const ApiException('Sin conexión')); await request;
    expect(controller.turnos.single.numero, 1);
    expect(controller.error, 'Sin conexión');
    request = controller.refresh(); api.requests[2].complete([turno(2)]); await request;
    expect(controller.error, isNull);
    controller.dispose();
  });
  test('bloquea doble envío y admite cierre durante una lectura', () async {
    final api = FakeApi(); final controller = TurnoController(api: api, socket: FakeSocket());
    final first = controller.crear('Ana', 'Consulta');
    expect(await controller.crear('Ana', 'Consulta'), isFalse);
    expect(api.creates, 1);
    api.creation.complete(); await flush();
    controller.dispose();
    api.requests.single.complete([]);
    expect(await first, isTrue);
  });
}
