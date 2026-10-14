# Turnos en tiempo real

Proyecto iniciado desde cero para el examen de Desarrollo de Software IV. El objetivo previsto es crear un sistema de gestión de turnos con comunicación en tiempo real.

## Arquitectura prevista

- **Backend (`backend/`)**: Node.js y Express, organizado bajo MVC. Los modelos gestionarán acceso a datos; los servicios contendrán reglas de negocio y transacciones; los controladores atenderán solicitudes HTTP; las rutas declararán endpoints; `config/` alojará la conexión y el esquema SQLite; `sockets/` gestionará eventos Socket.IO. `app.js` configurará Express y `server.js` creará el servidor HTTP y Socket.IO.
- **Frontend (`frontend/`)**: Flutter Web organizado por responsabilidades. `models/` representará los turnos, `services/` comunicará con REST y Socket.IO, `controllers/` coordinará estado, `views/` contendrá pantallas y `widgets/` componentes reutilizables. `main.dart` será el punto de entrada.
- **Persistencia**: SQLite mediante `better-sqlite3`.
- **Tiempo real**: Socket.IO en el backend y `socket_io_client` en Flutter.

## Estado de esta fase

Se crea únicamente la estructura inicial y archivos de referencia. La conexión SQLite, el modelo completo de `Turno`, las reglas de negocio, endpoints y eventos se implementarán en fases posteriores. No se han instalado dependencias.

## Inicio posterior

Cuando se autorice implementar y preparar el entorno, se podrán instalar dependencias desde `backend/` y `frontend/` siguiendo sus manifiestos (`package.json` y `pubspec.yaml`). Para configurar el entorno del backend, copia `backend/.env.example` a `backend/.env` y completa valores locales sin publicar secretos.
