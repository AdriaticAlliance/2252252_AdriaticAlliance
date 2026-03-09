import { NavLink } from 'react-router-dom';

const links = [
  { to: '/',          label: '⬡ DASHBOARD' },
  { to: '/rules',     label: '⚙ RULES'     },
  { to: '/actuators', label: '⚡ ACTUATORS' },
  { to: '/audit',     label: '📋 AUDIT LOG' },
];

interface NavBarProps {
  wsConnected: boolean;
  sensorCount: number;
}

export default function NavBar({ wsConnected, sensorCount }: NavBarProps) {
  return (
    <nav style={{
      background: '#0d0d14',
      borderBottom: '1px solid #1e1e2e',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      height: '52px',
      gap: '0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Brand */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        color: 'var(--cyan)',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.15em',
        marginRight: '40px',
        whiteSpace: 'nowrap',
      }}>
        MARS/OPS
      </span>

      {/* Nav links */}
      {links.map(({ to, label }) => (
        <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
          padding: '0 20px',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'var(--font-ui)',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: isActive ? 'var(--cyan)' : 'var(--text-muted)',
          borderBottom: isActive ? '2px solid var(--cyan)' : '2px solid transparent',
          textDecoration: 'none',
          transition: 'color 0.15s',
        })}>
          {label}
        </NavLink>
      ))}

      {/* Right side: live status */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}>
          {sensorCount} SENSORS CACHED
        </span>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: wsConnected ? 'var(--green)' : 'var(--red)',
        }}>
          <span style={{
            width: '7px', height: '7px',
            borderRadius: '50%',
            background: wsConnected ? 'var(--green)' : 'var(--red)',
            animation: wsConnected ? 'pulse-red 2s infinite' : 'none',
          }} />
          {wsConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
    </nav>
  );
}
