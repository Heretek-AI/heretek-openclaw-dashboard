# Heretek OpenClaw Health Dashboard

> Real-time monitoring and observability for the OpenClaw multi-agent collective

## Overview

The Health Dashboard provides comprehensive monitoring for all OpenClaw services including:

- **Service Health** - Gateway, LiteLLM, PostgreSQL, Redis, Ollama, Langfuse
- **Agent Status** - Real-time status of all deployed agents
- **LiteLLM Metrics** - Cost tracking, token usage, latency, budget status
- **Langfuse Observability** - LLM tracing and analytics
- **Resource Monitoring** - CPU, memory, disk usage
- **A2A Communication** - Agent-to-agent message tracking
- **Session Analytics** - User session tracking and statistics

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Health Dashboard                               │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Frontend      │  │   API Layer     │  │   Collectors    │ │
│  │   (React/TSX)   │◄─┤   (Express)     │◄─┤   (Node.js)     │ │
│  │                 │  │                 │  │                 │ │
│  │  - ServiceStatus│  │  - /api/health  │  │  - service-     │ │
│  │  - AgentStatus  │  │  - /api/litellm │  │    collector.js │ │
│  │  - LiteLLM      │  │  - /api/agents  │  │  - agent-       │ │
│  │  - ModelUsage   │  │  - /api/budgets │  │    collector.js │ │
│  │  - BudgetStatus │  │                 │  │  - litellm-     │ │
│  │  - Langfuse     │  │                 │  │    metrics-     │ │
│  │                 │  │                 │  │    collector.js │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │  LiteLLM    │     │   Langfuse  │     │  Services   │
  │  :4000      │     │   :3000     │     │  (PG,Redis, │
  │             │     │             │     │   Ollama)   │
  └─────────────┘     └─────────────┘     └─────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Access to OpenClaw services (Gateway, LiteLLM, etc.)
- `LITELLM_MASTER_KEY` environment variable

### Installation

```bash
cd dashboard
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
LITELLM_URL=http://litellm:4000
LITELLM_MASTER_KEY=your-master-key-here

# Dashboard Server
DASHBOARD_PORT=18790
DASHBOARD_HOST=0.0.0.0

# Service URLs
GATEWAY_URL=http://gateway:18789
LANGFUSE_URL=http://langfuse:3000
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

### Service Status (`ServiceStatus.tsx`)
Displays health status for all core services with response times and uptime.

### Agent Status (`AgentStatus.tsx`)
Shows real-time status of all deployed agents with memory usage and last active time.

### LiteLLM Metrics (`LiteLLMMetrics.tsx`)
Comprehensive LiteLLM Gateway metrics:
- Total spend (today/week/month)
- Token usage breakdown
- Request latency percentiles (P50, P95, P99)
- Success/failure rates
- Budget alerts

### Model Usage (`ModelUsage.tsx`)
Analytics for LLM model usage:
- Cost breakdown by model
- Token usage statistics
- Active models count
- Usage trends

### Budget Status (`BudgetStatus.tsx`)
Budget tracking and alerts:
- Per-key/user budget status
- Utilization percentages
- Warning/critical alerts
- Remaining budget tracking

### Langfuse Metrics (`LangfuseMetrics.tsx`)
Langfuse observability integration:
- Trace counts
- Session analytics
- Cost tracking via Langfuse
- Link to full Langfuse dashboard

## LiteLLM Integration

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/litellm/health` | LiteLLM health check |
| `GET /api/litellm/metrics` | Comprehensive metrics data |
| `GET /api/litellm/spend` | Total spend data |
| `GET /api/litellm/spend/models` | Spend by model |
| `GET /api/litellm/spend/endpoints` | Spend by agent endpoint |
| `GET /api/litellm/budgets` | Budget status |
| `GET /api/litellm/models/usage` | Model usage statistics |
| `GET /api/litellm/agents/usage` | Agent usage statistics |
| `GET /api/litellm/prometheus` | Raw Prometheus metrics |

### Metrics Collection

The `litellm-metrics-collector.js` runs every 30 seconds:
- Fetches spend data from `/spend` endpoints
- Pulls Prometheus metrics from `/metrics`
- Aggregates cost by model and agent
- Checks budget status and generates alerts

### Prometheus Metrics

Available metrics from LiteLLM:
- `litellm_cost_dollars_total{model, agent}` - Total cost in USD
- `litellm_tokens_total{model, type}` - Token counts (input/output)
- `litellm_request_count_total{model, status}` - Request counts
- `litellm_request_latency_seconds{model}` - Latency histogram
- `litellm_deployment_failure_responses{model}` - Failure counts

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
  url: "http://litellm:4000"
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
├── api/                    # Express API routes
│   ├── litellm-api.js     # LiteLLM proxy routes
│   └── websocket-server.js # WebSocket server
├── collectors/             # Data collectors
│   ├── service-collector.js
│   ├── agent-collector.js
│   ├── resource-collector.js
│   └── litellm-metrics-collector.js
├── integrations/           # External integrations
│   └── litellm-integration.js
├── config/                 # Configuration
│   └── dashboard-config.yaml
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # React hooks
│   │   └── styles/        # CSS styles
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

## Integration with LiteLLM WebUI

The Health Dashboard complements the built-in LiteLLM WebUI:

| Feature | Health Dashboard | LiteLLM WebUI |
|---------|-----------------|---------------|
| Cost Tracking | ✓ | ✓ |
| Token Usage | ✓ | ✓ |
| Budget Alerts | ✓ | ✓ |
| Service Health | ✓ | - |
| Agent Status | ✓ | - |
| Langfuse Traces | ✓ | - |
| Key Management | - | ✓ |
| Spend Reports | Summary | Detailed |

**LiteLLM WebUI Access:** `http://localhost:4000/ui` (requires master key)

## Troubleshooting

### LiteLLM Connection Failed

```bash
# Check LiteLLM is running
curl http://litellm:4000/health

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

## References

- [LiteLLM Documentation](https://docs.litellm.ai/docs/proxy/prometheus)
- [Langfuse Documentation](https://langfuse.com/docs)
- [LiteLLM Observability Guide](../docs/operations/LITELLM_OBSERVABILITY_INTEGRATION.md)
- [Langfuse Integration](../docs/operations/LANGFUSE_OBSERVABILITY.md)

---

🦞 *The thought that never ends.*
