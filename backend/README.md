# Backend de turnos

Backend MVC con Express, SQLite (`better-sqlite3`) y Socket.IO.

## Creación de turnos

`POST /api/turnos` recibe un objeto JSON con `nombre` y `motivo`, ambos
obligatorios y texto no vacío. El servidor asigna `numero`; si un cliente
antiguo todavía envía ese campo, se ignora. La respuesta usa el formato
`{ "datos": { "id": 1, "numero": 1, "nombre": "Ana", "motivo": "Consulta", "estado": "pendiente", "creado_en": "...", "atendido_en": null } }`
y comienza con estado `pendiente`.

Los números forman una secuencia global, creciente y no reutilizable; no se
reinicia por día. La tabla `secuencia_turnos` conserva el último número
asignado incluso si alguien elimina directamente una fila de `turnos`.
La asignación, el avance del contador y la inserción se ejecutan dentro de
una transacción SQLite `IMMEDIATE`. La restricción `UNIQUE` de
`turnos.numero` se mantiene como defensa adicional.

Al abrir una base existente, la inicialización crea la tabla de secuencia
si hace falta y la inicializa, de forma idempotente, al menos con el mayor
`numero` presente en `turnos`. La migración no elimina ni reescribe turnos.
Si ya existe un contador mayor (por ejemplo, tras una eliminación), no se
reduce. La base anterior no permite reconstruir números de filas eliminadas
antes de instalar esta secuencia; desde la migración en adelante, el contador
persistente evita reutilizarlos.

## Configuración local

Desde la raíz del repositorio, copie `.env.example` a `.env` una sola vez y
edite `CORS_ORIGINS` para el origen donde ejecutará Flutter Web. Luego
instale las dependencias y arranque el backend desde `backend/`:

```powershell
if (-not (Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
Set-Location backend
npm install
npm start
```

El servidor usa el puerto 3000 por defecto (`PORT` permite cambiarlo).
`DATABASE_PATH` puede ser una ruta absoluta,
`:memory:` o una ruta relativa; las rutas relativas se resuelven desde
`backend/`. El valor predeterminado es `backend/data/turnos.sqlite`.

`CORS_ORIGINS` es una lista separada por comas de orígenes exactos (sin
rutas), por ejemplo `http://localhost:8080,http://127.0.0.1:8080` para los
dos comandos de desarrollo de Flutter Web del README frontend. En producción
configúrela con el origen HTTPS real del frontend. No se aceptan comodines;
las peticiones de otros orígenes no reciben encabezados CORS. La misma lista
se aplica a Express y Socket.IO.

## Pruebas

Desde `backend/`, ejecute:

```powershell
npm test
```

Las pruebas crean bases bajo el directorio temporal del sistema y las
eliminan al terminar; no usan la base local configurada para desarrollo.

Última ejecución disponible (estos resultados no se volvieron a ejecutar al
actualizar esta documentación): `npm test`, **37/37 aprobadas**.
