import React, { useState, useMemo } from 'react';
import { Activity, AlertCircle, Clock, Cpu, RefreshCw, Zap } from 'lucide-react';
import type { AgentHealth } from '../hooks/useAgentsData';

interface AgentStatusProps {
  agents?: AgentHealth[];
}

type FilterMode = 'all' | 'active' | 'idle' | 'error';
type SortMode = 'name' | 'status' | 'heartbeat';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTokens(n: number): string {
  if (n === 0) return '0';
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function statusDot(status: AgentHealth['status']): string {
  switch (status) {
    case 'active': return '🟢';
    case 'idle':   return '🟡';
    case 'busy':   return '🟡';
    case 'error':  return '🔴';
    case 'offline':return '⚫';
    default:       return '⚪';
  }
}

function statusLabel(status: AgentHealth['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function cardStatusClasses(status: AgentHealth['status']): string {
  switch (status) {
    case 'active':  return 'border-green-500/40 bg-green-500/5';
    case 'idle':    return 'border-yellow-500/40 bg-yellow-500/5';
    case 'busy':    return 'border-yellow-500/40 bg-yellow-500/5';
    case 'error':   return 'border-red-500/40 bg-red-500/5';
    case 'offline': return 'border-gray-600/40 bg-gray-900/20';
    default:        return 'border-gray-700/40 bg-gray-900/10';
  }
}

function dotColor(status: AgentHealth['status']): string {
  switch (status) {
    case 'active':  return 'bg-green-500';
    case 'idle':    return 'bg-yellow-500';
    case 'busy':    return 'bg-yellow-400 animate-pulse';
    case 'error':   return 'bg-red-500';
    case 'offline': return 'bg-gray-600';
    default:        return 'bg-gray-500';
  }
}

// ── Agent Card ───────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: AgentHealth;
}

function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className={`p-4 rounded-lg border transition-all hover:border-primary/40 ${cardStatusClasses(agent.status)}`}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Animated status dot */}
          <span
            className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColor(agent.status)}`}
            title={agent.status}
          />
          <span className="text-xl flex-shrink-0" role="img" aria-label={agent.name}>
            {agent.emoji}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[140px]" title={agent.role}>
              {agent.role}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${
            agent.status === 'active'  ? 'bg-green-500/20 text-green-400' :
            agent.status === 'idle'    ? 'bg-yellow-500/20 text-yellow-400' :
            agent.status === 'busy'     ? 'bg-yellow-400/20 text-yellow-300 animate-pulse' :
            agent.status === 'error'    ? 'bg-red-500/20 text-red-400' :
            agent.status === 'offline' ? 'bg-gray-600/20 text-gray-400' :
                                         'bg-gray-500/20 text-gray-400'
          }`}
        >
          {statusDot(agent.status)} {statusLabel(agent.status)}
        </span>
      </div>

      {/* Current task */}
      {agent.currentTask && (
        <div className="mb-2 flex items-start gap-1.5">
          <Activity className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {agent.currentTask}
          </p>
        </div>
      )}

      {/* Error */}
      {agent.error && (
        <div className="mb-2 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400 leading-relaxed line-clamp-2">
            {agent.error}
          </p>
        </div>
      )}

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mt-3 pt-3 border-t border-border/50">
        {/* Last heartbeat */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span title={agent.lastHeartbeat ?? undefined}>
            {agent.heartbeatAge !== null
              ? formatAge(agent.heartbeatAge)
              : '—'}
          </span>
        </div>

        {/* Model */}
        <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
          <Cpu className="w-3 h-3 flex-shrink-0" />
          <span className="truncate" title={agent.model ?? undefined}>
            {agent.model ?? '—'}
          </span>
        </div>

        {/* Session tokens */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Zap className="w-3 h-3 flex-shrink-0" />
          <span>
            {formatTokens(agent.tokenUsage.session)} tok
          </span>
        </div>

        {/* Daily tokens */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Zap className="w-3 h-3 flex-shrink-0" />
          <span>
            {formatTokens(agent.tokenUsage.daily)} /day
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function AgentStatus({ agents: rawAgents }: AgentStatusProps) {
  const agents = rawAgents ?? [];

  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('name');

  // Status count badges
  const counts = useMemo(() => ({
    all: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    idle: agents.filter(a => a.status === 'idle' || a.status === 'busy').length,
    error: agents.filter(a => a.status === 'error' || a.status === 'offline').length,
  }), [agents]);

  // Filtered + sorted agents
  const displayed = useMemo(() => {
    let list = agents;

    // Filter
    if (filter === 'active') {
      list = list.filter(a => a.status === 'active');
    } else if (filter === 'idle') {
      list = list.filter(a => a.status === 'idle' || a.status === 'busy');
    } else if (filter === 'error') {
      list = list.filter(a => a.status === 'error' || a.status === 'offline');
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sort === 'status') {
        const order = ['active', 'busy', 'idle', 'error', 'offline', 'unknown'];
        return order.indexOf(a.status) - order.indexOf(b.status);
      }
      // sort === 'heartbeat' — most recent first (nulls last)
      if (a.heartbeatAge === null && b.heartbeatAge === null) return 0;
      if (a.heartbeatAge === null) return 1;
      if (b.heartbeatAge === null) return -1;
      return a.heartbeatAge - b.heartbeatAge; // smaller = more recent
    });
  }, [agents, filter, sort]);

  const filterButtons: { id: FilterMode; label: string }[] = [
    { id: 'all',   label: `All (${counts.all})` },
    { id: 'active', label: `Active (${counts.active})` },
    { id: 'idle',   label: `Idle (${counts.idle})` },
    { id: 'error',  label: `Error (${counts.error})` },
  ];

  const sortButtons: { id: SortMode; label: string }[] = [
    { id: 'name',     label: 'Name' },
    { id: 'status',   label: 'Status' },
    { id: 'heartbeat', label: 'Heartbeat' },
  ];

  return (
    <div className="space-y-4">
      {/* Header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Agent Status</h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter buttons */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {filterButtons.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort buttons */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
            {sortButtons.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSort(id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                  sort === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
                {sort === id && <RefreshCw className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent grid */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-border rounded-lg">
          <Activity className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No agents match the current filter.</p>
          <button
            onClick={() => setFilter('all')}
            className="mt-3 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Show all agents
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
