import React from 'react';

interface ZyraforgeFooterProps {
  style?: React.CSSProperties;
}

export const ZyraforgeFooter: React.FC<ZyraforgeFooterProps> = ({ style }) => {
  return (
    <footer
      style={{
        padding: '10px 0 16px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        userSelect: 'none',
        width: '100%',
        ...style,
      }}
    >
      <span>Built by</span>
      <a
        href="https://zyraforge.in"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#a78bfa',
          textDecoration: 'none',
          fontWeight: 700,
          transition: 'color var(--transition-fast)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#c4b5fd')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#a78bfa')}
      >
        Zyraforge
      </a>
      <span style={{ opacity: 0.4 }}>•</span>
      <a
        href="https://zyraforge.in"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          transition: 'color var(--transition-fast)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
      >
        zyraforge.in
      </a>
    </footer>
  );
};
