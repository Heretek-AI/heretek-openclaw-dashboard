import { useState, useEffect, useCallback, useRef } from 'react';

export interface AgentHealth {
  id: string;
  name: string;
  role: string;
  emoji: string;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline' | 'unknown';
  lastHeartbeat: string | null;
  heartbeatAge: number | null;
  currentTask: string | null;
  model: string | null;
  tokenUsage: { session: number; daily: number };
  memoryUsage: number | null;
  uptime: number | null;
  error: string | null;
  _sessionStatus?: string | null;
  _hasHeartbeat?: boolean;
}

interface UseAgentsDataResult {
  agents: AgentHealth[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

// Default agent list used when /api/health is unavailable
const DEFAULT_AGENTS: AgentHealth[] = [
  { id: 'steward',   name: 'Steward',   role: 'Orchestrator',          emoji: '🦞', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
  { id: 'alpha',     name: 'Alpha',     role: 'Triad Node A',          emoji: '🔺', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
  { id: 'beta',      name: 'Beta',      role: 'Triad Node B',          emoji: '🔷', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
  { id: 'charlie',   name: 'Charlie',  role: 'Triad Node C',          emoji: '🔶', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
  { id: 'examiner',  name: 'Examiner',  role: 'Quality Assurance',     emoji: '🔍', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
  { id: 'explorer',  name: 'Explorer',  role: 'Intelligence',           emoji: '🗺️', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
  { id: 'sentinel',  name: 'Sentinel',  role: 'Security',               emoji: '🛡️', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
  { id: 'coder',     name: 'Coder',     role: 'Software Development',  emoji: '👨‍💻', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
  { id: 'dreamer',   name: 'Dreamer',  role: 'Creative',               emoji: '💭', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
  { id: 'empath',   name: 'Empath',    role: 'Emotional Intelligence', emoji: '💝', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
  { id: 'historian', name: 'Historian', role: 'Memory & Context',      emoji: '📚', status: 'idle', lastHeartbeat: null, heartbeatAge: null, currentTask: null, model: null, tokenUsage: { session: 0, daily: 0 }, memoryUsage: null, uptime: null, error: null },
];

export function useAgentsData(options: {
  apiUrl?: string;
  pollInterval?: number;
} = {}): UseAgentsDataResult {
  const apiUrl = options.apiUrl || '/api/health';
  const pollInterval = options.pollInterval || 5000;

  const [agents, setAgents] = useState<AgentHealth[]>(DEFAULT_AGENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Support both flat agents array and nested { agents: [] } structure
      const agentList: AgentHealth[] = Array.isArray(data)
        ? data
        : Array.isArray(data.agents)
        ? data.agents
        : null;

      if (agentList && agentList.length > 0) {
        // Normalize each agent entry to our AgentHealth shape
        const normalized: AgentHealth[] = agentList.map((a: Record<string, unknown>) => ({
          id: String(a.id || a.name || 'unknown'),
          name: String(a.name || a.id || 'Unknown'),
          role: String(a.role || 'Agent'),
          emoji: String(a.emoji || '🤖'),
          status: normalizeStatus(a.status as string | undefined),
          lastHeartbeat: a.lastHeartbeat as string | null ?? a.last_heartbeat as string | null ?? null,
          heartbeatAge: a.heartbeatAge as number | null ?? a.heartbeat_age as number | null ?? null,
          currentTask: (a.currentTask as string | null) ?? (a.current_task as string | null) ?? null,
          model: (a.model as string | null) ?? (a.current_model as string | null) ?? null,
          tokenUsage: {
            session: Number(a.tokenUsage?.session ?? (a as Record<string, unknown>).session_tokens ?? a.session_tokens ?? 0),
            daily: Number(a.tokenUsage?.daily ?? (a as Record<string, unknown>).daily_tokens ?? a.daily_tokens ?? 0),
          },
          memoryUsage: a.memoryUsage as number | null ?? null,
          uptime: a.uptime as number | null ?? null,
          error: (a.error as string | null) ?? null,
        }));

        setAgents(normalized);
        setError(null);
        setLastUpdated(new Date());
      } else {
        // Got data but no agents — use defaults
        setAgents(DEFAULT_AGENTS);
        setError('No agent data returned, using defaults');
      }
    } catch (err) {
      // Network or parse error — fall back to defaults silently
      setError(err instanceof Error ? err.message : 'Failed to fetch agent data');
      // Keep previous agents if we have them; otherwise use defaults
      setAgents(prev => prev.length > 0 ? prev : DEFAULT_AGENTS);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  // Start polling
  useEffect(() => {
    // Initial fetch
    fetchAgents();

    // Set up interval
    intervalRef.current = setInterval(fetchAgents, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchAgents, pollInterval]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, lastUpdated, refresh };
}

function normalizeStatus(s?: string): AgentHealth['status'] {
  if (!s) return 'unknown';
  const l = s.toLowerCase();
  if (['active', 'running', 'online', 'healthy', 'ok'].includes(l)) return 'active';
  if (['idle', 'waiting', 'standby', 'ready'].includes(l)) return 'idle';
  if (['busy', 'processing', 'working', 'task_running', 'deliberating'].includes(l)) return 'busy';
  if (['error', 'failed', 'crashed'].includes(l)) return 'error';
  if (['offline', 'disconnected', 'stopped', 'terminated'].includes(l)) return 'offline';
  return 'unknown';
}
