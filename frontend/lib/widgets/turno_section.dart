import 'package:flutter/material.dart';
import '../models/turno.dart';
import 'turno_card.dart';

class TurnoSection extends StatelessWidget {
  const TurnoSection(
      {super.key, required this.title, required this.turnos, this.onAtender});
  final String title;
  final List<Turno> turnos;
  final void Function(int)? onAtender;
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
            padding: const EdgeInsets.all(8),
            child: Text('$title (${turnos.length})',
                style: Theme.of(context).textTheme.titleLarge)),
        if (turnos.isEmpty)
          const Padding(
              padding: EdgeInsets.all(16),
              child: Text('No hay turnos en esta sección.')),
        ...turnos.map((t) => TurnoCard(
            turno: t,
            onAtender: onAtender == null ? null : () => onAtender!(t.id))),
      ]);
}
