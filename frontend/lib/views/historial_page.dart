import 'package:flutter/material.dart';
import '../controllers/turno_controller.dart';
import '../widgets/turno_section.dart';

class HistorialPage extends StatelessWidget {
  const HistorialPage({super.key, required this.controller});
  final TurnoController controller;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Historial de atención'),
          actions: [
            IconButton.outlined(
              tooltip: 'Actualizar historial',
              onPressed: controller.loading ? null : controller.refresh,
              icon: const Icon(Icons.refresh),
            ),
            const SizedBox(width: 20),
          ],
        ),
        body: ListenableBuilder(
          listenable: controller,
          builder: (context, _) => Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1100),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 36),
                children: [
                  Text(
                    'Atenciones completadas',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF202B2A),
                        ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    'Consulta los turnos atendidos y sus fechas de registro y atención.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFF66736F),
                        ),
                  ),
                  const SizedBox(height: 16),
                  if (controller.loading)
                    const LinearProgressIndicator(minHeight: 3),
                  if (controller.error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        controller.error!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ),
                  TurnoSection(
                    title: 'Atendidos',
                    turnos: controller.historial,
                  ),
                ],
              ),
            ),
          ),
        ),
      );
}
