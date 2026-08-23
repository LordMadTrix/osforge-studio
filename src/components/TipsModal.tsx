import React, { useState } from 'react';
import { DISTRO_TIPS } from '../data/tips';
import { Lightbulb, X, Search, ArrowRight, ShieldCheck, Zap, HardDrive, Terminal, Cloud, Monitor } from 'lucide-react';

interface TipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  lang: 'fr' | 'en';
}

export const TipsModal: React.FC<TipsModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  lang,
}) => {
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', labelFr: 'Toutes les Catégories', labelEn: 'All Categories', icon: Lightbulb },
    { id: 'distro', labelFr: 'Distributions & Socle', labelEn: 'Distros & Base', icon: HardDrive },
    { id: 'desktop', labelFr: 'Bureau & Wayland/X11', labelEn: 'Desktop & Window Managers', icon: Monitor },
    { id: 'performance', labelFr: 'Performance & Noyau', labelEn: 'Performance & Kernel', icon: Zap },
    { id: 'security', labelFr: 'Sécurité & Hardening', labelEn: 'Security & CIS', icon: ShieldCheck },
    { id: 'packages', labelFr: 'Logiciels & CLI', labelEn: 'Packages & CLI', icon: Terminal },
    { id: 'wsl', labelFr: 'Windows WSL2', labelEn: 'Windows WSL2', icon: Monitor },
    { id: 'cloud', labelFr: 'Cloud CI/CD & Build', labelEn: 'Cloud CI/CD & Build', icon: Cloud },
  ];

  const levels = [
    { id: 'all', labelFr: 'Tous niveaux', labelEn: 'All levels' },
    { id: 'beginner', labelFr: '🌱 Débutant', labelEn: '🌱 Beginner' },
    { id: 'intermediate', labelFr: '⚡ Intermédiaire', labelEn: '⚡ Intermediate' },
    { id: 'expert', labelFr: '🔒 Expert', labelEn: '🔒 Expert' },
  ];

  const filteredTips = DISTRO_TIPS.filter(tip => {
    const matchesCategory = selectedCategory === 'all' || tip.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || tip.level === selectedLevel;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      tip.titleFr.toLowerCase().includes(q) ||
      tip.titleEn.toLowerCase().includes(q) ||
      tip.contentFr.toLowerCase().includes(q) ||
      tip.contentEn.toLowerCase().includes(q) ||
      tip.tag.toLowerCase().includes(q);

    return matchesCategory && matchesLevel && matchesSearch;
  });

  const handleGoToTab = (tab?: string) => {
    if (tab && onNavigateTab) {
      onNavigateTab(tab);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '920px' }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan)',
            }}>
              <Lightbulb size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                {lang === 'fr' ? 'Guide d’Optimisation & Astuces Pro' : 'OS Engineering Best Practices & Pro Tips'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {lang === 'fr'
                  ? 'Recommandations pour concevoir un OS Linux performant, compact et sécurisé.'
                  : 'Actionable advice to build lightweight, fast, and secure Linux distributions.'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(10, 15, 28, 0.4)' }}>
          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              className="input-text"
              placeholder={lang === 'fr' ? 'Rechercher une astuce (ex: Alpine, RAM, CIS, WSL2, Zen)...' : 'Search tips (e.g. Alpine, RAM, CIS, WSL2, Zen)...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', fontSize: '0.84rem' }}
            />
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {categories.map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                    color: isSelected ? 'var(--cyan)' : 'var(--text-muted)',
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={12} />
                  <span>{lang === 'fr' ? cat.labelFr : cat.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Level Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
              {lang === 'fr' ? 'Niveau :' : 'Level:'}
            </span>
            {levels.map(lvl => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: selectedLevel === lvl.id ? 'var(--emerald)' : 'transparent',
                  background: selectedLevel === lvl.id ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  color: selectedLevel === lvl.id ? '#34d399' : 'var(--text-dim)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: selectedLevel === lvl.id ? 600 : 400,
                }}
              >
                {lang === 'fr' ? lvl.labelFr : lvl.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Tips Grid */}
        <div style={{
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
          gap: '14px',
          maxHeight: '58vh',
          overflowY: 'auto',
        }}>
          {filteredTips.map(tip => (
            <div
              key={tip.id}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
                transition: 'border-color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(6, 182, 212, 0.1)',
                    color: 'var(--cyan)',
                    fontWeight: 600,
                  }}>
                    {tip.tag}
                  </span>
                  <span style={{
                    fontSize: '0.66rem',
                    color: tip.level === 'expert' ? '#f43f5e' : tip.level === 'intermediate' ? '#f59e0b' : '#10b981',
                    fontWeight: 600,
                  }}>
                    {tip.level === 'expert' ? 'Expert' : tip.level === 'intermediate' ? 'Avancé' : 'Débutant'}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
                  {lang === 'fr' ? tip.titleFr : tip.titleEn}
                </h4>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                  {lang === 'fr' ? tip.contentFr : tip.contentEn}
                </p>
              </div>

              {tip.targetTab && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleGoToTab(tip.targetTab)}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  >
                    <span>{lang === 'fr' ? 'Configurer' : 'Configure'}</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredTips.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.86rem' }}>
              {lang === 'fr' ? 'Aucune astuce trouvée pour ces critères.' : 'No tips match your search criteria.'}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.76rem',
          color: 'var(--text-dim)',
        }}>
          <span>{filteredTips.length} {lang === 'fr' ? 'astuces disponibles' : 'tips available'}</span>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '5px 14px', fontSize: '0.8rem' }}>
            {lang === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
