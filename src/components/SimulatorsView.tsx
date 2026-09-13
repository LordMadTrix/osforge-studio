import React, { useState } from 'react';
import { OSRecipe } from '../types/os';
import { Monitor, Eye, Play, Sparkles, Sliders, Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { ThemeEditorPanel } from './ThemeEditorPanel';

const BootPreviewSimulator = React.lazy(() => import('./BootPreviewSimulator').then(m => ({ default: m.BootPreviewSimulator })));
const LiveDesktopSimulator = React.lazy(() => import('./LiveDesktopSimulator').then(m => ({ default: m.LiveDesktopSimulator })));

interface SimulatorsViewProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

export const SimulatorsView: React.FC<SimulatorsViewProps> = ({
  recipe,
  onChange,
  lang,
  onOpenTips,
}) => {
  const [simulatorTab, setSimulatorTab] = useState<'boot' | 'desktop'>('boot');
  const [showThemeEditor, setShowThemeEditor] = useState<boolean>(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Contextual Tip */}
      <ContextTip category="desktop" lang={lang} onOpenAllTips={onOpenTips} />

      {/* En-tête de la Page Simulateurs */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Monitor size={20} color="var(--cyan)" />
              {lang === 'fr' ? 'Simulateurs Interactifs en Direct' : 'Interactive Live Simulators'}
              <InfoTooltip
                text={lang === 'fr'
                  ? 'Visualisez en temps réel l’animation Plymouth de démarrage GRUB ainsi que l’agencement graphique du bureau sélectionné avant compilation.'
                  : 'Preview Plymouth boot splash animations and desktop UI layout in real-time before compiling.'}
              />
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {lang === 'fr'
                ? 'Testez les séquences de démarrage et l’environnement de bureau avec vos thèmes et polices configurés.'
                : 'Test boot splash sequences and the desktop environment with your chosen branding presets.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Bouton Toggle Éditeur de Thème */}
            <button
              type="button"
              onClick={() => setShowThemeEditor((prev) => !prev)}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: showThemeEditor ? 700 : 600,
                background: showThemeEditor ? 'rgba(236, 72, 153, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                color: showThemeEditor ? '#f472b6' : 'var(--text-main)',
                border: showThemeEditor ? '1px solid #f472b6' : '1px solid rgba(255, 255, 255, 0.12)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              title={lang === 'fr' ? 'Afficher/Masquer le panneau d’édition de thème' : 'Toggle theme editor controls'}
            >
              <Palette size={14} />
              <span>{lang === 'fr' ? 'Éditeur de Thème' : 'Theme Editor'}</span>
              {showThemeEditor ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Onglets de Bascule Simulateur */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.6)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setSimulatorTab('boot')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontWeight: simulatorTab === 'boot' ? 700 : 500,
                  background: simulatorTab === 'boot' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: simulatorTab === 'boot' ? 'var(--cyan)' : 'var(--text-muted)',
                  border: simulatorTab === 'boot' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Play size={13} />
                <span>{lang === 'fr' ? 'Boot & Plymouth' : 'Boot & Plymouth'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSimulatorTab('desktop')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontWeight: simulatorTab === 'desktop' ? 700 : 500,
                  background: simulatorTab === 'desktop' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  color: simulatorTab === 'desktop' ? '#c084fc' : 'var(--text-muted)',
                  border: simulatorTab === 'desktop' ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Eye size={13} />
                <span>{lang === 'fr' ? `Bureau (${recipe.desktop.toUpperCase()})` : `Desktop (${recipe.desktop.toUpperCase()})`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Panneau Dédié Studio Éditeur de Thème en Direct */}
        {showThemeEditor && (
          <ThemeEditorPanel
            recipe={recipe}
            onChange={onChange}
            lang={lang}
            activeSimulatorTab={simulatorTab}
          />
        )}

        {/* Contrôles Rapides Dédiés au Simulateur Actif */}
        {simulatorTab === 'boot' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 14px',
            background: 'rgba(10, 15, 28, 0.5)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={15} color="#38bdf8" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {lang === 'fr' ? 'Thème Plymouth Splash en Test :' : 'Tested Plymouth Theme:'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px', maxWidth: '420px' }}>
              <select
                className="input-select"
                style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                value={recipe.branding.bootSplashTheme}
                onChange={(e) => onChange({
                  branding: { ...recipe.branding, bootSplashTheme: e.target.value as any }
                })}
              >
                <option value="osforge-custom">⭐ OSForge Custom (Sur-mesure avec Logo & Accent)</option>
                <option value="spinner">Minimal Spinner (Roue moderne)</option>
                <option value="bgrt">BGRT (Logo UEFI constructeur natif)</option>
                <option value="fade-in">Fade-In (Transition douce)</option>
                <option value="tribar">Tribar (Barre de progression classique)</option>
                <option value="solar">Solar (Éruptions coronales animées)</option>
                <option value="glow">Glow Minimal (Lueur diffuse)</option>
                <option value="cyberpunk">Cyberpunk Glow (Lueur futuriste)</option>
                <option value="matrix">Matrix Glow</option>
              </select>
            </div>
          </div>
        )}

        {simulatorTab === 'desktop' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 14px',
            background: 'rgba(10, 15, 28, 0.5)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={15} color="#c084fc" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {lang === 'fr' ? 'Environnement Actuel :' : 'Current Desktop:'}
              </span>
              <span className="badge badge-violet" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                {recipe.desktop.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {lang === 'fr'
                ? 'Modifiez l’environnement dans la section "Environnement de Bureau" pour simuler un autre WM/DE.'
                : 'Change desktop in "Desktop Environment" section to preview another UI.'}
            </span>
          </div>
        )}

        {/* Zone de Rendu Grand Format du Simulateur */}
        <div style={{ width: '100%', minHeight: '480px' }}>
          <React.Suspense fallback={
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              ⏳ {lang === 'fr' ? 'Initialisation du moteur de simulation graphique...' : 'Initializing graphical simulation engine...'}
            </div>
          }>
            {simulatorTab === 'boot' ? (
              <BootPreviewSimulator recipe={recipe} lang={lang} />
            ) : (
              <LiveDesktopSimulator recipe={recipe} lang={lang} />
            )}
          </React.Suspense>
        </div>
      </div>
    </div>
  );
};
