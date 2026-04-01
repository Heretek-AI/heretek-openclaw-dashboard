# Heretek OpenClaw Dashboard

> Real-time monitoring and observability for the OpenClaw multi-agent collective.

## Overview

The Health Dashboard provides comprehensive monitoring for all OpenClaw services including:

- **Service Health** - Gateway, LiteLLM, PostgreSQL, Redis, Ollama, Langfuse
- **Agent Status** - Real-time status of all deployed agents
- **LiteLLM Metrics** - Cost tracking, token usage, latency, budget status
- **Langfuse Observability** - LLM tracing and analytics
- **Resource Monitoring** - CPU, memory, disk usage
- **A2A Communication** - Agent-to-agent message tracking

## Quick Start

### Prerequisites

- Node.js 18+
- Access to OpenClaw services (Gateway, LiteLLM, etc.)
- `LITELLM_MASTER_KEY` environment variable

### Installation

```bash
git clone https://github.com/heretek/heretek-openclaw-dashboard.git
cd heretek-openclaw-dashboard
npm install
```

### Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update environment variables:
```bash
# LiteLLM Configuration
LITELLM_URL=http://localhost:4000
LITELLM_MASTER_KEY=your-master-key-here

# Dashboard Server
DASHBOARD_PORT=18790
DASHBOARD_HOST=0.0.0.0

# Service URLs
GATEWAY_URL=http://localhost:18789
LANGFUSE_URL=http://localhost:3000
```

### Running the Dashboard

```bash
# Development
npm run dev

# Production
npm start
```

Access the dashboard at `http://localhost:18790`

## Components

### Service Status

Displays health status for all core services with response times and uptime.

### Agent Status

Shows real-time status of all deployed agents with memory usage and last active time.

### LiteLLM Metrics

Comprehensive LiteLLM Gateway metrics:
- Total spend (today/week/month)
- Token usage breakdown
- Request latency percentiles (P50, P95, P99)
- Success/failure rates
- Budget alerts

### Model Usage

Analytics for LLM model usage:
- Cost breakdown by model
- Token usage statistics
- Active models count
- Usage trends

### Budget Status

Budget tracking and alerts:
- Per-key/user budget status
- Utilization percentages
- Warning/critical alerts
- Remaining budget tracking

## API Reference

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Service health check |
| `GET /api/litellm/health` | LiteLLM health check |
| `GET /api/litellm/metrics` | Comprehensive metrics data |
| `GET /api/litellm/spend` | Total spend data |
| `GET /api/litellm/budgets` | Budget status |
| `GET /api/agents` | Agent status |
| `GET /api/services` | Service status |

## Configuration

### Dashboard Config (`config/dashboard-config.yaml`)

```yaml
dashboard:
  name: "OpenClaw Health Dashboard"
  refresh_interval: 30000  # 30 seconds
  
server:
  port: 18790
  host: "0.0.0.0"

litellm:
  enabled: true
  url: "http://localhost:4000"
  collection_interval: 30000
```

### Alert Thresholds

```yaml
alerts:
  thresholds:
    budget_warning: 80      # 80% of budget
    budget_critical: 100    # 100% of budget
    latency_warning: 5000   # 5 seconds
    latency_critical: 10000 # 10 seconds
    error_rate_warning: 5   # 5%
    error_rate_critical: 10 # 10%
```

## Development

### Project Structure

```
dashboard/
├── src/                    # Source code
│   ├── api/               # Express API routes
│   ├── collectors/        # Data collectors
│   ├── integrations/      # External integrations
│   └── config/            # Configuration
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # React hooks
│   │   └── styles/       # CSS styles
│   └── index.html
└── README.md
```

### Adding New Components

1. Create component in `frontend/src/components/`
2. Create hook in `frontend/src/hooks/` if needed
3. Add to UI configuration in `dashboard-config.yaml`
4. Register in main app (`frontend/src/app.tsx`)

### Testing

```bash
# Run tests
npm test

# Lint
npm run lint
```

## Troubleshooting

### LiteLLM Connection Failed

```bash
# Check LiteLLM is running
curl http://localhost:4000/health

# Verify master key
echo $LITELLM_MASTER_KEY
```

### Metrics Not Updating

1. Check collector is running: `docker compose ps`
2. Review logs: `docker compose logs dashboard`
3. Verify network connectivity between services

### Budget Alerts Not Showing

1. Ensure budgets are configured in LiteLLM
2. Check `budget_settings` in `litellm_config.yaml`
3. Verify spend data is being collected

## Related Repositories

- [Core](https://github.com/heretek/heretek-openclaw-core) - Gateway and agents
- [CLI](https://github.com/heretek/heretek-openclaw-cli) - Deployment CLI
- [Plugins](https://github.com/heretek/heretek-openclaw-plugins) - Plugin system
- [Deploy](https://github.com/heretek/heretek-openclaw-deploy) - Infrastructure as Code
- [Docs](https://github.com/heretek/heretek-openclaw-docs) - Documentation site

## License

MIT

## Support

- **Issues:** https://github.com/heretek/heretek-openclaw-dashboard/issues
- **Discussions:** https://github.com/heretek/heretek-openclaw-dashboard/discussions

---

🦞 *The thought that never ends.*
