import React, { useState } from 'react';
import { OSRecipe } from '../types/os';
import { DISTRO_PRESETS } from '../data/presets';
import { Sparkles, X, CheckCircle2, Disc, Cpu } from 'lucide-react';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (recipe: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
}

export const PresetsModal: React.FC<PresetsModalProps> = ({ isOpen, onClose, onSelectPreset, lang }) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const categories = [
    { id: 'all', name: lang === 'fr' ? 'Tous les Modèles' : 'All Templates' },
    { id: 'Dev', name: 'Développement' },
    { id: 'Security', name: 'Cybersécurité' },
    { id: 'Gaming', name: 'Gaming' },
    { id: 'Server', name: 'Serveurs & Homelab' },
    { id: 'IoT/Minimal', name: 'Kiosk & Embarqué' },
  ];

  const filteredPresets = DISTRO_PRESETS.filter(p => {
    return selectedCat === 'all' || p.category === selectedCat;
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '940px' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              background: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan)',
            }}>
              <Sparkles size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                {lang === 'fr' ? 'Modèles Préconfigurés (Presets)' : 'Preconfigured Distro Templates'}
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {lang === 'fr'
                  ? 'Démarrez rapidement avec des recettes éprouvées prêtes à l’emploi.'
                  : 'Start instantly with battle-tested OS recipes tuned for specific use cases.'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '5px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Category Pills */}
        <div style={{ padding: '12px 20px 0 20px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: selectedCat === cat.id ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                background: selectedCat === cat.id ? 'rgba(14, 165, 233, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                color: selectedCat === cat.id ? 'var(--cyan)' : 'var(--text-muted)',
                fontWeight: selectedCat === cat.id ? 600 : 400,
                fontSize: '0.78rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Presets Grid */}
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '14px', maxHeight: '58vh', overflowY: 'auto' }}>
          {filteredPresets.map(preset => (
            <div
              key={preset.id}
              className="glass-panel"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--border-subtle)',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#f8fafc' }}>
                    {preset.title}
                  </h4>
                  <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
                    {preset.category}
                  </span>
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--cyan)', fontWeight: 500, marginBottom: '6px' }}>
                  {preset.subtitle}
                </div>

                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.35', marginBottom: '10px' }}>
                  {preset.description}
                </p>

                {/* Highlights */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '12px' }}>
                  {preset.highlights.map((h, i) => (
                    <span key={i} style={{
                      fontSize: '0.66rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      color: '#cbd5e1',
                    }}>
                      ✓ {h}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                {/* Size and RAM badges */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--border-subtle)',
                  marginBottom: '10px',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Disc size={11} color="var(--cyan)" /> ISO : <strong style={{ color: '#f1f5f9' }}>{preset.estimatedSize}</strong>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Cpu size={11} color="var(--emerald)" /> RAM : <strong style={{ color: '#f1f5f9' }}>{preset.estimatedRam}</strong>
                  </span>
                </div>

                <button
                  onClick={() => {
                    onSelectPreset(preset.recipe);
                    onClose();
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 10px' }}
                >
                  <CheckCircle2 size={13} />
                  <span>{lang === 'fr' ? 'Charger ce Modèle' : 'Load this Template'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '5px 14px', fontSize: '0.8rem' }}>
            {lang === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
