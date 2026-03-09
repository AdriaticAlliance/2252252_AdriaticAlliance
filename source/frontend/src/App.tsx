import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/layout/NavBar';
import Dashboard  from './pages/Dashboard';
import Rules      from './pages/Rules';
import Actuators  from './pages/Actuators';
import AuditLog   from './pages/AuditLog';
import { useWebSocket } from './hooks/useWebSocket';
import { useSensors }   from './hooks/useSensors';
import './styles/global.css';

export default function App() {
  const [wsConnected, setWsConnected] = useState(false);
  const { sensorList } = useSensors();

  // Track WS connection state
  useWebSocket('connected', () => setWsConnected(true));

  return (
    <BrowserRouter>
      <NavBar wsConnected={wsConnected} sensorCount={sensorList.length} />
      <Routes>
        <Route path="/"          element={<Dashboard />} />
        <Route path="/rules"     element={<Rules />} />
        <Route path="/actuators" element={<Actuators />} />
        <Route path="/audit"     element={<AuditLog />} />
      </Routes>
    </BrowserRouter>
  );
}
