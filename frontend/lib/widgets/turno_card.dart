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

  Color get _statusColor => switch (turno.estado) {
        'pendiente' => const Color(0xFF9A7321),
        'llamado' => const Color(0xFF39769A),
        'atendido' => const Color(0xFF367764),
        _ => const Color(0xFF66736F),
      };

  Color get _statusBackground => switch (turno.estado) {
        'pendiente' => const Color(0xFFF8F1DF),
        'llamado' => const Color(0xFFEAF3F8),
        'atendido' => const Color(0xFFE8F4EF),
        _ => const Color(0xFFF0F3F2),
      };

  String get _statusLabel => switch (turno.estado) {
        'pendiente' => 'Pendiente',
        'llamado' => 'Llamado',
        'atendido' => 'Atendido',
        _ => turno.estado,
      };

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: Padding(
          padding: const EdgeInsets.all(13),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    '#${turno.numero}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF263330),
                        ),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                    decoration: BoxDecoration(
                      color: _statusBackground,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _statusLabel,
                      style: TextStyle(
                        color: _statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 9),
              Text(
                turno.nombre,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF293532),
                    ),
              ),
              const SizedBox(height: 3),
              Text(
                turno.motivo,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF66736F),
                    ),
              ),
              const SizedBox(height: 10),
              _DateLine(
                icon: Icons.schedule_outlined,
                label: 'Registro',
                date: fechaLocal(turno.creadoEn),
              ),
              if (turno.atendidoEn != null) ...[
                const SizedBox(height: 4),
                _DateLine(
                  icon: Icons.check_circle_outline,
                  label: 'Atención',
                  date: fechaLocal(turno.atendidoEn!),
                ),
              ],
              if (turno.estado == 'llamado') ...[
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: onAtender,
                    icon: const Icon(Icons.check, size: 17),
                    label: const Text('Marcar atendido'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF34745F),
                      side: const BorderSide(color: Color(0xFFCFE3DA)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
}

class _DateLine extends StatelessWidget {
  const _DateLine({
    required this.icon,
    required this.label,
    required this.date,
  });

  final IconData icon;
  final String label;
  final String date;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Icon(icon, size: 14, color: const Color(0xFF84908C)),
          const SizedBox(width: 6),
          Text(
            '$label · ',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: const Color(0xFF74807C),
                ),
          ),
          Expanded(
            child: Text(
              date,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: const Color(0xFF53605C),
                  ),
            ),
          ),
        ],
      );
}
