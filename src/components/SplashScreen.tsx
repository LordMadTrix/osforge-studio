import React, { useState, useEffect, useCallback } from 'react';
import { useForgeSound } from '../hooks/useForgeSound';
import { Volume2, X, Terminal } from 'lucide-react';

export interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const { playStartupJingle } = useForgeSound();

  const handleDismiss = useCallback((withSound = true) => {
    if (isClosing) return;
    if (withSound) {
      playStartupJingle();
    }
    setIsClosing(true);
    setTimeout(() => {
      onDone();
    }, 400);
  }, [isClosing, playStartupJingle, onDone]);

  // Auto-dismiss après 2.8s si pas d'interaction
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss(false);
    }, 2800);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss(false);
      } else {
        handleDismiss(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDismiss]);

  const bgUrl = `${import.meta.env.BASE_URL}splash-bg.jpg`;

  return (
    <div
      role="dialog"
      aria-label="OSForge Studio Splash Screen"
      onClick={() => handleDismiss(true)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0c0a09',
        backgroundImage: `radial-gradient(circle at center, rgba(12, 10, 9, 0.45) 0%, rgba(12, 10, 9, 0.88) 75%, rgba(12, 10, 9, 0.98) 100%), url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: isClosing ? 0 : 1,
        transform: isClosing ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Bouton passer discret en haut à droite */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss(false);
        }}
        aria-label="Passer l'introduction"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(21, 18, 15, 0.75)',
          border: '1px solid rgba(255, 235, 215, 0.15)',
          borderRadius: '4px',
          padding: '6px 12px',
          color: 'var(--text-muted, #a89a8c)',
          fontSize: '0.78rem',
          fontFamily: 'var(--font-mono, monospace)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#f97316';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255, 235, 215, 0.15)';
          e.currentTarget.style.color = 'var(--text-muted, #a89a8c)';
        }}
      >
        <span>Passer [Échap]</span>
        <X size={14} />
      </button>

      {/* Contenu central */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '32px',
          maxWidth: '640px',
          animation: 'scaleUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Halo & Emblème Enclume Forge */}
        <div
          style={{
            position: 'relative',
            width: '96px',
            height: '96px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
          }}
        >
          {/* Halo pulsant */}
          <div
            className="forge-halo-pulse"
            style={{
              position: 'absolute',
              inset: '-12px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(249, 115, 22, 0.35) 0%, rgba(249, 115, 22, 0) 70%)',
              filter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          />

          {/* Cadre forgé */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '16px',
              background: 'linear-gradient(145deg, rgba(30, 25, 20, 0.95), rgba(15, 12, 10, 0.95))',
              border: '1.5px solid rgba(249, 115, 22, 0.5)',
              boxShadow: '0 0 25px rgba(249, 115, 22, 0.35), inset 0 0 15px rgba(249, 115, 22, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
            }}
          >
            <span role="img" aria-label="Anvil" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>
              ⚒
            </span>
          </div>
        </div>

        {/* Titre OSForge Studio */}
        <h1
          style={{
            fontFamily: 'var(--font-heading, "JetBrains Mono", monospace)',
            fontSize: '2.4rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '10px',
            background: 'linear-gradient(135deg, #ffffff 35%, #f97316 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 30px rgba(249, 115, 22, 0.4)',
          }}
        >
          OSForge Studio
        </h1>

        {/* Tagline style terminal */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: '0.95rem',
            color: '#fdba74',
            background: 'rgba(249, 115, 22, 0.08)',
            border: '1px solid rgba(249, 115, 22, 0.25)',
            padding: '6px 14px',
            borderRadius: '4px',
            marginBottom: '32px',
          }}
        >
          <Terminal size={15} color="#f97316" />
          <span>// Build real Linux systems</span>
          <span className="forge-blink-cursor" style={{ color: '#f97316', fontWeight: 'bold' }}>_</span>
        </div>

        {/* Indication clic & audio */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            color: 'var(--text-muted, #a89a8c)',
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '6px 16px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Volume2 size={15} color="#f97316" />
          <span>Cliquer n&apos;importe où pour entrer avec le son</span>
        </div>
      </div>

      {/* Barre de progression en bas */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
        }}
      >
        <div
          className="forge-progress-sweep"
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #f97316, #fb923c, #fdba74)',
            boxShadow: '0 0 12px #f97316',
          }}
        />
      </div>

      {/* Métadonnées en bas de page */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '24px',
          right: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.74rem',
          fontFamily: 'var(--font-mono, monospace)',
          color: 'var(--text-dim, #6b6058)',
          pointerEvents: 'none',
        }}
      >
        <span>OSForge Engine • Linux Kernel &amp; ISO Factory</span>
        <span>v2026.09 • Native Production</span>
      </div>
    </div>
  );
};
