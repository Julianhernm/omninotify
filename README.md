# OmniNotify

A scalable, decoupled omnichannel notification system built with Node.js and
TypeScript. Receives events from any service and distributes them across email,
SMS, and push notifications with fault tolerance, automatic retries, and
dead letter queue support.

## Architecture

```
Producers → EventBus → Redis (Queue) → Workers → Channels
                                                  ├── Email
                                                  ├── SMS
                                                  └── Push
```

OmniNotify implements the producer-consumer pattern with Redis as the message
broker. Producers emit events without knowing who consumes them. Each channel
worker processes notifications independently, with automatic retries and a
dead letter queue for failed messages.

## Tech Stack

| Technology | Role |
|---|---|
| Node.js + TypeScript | Runtime and strict static typing |
| Redis (ioredis) | Message broker and work queues |
| worker_threads | Parallel CPU-bound processing |
| Streams API | High-volume notification pipeline |
| Winston | Structured logging (JSON in production) |
| Jest + ts-jest | Unit testing |
| Docker | Containerization |

## Key Concepts

- **Clean Architecture** — strict separation of domain, infrastructure and channels
- **Typed EventEmitter** — event bus with strict generic constraints
- **Worker Pool** — thread pool with automatic replacement on worker crash
- **Backpressure** — flow control in the streams pipeline
- **Exponential Backoff with Jitter** — smart retries without thundering herd
- **Dead Letter Queue** — captures messages that exhaust their retry budget
- **Graceful Shutdown** — ordered teardown without losing in-flight messages
- **Health Checks** — real-time Redis latency and memory monitoring

## Project Structure

```
src/
├── config/          # Environment variables and configuration
├── domain/          # Types, interfaces and DTOs (no external dependencies)
├── events/          # Typed EventBus and handler registration
├── broker/          # Redis producer, consumer and dead letter queue
├── channels/        # Email, SMS and push implementations
├── workers/         # Worker threads and worker pool
├── streams/         # High-volume notification pipeline
├── services/        # Core business logic
├── health/          # Health check HTTP server
└── shared/          # Logger, errors and graceful shutdown
```

## Requirements

- Node.js 20+
- Docker and Docker Compose

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Julianhernm/omninotify.git
cd omninotify

# Set up environment variables
cp .env.example .env

# Start the full system
docker-compose up --build
```

The system starts in development mode with hot reload enabled.

## Without Docker

```bash
# Install dependencies
npm install

# You need Redis running locally
# brew install redis && brew services start redis  (Mac)
# docker run -d -p 6379:6379 redis:7-alpine        (any OS)

# Development with hot reload
npm run dev

# Build and run in production mode
npm run build
npm start
```

## Available Scripts

```bash
npm run dev           # Development with hot reload
npm run build         # Compile TypeScript to JavaScript
npm start             # Run the production build
npm test              # Run unit tests
npm run test:coverage # Tests with coverage report
npm run type-check    # Type checking without compilation
```

## Health Check

```bash
# Overall system status
GET http://localhost:3000/health

# Example response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:23:42.123Z",
  "uptime": 42.3,
  "components": {
    "redis": { "status": "healthy", "latencyMs": 2 },
    "memory": { "status": "healthy", "latencyMs": 45 }
  }
}

# Readiness probe (for Kubernetes)
GET http://localhost:3000/ready
```

## Notification Flow

```
1. External service emits an event:
   eventBus.emit('user.registered', { userId, email, name })

2. NotificationService builds DTOs per channel:
   → NotificationDTO { channel: 'email', recipient, body }
   → NotificationDTO { channel: 'sms',   recipient, body }
   → NotificationDTO { channel: 'push',  recipient, body }

3. Producer enqueues in Redis:
   LPUSH omninotify:queue:email <json>
   LPUSH omninotify:queue:sms   <json>
   LPUSH omninotify:queue:push  <json>

4. Consumer processes with BRPOP (blocking pop):
   → EmailChannel → WorkerPool → renderTemplate → send
   → SmsChannel   → send (simulated / Twilio ready)
   → PushChannel  → send (simulated / FCM ready)

5. On failure:
   → Retry with exponential backoff (max 3 attempts)
   → If retries exhausted → Dead Letter Queue
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `APP_PORT` | `3000` | Health server port |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_DB` | `0` | Redis database index |
| `LOG_LEVEL` | `debug` | Logging level |

## Author

**Julián Hernández**
[GitHub](https://github.com/Julianhernm) ·