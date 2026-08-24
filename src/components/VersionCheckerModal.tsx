import React, { useEffect, useState } from 'react';
import { OSRecipe } from '../types/os';
import { fetchLiveDistroVersions, fetchLiveDesktopVersions, LiveVersionItem } from '../services/liveVersions';
import {
  X,
  RefreshCw,
  Check,
  Globe,
  AlertCircle,
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
  lang,
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [items, setItems] = useState<LiveVersionItem[]>([]);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'distro' | 'desktop'>('all');

  const runCheck = async () => {
    setStatus('loading');
    try {
      const [distros, desktops] = await Promise.all([
        fetchLiveDistroVersions(),
        fetchLiveDesktopVersions(),
      ]);
      setItems([...distros, ...desktops]);
      setCheckedAt(new Date());
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    if (isOpen && status === 'idle') runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = items.filter(item => categoryFilter === 'all' || item.category === categoryFilter);
  const liveCount = items.filter(i => i.isLive).length;

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
          background: 'var(--bg-main)',
          border: '1px solid var(--border-hover)',
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
          background: 'var(--bg-surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(132, 160, 92, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--emerald)',
            }}>
              <RefreshCw size={18} className={status === 'loading' ? 'spin' : ''} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {lang === 'fr' ? 'Vérificateur de versions en direct' : 'Live Version Checker'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                {lang === 'fr' ? 'Interroge de vraies API publiques (endoflife.date, api.github.com) — pas de catalogue codé en dur' : 'Queries real public APIs (endoflife.date, api.github.com) — no hardcoded catalog'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={runCheck}
              disabled={status === 'loading'}
              className="btn btn-secondary"
              style={{ fontSize: '0.76rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} className={status === 'loading' ? 'spin' : ''} />
              <span>{status === 'loading' ? (lang === 'fr' ? 'Vérification...' : 'Scanning...') : (lang === 'fr' ? 'Re-vérifier' : 'Check Now')}</span>
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

          {/* Status Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            background: 'var(--bg-accent-subtle)',
            border: '1px solid var(--border-active)',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: status === 'loading' ? 'var(--amber)' : '#84a05c',
                boxShadow: status === 'loading' ? '0 0 10px var(--amber)' : '0 0 10px #84a05c',
              }} />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {status === 'loading'
                    ? (lang === 'fr' ? 'Interrogation des dépôts officiels en cours…' : 'Querying official upstream repos…')
                    : (lang === 'fr' ? `${liveCount}/${items.length} composants suivis en direct` : `${liveCount}/${items.length} components tracked live`)}
                </div>
                {checkedAt && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {lang === 'fr' ? 'Vérifié à ' : 'Checked at '}{checkedAt.toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {[
              { id: 'all', label: lang === 'fr' ? 'Tous' : 'All', count: items.length },
              { id: 'distro', label: lang === 'fr' ? 'Distributions' : 'Distributions', count: items.filter(i => i.category === 'distro').length },
              { id: 'desktop', label: lang === 'fr' ? 'Bureaux & WM' : 'Desktops & WMs', count: items.filter(i => i.category === 'desktop').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id as any)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: categoryFilter === tab.id ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                  background: categoryFilter === tab.id ? 'var(--cyan-subtle)' : 'rgba(26, 22, 19, 0.5)',
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

          {status === 'error' && (
            <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>
              {lang === 'fr' ? 'Échec de la vérification en direct.' : 'Live check failed.'}
            </div>
          )}

          {/* Live Components List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredItems.map(item => (
              <a
                key={item.id}
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-panel"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'rgba(26, 22, 19, 0.5)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      {item.name}
                    </span>
                    <span className={`badge badge-${item.channel === 'beta' ? 'amber' : (item.channel === 'lts' ? 'emerald' : 'cyan')}`} style={{ fontSize: '0.62rem' }}>
                      {item.channel.toUpperCase()}
                    </span>
                  </div>
                  {item.isLive ? (
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      {item.sourceUrl.replace('https://', '')}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'flex-start', gap: '4px', maxWidth: '380px' }}>
                      <AlertCircle size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>{item.note}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {item.isLive ? (
                    <>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--cyan)' }}>
                          {item.latest}{item.codename ? ` "${item.codename}"` : ''}
                        </div>
                      </div>
                      {item.releaseDate && (
                        <span className="badge badge-emerald" style={{ fontSize: '0.66rem', padding: '3px 8px' }}>
                          {item.releaseDate}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="badge" style={{ fontSize: '0.66rem', padding: '3px 8px', background: 'var(--bg-card)', color: 'var(--text-dim)' }}>
                      {item.channel === 'rolling' ? (lang === 'fr' ? 'Rolling' : 'Rolling') : (lang === 'fr' ? 'Non suivi' : 'Not tracked')}
                    </span>
                  )}
                </div>
              </a>
            ))}
            {status === 'loading' && filteredItems.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                {lang === 'fr' ? 'Chargement…' : 'Loading…'}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.74rem',
          color: 'var(--text-dim)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={13} color="var(--cyan)" />
            <span>{lang === 'fr' ? 'Le noyau Linux mainline est suivi séparément (voir section Noyau)' : 'Mainline Linux kernel is tracked separately (see Kernel section)'}</span>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.76rem', padding: '4px 10px' }}>
            {lang === 'fr' ? 'Fermer' : 'Close'}
            {status === 'done' && <Check size={11} style={{ marginLeft: '4px' }} />}
          </button>
        </div>
      </div>
    </div>
  );
};
