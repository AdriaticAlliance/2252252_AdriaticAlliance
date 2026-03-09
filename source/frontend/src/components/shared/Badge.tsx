interface BadgeProps {
  status: string;
}

export default function Badge({ status }: BadgeProps) {
  const colors: { [key: string]: { bg: string; color: string; border: string } } = {
    ok:      { bg: '#0f2d1a', color: '#22c55e', border: '#166534' },
    warning: { bg: '#2d1a0f', color: '#f59e0b', border: '#92400e' },
    unknown: { bg: '#1a1a2d', color: '#6366f1', border: '#3730a3' },
  };
  const c = colors[status] || colors.unknown;
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: '3px',
      padding: '2px 7px',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
}
