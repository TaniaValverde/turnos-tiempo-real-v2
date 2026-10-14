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
          body: Column(
            children: [
              _DashboardHeader(
                status: controller.connection,
                busy: controller.busy,
                loading: controller.loading,
                onCallNext: controller.llamarSiguiente,
                onRefresh: controller.refresh,
                onHistory: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => HistorialPage(controller: controller),
                  ),
                ),
              ),
              Expanded(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1360),
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(28, 24, 28, 40),
                      children: [
                        if (controller.connection !=
                            ConnectionStatus.connected)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: Text(
                              'Los datos pueden estar desactualizados. Se recuperarán al reconectar.',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: const Color(0xFF66736F)),
                            ),
                          ),
                        if (controller.loading || controller.busy)
                          const Padding(
                            padding: EdgeInsets.only(bottom: 14),
                            child: LinearProgressIndicator(minHeight: 3),
                          ),
                        if (controller.error != null) ...[
                          _Notice(message: controller.error!, isError: true),
                          const SizedBox(height: 12),
                        ],
                        if (controller.success != null) ...[
                          _Notice(message: controller.success!, isError: false),
                          const SizedBox(height: 12),
                        ],
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final registration = TurnoForm(
                              busy: controller.busy,
                              onSubmit: controller.crear,
                            );
                            final summary = _SummaryPanel(
                              pending:
                                  controller.porEstado('pendiente').length,
                              called: controller.porEstado('llamado').length,
                              attended:
                                  controller.porEstado('atendido').length,
                            );

                            if (constraints.maxWidth >= 940) {
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(flex: 6, child: registration),
                                  const SizedBox(width: 18),
                                  Expanded(flex: 5, child: summary),
                                ],
                              );
                            }
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                registration,
                                const SizedBox(height: 14),
                                summary,
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 30),
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Tablero de atención',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleLarge
                                        ?.copyWith(
                                          color: const Color(0xFF263330),
                                          fontWeight: FontWeight.w700,
                                        ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    'Organizado por estado del turno',
                                    style: Theme.of(context)
                                        .textTheme
                                        .bodySmall
                                        ?.copyWith(
                                          color: const Color(0xFF74807C),
                                        ),
                                  ),
                                ],
                              ),
                            ),
                            const _LiveLabel(),
                          ],
                        ),
                        const SizedBox(height: 14),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final columns = constraints.maxWidth >= 900
                                ? 3
                                : constraints.maxWidth >= 620
                                    ? 2
                                    : 1;
                            const gap = 14.0;
                            final itemWidth = columns == 1
                                ? constraints.maxWidth
                                : (constraints.maxWidth -
                                        gap * (columns - 1)) /
                                    columns;
                            final sections = [
                              TurnoSection(
                                title: 'Pendientes',
                                turnos: controller.porEstado('pendiente'),
                              ),
                              TurnoSection(
                                title: 'Llamados',
                                turnos: controller.porEstado('llamado'),
                                onAtender: controller.busy
                                    ? null
                                    : controller.atender,
                              ),
                              TurnoSection(
                                title: 'Atendidos',
                                turnos: controller.porEstado('atendido'),
                              ),
                            ];

                            return Wrap(
                              spacing: gap,
                              runSpacing: gap,
                              crossAxisAlignment: WrapCrossAlignment.start,
                              children: sections
                                  .map((section) => SizedBox(
                                        width: itemWidth,
                                        child: section,
                                      ))
                                  .toList(),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}

class _DashboardHeader extends StatelessWidget {
  const _DashboardHeader({
    required this.status,
    required this.busy,
    required this.loading,
    required this.onCallNext,
    required this.onRefresh,
    required this.onHistory,
  });

  final ConnectionStatus status;
  final bool busy;
  final bool loading;
  final VoidCallback onCallNext;
  final VoidCallback onRefresh;
  final VoidCallback onHistory;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(
            bottom: BorderSide(color: Color(0xFFE2E9E6)),
          ),
        ),
        child: SafeArea(
          bottom: false,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1360),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(28, 16, 28, 16),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final title = Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Gestión de turnos',
                          style: Theme.of(context)
                              .textTheme
                              .titleLarge
                              ?.copyWith(
                                color: const Color(0xFF20302D),
                                fontWeight: FontWeight.w600,
                                letterSpacing: -0.35,
                              ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Administra la atención en tiempo real',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: const Color(0xFF6B7773)),
                        ),
                      ],
                    );
                    final actions = Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        _ConnectionBadge(status: status),
                        FilledButton.icon(
                          onPressed: busy ? null : onCallNext,
                          icon: const Icon(Icons.campaign_outlined, size: 18),
                          label: const Text('Llamar siguiente'),
                        ),
                        IconButton.outlined(
                          tooltip: 'Historial',
                          onPressed: onHistory,
                          icon: const Icon(Icons.history),
                        ),
                        IconButton.outlined(
                          tooltip: 'Actualizar datos',
                          onPressed: loading ? null : onRefresh,
                          icon: const Icon(Icons.refresh),
                        ),
                      ],
                    );

                    if (constraints.maxWidth < 820) {
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          title,
                          const SizedBox(height: 14),
                          actions,
                        ],
                      );
                    }
                    return Row(
                      children: [
                        Expanded(child: title),
                        const SizedBox(width: 18),
                        actions,
                      ],
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      );
}

class _ConnectionBadge extends StatelessWidget {
  const _ConnectionBadge({required this.status});

  final ConnectionStatus status;

  @override
  Widget build(BuildContext context) {
    final connected = status == ConnectionStatus.connected;
    final connecting = status == ConnectionStatus.connecting;
    final color = connected
        ? const Color(0xFF34745F)
        : connecting
            ? const Color(0xFF967326)
            : const Color(0xFF8B5D50);
    final background = connected
        ? const Color(0xFFEAF4EF)
        : connecting
            ? const Color(0xFFF8F1DF)
            : const Color(0xFFF7EBE7);
    final label = connected
        ? 'Sistema conectado'
        : connecting
            ? 'Conectando…'
            : 'Reconectando';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(30),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 7),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryPanel extends StatelessWidget {
  const _SummaryPanel({
    required this.pending,
    required this.called,
    required this.attended,
  });

  final int pending;
  final int called;
  final int attended;

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(17),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.query_stats_outlined,
                      color: Color(0xFF45635B), size: 19),
                  const SizedBox(width: 8),
                  Text(
                    'Resumen de turnos',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: const Color(0xFF293532),
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              LayoutBuilder(
                builder: (context, constraints) {
                  final columns = constraints.maxWidth >= 360 ? 3 : 2;
                  const gap = 8.0;
                  final width = columns == 3
                      ? (constraints.maxWidth - gap * 2) / 3
                      : (constraints.maxWidth - gap) / 2;
                  final metrics = [
                    _SummaryMetric(
                      label: 'Pendientes',
                      count: pending,
                      icon: Icons.schedule,
                      color: const Color(0xFF9A7321),
                      background: const Color(0xFFF8F1DF),
                    ),
                    _SummaryMetric(
                      label: 'Llamados',
                      count: called,
                      icon: Icons.campaign_outlined,
                      color: const Color(0xFF39769A),
                      background: const Color(0xFFEAF3F8),
                    ),
                    _SummaryMetric(
                      label: 'Atendidos',
                      count: attended,
                      icon: Icons.check_circle_outline,
                      color: const Color(0xFF367764),
                      background: const Color(0xFFE8F4EF),
                    ),
                  ];
                  return Wrap(
                    spacing: gap,
                    runSpacing: gap,
                    children: metrics
                        .map((metric) => SizedBox(width: width, child: metric))
                        .toList(),
                  );
                },
              ),
            ],
          ),
        ),
      );
}

class _SummaryMetric extends StatelessWidget {
  const _SummaryMetric({
    required this.label,
    required this.count,
    required this.icon,
    required this.color,
    required this.background,
  });

  final String label;
  final int count;
  final IconData icon;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) => Container(
        constraints: const BoxConstraints(minHeight: 104),
        padding: const EdgeInsets.all(11),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(13),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 7),
            Text(
              '$count',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: const Color(0xFF25332F),
                    fontWeight: FontWeight.w700,
                    height: 1,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: const Color(0xFF5F6E69),
                  ),
            ),
          ],
        ),
      );
}

class _LiveLabel extends StatelessWidget {
  const _LiveLabel();

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi, size: 15, color: Color(0xFF34745F)),
          const SizedBox(width: 5),
          Text(
            'Actualizado en vivo',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: const Color(0xFF34745F),
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      );
}

class _Notice extends StatelessWidget {
  const _Notice({required this.message, required this.isError});

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final color = isError ? const Color(0xFF9D4338) : const Color(0xFF34745F);
    final background =
        isError ? const Color(0xFFF8EDEA) : const Color(0xFFE8F4EF);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            isError ? Icons.error_outline : Icons.check_circle_outline,
            color: color,
            size: 19,
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(message, style: TextStyle(color: color))),
        ],
      ),
    );
  }
}
