import React, { useState } from 'react';
import { DISTRO_TIPS, DistroTip } from '../data/tips';
import { Lightbulb, RotateCw, X, Compass } from 'lucide-react';

interface ContextTipProps {
  category?: DistroTip['category'];
  currentTab?: string;
  lang: 'fr' | 'en';
  onOpenAllTips?: () => void;
}

export const ContextTip: React.FC<ContextTipProps> = ({
  category,
  currentTab,
  lang,
  onOpenAllTips,
}) => {
  const filteredTips = DISTRO_TIPS.filter(t => {
    if (category) return t.category === category;
    if (currentTab) return !t.targetTab || t.targetTab === currentTab;
    return true;
  });

  const tipsPool = filteredTips.length > 0 ? filteredTips : DISTRO_TIPS;
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const currentTip = tipsPool[currentIndex % tipsPool.length];

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % tipsPool.length);
  };

  if (isDismissed || !currentTip) return null;

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.82rem',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: '1 1 300px' }}>
        <div
          style={{
            padding: '5px',
            borderRadius: '6px',
            background: 'rgba(6, 182, 212, 0.1)',
            color: 'var(--cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          <Lightbulb size={16} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.84rem' }}>
              {lang === 'fr' ? 'Astuce Pro' : 'Pro Tip'} : {lang === 'fr' ? currentTip.titleFr : currentTip.titleEn}
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              {currentTip.tag}
            </span>
          </div>

          <p style={{ color: 'var(--text-muted)', lineHeight: '1.4', margin: 0, fontSize: '0.8rem' }}>
            {lang === 'fr' ? currentTip.contentFr : currentTip.contentEn}
          </p>
        </div>
      </div>

      {/* Action buttons on the right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {tipsPool.length > 1 && (
          <button
            onClick={handleNext}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.74rem', height: '26px' }}
            title={lang === 'fr' ? 'Astuce suivante' : 'Next tip'}
          >
            <RotateCw size={12} />
            <span>{lang === 'fr' ? 'Autre astuce' : 'Next'}</span>
          </button>
        )}

        {onOpenAllTips && (
          <button
            onClick={onOpenAllTips}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.74rem', height: '26px' }}
          >
            <Compass size={12} />
            <span>{lang === 'fr' ? 'Tous les guides' : 'All Tips'}</span>
          </button>
        )}

        <button
          onClick={() => setIsDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
          title={lang === 'fr' ? 'Masquer' : 'Dismiss'}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
