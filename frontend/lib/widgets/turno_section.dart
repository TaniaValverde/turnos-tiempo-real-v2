import 'package:flutter/material.dart';
import '../models/turno.dart';
import 'turno_card.dart';

class TurnoSection extends StatelessWidget {
  const TurnoSection({
    super.key,
    required this.title,
    required this.turnos,
    this.onAtender,
  });

  final String title;
  final List<Turno> turnos;
  final void Function(int)? onAtender;

  Color get _accent => switch (title) {
        'Pendientes' => const Color(0xFF9A7321),
        'Llamados' => const Color(0xFF39769A),
        'Atendidos' => const Color(0xFF367764),
        _ => const Color(0xFF0D625B),
      };

  Color get _accentBackground => switch (title) {
        'Pendientes' => const Color(0xFFF8F1DF),
        'Llamados' => const Color(0xFFEAF3F8),
        'Atendidos' => const Color(0xFFE8F4EF),
        _ => const Color(0xFFE8F4EF),
      };

  IconData get _icon => switch (title) {
        'Pendientes' => Icons.schedule,
        'Llamados' => Icons.campaign_outlined,
        'Atendidos' => Icons.check_circle_outline,
        _ => Icons.list_alt,
      };

  @override
  Widget build(BuildContext context) => Card(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(height: 3, color: _accent),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: _accentBackground,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(_icon, size: 18, color: _accent),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF293532),
                                ),
                          ),
                        ),
                        Container(
                          constraints: const BoxConstraints(minWidth: 28),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _accentBackground,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '${turnos.length}',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: _accent,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    if (turnos.isEmpty)
                      const Padding(
                        padding: EdgeInsets.fromLTRB(8, 18, 8, 20),
                        child: Text(
                          'No hay turnos en esta sección.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xFF74807C)),
                        ),
                      ),
                    ...turnos.map(
                      (turno) => TurnoCard(
                        turno: turno,
                        onAtender: onAtender == null
                            ? null
                            : () => onAtender!(turno.id),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}
