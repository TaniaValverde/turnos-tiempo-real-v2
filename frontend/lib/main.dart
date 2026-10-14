import 'package:flutter/material.dart';

void main() {
  runApp(const TurnosApp());
}

class TurnosApp extends StatelessWidget {
  const TurnosApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Turnos en tiempo real',
      theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal)),
      home: const Scaffold(
        body: Center(child: Text('Estructura inicial de Turnos')),
      ),
    );
  }
}
