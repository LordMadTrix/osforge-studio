import React, { useState, useMemo } from 'react';
import { 
  X, Download, ExternalLink, ShieldCheck, Terminal, 
  Check, Copy, Search, HardDrive, Globe, Share2 
} from 'lucide-react';
import { DistroId, ArchType } from '../types/os';
import { 
  OFFICIAL_RELEASES_CATALOG, 
  OfficialReleaseItem, 
  DistroOfficialMetadata 
} from '../data/officialReleases';

interface OfficialReleasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fr' | 'en';
  initialDistroId?: DistroId;
}

export const OfficialReleasesModal: React.FC<OfficialReleasesModalProps> = ({
  isOpen,
  onClose,
  lang,
  initialDistroId = 'debian',
}) => {
  const [selectedDistroId, setSelectedDistroId] = useState<DistroId>(initialDistroId);
  const [prevInitialId, setPrevInitialId] = useState<DistroId>(initialDistroId);
  const [distroSearch, setDistroSearch] = useState('');
  const [selectedArch, setSelectedArch] = useState<ArchType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync initialDistroId cleanly when changed by parent
  if (initialDistroId !== prevInitialId) {
    setPrevInitialId(initialDistroId);
    setSelectedDistroId(initialDistroId);
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDistros = useMemo(() => {
    const q = distroSearch.toLowerCase().trim();
    if (!q) return OFFICIAL_RELEASES_CATALOG;
    return OFFICIAL_RELEASES_CATALOG.filter(d => 
      d.name.toLowerCase().includes(q) ||
      d.distroId.toLowerCase().includes(q) ||
      d.badge.toLowerCase().includes(q)
    );
  }, [distroSearch]);

  const currentDistro: DistroOfficialMetadata | undefined = useMemo(() => {
    return OFFICIAL_RELEASES_CATALOG.find(d => d.distroId === selectedDistroId) 
      || OFFICIAL_RELEASES_CATALOG[0];
  }, [selectedDistroId]);

  const filteredReleases: OfficialReleaseItem[] = useMemo(() => {
    if (!currentDistro) return [];
    return currentDistro.releases.filter(r => {
      if (selectedArch !== 'all' && r.arch !== selectedArch) return false;
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      return true;
    });
  }, [currentDistro, selectedArch, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
      }}
    >
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #0b1120 0%, #060913 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(56, 189, 248, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
            }}>
              <Download size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {lang === 'fr' ? 'Releases Officielles Sans Modification' : 'Official Unmodified Releases'}
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <ShieldCheck size={11} />
                  {lang === 'fr' ? '100% Authentique & Pur' : '100% Upstream Official'}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                {lang === 'fr' 
                  ? 'Téléchargez directement les images ISO et disques d’origine depuis les miroirs officiels des éditeurs, sans intermédiaire ni modification.'
                  : 'Download genuine original ISO and disk images directly from official upstream mirrors, completely unmodified.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title={lang === 'fr' ? 'Fermer' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps principal : 2 colonnes (Sélecteur gauche + Détail droit) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          flex: 1,
          overflow: 'hidden',
          minHeight: '480px',
        }}>
          {/* Colonne Gauche : Liste des distributions */}
          <div style={{
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Champ de recherche */}
            <div style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder={lang === 'fr' ? 'Filtrer distribution...' : 'Filter distribution...'}
                  value={distroSearch}
                  onChange={e => setDistroSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    fontSize: '0.76rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Liste scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {filteredDistros.map(d => {
                  const isSelected = d.distroId === selectedDistroId;
                  return (
                    <button
                      key={d.distroId}
                      onClick={() => {
                        setSelectedDistroId(d.distroId);
                        setSelectedArch('all');
                        setSelectedCategory('all');
                      }}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: isSelected 
                          ? `1px solid ${d.color}` 
                          : '1px solid transparent',
                        background: isSelected 
                          ? `${d.color}20` 
                          : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <span style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: d.color,
                          boxShadow: isSelected ? `0 0 8px ${d.color}` : 'none',
                        }} />
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#f8fafc' : '#cbd5e1',
                        }}>
                          {d.name}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.66rem',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#94a3b8',
                      }}>
                        {d.releases.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Colonne Droite : Fiche distribution & Releases pures */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '20px 24px',
            gap: '20px',
            background: 'rgba(15, 23, 42, 0.3)',
          }}>
            {currentDistro && (
              <>
                {/* Bandeau d'en-tête de la distribution */}
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${currentDistro.color}15 0%, rgba(255, 255, 255, 0.02) 100%)`,
                  border: `1px solid ${currentDistro.color}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: currentDistro.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: '1.2rem',
                      boxShadow: `0 4px 16px ${currentDistro.color}40`,
                    }}>
                      {currentDistro.name.substring(0, 1)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                          {currentDistro.name}
                        </h4>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#e2e8f0',
                        }}>
                          {currentDistro.badge}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                        {lang === 'fr' 
                          ? 'Dépôts officiels et serveurs d’images originaux' 
                          : 'Official repositories and genuine upstream image servers'}
                      </p>
                    </div>
                  </div>

                  {/* Liens officiels amont */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <a
                      href={currentDistro.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.73rem',
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Globe size={12} />
                      <span>{lang === 'fr' ? 'Site officiel' : 'Official Site'}</span>
                      <ExternalLink size={10} />
                    </a>
                    <a
                      href={currentDistro.officialDownloadPortal}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.73rem',
                        color: '#a78bfa',
                        background: 'rgba(167, 139, 250, 0.1)',
                        border: '1px solid rgba(167, 139, 250, 0.25)',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <HardDrive size={12} />
                      <span>{lang === 'fr' ? 'Portail de téléchargement' : 'Download Portal'}</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Filtres d'architecture & de catégorie */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingBottom: '4px',
                }}>
                  {/* Filtre d'Architecture */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginRight: '4px' }}>
                      {lang === 'fr' ? 'Architecture :' : 'Arch:'}
                    </span>
                    {(['all', 'x86_64', 'aarch64'] as const).map(arch => (
                      <button
                        key={arch}
                        onClick={() => setSelectedArch(arch)}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: selectedArch === arch ? 700 : 500,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: selectedArch === arch ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: selectedArch === arch ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: selectedArch === arch ? '#38bdf8' : '#cbd5e1',
                          cursor: 'pointer',
                        }}
                      >
                        {arch === 'all' ? (lang === 'fr' ? 'Toutes' : 'All') : arch}
                      </button>
                    ))}
                  </div>

                  {/* Filtre de Catégorie */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginRight: '4px' }}>
                      {lang === 'fr' ? 'Édition :' : 'Edition:'}
                    </span>
                    {[
                      { id: 'all', label: lang === 'fr' ? 'Toutes' : 'All' },
                      { id: 'live_desktop', label: lang === 'fr' ? 'Bureau Live' : 'Live Desktop' },
                      { id: 'netinst', label: lang === 'fr' ? 'Netinst' : 'Netinst' },
                      { id: 'server', label: lang === 'fr' ? 'Serveur' : 'Server' },
                      { id: 'minimal', label: lang === 'fr' ? 'Minimal' : 'Minimal' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: selectedCategory === cat.id ? 700 : 500,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: selectedCategory === cat.id ? '1px solid #34d399' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: selectedCategory === cat.id ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: selectedCategory === cat.id ? '#34d399' : '#cbd5e1',
                          cursor: 'pointer',
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Liste des Releases pures */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {filteredReleases.length === 0 ? (
                    <div style={{
                      padding: '32px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '10px',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                      fontSize: '0.85rem',
                    }}>
                      {lang === 'fr' 
                        ? 'Aucune image ne correspond aux filtres sélectionnés.' 
                        : 'No official images match the selected filters.'}
                    </div>
                  ) : (
                    filteredReleases.map(release => (
                      <div
                        key={release.id}
                        style={{
                          padding: '16px 18px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.025)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        {/* En-tête release */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h5 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                                {release.name}
                              </h5>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                              }}>
                                {release.fileFormat}
                              </span>
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: '#94a3b8',
                              }}>
                                {release.arch}
                              </span>
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: '#cbd5e1',
                              }}>
                                📦 {release.approxSize}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                              {lang === 'fr' ? release.descriptionFr : release.descriptionEn}
                            </p>
                          </div>

                          {/* Bouton de téléchargement principal */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <a
                              href={release.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '7px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                padding: '8px 14px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                color: '#ffffff',
                                textDecoration: 'none',
                                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                              }}
                            >
                              <Download size={14} />
                              <span>{lang === 'fr' ? 'Télécharger l\'ISO' : 'Download ISO'}</span>
                            </a>

                            {release.torrentUrl && (
                              <a
                                href={release.torrentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontSize: '0.75rem',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  color: '#34d399',
                                  textDecoration: 'none',
                                }}
                                title={lang === 'fr' ? 'Télécharger via BitTorrent' : 'Download via BitTorrent'}
                              >
                                <Share2 size={13} />
                                <span>Torrent</span>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Barre d'outils secondaire : Copie d'URL, Checksum, Commande CLI */}
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}>
                          {/* Commande CLI 1-clic */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
                            <Terminal size={13} color="#94a3b8" />
                            <code style={{
                              fontSize: '0.72rem',
                              fontFamily: 'monospace',
                              color: '#38bdf8',
                              background: 'transparent',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {release.curlCommand}
                            </code>
                          </div>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {/* Copier commande CLI */}
                            <button
                              onClick={() => copyToClipboard(release.curlCommand, `cmd-${release.id}`)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.7rem',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                background: copiedId === `cmd-${release.id}` ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: copiedId === `cmd-${release.id}` ? '#34d399' : '#cbd5e1',
                                cursor: 'pointer',
                              }}
                              title={lang === 'fr' ? 'Copier la commande de téléchargement' : 'Copy download command'}
                            >
                              {copiedId === `cmd-${release.id}` ? <Check size={11} /> : <Copy size={11} />}
                              <span>{copiedId === `cmd-${release.id}` ? (lang === 'fr' ? 'Copié !' : 'Copied!') : 'CLI'}</span>
                            </button>

                            {/* Copier URL Directe */}
                            <button
                              onClick={() => copyToClipboard(release.downloadUrl, `url-${release.id}`)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.7rem',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                background: copiedId === `url-${release.id}` ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: copiedId === `url-${release.id}` ? '#34d399' : '#cbd5e1',
                                cursor: 'pointer',
                              }}
                              title={lang === 'fr' ? 'Copier l\'URL directe' : 'Copy direct URL'}
                            >
                              {copiedId === `url-${release.id}` ? <Check size={11} /> : <Copy size={11} />}
                              <span>{lang === 'fr' ? 'URL' : 'URL'}</span>
                            </button>

                            {/* Lien Checksum */}
                            {release.checksumUrl && (
                              <a
                                href={release.checksumUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.7rem',
                                  padding: '3px 8px',
                                  borderRadius: '5px',
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  color: '#fbbf24',
                                  textDecoration: 'none',
                                }}
                                title={lang === 'fr' ? 'Consulter les sommes de contrôle officielles' : 'View official checksums'}
                              >
                                <ShieldCheck size={11} />
                                <span>{release.checksumType || 'SHA256'}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bloc de vérification d'intégrité & guide */}
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={15} color="#34d399" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399' }}>
                      {lang === 'fr' ? 'Vérification de l’intégrité du fichier téléchargé' : 'Verifying image checksum and integrity'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                    {lang === 'fr' ? currentDistro.verificationGuideFr : currentDistro.verificationGuideEn}
                  </p>
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 600 }}>Linux / macOS :</span>
                      <code style={{ fontSize: '0.68rem', background: 'rgba(0, 0, 0, 0.4)', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>
                        sha256sum -c SHA256SUMS
                      </code>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 600 }}>Windows (PowerShell) :</span>
                      <code style={{ fontSize: '0.68rem', background: 'rgba(0, 0, 0, 0.4)', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8' }}>
                        Get-FileHash -Algorithm SHA256 ./image.iso
                      </code>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
            }} />
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
              {lang === 'fr' 
                ? 'Tous les téléchargements pointent vers les CDNs et miroirs officiels des projets respectifs.' 
                : 'All downloads connect directly to the official project CDNs and mirrors.'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              fontSize: '0.78rem',
              padding: '6px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {lang === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
