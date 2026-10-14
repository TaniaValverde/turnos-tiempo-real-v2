import 'package:flutter/material.dart';

class TurnoForm extends StatefulWidget {
  const TurnoForm({super.key, required this.busy, required this.onSubmit});

  final bool busy;
  final Future<bool> Function(String nombre, String motivo) onSubmit;

  @override
  State<TurnoForm> createState() => _TurnoFormState();
}

class _TurnoFormState extends State<TurnoForm> {
  final _key = GlobalKey<FormState>();
  final _nombre = TextEditingController();
  final _motivo = TextEditingController();

  @override
  void dispose() {
    _nombre.dispose();
    _motivo.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (widget.busy || !_key.currentState!.validate()) return;
    final ok = await widget.onSubmit(_nombre.text, _motivo.text);
    if (ok && mounted) {
      _key.currentState!.reset();
      _nombre.clear();
      _motivo.clear();
    }
  }

  @override
  Widget build(BuildContext context) => Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _key,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8F4EF),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.person_add_alt_1_outlined,
                        color: Color(0xFF34745F),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Registrar nuevo turno',
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'El número se asigna al confirmar el registro.',
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: const Color(0xFF66736F)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _nombre,
                  enabled: !widget.busy,
                  decoration: const InputDecoration(
                    labelText: 'Nombre',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  textInputAction: TextInputAction.next,
                  validator: (value) =>
                      value == null || value.trim().isEmpty
                          ? 'Ingresa el nombre.'
                          : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _motivo,
                  enabled: !widget.busy,
                  decoration: const InputDecoration(
                    labelText: 'Motivo de la visita',
                    prefixIcon: Icon(Icons.notes_outlined),
                    alignLabelWithHint: true,
                  ),
                  minLines: 2,
                  maxLines: 4,
                  validator: (value) =>
                      value == null || value.trim().isEmpty
                          ? 'Ingresa el motivo.'
                          : null,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: 48,
                  child: FilledButton.icon(
                    onPressed: widget.busy ? null : _submit,
                    icon: const Icon(Icons.add),
                    label: Text(
                      widget.busy ? 'Procesando…' : 'Registrar turno',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}
