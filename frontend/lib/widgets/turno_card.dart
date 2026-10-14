import 'package:flutter/material.dart';
import '../models/turno.dart';

String fechaLocal(DateTime date) {
  final d = date.toLocal();
  String pad(int n) => n.toString().padLeft(2, '0');
  return '${pad(d.day)}/${pad(d.month)}/${d.year} ${pad(d.hour)}:${pad(d.minute)}:${pad(d.second)}';
}

class TurnoCard extends StatelessWidget {
  const TurnoCard({super.key, required this.turno, this.onAtender});
  final Turno turno;
  final VoidCallback? onAtender;
  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Turno #${turno.numero}',
                    style: Theme.of(context).textTheme.titleLarge),
                Text(turno.nombre,
                    style: Theme.of(context).textTheme.titleMedium),
                Text(turno.motivo),
                const SizedBox(height: 8),
                Text('Registro: ${fechaLocal(turno.creadoEn)}'),
                if (turno.atendidoEn != null)
                  Text('Atención: ${fechaLocal(turno.atendidoEn!)}'),
                if (turno.estado == 'llamado')
                  Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: FilledButton.tonal(
                          onPressed: onAtender,
                          child: const Text('Marcar atendido'))),
              ],
            )),
      );
}
