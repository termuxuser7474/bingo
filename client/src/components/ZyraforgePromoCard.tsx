import React, { useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';

interface ZyraforgePromoCardProps {
  compact?: boolean;
  style?: React.CSSProperties;
}

export const ZyraforgePromoCard: React.FC<ZyraforgePromoCardProps> = ({ compact = false, style }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href="https://zyraforge.in"
      target="_blank"
      rel="noopener noreferrer"
      className="zyraforge-promo-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        textDecoration: 'none',
        padding: compact ? '12px 16px' : '16px 20px',
        borderRadius: 'var(--radius-md)',
        background: isHovered
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(139, 92, 246, 0.18) 100%)'
          : 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.55) 100%)',
        border: isHovered
          ? '1px solid rgba(167, 139, 250, 0.55)'
          : '1px solid rgba(139, 92, 246, 0.22)',
        boxShadow: isHovered
          ? '0 8px 24px rgba(139, 92, 246, 0.22), 0 0 16px rgba(56, 189, 248, 0.12)'
          : '0 4px 16px rgba(0, 0, 0, 0.25)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
        cursor: 'pointer',
        gap: '14px',
        flexWrap: 'wrap',
        ...style,
      }}
      aria-label="Built by Zyraforge - Building modern digital products and experiences. Visit zyraforge.in"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          minWidth: 0,
          flex: '1 1 220px',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: compact ? '14px' : '15px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '0.3px',
            }}
          >
            Built by Zyraforge
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 7px',
              borderRadius: '4px',
              background: 'rgba(139, 92, 246, 0.25)',
              color: '#c4b5fd',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Sparkles size={11} /> CREATOR
          </span>
        </div>
        <div
          style={{
            fontSize: compact ? '12px' : '13px',
            color: '#94a3b8',
            lineHeight: 1.4,
          }}
        >
          Building modern digital products &amp; experiences
        </div>
      </div>

      {/* CTA Button / Link */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '6px 12px' : '7px 15px',
          borderRadius: 'var(--radius-full)',
          background: isHovered ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255, 255, 255, 0.06)',
          border: isHovered ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.12)',
          color: isHovered ? '#ffffff' : '#cbd5e1',
          fontSize: compact ? '12px' : '13px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          marginLeft: 'auto',
          transition: 'all 0.2s ease',
        }}
      >
        <span>Visit zyraforge.in</span>
        <ExternalLink
          size={compact ? 13 : 14}
          style={{
            transform: isHovered ? 'translateX(2px)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />
      </div>
    </a>
  );
};
