# Frontend Flutter — responsabilidad del compañero

## Ejecutar

Desde `frontend/`:

```powershell
flutter pub get
flutter run -d chrome --web-port 8080 --dart-define=API_URL=http://localhost:3000
```

Para abrir la misma aplicación en dos navegadores independientes:

```powershell
flutter run -d web-server --web-hostname 127.0.0.1 --web-port 8080 --dart-define=API_URL=http://localhost:3000
```

Abrir `http://127.0.0.1:8080` en Chrome y Edge. El backend debe estar encendido y autorizar ese origen mediante CORS en REST y Socket.IO. En despliegues HTTPS, usar también una URL HTTPS para el backend.

```powershell
flutter analyze
flutter test
flutter build web --dart-define=API_URL=http://localhost:3000
```

## Arquitectura

- `models/turno.dart`: interpreta los campos y fechas del servidor.
- `services/api_service.dart`: solicitudes REST, timeout y errores HTTP.
- `services/socket_service.dart`: conexión WebSocket mediante Socket.IO, eventos y reconexión.
- `controllers/turno_controller.dart`: estado observable, acciones y recuperación de listas.
- `views/`: panel e historial; `widgets/`: formulario validado, tarjetas y secciones.

El servidor asigna números y decide transiciones. Flutter no elige el siguiente turno ni genera consecutivos. Deshabilitar botones durante una solicitud evita dobles clics locales, pero no garantiza exclusión entre funcionarios.

## Contrato REST y Socket.IO actual

| Operación | Solicitud | Respuesta esperada |
| --- | --- | --- |
| Listar | GET /api/turnos | 200, `{ "datos": [turno, ...] }` |
| Registrar | POST /api/turnos con `{ "nombre": "Ana", "motivo": "Consulta" }` | 201, `{ "datos": turno }`; el servidor asigna `numero` |
| Llamar siguiente | POST /api/turnos/siguiente | 200, `{ "datos": turno }`; 404 `SIN_TURNOS_PENDIENTES` si no hay pendientes |
| Atender | PATCH /api/turnos/:id con `{ "estado": "atendido" }` | 200, `{ "datos": turno }` |
| Historial | GET /api/turnos/historial | 200, `{ "datos": [turno, ...] }` |
| Salud | GET /api/health | 200, `{ "estado": "ok" }` |

Cada turno contiene `id` y `numero` enteros, `nombre`, `motivo`, `estado` (`pendiente`, `llamado`, `atendido`), `creado_en` ISO 8601 UTC y `atendido_en` ISO 8601 UTC o null. Las fechas se muestran en la zona horaria del navegador. Los errores usan el código HTTP y `{ "error": { "codigo": "...", "mensaje": "..." } }`. Flutter conserva el código HTTP y el código de dominio; para respuestas 500 muestra un mensaje genérico.

- Flutter → servidor: `turnos:solicitar_estado` al conectar y reconectar.
- Servidor → Flutter: `turnos:actualizados` con `{ "datos": [...] }` después de confirmar cada escritura y como respuesta a la solicitud de estado. El frontend usa el evento para obtener por REST las listas actuales y el historial.
- Servidor → Flutter: `turnos:error` opcional.

No hay consulta periódica. La primera conexión y cada reconexión solicitan una instantánea Socket.IO; esa respuesta inicia una lectura REST de listado e historial. Si la conexión inicial falla, el controlador hace una única lectura REST de respaldo. Los eventos de escritura también desencadenan recuperación; si llega otro evento durante una consulta, el controlador descarta esa instantánea y repite la lectura. En caso de error se conservan los datos anteriores y se avisa al usuario; no se reintenta automáticamente una escritura cuyo resultado se desconoce.

### CORS para Flutter Web

Configura `CORS_ORIGINS` en `backend/.env` con los orígenes exactos donde se sirve Flutter, separados por comas y sin rutas. En desarrollo suelen ser `http://localhost:8080` y `http://127.0.0.1:8080`; en producción configura el origen HTTPS del frontend. Express y Socket.IO comparten esta lista. La URL del backend se configura al ejecutar Flutter con `--dart-define=API_URL=...`.

## Investigación para la parte práctica

HTTP sigue un intercambio de solicitud y respuesta y resulta adecuado para las operaciones REST con códigos de resultado. WebSockets mantiene comunicación bidireccional para avisar cambios sin recargar ni consultar periódicamente. Aquí REST realiza las escrituras y Socket.IO sobre WebSocket notifica que cambió el estado. Socket.IO añade su propio protocolo: el backend debe implementar Socket.IO, no solamente un WebSocket genérico.

Reconectar el transporte no garantiza recuperar eventos perdidos. Por ello cada conexión recupera el estado vigente por REST y solicita estado al servidor. La interfaz indica si la conexión de tiempo real se perdió. Véanse las [garantías de entrega de Socket.IO](https://socket.io/docs/v4/delivery-guarantees/) y su [comportamiento sin conexión](https://socket.io/docs/v4/client-offline-behavior/). La [guía Flutter de WebSockets](https://docs.flutter.dev/cookbook/networking/web-sockets) explica la comunicación bidireccional sin consultas periódicas.

La concurrencia se resuelve en el backend mediante una operación SQLite atómica que selecciona y cambia el turno pendiente; las escrituras REST notifican Socket.IO después del commit.

## Verificación y evidencia pendientes de integración

La existencia del frontend no acredita los 60 puntos. El backend actual todavía tiene servicios, rutas y sockets pendientes. Registrar resultados reales al integrar:

1. Abrir dos navegadores, registrar en A y comprobar aparición en B sin recargar.
2. Llamar siguiente en A; comprobar el mismo número y estado en B.
3. Con un solo pendiente, llamar simultáneamente desde A y B: solo una solicitud debe tener éxito. Guardar las respuestas HTTP. Con varios pendientes pueden ganar ambas solicitudes, pero deben recibir turnos distintos.
4. Marcar atendido y revisar fecha/hora en el historial de ambos navegadores.
5. Desconectar B, cambiar turnos en A y reconectar B: debe recuperar el estado vigente.
6. Reiniciar el backend y comprobar persistencia y reconexión.
7. Probar formularios vacíos, errores del servidor y ancho de pantalla pequeño.

Rúbrica práctica: interfaz/estados 10; REST 10; persistencia 8; WebSockets 15; concurrencia/consistencia 10; investigación/documentación/demostración 7. La interfaz y la parte cliente de tiempo real son responsabilidad del compañero; los criterios compartidos necesitan integración real.

Guion de video (máximo 5 minutos): 0:00 arquitectura y dos navegadores; 0:40 registro y validaciones; 1:30 sincronización y atención; 2:20 llamadas simultáneas con evidencia HTTP; 3:20 desconexión/reconexión y reinicio; 4:20 historial y explicación de concurrencia. El README general y las evidencias finales deben integrarse con Tania.

## Resultado de validación local

En la última verificación local, `flutter test` ejecutó 9 pruebas y `flutter analyze` no reportó problemas. Las pruebas Flutter usan servicios HTTP/controlador simulados: verifican el contrato `{ "datos": [...] }`, creación sin número, errores HTTP estructurados, recuperación y ausencia de doble lectura inicial, pero no sustituyen una prueba end-to-end con ambos servidores en ejecución.
