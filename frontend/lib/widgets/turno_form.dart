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
  final _nombre = TextEditingController(), _motivo = TextEditingController();
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
                Text('Registrar turno',
                    style: Theme.of(context).textTheme.titleLarge),
                const Text('El número se asigna al confirmar el registro.'),
                const SizedBox(height: 16),
                TextFormField(
                    controller: _nombre,
                    enabled: !widget.busy,
                    decoration: const InputDecoration(
                        labelText: 'Nombre', border: OutlineInputBorder()),
                    textInputAction: TextInputAction.next,
                    validator: (v) => v == null || v.trim().isEmpty
                        ? 'Ingresa el nombre.'
                        : null),
                const SizedBox(height: 12),
                TextFormField(
                    controller: _motivo,
                    enabled: !widget.busy,
                    decoration: const InputDecoration(
                        labelText: 'Motivo de la visita',
                        border: OutlineInputBorder()),
                    minLines: 2,
                    maxLines: 4,
                    validator: (v) => v == null || v.trim().isEmpty
                        ? 'Ingresa el motivo.'
                        : null),
                const SizedBox(height: 16),
                FilledButton.icon(
                    onPressed: widget.busy ? null : _submit,
                    icon: const Icon(Icons.add),
                    label:
                        Text(widget.busy ? 'Procesando…' : 'Registrar turno')),
              ],
            )),
      ));
}
