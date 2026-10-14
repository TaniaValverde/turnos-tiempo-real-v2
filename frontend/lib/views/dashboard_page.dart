import 'package:flutter/material.dart';
import '../controllers/turno_controller.dart';
import '../services/socket_service.dart';
import '../widgets/turno_form.dart';
import '../widgets/turno_section.dart';
import 'historial_page.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key, this.controller});
  final TurnoController? controller;
  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  late final TurnoController controller;
  @override
  void initState() {
    super.initState();
    controller = widget.controller ?? TurnoController();
    controller.start();
  }

  @override
  void dispose() {
    if (widget.controller == null) controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
      listenable: controller,
      builder: (context, _) => Scaffold(
            appBar: AppBar(title: const Text('Gestión de turnos'), actions: [
              IconButton(
                  tooltip: 'Historial',
                  icon: const Icon(Icons.history),
                  onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                          builder: (_) =>
                              HistorialPage(controller: controller)))),
              IconButton(
                  tooltip: 'Actualizar',
                  onPressed: controller.loading ? null : controller.refresh,
                  icon: const Icon(Icons.refresh)),
            ]),
            body: ListView(padding: const EdgeInsets.all(20), children: [
              Wrap(
                  spacing: 16,
                  runSpacing: 12,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Chip(
                        avatar: Icon(
                            controller.connection == ConnectionStatus.connected
                                ? Icons.wifi
                                : Icons.wifi_off),
                        label: Text(switch (controller.connection) {
                          ConnectionStatus.connected => 'Tiempo real conectado',
                          ConnectionStatus.connecting => 'Conectando…',
                          ConnectionStatus.disconnected =>
                            'Sin conexión en tiempo real · reconectando',
                        })),
                    FilledButton.icon(
                        onPressed:
                            controller.busy ? null : controller.llamarSiguiente,
                        icon: const Icon(Icons.campaign),
                        label: const Text('Llamar siguiente')),
                  ]),
              if (controller.connection != ConnectionStatus.connected)
                const Text(
                    'Los datos pueden estar desactualizados. Se recuperarán al reconectar.'),
              if (controller.loading || controller.busy)
                const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: LinearProgressIndicator()),
              if (controller.error != null)
                Card(
                    color: Theme.of(context).colorScheme.errorContainer,
                    child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(controller.error!,
                            style: TextStyle(
                                color: Theme.of(context)
                                    .colorScheme
                                    .onErrorContainer)))),
              if (controller.success != null)
                Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(controller.success!)),
              const SizedBox(height: 12),
              Align(
                  alignment: Alignment.centerLeft,
                  child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 600),
                      child: TurnoForm(
                          busy: controller.busy, onSubmit: controller.crear))),
              const SizedBox(height: 24),
              LayoutBuilder(builder: (context, constraints) {
                final sections = [
                  TurnoSection(
                      title: 'Pendientes',
                      turnos: controller.porEstado('pendiente')),
                  TurnoSection(
                      title: 'Llamados',
                      turnos: controller.porEstado('llamado'),
                      onAtender: controller.busy ? null : controller.atender),
                  TurnoSection(
                      title: 'Atendidos',
                      turnos: controller.porEstado('atendido')),
                ];
                if (constraints.maxWidth < 900)
                  return Column(children: sections);
                return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: sections
                        .map((s) => Expanded(
                            child: Padding(
                                padding: const EdgeInsets.all(4), child: s)))
                        .toList());
              }),
            ]),
          ));
}
