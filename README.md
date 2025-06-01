# Browser Factory

A distributed browser-for-scraping service built with **BullMQ**, **Deno Fresh**, and **Docker**.

## Architecture

Browser Factory provides on-demand browser instances through a distributed queue system:

- **BullMQ** serves as a distributed queue where messages are browser requests, fulfilled by Workers
- **Workers** spin up new Browser containers, properly forward ports, and update messages with debug WSS for CDP
- **Deno Fresh** provides an HTTP API that can:
  - `/create` - Create a new browser (posts message to queue, returns 202 with session name)
  - `/status` - Poll session status
  - `/terminate` - Force terminate a session

### Process Flow

1. **External client** sends `/create` API call to **Deno Fresh**
2. **Deno Fresh** posts a message to **queue** and returns new session name
3. A **worker** picks up the message and spins a new **Browser** in Docker
4. The **worker** updates the message with the target browser WSS
5. External client polls `/status` call which asks **Deno Fresh** to check target task status
6. When the task is updated — **Deno Fresh** returns target WSS
7. The **external client** connects to this session over CDP
8. When the **external client** is done, it disconnects from the session
9. After that, the **worker** terminates the Docker image and completes the task

## Technology Stack

- **Queue**: BullMQ with Redis
- **API Server**: Deno Fresh
- **Worker**: Deno with Docker API access
- **Browser**: browserless/chrome containers
- **Development**: Docker dev containers & compose

## Project Structure

```
repo-root
│
├─ apps/
│   ├─ api-fresh/
│   │   ├─ main.ts               # Fresh entry
│   │   ├─ routes/
│   │   │   ├─ create.ts         # POST /create - queue browser requests
│   │   │   ├─ status.ts         # GET /status - poll session status
│   │   │   └─ terminate.ts      # POST /terminate - force terminate session
│   │   ├─ ws_bridge.ts          # pipes CDP frames
│   │   ├─ deno.json             # permissions & tasks
│   │   ├─ fresh.config.ts       # Fresh configuration
│   │   └─ Dockerfile
│   │
│   └─ worker/
│       ├─ processor.ts          # BullMQ consumer
│       ├─ docker_client.ts      # dockerode helpers
│       ├─ deno.json
│       └─ Dockerfile
│
├─ libs/
│   ├─ queue/
│   │   ├─ types.ts              # JobPayload, ResultPayload
│   │   └─ client.ts             # thin wrapper around BullMQ
│   ├─ cdp/
│   │   └─ captcha.ts            # solveRecaptchas(), closeDialogs()
│   └─ shared.ts                 # shared utilities and constants
│
├─ .devcontainer/
│   └─ devcontainer.json         # Dev container configuration
├─ compose.yaml                  # Development compose setup
└─ README.md
```

## Development Setup

### Prerequisites

- Docker & Docker Compose
- VS Code with Dev Containers extension (recommended)

### Quick Start

1. **Clone and open in dev container:**

   ```bash
   git clone <repo-url>
   cd browserfactory
   # Open in VS Code and use "Reopen in Container"
   ```

2. **Start development environment:**
   ```bash
   docker compose up
   ```

This will start:

- **Redis** on port 6379
- **API Fresh server** on port 3000
- **Worker** instances (2 replicas)

### API Usage

#### Create Browser Session

```bash
POST http://localhost:3000/create
Content-Type: application/json

{
  "viewport": { "width": 1920, "height": 1080 },
  "userAgent": "Mozilla/5.0...",
  "headless": true,
  "timeout": 300000
}
```

Response:

```json
{
  "sessionId": "session_1703123456789_abc123def",
  "status": "accepted",
  "message": "Browser creation request queued"
}
```

#### Check Session Status

```bash
GET http://localhost:3000/status?sessionId=session_1703123456789_abc123def
```

Response:

```json
{
  "sessionId": "session_1703123456789_abc123def",
  "status": "completed",
  "browserWssUrl": "ws://localhost:9223",
  "containerId": "abc123...",
  "containerPort": 9223,
  "startedAt": 1703123456789,
  "completedAt": 1703123456890
}
```

#### Terminate Session

```bash
POST http://localhost:3000/terminate
Content-Type: application/json

{
  "sessionId": "session_1703123456789_abc123def"
}
```

### Session States

- `pending` - Job queued, waiting for worker
- `running` - Worker is creating browser container
- `completed` - Browser ready, WSS URL available
- `failed` - Error occurred during creation
- `terminated` - Session manually terminated

### WebSocket Bridge

The server relays WebSocket connections through itself, so workers are only reachable from the server IP. This provides:

- **Security**: Browser containers aren't directly exposed
- **Load balancing**: Single endpoint for all sessions
- **Monitoring**: Centralized connection tracking

## Configuration

### Environment Variables

**API Server:**

- `REDIS_URL` - Redis connection string (default: redis://redis:6379)
- `DENO_ENV` - Environment (development/production)

**Worker:**

- `REDIS_URL` - Redis connection string (default: redis://redis:6379)
- `DENO_ENV` - Environment (development/production)

### Browser Configuration

Browsers run with the following defaults:

- **Image**: `browserless/chrome:latest`
- **Memory limit**: 1GB
- **Shared memory**: 2GB (for Chrome)
- **Auto-remove**: Containers cleanup automatically
- **Port range**: 9222-9322

## Development Commands

### API Server

```bash
cd apps/api-fresh
deno task dev          # Start with hot reload
deno task start        # Production start
deno task check        # Lint and type check
```

### Worker

```bash
cd apps/worker
deno task dev          # Start with hot reload
deno task start        # Production start
deno task check        # Lint and type check
```

### Docker Development

```bash
# Start all services
docker compose up

# Start specific service
docker compose up api-fresh
docker compose up worker

# View logs
docker compose logs -f api-fresh
docker compose logs -f worker

# Scale workers
docker compose up --scale worker=3
```

## Monitoring & Debugging

### Logs

- API server logs HTTP requests and queue operations
- Workers log container lifecycle and job processing
- Redis operations are logged by BullMQ

### Container Management

Workers automatically:

- Clean up containers on startup
- Set resource limits (1GB RAM, CPU shares)
- Apply session labels for tracking
- Handle graceful shutdown

### Health Checks

- Redis: Built-in health check in compose
- Browser containers: CDP endpoint verification
- Workers: BullMQ connection monitoring

## Production Deployment

1. **Build images:**

   ```bash
   docker build -t browserfactory/api ./apps/api-fresh
   docker build -t browserfactory/worker ./apps/worker
   ```

2. **Deploy with compose:**

   ```bash
   # Update compose.yaml for production
   # - Remove dev volumes
   # - Use built images
   # - Configure resource limits
   # - Set up proper networking
   ```

3. **Scale workers based on load:**
   ```bash
   docker compose up --scale worker=5
   ```

## Security Considerations

- Workers require Docker socket access (`/var/run/docker.sock`)
- Browser containers run with resource limits
- API includes CORS headers for web client access
- WebSocket connections are proxied through the API server
- Session IDs are cryptographically random

## Extending the System

### Adding CDP Utilities

The `libs/cdp/` directory contains utilities for:

- Solving reCAPTCHAs (placeholder implementation)
- Handling browser dialogs
- Setting up auto-handlers

### Custom Browser Images

Modify `libs/shared.ts` `CONFIG.BROWSER_IMAGE` to use custom browser images with specific:

- Browser versions
- Extensions pre-installed
- Custom configurations
- Proxy settings

### Queue Monitoring

BullMQ provides built-in monitoring. Add Bull Dashboard or similar for:

- Job queue visualization
- Performance metrics
- Failed job management
- Worker status monitoring

## License

[Your License Here]

## Contributing

[Contributing Guidelines Here]
