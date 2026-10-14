# Turnos en tiempo real

Proyecto iniciado desde cero para el examen de Desarrollo de Software IV. El objetivo previsto es crear un sistema de gestión de turnos con comunicación en tiempo real.

## Arquitectura prevista

- **Backend (`backend/`)**: Node.js y Express, organizado bajo MVC. Los modelos gestionarán acceso a datos; los servicios contendrán reglas de negocio y transacciones; los controladores atenderán solicitudes HTTP; las rutas declararán endpoints; `config/` alojará la conexión y el esquema SQLite; `sockets/` gestionará eventos Socket.IO. `app.js` configurará Express y `server.js` creará el servidor HTTP y Socket.IO.
- **Frontend (`frontend/`)**: Flutter Web organizado por responsabilidades. `models/` representará los turnos, `services/` comunicará con REST y Socket.IO, `controllers/` coordinará estado, `views/` contendrá pantallas y `widgets/` componentes reutilizables. `main.dart` será el punto de entrada.
- **Persistencia**: SQLite mediante `better-sqlite3`.
- **Tiempo real**: Socket.IO en el backend y `socket_io_client` en Flutter.

## Estado del backend

El backend incluye persistencia SQLite, modelo y servicio de turnos, API REST y eventos Socket.IO. `POST /api/turnos` recibe `nombre` y `motivo`; el backend asigna un número global creciente y no reutilizable. La migración de secuencia conserva los turnos existentes. Consulta [backend/README.md](backend/README.md) para el contrato y la configuración.

## Inicio posterior

Las dependencias del backend se administran desde `backend/` mediante `package.json`; las del frontend desde `frontend/` con `pubspec.yaml`. Para configurar el backend, copia `backend/.env.example` a `backend/.env` y completa los valores locales sin publicar secretos.
