import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:turnos_tiempo_real/services/api_service.dart';
import 'package:turnos_tiempo_real/widgets/turno_form.dart';

void main() {
  test('crea sin asignar número ni estado en el cliente', () async {
    final api = ApiService(client: MockClient((request) async {
      expect(request.method, 'POST');
      expect(request.url.path, '/api/turnos');
      expect(jsonDecode(request.body), {'nombre': 'Ana', 'motivo': 'Consulta'});
      return http.Response('{}', 201);
    }));
    await api.crear(' Ana ', ' Consulta ');
    api.dispose();
  });
  test('propaga conflictos del servidor', () async {
    final api = ApiService(
        client: MockClient((_) async => http.Response(
            jsonEncode({'message': 'El turno ya fue llamado.'}), 409)));
    await expectLater(api.llamarSiguiente(), throwsA(isA<ApiException>()));
    api.dispose();
  });
  test('interpreta fechas UTC y formato de lista', () async {
    final api = ApiService(
        client: MockClient((_) async => http.Response(
            jsonEncode([
              {
                'id': 1,
                'numero': 8,
                'nombre': 'Ana',
                'motivo': 'Consulta',
                'estado': 'atendido',
                'creado_en': '2026-10-14T12:00:00.000Z',
                'atendido_en': '2026-10-14T12:05:00.000Z'
              }
            ]),
            200)));
    final rows = await api.listar(historial: true);
    expect(rows.single.numero, 8);
    expect(rows.single.atendidoEn!.isUtc, isTrue);
    api.dispose();
  });
  testWidgets('valida vacíos, conserva datos ante error y limpia tras éxito',
      (tester) async {
    var calls = 0;
    var succeed = false;
    await tester.pumpWidget(MaterialApp(
        home: Scaffold(
            body: TurnoForm(
                busy: false,
                onSubmit: (nombre, motivo) async {
                  calls++;
                  return succeed;
                }))));
    await tester.tap(find.text('Registrar turno').last);
    await tester.pump();
    expect(calls, 0);
    expect(find.text('Ingresa el nombre.'), findsOneWidget);
    await tester.enterText(find.byType(TextFormField).at(0), 'Ana');
    await tester.enterText(find.byType(TextFormField).at(1), 'Consulta');
    await tester.tap(find.text('Registrar turno').last);
    await tester.pump();
    expect(calls, 1);
    expect(find.text('Ana'), findsOneWidget);
    succeed = true;
    await tester.tap(find.text('Registrar turno').last);
    await tester.pump();
    expect(calls, 2);
    expect(find.text('Ana'), findsNothing);
  });
}
