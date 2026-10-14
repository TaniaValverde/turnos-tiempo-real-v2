class Turno {
  const Turno(
      {required this.id,
      required this.numero,
      required this.nombre,
      required this.motivo,
      required this.estado,
      required this.creadoEn,
      this.atendidoEn});
  final int id, numero;
  final String nombre, motivo, estado;
  final DateTime creadoEn;
  final DateTime? atendidoEn;
  factory Turno.fromJson(Map<String, dynamic> json) {
    final estado = json['estado'] as String;
    if (!['pendiente', 'llamado', 'atendido'].contains(estado)) {
      throw const FormatException('Estado desconocido');
    }
    return Turno(
        id: json['id'] as int,
        numero: json['numero'] as int,
        nombre: json['nombre'] as String,
        motivo: json['motivo'] as String,
        estado: estado,
        creadoEn: DateTime.parse(json['creado_en'] as String),
        atendidoEn: json['atendido_en'] == null
            ? null
            : DateTime.parse(json['atendido_en'] as String));
  }
}
