/**
 * Heretek OpenClaw Health Check Dashboard - Resource Collector
 * 
 * Collects system resource metrics including CPU, memory, disk, and network
 * 
 * @version 1.0.0
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const os = require('os');

class ResourceCollector {
  constructor(options = {}) {
    this.prometheusUrl = options.prometheusUrl || 'http://prometheus:9090';
    this.dockerEnabled = options.dockerEnabled !== false;
    this.initialized = false;
  }

  /**
   * Initialize the collector
   */
  async initialize() {
    // Check if Docker is available
    try {
      await execAsync('docker ps');
      this.dockerEnabled = true;
      console.log('[ResourceCollector] Docker detected');
    } catch (error) {
      this.dockerEnabled = false;
      console.log('[ResourceCollector] Docker not available, using system metrics only');
    }
    this.initialized = true;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.initialized = false;
  }

  /**
   * Collect resource metrics
   */
  async collect() {
    const [cpu, memory, disk, network, containers] = await Promise.all([
      this.collectCpuMetrics(),
      this.collectMemoryMetrics(),
      this.collectDiskMetrics(),
      this.collectNetworkMetrics(),
      this.dockerEnabled ? this.collectContainerMetrics() : Promise.resolve([])
    ]);

    return {
      cpu,
      memory,
      disk,
      network,
      containers,
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        uptime: os.uptime()
      }
    };
  }

  /**
   * Collect CPU metrics
   */
  async collectCpuMetrics() {
    const system = {
      usage: 0,
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown',
      speed: os.cpus()[0]?.speed || 0,
      perCore: []
    };

    // Get CPU usage from /proc/stat on Linux
    try {
      const statContent = fs.readFileSync('/proc/stat', 'utf8');
      const cpuLines = statContent.split('\n').filter(line => line.startsWith('cpu'));
      
      for (const line of cpuLines) {
        const parts = line.split(/\s+/);
        const cpuName = parts[0];
        const user = parseInt(parts[1]);
        const nice = parseInt(parts[2]);
        const system_time = parseInt(parts[3]);
        const idle = parseInt(parts[4]);
        const iowait = parseInt(parts[5]) || 0;
        const irq = parseInt(parts[6]) || 0;
        const softirq = parseInt(parts[7]) || 0;
        
        const total = user + nice + system_time + idle + iowait + irq + softirq;
        const usage = ((total - idle - iowait) / total) * 100;
        
        if (cpuName === 'cpu') {
          system.usage = Math.round(usage * 10) / 10;
        } else {
          system.perCore.push({
            name: cpuName,
            usage: Math.round(usage * 10) / 10
          });
        }
      }
    } catch (error) {
      // Fallback to os module
      const cpus = os.cpus();
      system.usage = Math.round(this.calculateCpuUsage(cpus) * 10) / 10;
      system.perCore = cpus.map((cpu, i) => ({
        name: `cpu${i}`,
        usage: Math.round(this.calculateCpuUsage([cpu]) * 10) / 10
      }));
    }

    return { system };
  }

  /**
   * Calculate CPU usage from os.cpus() data
   */
  calculateCpuUsage(cpus) {
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      const times = cpu.times;
      totalIdle += times.idle;
      totalTick += times.user + times.nice + times.sys + times.idle + times.irq + times.iowait;
    }

    return 1 - (totalIdle / totalTick);
  }

  /**
   * Collect memory metrics
   */
  async collectMemoryMetrics() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usage = (used / total) * 100;

    const system = {
      total,
      used,
      free,
      usage: Math.round(usage * 10) / 10
    };

    // Get detailed memory info on Linux
    try {
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
      const parseMeminfo = (key) => {
        const match = meminfo.match(new RegExp(`${key}:\\s+(\\d+)`));
        return match ? parseInt(match[1]) * 1024 : 0;
      };

      system.details = {
        memTotal: parseMeminfo('MemTotal'),
        memFree: parseMeminfo('MemFree'),
        memAvailable: parseMeminfo('MemAvailable'),
        buffers: parseMeminfo('Buffers'),
        cached: parseMeminfo('Cached'),
        swapTotal: parseMeminfo('SwapTotal'),
        swapFree: parseMeminfo('SwapFree')
      };
    } catch (error) {
      // No detailed info available
    }

    return { system };
  }

  /**
   * Collect disk metrics
   */
  async collectDiskMetrics() {
    const system = {
      total: 0,
      used: 0,
      free: 0,
      usage: 0,
      partitions: []
    };

    try {
      const { stdout } = await execAsync('df -B1 / 2>/dev/null || df -k /');
      const lines = stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 5) {
          system.total = parseInt(parts[1]);
          system.used = parseInt(parts[2]);
          system.free = parseInt(parts[3]);
          system.usage = parseFloat(parts[4]);
        }
      }
    } catch (error) {
      // Fallback to basic calculation
      const statfs = require('fs').statfsSync ? require('fs').statfsSync('/') : null;
      if (statfs) {
        system.total = statfs.bsize * statfs.blocks;
        system.free = statfs.bsize * statfs.bfree;
        system.used = system.total - system.free;
        system.usage = (system.used / system.total) * 100;
      }
    }

    // Get partition details
    try {
      const { stdout } = await execAsync('df -h --output=target,size,used,avail,pcent 2>/dev/null | tail -n +2');
      const lines = stdout.trim().split('\n');
      system.partitions = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          mount: parts[0],
          size: parts[1],
          used: parts[2],
          available: parts[3],
          usage: parseFloat(parts[4]) || 0
        };
      }).filter(p => !p.mount.startsWith('/snap') && !p.mount.startsWith('/sys'));
    } catch (error) {
      // No partition details available
    }

    return { system };
  }

  /**
   * Collect network metrics
   */
  async collectNetworkMetrics() {
    const system = {
      rxBytes: 0,
      txBytes: 0,
      rxBytesPerSec: 0,
      txBytesPerSec: 0,
      interfaces: []
    };

    try {
      const statContent = fs.readFileSync('/proc/net/dev', 'utf8');
      const lines = statContent.split('\n').slice(2); // Skip header lines

      for (const line of lines) {
        const parts = line.trim().split(/:\s+/);
        if (parts.length !== 2) continue;

        const iface = parts[0].trim();
        const stats = parts[1].split(/\s+/).map(Number);

        const ifaceData = {
          name: iface,
          rxBytes: stats[0],
          rxPackets: stats[1],
          rxDropped: stats[2],
          rxErrors: stats[3],
          txBytes: stats[8],
          txPackets: stats[9],
          txDropped: stats[10],
          txErrors: stats[11]
        };

        system.interfaces.push(ifaceData);
        system.rxBytes += stats[0];
        system.txBytes += stats[8];
      }
    } catch (error) {
      // No network stats available
    }

    return { system };
  }

  /**
   * Collect Docker container metrics
   */
  async collectContainerMetrics() {
    const containers = [];

    try {
      // Get running containers
      const { stdout } = await execAsync(
        'docker stats --no-stream --format "{{.ID}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null'
      );

      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.split('\t');
        if (parts.length < 5) continue;

        const container = {
          id: parts[0],
          name: parts[1].replace(/_/g, '-'),
          cpuUsage: parseFloat(parts[2]) || 0,
          memoryUsage: this.parseMemoryUsage(parts[3]),
          networkIO: this.parseNetworkIO(parts[4])
        };

        containers.push(container);
      }
    } catch (error) {
      console.error('[ResourceCollector] Error getting container metrics:', error.message);
    }

    return containers;
  }

  /**
   * Parse memory usage string
   */
  parseMemoryUsage(str) {
    // Format: "123.4MiB / 1024MiB"
    const match = str.match(/([\d.]+)(\w*)\s*\/\s*([\d.]+)(\w*)/);
    if (!match) return { used: 0, total: 0, percent: 0 };

    const used = parseFloat(match[1]);
    const usedUnit = match[2];
    const total = parseFloat(match[3]);
    const totalUnit = match[4];

    const toBytes = (val, unit) => {
      const units = { B: 1, KiB: 1024, MiB: 1024 * 1024, GiB: 1024 * 1024 * 1024 };
      return val * (units[unit] || 1);
    };

    return {
      used: toBytes(used, usedUnit),
      total: toBytes(total, totalUnit),
      percent: total > 0 ? (used / total) * 100 : 0
    };
  }

  /**
   * Parse network IO string
   */
  parseNetworkIO(str) {
    // Format: "1.23kB / 4.56kB"
    const match = str.match(/([\d.]+)(\w*)\s*\/\s*([\d.]+)(\w*)/);
    if (!match) return { rx: 0, tx: 0 };

    return {
      rx: parseFloat(match[1]),
      tx: parseFloat(match[3])
    };
  }

  /**
   * Get metrics from Prometheus
   */
  async getPrometheusMetrics(query) {
    try {
      const response = await fetch(`${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      return data.data?.result?.[0]?.value?.[1] || null;
    } catch (error) {
      console.error('[ResourceCollector] Error fetching Prometheus metrics:', error.message);
      return null;
    }
  }
}

module.exports = ResourceCollector;
