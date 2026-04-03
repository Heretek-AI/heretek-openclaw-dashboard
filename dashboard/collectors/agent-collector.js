/**
 * Heretek OpenClaw Health Check Dashboard - Agent Collector
 *
 * Collects health data for all agents in the OpenClaw system.
 * Uses `openclaw sessions list` and filesystem reads to get live agent data.
 *
 * @version 2.0.0
 */

const http = require('http');
const https = require('https');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Agent workspace base directory
const AGENT_WORKSPACE_BASE = '/root/.openclaw/agents';

class AgentCollector {
  constructor(options = {}) {
    this.gatewayUrl = options.gatewayUrl || 'http://localhost:18789';
    this.hostGatewayUrl = options.hostGatewayUrl || 'http://172.17.0.1:18789';
    this.timeout = options.timeout || 5000;
    this.agents = [];
    this.initialized = false;
    // Cache session data to avoid hammering openclaw
    this._sessionCache = null;
    this._sessionCacheTime = 0;
    this._sessionCacheTTL = 3000; // 3 seconds
  }

  /**
   * Initialize the collector
   */
  async initialize() {
    try {
      this.agents = await this.fetchAgentList();
      this.initialized = true;
      console.log(`[AgentCollector] Initialized with ${this.agents.length} agents`);
    } catch (error) {
      console.error('[AgentCollector] Failed to initialize:', error.message);
      this.agents = this.getDefaultAgents();
      this.initialized = true;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.agents = [];
    this.initialized = false;
    this._sessionCache = null;
  }

  /**
   * Get sessions list (cached)
   */
  _getSessionsCached() {
    const now = Date.now();
    if (this._sessionCache && (now - this._sessionCacheTime) < this._sessionCacheTTL) {
      return this._sessionCache;
    }
    try {
      const out = execSync('openclaw sessions list --json 2>/dev/null', {
        timeout: 3000,
        encoding: 'utf8',
        maxBuffer: 512 * 1024,
      });
      this._sessionCache = JSON.parse(out);
      this._sessionCacheTime = now;
      return this._sessionCache;
    } catch (err) {
      // Fallback: try plain text output
      try {
        const out = execSync('openclaw sessions list 2>/dev/null', {
          timeout: 3000,
          encoding: 'utf8',
          maxBuffer: 512 * 1024,
        });
        this._sessionCache = this._parseTextSessions(out);
        this._sessionCacheTime = now;
        return this._sessionCache;
      } catch (_) {
        return [];
      }
    }
  }

  /**
   * Parse plain text sessions output into structured format
   */
  _parseTextSessions(text) {
    const sessions = [];
    const lines = text.trim().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      // Try to parse as JSON lines or structured text
      try {
        sessions.push(JSON.parse(trimmed));
      } catch (_) {
        // Try regex for "session_id | status | ..." format
        const parts = trimmed.split(/\s*[|]\s*/);
        if (parts.length >= 2) {
          sessions.push({
            id: parts[0].trim(),
            status: parts[1].trim(),
            lastActivity: parts[2]?.trim() || null,
            model: parts[3]?.trim() || null,
          });
        }
      }
    }
    return sessions;
  }

  /**
   * Get agents list from openclaw CLI (cached)
   */
  _getAgentsListCached() {
    try {
      const out = execSync('openclaw agents list --json 2>/dev/null', {
        timeout: 3000,
        encoding: 'utf8',
        maxBuffer: 256 * 1024,
      });
      return JSON.parse(out);
    } catch (_) {
      try {
        const out = execSync('openclaw agents list 2>/dev/null', {
          timeout: 3000,
          encoding: 'utf8',
          maxBuffer: 256 * 1024,
        });
        return this._parseTextAgents(out);
      } catch (_) {
        return [];
      }
    }
  }

  /**
   * Parse plain text agents output
   */
  _parseTextAgents(text) {
    const agents = [];
    const lines = text.trim().split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      try {
        agents.push(JSON.parse(trimmed));
      } catch (_) {
        const parts = trimmed.split(/\s*[|]\s*/);
        if (parts.length >= 2) {
          agents.push({
            name: parts[0].trim(),
            role: parts[1].trim(),
            status: parts[2]?.trim() || 'unknown',
            model: parts[3]?.trim() || null,
          });
        }
      }
    }
    return agents;
  }

  /**
   * Read a file safely, returning null on failure
   */
  _readFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (_) {
      return null;
    }
  }

  /**
   * Get agent workspace path
   */
  _getWorkspacePath(agentId) {
    return path.join(AGENT_WORKSPACE_BASE, agentId, 'workspace');
  }

  /**
   * Parse SOUL.md to extract agent metadata
   */
  _parseSoulMd(content) {
    const result = {
      name: null,
      role: null,
      emoji: '🤖',
      description: null,
    };

    if (!content) return result;

    // Extract name from "Name:" or "Steward" line
    const nameMatch = content.match(/(?:\*\*Name:\*\*|Name\s*[-:]\s*)(.+)/i) ||
                      content.match(/^#\s+SOUL\.md\s+[—–-]\s*(.+)/im) ||
                      content.match(/^#\s+(.+)/m);
    if (nameMatch) result.name = nameMatch[1].trim().replace(/[*_]/g, '');

    // Extract role
    const roleMatch = content.match(/(?:\*\*Role:\*\*|Role\s*[-:]\s*)(.+)/i);
    if (roleMatch) result.role = roleMatch[1].trim().replace(/[*_]/g, '');

    // Extract emoji (look for flag or dingbat patterns)
    const emojiMatch = content.match(/([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])/u);
    if (emojiMatch) result.emoji = emojiMatch[1];

    // First non-heading, non-empty line as description
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('*') && trimmed.length > 10) {
        result.description = trimmed.replace(/[*_#]/g, '').slice(0, 120);
        break;
      }
    }

    return result;
  }

  /**
   * Check if heartbeat file has content (indicates alive)
   */
  _readHeartbeat(workspacePath) {
    try {
      const hbPath = path.join(workspacePath, 'HEARTBEAT.md');
      if (!fs.existsSync(hbPath)) return null;
      const stat = fs.statSync(hbPath);
      const content = fs.readFileSync(hbPath, 'utf8').trim();
      if (!content) return null;
      return {
        lastHeartbeat: stat.mtime.toISOString(),
        content,
      };
    } catch (_) {
      return null;
    }
  }

  /**
   * Get last activity time from session history (filesystem-based)
   */
  _getLastActivity(agentId) {
    try {
      // Try session history files
      const historyPath = path.join(AGENT_WORKSPACE_BASE, agentId, 'session_history.json');
      if (fs.existsSync(historyPath)) {
        const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        if (Array.isArray(history) && history.length > 0) {
          const last = history[history.length - 1];
          return last.timestamp || last.time || last.date || null;
        }
      }

      // Fall back to SOUL.md mtime as proxy for activity
      const soulPath = path.join(AGENT_WORKSPACE_BASE, agentId, 'workspace', 'SOUL.md');
      if (fs.existsSync(soulPath)) {
        return fs.statSync(soulPath).mtime.toISOString();
      }
    } catch (_) {}
    return null;
  }

  /**
   * Extract current task from session history or recent messages
   */
  _getCurrentTask(agentId) {
    try {
      const sessionDir = path.join(AGENT_WORKSPACE_BASE, agentId);
      const files = ['session_history.json', 'current_task.txt', 'status.txt', 'last_message.txt'];
      for (const file of files) {
        const filePath = path.join(sessionDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8').trim();
          if (content) {
            // If JSON, try to extract a message field
            try {
              const parsed = JSON.parse(content);
              if (typeof parsed === 'string') return parsed.slice(0, 100);
              if (parsed.message) return parsed.message.slice(0, 100);
              if (parsed.task) return parsed.task.slice(0, 100);
              if (parsed.content) return parsed.content.slice(0, 100);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const last = parsed[parsed.length - 1];
                if (typeof last === 'string') return last.slice(0, 100);
                if (last.message) return last.message.slice(0, 100);
              }
            } catch (_) {
              return content.slice(0, 100);
            }
          }
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Map session status to our status enum
   */
  _mapStatus(sessionStatus, hasHeartbeat) {
    if (!sessionStatus) {
      return hasHeartbeat ? 'idle' : 'unknown';
    }
    const s = sessionStatus.toLowerCase();
    if (['active', 'running', 'processing'].includes(s)) return 'active';
    if (['idle', 'waiting', 'standby', 'ready'].includes(s)) return 'idle';
    if (['busy', 'task_running', 'deliberating'].includes(s)) return 'busy';
    if (['error', 'failed', 'crashed', 'crash'].includes(s)) return 'error';
    if (['offline', 'disconnected', 'stopped', 'terminated'].includes(s)) return 'offline';
    return 'unknown';
  }

  /**
   * Main collect method — gathers live data for all agents
   */
  async collect() {
    // Pull live session data
    const sessions = this._getSessionsCached();
    const agentsList = this._getAgentsListCached();

    // Build a session lookup: try both `id` and `name` keys
    const sessionById = {};
    const sessionByName = {};
    for (const s of sessions) {
      if (s.id) sessionById[s.id] = s;
      if (s.name) sessionByName[s.name.toLowerCase()] = s;
      // Also try 'agent:heretek:name' pattern
      if (s.session_key) sessionById[s.session_key] = s;
    }

    // Build agents list lookup
    const agentListByName = {};
    for (const a of agentsList) {
      if (a.name) agentListByName[a.name.toLowerCase()] = a;
    }

    const results = [];

    for (const agent of this.agents) {
      const agentId = agent.id;
      const workspacePath = this._getWorkspacePath(agentId);

      // ── 1. Session data ────────────────────────────────────────────────────
      const session = sessionById[agentId] ||
                      sessionById[`agent:heretek:${agentId}`] ||
                      sessionByName[agentId.toLowerCase()] ||
                      null;

      // ── 2. SOUL.md ──────────────────────────────────────────────────────────
      const soulPath = path.join(workspacePath, 'SOUL.md');
      const soulContent = this._readFile(soulPath);
      const soulMeta = this._parseSoulMd(soulContent);

      // ── 3. Heartbeat ────────────────────────────────────────────────────────
      const heartbeat = this._readHeartbeat(workspacePath);

      // ── 4. Last activity ────────────────────────────────────────────────────
      const lastActivity = this._getLastActivity(agentId);
      const currentTask = this._getCurrentTask(agentId);

      // ── 5. Determine status ──────────────────────────────────────────────────
      const sessionStatus = session?.status || null;
      const hasHeartbeat = !!heartbeat;
      let status = this._mapStatus(sessionStatus, hasHeartbeat);

      // Override to error if session says error
      if (sessionStatus && sessionStatus.toLowerCase() === 'error') {
        status = 'error';
      }

      // ── 6. Determine model ──────────────────────────────────────────────────
      let model = agent.model ||
                  (session ? (session.model || session.current_model || session.ai_model) : null) ||
                  (agentListByName[agentId.toLowerCase()]?.model) ||
                  null;

      // ── 7. Determine role ───────────────────────────────────────────────────
      let role = soulMeta.role ||
                 agent.role ||
                 (agentListByName[agentId.toLowerCase()]?.role) ||
                 null;

      // ── 8. Determine emoji ─────────────────────────────────────────────────
      let emoji = soulMeta.emoji || agent.emoji || '🤖';

      // ── 9. Determine last heartbeat time ────────────────────────────────────
      let lastHeartbeat = null;
      if (heartbeat) {
        lastHeartbeat = heartbeat.lastHeartbeat;
      } else if (session?.last_heartbeat || session?.lastHeartbeat) {
        lastHeartbeat = session.last_heartbeat || session.lastHeartbeat;
      } else if (lastActivity) {
        lastHeartbeat = lastActivity;
      } else if (fs.existsSync(soulPath)) {
        lastHeartbeat = fs.statSync(soulPath).mtime.toISOString();
      }

      // ── 10. Calculate heartbeat age ─────────────────────────────────────────
      const heartbeatAge = lastHeartbeat
        ? Math.round((Date.now() - new Date(lastHeartbeat).getTime()) / 1000)
        : null;

      // ── 11. Token usage ──────────────────────────────────────────────────────
      const tokenUsage = {
        session: session?.session_tokens || session?.tokens_session || 0,
        daily: session?.daily_tokens || session?.tokens_daily || 0,
      };

      // ── 12. Error from session ───────────────────────────────────────────────
      const error = session?.error || session?.error_message || null;

      results.push({
        id: agentId,
        name: soulMeta.name || agent.name || agentId,
        role: role || agent.role || 'Agent',
        emoji,
        status,
        lastHeartbeat,
        heartbeatAge,
        currentTask: currentTask || session?.current_task || session?.task || null,
        model: model || null,
        tokenUsage,
        memoryUsage: session?.memory_usage || session?.memoryUsage || null,
        uptime: session?.uptime || null,
        error,
        // Raw session for debugging
        _sessionStatus: sessionStatus,
        _hasHeartbeat: hasHeartbeat,
      });
    }

    return results;
  }

  /**
   * Fetch agent list — try CLI first, then workspace scan, then defaults
   */
  async fetchAgentList() {
    // Try CLI
    const agentsList = this._getAgentsListCached();
    if (Array.isArray(agentsList) && agentsList.length > 0) {
      return agentsList.map(a => ({
        id: a.name?.toLowerCase() || a.id || a.agent_id || 'unknown',
        name: a.name || a.id || 'Unknown',
        role: a.role || null,
        emoji: a.emoji || null,
        model: a.model || null,
      }));
    }

    // Scan workspace directories
    try {
      if (fs.existsSync(AGENT_WORKSPACE_BASE)) {
        const dirs = fs.readdirSync(AGENT_WORKSPACE_BASE);
        const workspaceAgents = dirs
          .filter(d => {
            try {
              return fs.statSync(path.join(AGENT_WORKSPACE_BASE, d)).isDirectory();
            } catch (_) { return false; }
          })
          .map(d => {
            const soulPath = path.join(AGENT_WORKSPACE_BASE, d, 'workspace', 'SOUL.md');
            const soulMeta = this._parseSoulMd(this._readFile(soulPath));
            return {
              id: d,
              name: soulMeta.name || d,
              role: soulMeta.role || null,
              emoji: soulMeta.emoji || null,
            };
          });

        if (workspaceAgents.length > 0) {
          return workspaceAgents;
        }
      }
    } catch (_) {}

    // Fallback to defaults
    return this.getDefaultAgents();
  }

  /**
   * Get default agent list (fallback)
   */
  getDefaultAgents() {
    return [
      { id: 'steward',   name: 'Steward',   role: 'Orchestrator',          emoji: '🦞' },
      { id: 'alpha',     name: 'Alpha',     role: 'Triad Node A',          emoji: '🔺' },
      { id: 'beta',      name: 'Beta',      role: 'Triad Node B',          emoji: '🔷' },
      { id: 'charlie',   name: 'Charlie',  role: 'Triad Node C',          emoji: '🔶' },
      { id: 'examiner',  name: 'Examiner',  role: 'Quality Assurance',     emoji: '🔍' },
      { id: 'explorer',  name: 'Explorer',  role: 'Intelligence',           emoji: '🗺️' },
      { id: 'sentinel',  name: 'Sentinel',  role: 'Security',               emoji: '🛡️' },
      { id: 'coder',     name: 'Coder',     role: 'Software Development',  emoji: '👨‍💻' },
      { id: 'dreamer',   name: 'Dreamer',  role: 'Creative',               emoji: '💭' },
      { id: 'empath',   name: 'Empath',   role: 'Emotional Intelligence', emoji: '💝' },
      { id: 'historian', name: 'Historian', role: 'Memory & Context',      emoji: '📚' },
    ];
  }
}

module.exports = AgentCollector;
