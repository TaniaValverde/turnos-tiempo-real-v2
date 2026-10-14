# Turnos en tiempo real

Sistema de gestión de turnos en tiempo real desarrollado para el examen de Desarrollo de Software IV.

## Arquitectura implementada

- **Backend (`backend/`)**: Node.js y Express bajo MVC. Los modelos gestionan SQLite; los servicios contienen las reglas y transacciones; los controladores atienden HTTP; las rutas declaran los endpoints; `config/` configura SQLite y CORS; `sockets/` integra Socket.IO. `app.js` configura Express y `server.js` crea el servidor HTTP y Socket.IO.
- **Frontend (`frontend/`)**: Flutter Web organizado por responsabilidades. `models/` representa los turnos, `services/` comunica con REST y Socket.IO, `controllers/` coordina el estado, `views/` contiene las pantallas y `widgets/` los componentes reutilizables. `main.dart` es el punto de entrada.
- **Persistencia**: SQLite mediante `better-sqlite3`.
- **Tiempo real**: Socket.IO en el backend y `socket_io_client` en Flutter.

## Estado del backend

El backend incluye persistencia SQLite, modelo y servicio de turnos, API REST y eventos Socket.IO. `POST /api/turnos` recibe `nombre` y `motivo`; el backend asigna un número global creciente y no reutilizable. La migración de secuencia conserva los turnos existentes. Consulta [backend/README.md](backend/README.md) para el contrato y la configuración.

## Instalación y ejecución

En PowerShell, desde la raíz del repositorio, configura el entorno local una sola vez y arranca el backend:

```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
Set-Location backend
npm install
npm start
```

En `backend/.env`, ajusta `CORS_ORIGINS` al origen exacto donde se servirá Flutter Web. Para el comando de desarrollo siguiente, el origen es `http://localhost:8080`.

En otra terminal, desde la raíz del repositorio, ejecuta Flutter Web:

```powershell
Set-Location frontend
flutter pub get
flutter run -d chrome --web-port 8080 --dart-define=API_URL=http://localhost:3000
```

Para instrucciones de CORS, contrato y pruebas, consulta [frontend/README.md](frontend/README.md) y [backend/README.md](backend/README.md).
