# OmniNotify

Sistema de notificaciones omnicanal construido con Node.js y TypeScript.
Recibe eventos de cualquier servicio y los distribuye por email, SMS y push
notifications de forma escalable, desacoplada y tolerante a fallos.

## Arquitectura

```
Productores → EventBus → Redis (Queue) → Workers → Canales
                                                    ├── Email
                                                    ├── SMS
                                                    └── Push
```

El sistema implementa el patrón productor-consumidor con Redis como message
broker. Los productores emiten eventos sin conocer a los consumidores.
Los consumidores procesan notificaciones de forma independiente, con reintentos
automáticos y dead letter queue para mensajes fallidos.

## Tecnologías

| Tecnología | Rol |
|---|---|
| Node.js + TypeScript | Runtime y tipado estático |
| Redis (ioredis) | Message broker y colas de trabajo |
| worker_threads | Procesamiento CPU-bound en paralelo |
| Streams API | Pipeline de notificaciones masivas |
| Winston | Logging estructurado (JSON en producción) |
| Jest + ts-jest | Testing unitario |
| Docker | Containerización |

## Conceptos implementados

- **Clean Architecture** — separación de dominio, infraestructura y canales
- **Typed EventEmitter** — bus de eventos con tipado genérico estricto
- **Worker Pool** — pool de hilos con auto-reemplazo en caso de crash
- **Backpressure** — control de flujo en el pipeline de streams
- **Exponential Backoff con Jitter** — reintentos inteligentes sin thundering herd
- **Dead Letter Queue** — captura de mensajes que agotan sus reintentos
- **Graceful Shutdown** — cierre ordenado sin pérdida de mensajes
- **Health Checks** — monitoreo de Redis y memoria en tiempo real

## Estructura del proyecto

```
src/
├── config/          # Variables de entorno y configuración
├── domain/          # Tipos, interfaces y DTOs (sin dependencias externas)
├── events/          # EventBus tipado y registro de handlers
├── broker/          # Redis producer, consumer y dead letter queue
├── channels/        # Implementaciones de email, SMS y push
├── workers/         # Worker threads y pool de workers
├── streams/         # Pipeline de notificaciones masivas
├── services/        # Lógica de negocio central
├── health/          # Health check server
└── shared/          # Logger, errores y graceful shutdown
```

## Requisitos

- Node.js 20+
- Docker y Docker Compose

## Inicio rápido

```bash
# Clona el repositorio
git clone https://github.com/tu-usuario/omninotify.git
cd omninotify

# Configura las variables de entorno
cp .env.example .env

# Levanta el sistema completo
docker-compose up --build
```

El sistema arranca en modo desarrollo con hot reload.

## Sin Docker

```bash
# Instala dependencias
npm install

# Necesitas Redis corriendo localmente
# brew install redis && brew services start redis  (Mac)
# docker run -d -p 6379:6379 redis:7-alpine        (cualquier OS)

# Desarrollo con hot reload
npm run dev

# Compilar y correr en producción
npm run build
npm start
```

## Scripts disponibles

```bash
npm run dev          # Desarrollo con hot reload
npm run build        # Compila TypeScript a JavaScript
npm start            # Corre el build de producción
npm test             # Corre los tests unitarios
npm run test:coverage # Tests con reporte de cobertura
npm run type-check   # Verifica tipos sin compilar
```

## Health Check

El sistema expone dos endpoints de monitoreo:

```bash
# Estado general del sistema
GET http://localhost:3000/health

# Respuesta ejemplo
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:23:42.123Z",
  "uptime": 42.3,
  "components": {
    "redis": { "status": "healthy", "latencyMs": 2 },
    "memory": { "status": "healthy", "latencyMs": 45 }
  }
}

# Readiness check (para Kubernetes)
GET http://localhost:3000/ready
```

## Flujo de una notificación

```
1. Servicio externo emite evento:
   eventBus.emit('user.registered', { userId, email, name })

2. NotificationService construye DTOs por canal:
   → NotificationDTO { channel: 'email', recipient, body }
   → NotificationDTO { channel: 'sms',   recipient, body }
   → NotificationDTO { channel: 'push',  recipient, body }

3. Producer encola en Redis:
   LPUSH omninotify:queue:email <json>
   LPUSH omninotify:queue:sms   <json>
   LPUSH omninotify:queue:push  <json>

4. Consumer procesa con BRPOP (blocking):
   → EmailChannel → WorkerPool → renderTemplate → send
   → SmsChannel   → send (simulado)
   → PushChannel  → send (simulado)

5. En caso de fallo:
   → Reintento con backoff exponencial (máx 3 intentos)
   → Si agota reintentos → Dead Letter Queue
```

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `NODE_ENV` | `development` | Ambiente de ejecución |
| `APP_PORT` | `3000` | Puerto del health server |
| `REDIS_HOST` | `localhost` | Host de Redis |
| `REDIS_PORT` | `6379` | Puerto de Redis |
| `REDIS_DB` | `0` | Base de datos de Redis |
| `LOG_LEVEL` | `debug` | Nivel de logging |

## Autor

**Julián Hernández**
[GitHub](https://github.com/Julianhernm)