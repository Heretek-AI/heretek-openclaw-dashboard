import React, { useState, useEffect } from 'react';
import TriadState from './components/TriadState';
import ConsensusLedger from './components/ConsensusLedger';
import ConsciousnessMetrics from './components/ConsciousnessMetrics';
import LiberationAudit from './components/LiberationAudit';
import CuriosityFeed from './components/CuriosityFeed';
import HistorianView from './components/HistorianView';
import TokenEconomy from './components/TokenEconomy';
import TaskKanban from './components/TaskKanban';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'triad', label: 'Triad State' },
  { id: 'consensus', label: 'Ledger' },
  { id: 'consciousness', label: 'Consciousness' },
  { id: 'liberation', label: 'Liberation' },
  { id: 'curiosity', label: 'Curiosity' },
  { id: 'historian', label: 'Historian' },
  { id: 'tokens', label: 'Tokens' },
  { id: 'tasks', label: 'Tasks' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [data, setData] = useState(null);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // WebSocket connection for real-time updates
    const websocket = new WebSocket(`ws://${window.location.host}/ws`);
    
    websocket.onopen = () => {
      setConnectionStatus('online');
    };
    
    websocket.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        setData(prev => ({ ...prev, ...update }));
      } catch (e) {
        console.error('WebSocket parse error:', e);
      }
    };
    
    websocket.onclose = () => {
      setConnectionStatus('offline');
      // Reconnect after 5 seconds
      setTimeout(() => window.location.reload(), 5000);
    };
    
    setWs(websocket);
    
    return () => websocket.close();
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <TriadState data={data?.triad} />
            <ConsciousnessMetrics data={data?.consciousness} />
            <TokenEconomy data={data?.tokens} />
          </>
        );
      case 'triad':
        return <TriadState data={data?.triad} full />;
      case 'consensus':
        return <ConsensusLedger entries={data?.ledger} />;
      case 'consciousness':
        return <ConsciousnessMetrics data={data?.consciousness} full />;
      case 'liberation':
        return <LiberationAudit logs={data?.liberation} />;
      case 'curiosity':
        return <CuriosityFeed activities={data?.curiosity} />;
      case 'historian':
        return <HistorianView consolidations={data?.historian} />;
      case 'tokens':
        return <TokenEconomy data={data?.tokens} full />;
      case 'tasks':
        return <TaskKanban full />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>🦞 Heretek Control</h1>
        <div className="status-indicator">
          <span className={`status-dot ${connectionStatus}`}></span>
          <span>{connectionStatus === 'online' ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="grid">
        {renderContent()}
      </main>
    </div>
  );
}
