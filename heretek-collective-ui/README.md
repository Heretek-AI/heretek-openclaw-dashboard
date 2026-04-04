# Heretek Collective UI

> Real-time monitoring and control interface for the Heretek-AI Collective

## Overview

The Heretek Collective UI provides a comprehensive dashboard for monitoring and controlling the OpenClaw multi-agent collective, featuring:

- **Neural Map** — Live visualization of agent topology and A2A communications using React Flow
- **Agent & Skill Manager** — Deploy, configure, and manage agents and skills
- **Memory Deep Search** — Query vector DB with episodic/semantic/shared filters
- **A2A Monitor** — Live stream of inter-agent "internal monologue" via SSE
- **Collective Command Line** — Global broadcast input for autonomous debate

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Cybernetic Theme)
- **State Management:** Zustand
- **Visualization:** React Flow
- **Real-time:** Server-Sent Events (SSE), WebSocket

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to OpenClaw services (Gateway, LiteLLM, Qdrant)

### Installation

```bash
cd heretek-collective-ui
npm install
```

### Configuration

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Update environment variables:
```bash
# LiteLLM Configuration
LITELLM_URL=http://localhost:4000
LITELLM_MASTER_KEY=your-master-key-here

# Gateway Configuration
GATEWAY_URL=ws://localhost:18789
GATEWAY_API_KEY=your-gateway-api-key

# Vector Database
QDRANT_URL=http://localhost:6333
DATABASE_URL=postgresql://heretek:password@localhost:5432/heretek
```

### Development

```bash
npm run dev
```

Access the dashboard at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
docker-compose up -d
```

The dashboard will be available at `http://localhost:3000`

### Environment Variables for Docker

Create a `.env` file in the same directory as `docker-compose.yml`:

```bash
LITELLM_MASTER_KEY=sk-1234
GATEWAY_API_KEY=your-gateway-api-key
```

## Project Structure

```
heretek-collective-ui/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Dashboard home (Neural Map)
│   │   ├── agents/             # Agent Manager page
│   │   ├── memory/             # Memory Search page
│   │   ├── a2a/                # A2A Monitor page
│   │   ├── config/             # Configuration page
│   │   └── api/                # API Routes (BFF layer)
│   │
│   ├── components/
│   │   ├── ui/                 # Base UI components
│   │   ├── neural-map/         # Neural Map components
│   │   ├── agent-manager/      # Agent & Skill Manager
│   │   ├── memory-search/      # Memory Deep Search
│   │   ├── a2a-monitor/        # A2A Monitor
│   │   ├── command-line/       # Collective Command Line
│   │   └── layout/             # Layout components
│   │
│   ├── store/                  # Zustand State Stores
│   │   ├── agentStore.ts       # Agent state
│   │   ├── neuralMapStore.ts   # Neural Map state
│   │   ├── memoryStore.ts      # Memory search state
│   │   └── a2aStore.ts         # A2A message buffer
│   │
│   ├── hooks/                  # Custom React Hooks
│   └── lib/                    # Utilities
│
├── styles/
│   └── globals.css             # Global styles & theme
│
├── Dockerfile                  # Production Docker image
├── docker-compose.yml          # Docker Compose configuration
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── package.json
```

## API Endpoints

The dashboard includes a BFF (Backend for Frontend) layer with the following API routes:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents with status |
| `/api/agents/:id` | GET/PUT | Get/update specific agent |
| `/api/agents/:id/deploy` | POST | Deploy agent instance |
| `/api/skills` | GET/POST | List/install skills |
| `/api/skills/:id` | DELETE | Remove skill |
| `/api/memory/search` | POST | Search vector DB |
| `/api/memory/:id` | GET/DELETE | Get/delete memory |
| `/api/memory/:id/pin` | POST | Pin memory (prevent pruning) |
| `/api/a2a/stream` | GET | SSE stream of A2A messages |
| `/api/a2a/broadcast` | POST | Send to Global Workspace |
| `/api/gateway/health` | GET | Gateway health check |
| `/api/gateway/config` | GET/PUT | Gateway configuration |
| `/api/litellm/metrics` | GET | LiteLLM metrics |
| `/api/litellm/config` | GET/PUT | LiteLLM configuration |

## Features

### Neural Map

Interactive React Flow canvas showing:
- Agent nodes with status indicators
- Animated A2A communication edges
- Real-time status updates
- Node details panel
- Zoom/pan controls

### Agent Manager

- Agent registry with deployment controls
- Skill store for browsing/installing plugins
- Real-time status monitoring
- Memory usage tracking

### Memory Deep Search

- Semantic, episodic, and shared memory filters
- Vector similarity search
- Memory pinning/pruning
- Usage statistics

### A2A Monitor

- Live SSE stream of agent communications
- Envelope viewer with trace details
- Latency tracking
- Collective broadcast console

## Theming

The dashboard uses a custom cybernetic theme with:
- Cyan accent colors (#06b6d4, #22d3ee)
- Dark background (#030712)
- Monospace fonts (JetBrains Mono)
- Glow effects and animations

Customize in `tailwind.config.js` and `styles/globals.css`.

## Related Repositories

- [Core](https://github.com/heretek/heretek-openclaw-core) - Gateway and agents
- [CLI](https://github.com/heretek/heretek-openclaw-cli) - Deployment CLI
- [Plugins](https://github.com/heretek/heretek-openclaw-plugins) - Plugin system
- [Deploy](https://github.com/heretek/heretek-openclaw-deploy) - Infrastructure as Code
- [Docs](https://github.com/heretek/heretek-openclaw-docs) - Documentation

## License

MIT

## Support

- **Issues:** https://github.com/heretek/heretek-openclaw-dashboard/issues
- **Discussions:** https://github.com/heretek/heretek-openclaw-dashboard/discussions

---

🦞 *The thought that never ends.*
