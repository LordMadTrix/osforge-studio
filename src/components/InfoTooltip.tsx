import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  title?: string;
  size?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  text,
  title,
  size = 14,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'help',
        verticalAlign: 'middle',
        marginLeft: '4px',
      }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsVisible(prev => !prev);
      }}
      aria-label={text}
    >
      <HelpCircle
        size={size}
        color={isVisible ? 'var(--cyan)' : 'var(--text-dim)'}
        style={{
          transition: 'color 0.15s ease',
          opacity: 0.8,
        }}
      />

      {isVisible && (
        <span
          style={{
            position: 'absolute',
            bottom: position === 'top' ? 'calc(100% + 8px)' : 'auto',
            top: position === 'bottom' ? 'calc(100% + 8px)' : 'auto',
            left: position === 'top' || position === 'bottom' ? '50%' : 'auto',
            transform: position === 'top' || position === 'bottom' ? 'translateX(-50%)' : 'none',
            zIndex: 1000,
            width: 'max-content',
            maxWidth: '260px',
            background: '#0d1527',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.75rem',
            lineHeight: '1.4',
            color: '#e2e8f0',
            fontWeight: 400,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.15s ease-out',
            textAlign: 'left',
            whiteSpace: 'normal',
          }}
        >
          {title && (
            <span style={{ display: 'block', fontWeight: 700, color: 'var(--cyan)', marginBottom: '3px' }}>
              {title}
            </span>
          )}
          {text}
        </span>
      )}
    </span>
  );
};
