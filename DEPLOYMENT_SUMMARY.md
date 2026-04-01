# Heretek OpenClaw Dashboard - Deployment Summary

## Deployment Status: ✅ SUCCESSFUL

The Heretek OpenClaw Dashboard and monitoring stack have been successfully deployed using Docker Compose.

---

## Access URLs

| Service | URL | Port | Status |
|---------|-----|------|--------|
| **Health Dashboard API** | http://localhost:18080 | 18080 | ✅ Running |
| **Health Dashboard (Frontend)** | http://localhost:18790 | 18790 | ✅ Running |
| **Prometheus** | http://localhost:9090 | 9090 | ✅ Running |
| **Grafana** | http://localhost:3001 | 3001 | ✅ Running |
| **cAdvisor** | http://localhost:8080 | 8080 | ✅ Running |
| **Node Exporter** | http://localhost:9100 | 9100 | ✅ Running |
| **Redis Exporter** | http://localhost:9121 | 9121 | ✅ Running |
| **Postgres Exporter** | http://localhost:9187 | 9187 | ✅ Running |
| **Blackbox Exporter** | http://localhost:9115 | 9115 | ✅ Running |

---

## Running Services

```
heretek-dashboard           Up (healthy)    Ports: 18790, 18080
heretek-grafana             Up (healthy)    Port: 3001
heretek-prometheus          Up (healthy)    Port: 9090
heretek-cadvisor            Up (healthy)    Port: 8080
heretek-node-exporter       Up              Port: 9100
heretek-blackbox-exporter   Up              Port: 9115
heretek-redis-exporter      Up              Port: 9121
heretek-postgres-exporter   Up              Port: 9187
```

---

## API Endpoints

### Health Dashboard API

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Basic health check |
| `GET /api/health` | Full health data (agents, services, resources, alerts) |
| `GET /api/health/agents` | Agent status |
| `GET /api/health/services` | Service health |
| `GET /api/health/resources` | Resource usage (CPU, memory, disk) |
| `GET /api/health/alerts` | Active alerts |
| `GET /api/health/summary` | Health summary |
| `GET /api/metrics` | Prometheus metrics |
| `GET /api/config` | Dashboard configuration |
| `WebSocket /ws` | Real-time health updates |

### Example API Calls

```bash
# Health check
curl http://localhost:18080/health

# Full health data
curl http://localhost:18080/api/health

# Health summary
curl http://localhost:18080/api/health/summary
```

---

## Grafana Access

- **URL**: http://localhost:3001
- **Username**: admin
- **Password**: admin123 (change in production!)

---

## Deployment Files Created

| File | Purpose |
|------|---------|
| [`docker-compose.yml`](docker-compose.yml) | Dashboard and monitoring stack deployment |
| [`.env`](.env) | Environment configuration |
| [`Dockerfile`](Dockerfile) | Dashboard container build |

---

## Troubleshooting

### Dashboard Not Starting

1. **Check container logs**:
   ```bash
   docker logs heretek-dashboard
   ```

2. **Restart the dashboard**:
   ```bash
   docker compose restart dashboard
   ```

3. **Rebuild if needed**:
   ```bash
   docker compose up -d --build dashboard
   ```

### Service Status Shows Errors

The dashboard container runs in isolation and may not have access to host-level tools (pg_isready, redis-cli). This is expected behavior. The service collectors will show errors for services that require CLI tools not installed in the container.

To improve service detection:
1. Ensure all core services are running in the same Docker network
2. Verify network connectivity: `docker network inspect heretek-openclaw-core_heretek-network`
3. Check service health directly:
   ```bash
   curl http://localhost:4000/health  # LiteLLM
   curl http://localhost:3000/api/health  # Langfuse
   ```

### Prometheus Not Scraping Targets

1. Check Prometheus targets: http://localhost:9090/targets
2. Verify prometheus.yml configuration
3. Check Prometheus logs: `docker logs heretek-prometheus`

### Grafana Dashboards Empty

1. Verify Prometheus datasource is configured
2. Check Grafana logs: `docker logs heretek-grafana`
3. Wait 1-2 minutes for metrics to populate

### Port Conflicts

If you see "port already allocated" errors:
1. Check what's using the port: `lsof -i :PORT`
2. Update `.env` file with alternative ports
3. Restart: `docker compose up -d`

---

## Configuration

### Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHBOARD_PORT` | 18790 | Dashboard frontend port |
| `HEALTH_API_PORT` | 18080 | Health API port |
| `LITELLM_URL` | http://litellm:4000 | LiteLLM endpoint |
| `LITELLM_MASTER_KEY` | (required) | LiteLLM API key |
| `GRAFANA_PORT` | 3001 | Grafana port |
| `GRAFANA_ADMIN_USER` | admin | Grafana admin user |
| `GRAFANA_ADMIN_PASSWORD` | admin123 | Grafana admin password |
| `PROMETHEUS_PORT` | 9090 | Prometheus port |

---

## Commands

```bash
# Start all services
cd /root/heretek/heretek-openclaw-dashboard
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# View specific service logs
docker logs -f heretek-dashboard

# Restart dashboard
docker compose restart dashboard

# Rebuild dashboard
docker compose up -d --build dashboard

# Check service status
docker compose ps
```

---

## Notes

- The monitoring stack uses the existing `heretek-openclaw-core_heretek-network` network
- All data is persisted in Docker volumes (prometheus_data, grafana_data)
- The dashboard collects health data every 5 seconds by default
- Alerts are automatically generated for service failures and resource thresholds

---

## Related Documentation

- [Main README](README.md)
- [Monitoring Stack Docs](../heretek-openclaw-docs/docs/operations/MONITORING_STACK.md)
- [Langfuse Setup](../heretek-openclaw-docs/docs/operations/LANGFUSE_LOCAL_SETUP.md)
