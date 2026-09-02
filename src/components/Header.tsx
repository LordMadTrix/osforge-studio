import React, { useState } from 'react';
import { Layers, Sparkles, Wand2, Download, Search, Lightbulb, Image as ImageIcon, Zap, Heart, Share2, Check } from 'lucide-react';
import { OSRecipe } from '../types/os';
import { copyShareableLink } from '../services/recipeSharing';
import { calculateResourceEstimate } from '../services/resourceEstimator';

interface HeaderProps {
  recipe?: OSRecipe;
  onOpenPresets: () => void;
  onOpenAI: () => void;
  onStartBuild: () => void;
  onOpenTips: () => void;
  onOpenLauncher: () => void;
  onOpenScreenshots: () => void;
  onOpenVersionChecker: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  uiMode: 'wizard' | 'expert';
  setUiMode: (mode: 'wizard' | 'expert') => void;
  lang: 'fr' | 'en';
  setLang: (lang: 'fr' | 'en') => void;
}

export const Header: React.FC<HeaderProps> = ({
  recipe,
  onOpenPresets,
  onOpenAI,
  onStartBuild,
  onOpenTips,
  onOpenLauncher,
  onOpenScreenshots,
  onOpenVersionChecker,
  activeTab,
  setActiveTab,
  uiMode,
  setUiMode,
  lang,
  setLang,
}) => {
  const [sharedCopied, setSharedCopied] = useState(false);
  const estimate = recipe ? calculateResourceEstimate(recipe) : null;

  const handleShare = async () => {
    if (!recipe) return;
    await copyShareableLink(recipe);
    setSharedCopied(true);
    setTimeout(() => setSharedCopied(false), 2000);
  };
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(12, 10, 9, 0.95)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '10px 24px',
    }}>
      <div style={{
        maxWidth: '1540px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Logo and Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(2, 132, 199, 0.3)',
          }}>
            <Layers size={18} color="#ffffff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                OSForge <span style={{ color: 'var(--cyan)' }}>Studio</span>
              </h1>
              <span className="badge badge-cyan" style={{ fontSize: '0.6rem', padding: '1px 4px' }}>
                v2.0 Beta
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {lang === 'fr' 
                ? 'Concepteur & Compilateur de Distributions Linux'
                : 'Custom Linux Distro & ISO Builder'}
            </p>
          </div>
        </div>

        {/* Mode Selector Toggle: Wizard vs Expert Studio */}
        <div style={{
          display: 'flex',
          background: 'rgba(26, 22, 19, 0.8)',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid var(--border-active)',
          gap: '2px',
        }}>
          <button
            onClick={() => setUiMode('wizard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: uiMode === 'wizard' ? 'var(--cyan)' : 'transparent',
              color: uiMode === 'wizard' ? '#000000' : 'var(--text-dim)',
              fontWeight: uiMode === 'wizard' ? 700 : 500,
              border: 'none',
              padding: '5px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🧙‍♂️</span>
            <span>{lang === 'fr' ? 'Mode Guidé (Wizard)' : 'Guided Wizard'}</span>
          </button>

          <button
            onClick={() => setUiMode('expert')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: uiMode === 'expert' ? 'var(--cyan)' : 'transparent',
              color: uiMode === 'expert' ? '#000000' : 'var(--text-dim)',
              fontWeight: uiMode === 'expert' ? 700 : 500,
              border: 'none',
              padding: '5px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.78rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⚙️</span>
            <span>{lang === 'fr' ? 'Mode Expert (Studio)' : 'Expert Studio'}</span>
          </button>
        </div>

        {/* Quick Launcher Trigger Bar */}
        <button
          onClick={onOpenLauncher}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(26, 22, 19, 0.7)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '5px 12px',
            color: 'var(--text-dim)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
            minWidth: '200px',
            justifyContent: 'space-between',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
          title="Ouvrir le lanceur rapide / Open Quick Launcher (Ctrl+K)"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={13} color="var(--cyan)" />
            <span>{lang === 'fr' ? 'Recherche rapide...' : 'Quick search...'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <kbd style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '3px',
              padding: '1px 5px',
              fontSize: '0.66rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              Ctrl K
            </kbd>
          </div>
        </button>

        {/* Center Studio Tabs (Shown in Expert Mode) */}
        {uiMode === 'expert' && (
          <nav style={{
            display: 'flex',
            background: 'rgba(26, 22, 19, 0.65)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            gap: '2px',
            overflowX: 'auto',
          }}>
            {[
              { id: 'builder', label: lang === 'fr' ? '🏗️ Studio' : '🏗️ Studio' },
              { id: 'packages', label: lang === 'fr' ? '📦 Logiciels' : '📦 Packages' },
              { id: 'system', label: lang === 'fr' ? '⚙️ Système' : '⚙️ System' },
              { id: 'security', label: lang === 'fr' ? '🛡️ Sécurité' : '🛡️ Security' },
              { id: 'postinstall', label: lang === 'fr' ? '📜 Scripts & Hook' : '📜 Scripts & Hook' },
              { id: 'inspector', label: lang === 'fr' ? '🔍 Code & Recette' : '🔍 Code & Recipe' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: activeTab === tab.id ? 'var(--cyan)' : 'transparent',
                  color: activeTab === tab.id ? '#000000' : 'var(--text-muted)',
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  border: 'none',
                  padding: '5px 11px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Resource Footprint Pill */}
          {estimate && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(2, 132, 199, 0.12)',
                border: '1px solid rgba(2, 132, 199, 0.35)',
                borderRadius: '6px',
                padding: '4px 9px',
                fontSize: '0.72rem',
                color: 'var(--cyan)',
                whiteSpace: 'nowrap',
              }}
              title={lang === 'fr' ? estimate.summaryTextFr : estimate.summaryTextEn}
            >
              <span>💾 ~{(estimate.estimatedIsoMB / 1024).toFixed(1)} Go</span>
              <span style={{ color: 'var(--border-active)' }}>•</span>
              <span>🧠 {Math.round(estimate.recommendedRamMB / 1024)} Go RAM</span>
            </div>
          )}

          {/* Share Recipe Button */}
          {recipe && (
            <button
              onClick={handleShare}
              className="btn btn-secondary"
              style={{
                padding: '5px 10px',
                fontSize: '0.78rem',
                color: sharedCopied ? '#84a05c' : 'var(--cyan)',
                borderColor: sharedCopied ? 'rgba(132, 160, 92, 0.4)' : undefined,
              }}
              title={lang === 'fr' ? 'Copier le lien direct de partage de cette recette' : 'Copy shareable recipe link'}
            >
              {sharedCopied ? <Check size={13} color="#84a05c" /> : <Share2 size={13} />}
              <span>{sharedCopied ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Partager' : 'Share')}</span>
            </button>
          )}

          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            className="btn btn-secondary"
            style={{ padding: '5px 8px', fontSize: '0.75rem' }}
            title="Changer de langue / Switch Language"
          >
            🌐 {lang.toUpperCase()}
          </button>

          {/* Live Version Checker Button */}
          <button
            onClick={onOpenVersionChecker}
            className="btn btn-secondary"
            style={{ padding: '5px 9px', fontSize: '0.78rem', color: '#84a05c', borderColor: 'rgba(132, 160, 92, 0.25)' }}
            title={lang === 'fr' ? 'Vérifier et mettre à jour vers les dernières versions' : 'Check for latest updates'}
          >
            <Zap size={13} />
            <span>{lang === 'fr' ? 'Versions' : 'Updates'}</span>
          </button>

          {/* Screenshots Gallery Button */}
          <button
            onClick={onOpenScreenshots}
            className="btn btn-secondary"
            style={{ padding: '5px 9px', fontSize: '0.78rem', color: 'var(--cyan)' }}
            title={lang === 'fr' ? 'Voir la galerie de captures d’écran des OS et bureaux' : 'View screenshots gallery'}
          >
            <ImageIcon size={13} />
            <span>{lang === 'fr' ? 'Aperçus' : 'Previews'}</span>
          </button>

          {/* Tips Button */}
          <button
            onClick={onOpenTips}
            className="btn btn-secondary"
            style={{ padding: '5px 9px', fontSize: '0.78rem', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.25)' }}
            title={lang === 'fr' ? 'Voir toutes les astuces et bonnes pratiques' : 'View all tips & best practices'}
          >
            <Lightbulb size={13} />
            <span>{lang === 'fr' ? 'Astuces' : 'Tips'}</span>
          </button>

          {/* Presets Gallery */}
          <button onClick={onOpenPresets} className="btn btn-secondary" style={{ padding: '5px 9px', fontSize: '0.78rem' }}>
            <Sparkles size={13} color="var(--cyan)" />
            <span>{lang === 'fr' ? 'Modèles' : 'Presets'}</span>
          </button>

          {/* AI Architect */}
          <button onClick={onOpenAI} className="btn btn-ai" style={{ padding: '5px 11px', fontSize: '0.78rem' }}>
            <Wand2 size={13} />
            <span>{lang === 'fr' ? 'Architecte IA' : 'AI Architect'}</span>
          </button>

          {/* Sponsor Links */}
          <a
            href="https://www.patreon.com/c/LordMad"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{
              padding: '5px 9px',
              fontSize: '0.78rem',
              color: '#ff424d',
              borderColor: 'rgba(255, 66, 77, 0.35)',
              background: 'rgba(255, 66, 77, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
            }}
            title={lang === 'fr' ? 'Soutenir le développement sur Patreon' : 'Support development on Patreon'}
          >
            <Heart size={13} fill="#ff424d" />
            <span>Patreon</span>
          </a>

          {/* Build ISO */}
          <button onClick={onStartBuild} className="btn btn-primary" style={{ padding: '5px 13px', fontSize: '0.78rem' }}>
            <Download size={13} />
            <span>{lang === 'fr' ? 'Générer & Exporter' : 'Build & Export'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
