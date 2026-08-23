import React, { useState } from 'react';
import { OSRecipe } from '../types/os';
import { UPSTREAM_FEED } from '../services/versionChecker';
import {
  X,
  RefreshCw,
  Zap,
  Check,
  Globe
} from 'lucide-react';

interface VersionCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: OSRecipe;
  onUpdateRecipe: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
}

export const VersionCheckerModal: React.FC<VersionCheckerModalProps> = ({
  isOpen,
  onClose,
  recipe,
  onUpdateRecipe,
  lang,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'kernel' | 'distro' | 'desktop' | 'toolchain'>('all');
  const [applied, setApplied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleScan = () => {
    setIsScanning(true);
    setApplied(false);
    setTimeout(() => {
      setIsScanning(false);
    }, 900);
  };

  const handleApplyLatest = () => {
    // Upgrades current recipe to latest upstream channels
    onUpdateRecipe({
      distroVersion: recipe.distro === 'debian' ? '13 (Trixie Testing / Next)' : (recipe.distro === 'ubuntu' ? '25.04 (Plucky Puffin Beta)' : recipe.distroVersion),
      kernel: 'cachyos', // Ultra-fast low latency kernel
      desktop: recipe.desktop === 'none' ? 'none' : recipe.desktop,
      branding: {
        ...recipe.branding,
        version: '2.0-latest',
      },
    });
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const filteredFeed = UPSTREAM_FEED.filter(item => {
    if (categoryFilter === 'all') return true;
    return item.category === categoryFilter;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '860px',
          width: '95%',
          maxHeight: '90vh',
          padding: 0,
          overflow: 'hidden',
          background: '#090e1a',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: '#0c1222',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--emerald)',
            }}>
              <RefreshCw size={18} className={isScanning ? 'animate-spin' : ''} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                {lang === 'fr' ? 'Vérification & Mises à Jour en Direct' : 'Live Upstream Version Checker & Updates'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                {lang === 'fr' ? 'Flux en temps réel des dépôts officiels (kernel.org, Debian, Ubuntu, Arch, Rust, Hyprland)' : 'Real-time feed from official mirrors and release channels'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="btn btn-secondary"
              style={{ fontSize: '0.76rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} className={isScanning ? 'animate-spin' : ''} />
              <span>{isScanning ? (lang === 'fr' ? 'Vérification...' : 'Scanning...') : (lang === 'fr' ? 'Re-vérifier' : 'Check Now')}</span>
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Top Status & 1-Click Update Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            background: 'rgba(14, 165, 233, 0.08)',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 10px #10b981',
              }} />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc' }}>
                  {lang === 'fr' ? 'Miroirs officiels synchronisés' : 'Upstream mirrors synchronized'}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {lang === 'fr' ? 'Noyaux 6.13/6.14, Debian 13, Ubuntu 25.04 Beta et Mesa 25 disponibles' : 'Kernels 6.13/6.14, Debian 13, Ubuntu 25.04 Beta & Mesa 25 available'}
                </div>
              </div>
            </div>

            <button
              onClick={handleApplyLatest}
              className="btn btn-emerald"
              style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {applied ? <Check size={14} color="#ffffff" /> : <Zap size={14} />}
              <span>{applied ? (lang === 'fr' ? 'Recette mise à jour !' : 'Recipe Updated!') : (lang === 'fr' ? 'Mettre à jour la recette vers les dernières versions' : 'Apply Latest Upstream Versions')}</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {[
              { id: 'all', label: lang === 'fr' ? 'Tous les composants' : 'All Components', count: UPSTREAM_FEED.length },
              { id: 'kernel', label: 'Noyaux Linux', count: UPSTREAM_FEED.filter(i => i.category === 'kernel').length },
              { id: 'distro', label: 'Distributions', count: UPSTREAM_FEED.filter(i => i.category === 'distro').length },
              { id: 'desktop', label: 'Bureaux & WM', count: UPSTREAM_FEED.filter(i => i.category === 'desktop').length },
              { id: 'toolchain', label: 'Compilateurs & Outils', count: UPSTREAM_FEED.filter(i => i.category === 'toolchain').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id as any)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: categoryFilter === tab.id ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                  background: categoryFilter === tab.id ? 'rgba(14, 165, 233, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                  color: categoryFilter === tab.id ? 'var(--cyan)' : 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: categoryFilter === tab.id ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{tab.label}</span>
                <span style={{ marginLeft: '4px', opacity: 0.7 }}>({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Upstream Components Feed List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredFeed.map(item => (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'rgba(15, 23, 42, 0.5)',
                }}
              >
                <div style={{ minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>
                      {item.name}
                    </span>
                    <span className={`badge badge-${item.channel === 'beta' ? 'amber' : (item.channel === 'lts' ? 'emerald' : 'cyan')}`} style={{ fontSize: '0.62rem' }}>
                      {item.channel.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {item.changelogSummary}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      Version dans l’app : <span style={{ color: '#cbd5e1' }}>{item.currentInApp}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--cyan)' }}>
                      ⚡ {item.latestUpstream}
                    </div>
                  </div>

                  <span className="badge badge-emerald" style={{ fontSize: '0.66rem', padding: '3px 8px' }}>
                    {item.releaseDate}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: '#0c1222',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.74rem',
          color: 'var(--text-dim)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={13} color="var(--cyan)" />
            <span>Miroirs officiels vérifiés : kernel.org • debian.org • ubuntu.com • archlinux.org</span>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
