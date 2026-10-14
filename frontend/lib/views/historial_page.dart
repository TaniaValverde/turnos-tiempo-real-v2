import 'package:flutter/material.dart';
import '../controllers/turno_controller.dart';
import '../widgets/turno_section.dart';

class HistorialPage extends StatelessWidget {
  const HistorialPage({super.key, required this.controller});
  final TurnoController controller;
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Historial de atención')),
        body: ListenableBuilder(
            listenable: controller,
            builder: (context, _) =>
                ListView(padding: const EdgeInsets.all(20), children: [
                  const Text(
                      'Fechas y horas en la zona horaria de este dispositivo.'),
                  if (controller.loading) const LinearProgressIndicator(),
                  if (controller.error != null)
                    Text(controller.error!,
                        style: TextStyle(
                            color: Theme.of(context).colorScheme.error)),
                  TextButton.icon(
                      onPressed: controller.loading ? null : controller.refresh,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Actualizar')),
                  TurnoSection(
                      title: 'Atendidos', turnos: controller.historial),
                ])),
      );
}
