import 'package:flutter/material.dart';
import 'views/dashboard_page.dart';

void main() => runApp(const TurnosApp());

class TurnosApp extends StatelessWidget {
  const TurnosApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Turnos en tiempo real',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal)),
        home: const DashboardPage(),
      );
}
