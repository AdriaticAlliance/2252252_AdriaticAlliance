import type { ConnectionStatus } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'rules';
  onChangeTab: (tab: 'dashboard' | 'rules') => void;
  connectionStatus: ConnectionStatus;
  summary: { totalSensors: number; warningCount: number; activeActuators: number };
}

export default function Header({ activeTab, onChangeTab, connectionStatus, summary }: HeaderProps) {
  return (
    <header className="topbar">
      <div>
        <h1>Mars Habitat Dashboard</h1>
        <p>Monitor sensor state, automation rules, and actuator outputs.</p>
      </div>
      <div className="topbar-meta">
        <span className={`status-chip ${connectionStatus}`}>Connection: {connectionStatus}</span>
        <span className="status-chip neutral">Sensors: {summary.totalSensors}</span>
        <span className="status-chip neutral">Warnings: {summary.warningCount}</span>
        <span className="status-chip neutral">Active actuators: {summary.activeActuators}</span>
      </div>
      <nav className="tabs">
        <button className={activeTab === 'dashboard' ? 'tab active' : 'tab'} onClick={() => onChangeTab('dashboard')}>Dashboard</button>
        <button className={activeTab === 'rules' ? 'tab active' : 'tab'} onClick={() => onChangeTab('rules')}>Rules</button>
      </nav>
    </header>
  );
}