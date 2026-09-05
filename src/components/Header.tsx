import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, Wand2, Sliders, Search, Share2, Check, Download, Heart, 
  ChevronDown, Sparkles, Activity, BookOpen, Image as ImageIcon, 
  Lightbulb, Zap, Globe, Save 
} from 'lucide-react';
import { OSRecipe } from '../types/os';
import { copyShareableLink } from '../services/recipeSharing';

interface HeaderProps {
  recipe?: OSRecipe;
  onOpenPresets: () => void;
  onOpenAI: () => void;
  onStartBuild: () => void;
  onOpenTips: () => void;
  onOpenLauncher: () => void;
  onOpenScreenshots: () => void;
  onOpenVersionChecker: () => void;
  onOpenPresentation?: () => void;
  onOpenAudit?: () => void;
  onOpenProfiles?: () => void;
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
  onOpenPresentation,
  onOpenAudit,
  onOpenProfiles,
  uiMode,
  setUiMode,
  lang,
  setLang,
}) => {
  const [sharedCopied, setSharedCopied] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = async () => {
    if (!recipe) return;
    await copyShareableLink(recipe);
    setSharedCopied(true);
    setTimeout(() => setSharedCopied(false), 2000);
  };

  return (
    <header style={{
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(9, 13, 22, 0.95)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '7px 20px',
      minHeight: '48px',
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
      }}>
        
        {/* 1. GAUCHE : Logo & Brand & Switch de Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
            }}>
              <Layers size={16} color="#ffffff" strokeWidth={2.2} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                OSForge <span style={{ color: 'var(--cyan)' }}>Studio</span>
              </span>
              <span style={{
                fontSize: '0.62rem',
                padding: '1px 5px',
                borderRadius: '4px',
                background: 'rgba(2, 132, 199, 0.15)',
                color: 'var(--cyan)',
                border: '1px solid rgba(2, 132, 199, 0.3)',
                fontWeight: 700,
              }}>
                PRO
              </span>
            </div>
          </div>

          <div style={{ height: '18px', width: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Sélecteur de Mode Pro : Wizard vs Studio Expert */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '2px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '2px',
          }}>
            <button
              onClick={() => setUiMode('wizard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: uiMode === 'wizard' ? 'var(--cyan)' : 'transparent',
                color: uiMode === 'wizard' ? '#000000' : 'var(--text-muted)',
                fontWeight: uiMode === 'wizard' ? 700 : 500,
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.74rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Wand2 size={12} />
              <span>{lang === 'fr' ? 'Assistant' : 'Wizard'}</span>
            </button>

            <button
              onClick={() => setUiMode('expert')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: uiMode === 'expert' ? 'var(--cyan)' : 'transparent',
                color: uiMode === 'expert' ? '#000000' : 'var(--text-muted)',
                fontWeight: uiMode === 'expert' ? 700 : 500,
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.74rem',
                transition: 'all 0.15s ease',
              }}
            >
              <Sliders size={12} />
              <span>{lang === 'fr' ? 'Studio Expert' : 'Expert Studio'}</span>
            </button>
          </div>
        </div>

        {/* 2. CENTRE : Barre de Recherche Rapide (Palette de commande Ctrl+K) */}
        <button
          onClick={onOpenLauncher}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '5px 12px',
            gap: '12px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.74rem',
            width: '260px',
            justifyContent: 'space-between',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
          title={lang === 'fr' ? 'Rechercher un composant ou une action (Ctrl+K)' : 'Search component or action (Ctrl+K)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={13} color="var(--cyan)" />
            <span>{lang === 'fr' ? 'Rechercher...' : 'Search...'}</span>
          </div>
          <kbd style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '3px',
            padding: '1px 5px',
            fontSize: '0.64rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            Ctrl K
          </kbd>
        </button>

        {/* 3. DROITE : Groupe d'Actions Pro & Menu Outils Compact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          
          {/* Menu Déroulant "Outils" Groupé (Évite d'étaler 10 boutons) */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: toolsDropdownOpen ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--text-main)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>{lang === 'fr' ? 'Outils' : 'Tools'}</span>
              <ChevronDown size={13} color="var(--text-muted)" />
            </button>

            {toolsDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: '#0d131f',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                padding: '6px',
                minWidth: '220px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                zIndex: 110,
              }}>
                <button
                  onClick={() => { onOpenPresets(); setToolsDropdownOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Sparkles size={14} color="var(--cyan)" />
                  <span>{lang === 'fr' ? 'Modèles & Presets' : 'Presets & Templates'}</span>
                </button>

                {onOpenProfiles && (
                  <button
                    onClick={() => { onOpenProfiles(); setToolsDropdownOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-main)',
                      fontSize: '0.75rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Save size={14} color="#38bdf8" />
                    <span>{lang === 'fr' ? 'Profils & Sauvegardes' : 'Profiles & Backups'}</span>
                  </button>
                )}

                <button
                  onClick={() => { onOpenAI(); setToolsDropdownOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Wand2 size={14} color="#c084fc" />
                  <span>{lang === 'fr' ? 'Architecte IA Copilot' : 'AI Copilot Architect'}</span>
                </button>

                {onOpenAudit && (
                  <button
                    onClick={() => { onOpenAudit(); setToolsDropdownOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-main)',
                      fontSize: '0.75rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Activity size={14} color="#10b981" />
                    <span>{lang === 'fr' ? 'Sonde Matérielle PC' : 'Hardware PC Audit'}</span>
                  </button>
                )}

                <button
                  onClick={() => { onOpenScreenshots(); setToolsDropdownOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <ImageIcon size={14} color="var(--cyan)" />
                  <span>{lang === 'fr' ? 'Galerie de Captures' : 'Screenshots Gallery'}</span>
                </button>

                <button
                  onClick={() => { onOpenVersionChecker(); setToolsDropdownOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Zap size={14} color="#84a05c" />
                  <span>{lang === 'fr' ? 'Vérificateur de Versions' : 'Version Checker'}</span>
                </button>

                <button
                  onClick={() => { onOpenTips(); setToolsDropdownOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Lightbulb size={14} color="#fbbf24" />
                  <span>{lang === 'fr' ? 'Guides & Documentation' : 'Guides & Documentation'}</span>
                </button>

                {onOpenPresentation && (
                  <button
                    onClick={() => { onOpenPresentation(); setToolsDropdownOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-main)',
                      fontSize: '0.75rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <BookOpen size={14} color="#38bdf8" />
                    <span>{lang === 'fr' ? 'Présentation du Projet' : 'Project Showcase'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bouton Sauvegardes & Profils */}
          {onOpenProfiles && (
            <button
              onClick={onOpenProfiles}
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                padding: '5px 9px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 600,
              }}
              title={lang === 'fr' ? 'Gérer les profils et sauvegardes' : 'Manage profiles and backups'}
            >
              <Save size={13} color="#38bdf8" />
              <span>{lang === 'fr' ? 'Sauvegardes' : 'Backups'}</span>
            </button>
          )}

          {/* Bouton Partager */}
          {recipe && (
            <button
              onClick={handleShare}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: sharedCopied ? '#10b981' : 'var(--text-muted)',
                padding: '5px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title={lang === 'fr' ? 'Copier le lien de cette recette' : 'Copy recipe link'}
            >
              {sharedCopied ? <Check size={13} color="#10b981" /> : <Share2 size={13} />}
              <span style={{ fontSize: '0.72rem' }}>{sharedCopied ? (lang === 'fr' ? 'Copié' : 'Copied') : (lang === 'fr' ? 'Partager' : 'Share')}</span>
            </button>
          )}

          {/* Switch de Langue FR / EN */}
          <button
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)',
              padding: '5px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Switch Language"
          >
            <Globe size={12} />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Don Patreon discret */}
          <a
            href="https://www.patreon.com/c/LordMad"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(255, 66, 77, 0.08)',
              border: '1px solid rgba(255, 66, 77, 0.25)',
              color: '#ff424d',
              padding: '5px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title={lang === 'fr' ? 'Soutenir le créateur sur Patreon' : 'Support on Patreon'}
          >
            <Heart size={12} fill="#ff424d" />
            <span>Patreon</span>
          </a>

          {/* Bouton de Build en mode Wizard uniquement (en mode expert il est dans le HUD droit) */}
          {uiMode === 'wizard' && (
            <button
              onClick={onStartBuild}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
              }}
            >
              <Download size={13} />
              <span>{lang === 'fr' ? 'Générer l\'Image' : 'Build Image'}</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
