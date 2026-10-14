import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/turno.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.code});
  final String message;
  final int? statusCode;
  final String? code;
  @override
  String toString() => message;
}

class ApiService {
  ApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        baseUrl = (baseUrl ??
                const String.fromEnvironment('API_URL',
                    defaultValue: 'http://localhost:3000'))
            .replaceFirst(RegExp(r'/+$'), '');
  final http.Client _client;
  final String baseUrl;
  Future<dynamic> _request(String method, String path,
      [Map<String, dynamic>? body]) async {
    final request = http.Request(method, Uri.parse('$baseUrl/api$path'));
    request.headers['Content-Type'] = 'application/json';
    if (body != null) request.body = jsonEncode(body);
    try {
      final response = await (() async =>
              http.Response.fromStream(await _client.send(request)))()
          .timeout(const Duration(seconds: 12));
      dynamic data;
      try {
        data = response.body.isEmpty ? null : jsonDecode(response.body);
      } on FormatException {
        throw const ApiException('Respuesta del servidor no válida.');
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final error = data is Map ? data['error'] : null;
        final code = error is Map && error['codigo'] is String
            ? error['codigo'] as String
            : null;
        final serverMessage = error is Map && error['mensaje'] is String
            ? (error['mensaje'] as String).trim()
            : '';
        final message = response.statusCode >= 500
            ? 'El servidor no pudo completar la operación.'
            : serverMessage.isNotEmpty
                ? serverMessage
                : 'No se pudo completar la operación (${response.statusCode}).';
        throw ApiException(message,
            statusCode: response.statusCode, code: code);
      }
      return data;
    } on TimeoutException {
      throw const ApiException(
          'El servidor tardó demasiado. Comprueba el estado antes de repetir la operación.');
    } on http.ClientException {
      throw const ApiException(
          'No se pudo contactar con el servidor. Comprueba la conexión y el estado antes de repetir.');
    }
  }

  Future<List<Turno>> listar({bool historial = false}) async {
    final data =
        await _request('GET', historial ? '/turnos/historial' : '/turnos');
    final rows = data is Map ? data['datos'] : null;
    if (rows is! List) throw const ApiException('Formato de lista no válido.');
    try {
      return rows
          .map((row) => Turno.fromJson(Map<String, dynamic>.from(row as Map)))
          .toList();
    } catch (_) {
      throw const ApiException('Datos de turnos incompletos o inválidos.');
    }
  }

  Future<void> crear(String nombre, String motivo) async {
    await _request(
        'POST', '/turnos', {'nombre': nombre.trim(), 'motivo': motivo.trim()});
  }

  Future<void> llamarSiguiente() async {
    await _request('POST', '/turnos/siguiente');
  }

  Future<void> atender(int id) async {
    await _request('PATCH', '/turnos/$id', {'estado': 'atendido'});
  }

  void dispose() => _client.close();
}
