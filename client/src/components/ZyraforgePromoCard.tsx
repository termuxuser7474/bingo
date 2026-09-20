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
          alignItems: 'center',
          gap: '12px',
          minWidth: 0,
          flex: '1 1 230px',
        }}
      >
        {/* Sleek brand badge mark */}
        <div
          style={{
            width: compact ? '34px' : '38px',
            height: compact ? '34px' : '38px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)',
            color: '#ffffff',
            fontWeight: 900,
            fontSize: compact ? '16px' : '18px',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.5px',
          }}
        >
          Z
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: compact ? '13px' : '14px',
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
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(139, 92, 246, 0.25)',
                color: '#c4b5fd',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Sparkles size={10} /> CREATOR
            </span>
          </div>
          <div
            style={{
              fontSize: compact ? '11px' : '12px',
              color: '#94a3b8',
              lineHeight: 1.3,
            }}
          >
            Building modern digital products &amp; experiences
          </div>
        </div>
      </div>

      {/* CTA Button / Link */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '5px 10px' : '6px 14px',
          borderRadius: 'var(--radius-full)',
          background: isHovered ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255, 255, 255, 0.06)',
          border: isHovered ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.12)',
          color: isHovered ? '#ffffff' : '#cbd5e1',
          fontSize: compact ? '11px' : '12px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          marginLeft: 'auto',
          transition: 'all 0.2s ease',
        }}
      >
        <span>Visit zyraforge.in</span>
        <ExternalLink
          size={compact ? 12 : 13}
          style={{
            transform: isHovered ? 'translateX(2px)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />
      </div>
    </a>
  );
};
