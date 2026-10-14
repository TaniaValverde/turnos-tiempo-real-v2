import 'package:flutter/material.dart';

// Tarjeta reutilizable para mostrar un turno.
class TurnoCard extends StatelessWidget {
  const TurnoCard({super.key});

  @override
  Widget build(BuildContext context) => const Card(child: ListTile(title: Text('Turno')));
}
