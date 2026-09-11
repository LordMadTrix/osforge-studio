import React, { useState, useMemo } from 'react';
import { OSRecipe, PackageCategory } from '../types/os';
import { SOFTWARE_PACKAGES } from '../data/packages';
import { DISTROS } from '../data/distros';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { 
  Search, Package, Plus, CheckCircle2, Shield, Gamepad2, Code, Server, 
  Video, FileText, Cpu, Sparkles, Radio, Zap, RotateCcw, Tag, Download,
  Monitor, Terminal, Activity, Copy, Check, Layers, X
} from 'lucide-react';

interface PackageCatalogProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

export const PackageCatalog: React.FC<PackageCatalogProps> = ({ recipe, onChange, lang, onOpenTips }) => {
  // Vue active : Catalogue principal, Stacks spécialisées, ou Paquets personnalisés / Import-Export
  const [activeTab, setActiveTab] = useState<'catalog' | 'stacks' | 'custom'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'gui' | 'cli' | 'daemon'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState<string>('');
  const [showImportExport, setShowImportExport] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [copiedExport, setCopiedExport] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const distro = DISTROS.find(d => d.id === recipe.distro) || DISTROS[0];

  const categories: { id: string; name: string; icon: any; categoryKey?: PackageCategory }[] = [
    { id: 'all', name: lang === 'fr' ? 'Tous les Logiciels' : 'All Packages', icon: Package },
    { id: 'development', name: lang === 'fr' ? 'Développement' : 'Development', icon: Code, categoryKey: 'development' },
    { id: 'ai', name: lang === 'fr' ? 'IA & Données' : 'AI & Data', icon: Sparkles, categoryKey: 'ai' },
    { id: 'gaming', name: lang === 'fr' ? 'Gaming & Émulation' : 'Gaming & Emulation', icon: Gamepad2, categoryKey: 'gaming' },
    { id: 'security', name: lang === 'fr' ? 'Cybersécurité' : 'Cybersecurity', icon: Shield, categoryKey: 'security' },
    { id: 'homelab', name: lang === 'fr' ? 'Homelab & Serveur' : 'Homelab & Server', icon: Server, categoryKey: 'homelab' },
    { id: 'multimedia', name: lang === 'fr' ? 'Multimédia & Graphisme' : 'Multimedia & Graphics', icon: Video, categoryKey: 'multimedia' },
    { id: 'audio', name: lang === 'fr' ? 'Studio Audio & MAO' : 'Audio & Music Studio', icon: Radio, categoryKey: 'audio' },
    { id: 'productivity', name: lang === 'fr' ? 'Bureautique & Mail' : 'Productivity & Office', icon: FileText, categoryKey: 'productivity' },
    { id: 'system', name: lang === 'fr' ? 'Système & CLI Rust' : 'System & Rust CLI', icon: Cpu, categoryKey: 'system' },
  ];

  // Tags populaires mémoïsés
  const allTags = useMemo(() => Array.from(new Set(SOFTWARE_PACKAGES.flatMap(p => p.tags))).slice(0, 14), []);

  // Suggestions de paquets personnalisés populaires
  const popularCustomPackages = useMemo(() => ['jq', 'tree', 'ncdu', 'micro', 'fish', 'zellij', 'tmux', 'lazygit', 'eza', 'bat', 'strace', 'gdb', 'duf', 'tealdeer'], []);

  // Filtrage ultra-rapide mémoïsé
  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SOFTWARE_PACKAGES.filter(pkg => {
      const matchesCategory = selectedCategory === 'all' || pkg.category === selectedCategory;
      const matchesType = selectedType === 'all' || pkg.appType === selectedType;
      const matchesTag = !selectedTag || pkg.tags.includes(selectedTag);
      if (!matchesCategory || !matchesType || !matchesTag) return false;
      if (!q) return true;
      return pkg.name.toLowerCase().includes(q) ||
             pkg.description.toLowerCase().includes(q) ||
             pkg.tags.some(t => t.toLowerCase().includes(q));
    });
  }, [selectedCategory, selectedType, selectedTag, searchQuery]);

  const togglePackage = (pkgId: string) => {
    const isSelected = recipe.selectedPackages.includes(pkgId);
    let newSelected: string[];
    if (isSelected) {
      newSelected = recipe.selectedPackages.filter(id => id !== pkgId);
    } else {
      newSelected = [...recipe.selectedPackages, pkgId];
    }
    onChange({ selectedPackages: newSelected });
  };

  const selectPack = (pkgIds: string[]) => {
    const combined = Array.from(new Set([...recipe.selectedPackages, ...pkgIds]));
    onChange({ selectedPackages: combined });
  };

  const clearAllPackages = () => {
    onChange({ selectedPackages: [], customPackages: [] });
  };

  const handleAddCustomPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const items = customInput.split(/[\s,]+/).filter(Boolean);
    const updated = Array.from(new Set([...recipe.customPackages, ...items]));
    onChange({ customPackages: updated });
    setCustomInput('');
  };

  const addCustomPkgQuick = (pkgName: string) => {
    if (recipe.customPackages.includes(pkgName)) return;
    onChange({ customPackages: [...recipe.customPackages, pkgName] });
  };

  const removeCustomPackage = (pkgName: string) => {
    onChange({ customPackages: recipe.customPackages.filter(p => p !== pkgName) });
  };

  // Calcul du poids total cumulé des logiciels sélectionnés
  const totalSelectedSizeMB = recipe.selectedPackages.reduce((acc, id) => {
    const p = SOFTWARE_PACKAGES.find(x => x.id === id);
    return acc + (p?.sizeMB || 0);
  }, 0);

  const totalSelectedCount = recipe.selectedPackages.length + recipe.customPackages.length;

  // Nombre de stacks actives
  const activeStacksCount = (recipe.enableLocalAiStack ? 1 : 0) +
    (recipe.enableHomelabStack ? 1 : 0) +
    ((recipe.thirdPartyRepos && recipe.thirdPartyRepos.length > 0) ? 1 : 0) +
    (recipe.enableNetworkSecurityGateway ? 1 : 0);

  // Génération de la liste exportable
  const exportPackageListString = () => {
    const lines: string[] = [];
    lines.push(`# OSForge Studio - Export de la sélection logicielle (${distro.name})`);
    lines.push(`# Gestionnaire de paquets : ${distro.packageManager}`);
    lines.push('');
    lines.push('# --- Paquets du Catalogue ---');
    recipe.selectedPackages.forEach(id => {
      const p = SOFTWARE_PACKAGES.find(x => x.id === id);
      if (p) {
        const pkgForDistro = p.pkgNames[distro.id] || p.id;
        lines.push(`${pkgForDistro} # ${p.name}`);
      }
    });
    if (recipe.customPackages.length > 0) {
      lines.push('');
      lines.push('# --- Paquets Personnalisés ---');
      recipe.customPackages.forEach(p => lines.push(p));
    }
    return lines.join('\n');
  };

  const handleImportText = () => {
    if (!importText.trim()) return;
    const items = importText
      .split(/[\r\n,]+/)
      .map(l => l.replace(/#.*$/, '').trim())
      .filter(l => l.length > 0)
      .flatMap(l => l.split(/\s+/));
    const unique = Array.from(new Set([...recipe.customPackages, ...items]));
    onChange({ customPackages: unique });
    setImportText('');
    setShowImportExport(false);
  };

  const copyExportToClipboard = () => {
    navigator.clipboard.writeText(exportPackageListString());
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="packages" lang={lang} onOpenAllTips={onOpenTips} />

      {/* ========================================================================= */}
      {/* 1. BARRE SUPÉRIEURE DE CONTRÔLE & NAVIGATION MODULAIRE                     */}
      {/* ========================================================================= */}
      <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          
          {/* Segmented Tab Navigation */}
          <div style={{
            display: 'inline-flex',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '4px',
          }}>
            <button
              onClick={() => setActiveTab('catalog')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'catalog' ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.8), rgba(3, 105, 161, 0.9))' : 'transparent',
                color: activeTab === 'catalog' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: activeTab === 'catalog' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none',
              }}
            >
              <Package size={14} />
              <span>{lang === 'fr' ? 'Catalogue Logiciel' : 'Software Catalog'}</span>
              <span style={{
                fontSize: '0.66rem',
                background: activeTab === 'catalog' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                padding: '1px 6px',
                borderRadius: '8px',
                color: activeTab === 'catalog' ? '#fff' : 'var(--text-dim)',
              }}>
                {SOFTWARE_PACKAGES.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('stacks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'stacks' ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.8), rgba(126, 34, 206, 0.9))' : 'transparent',
                color: activeTab === 'stacks' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: activeTab === 'stacks' ? '0 2px 8px rgba(168, 85, 247, 0.3)' : 'none',
              }}
            >
              <Layers size={14} />
              <span>{lang === 'fr' ? 'Stacks & Profils OOB' : 'OOB Stacks & Profiles'}</span>
              {activeStacksCount > 0 && (
                <span style={{
                  fontSize: '0.66rem',
                  background: '#10b981',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '8px',
                  fontWeight: 700,
                }}>
                  {activeStacksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('custom')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '7px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeTab === 'custom' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.9))' : 'transparent',
                color: activeTab === 'custom' ? '#ffffff' : 'var(--text-muted)',
                boxShadow: activeTab === 'custom' ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none',
              }}
            >
              <Plus size={14} />
              <span>{lang === 'fr' ? 'Paquets Perso & Import' : 'Custom & Import'}</span>
              {recipe.customPackages.length > 0 && (
                <span style={{
                  fontSize: '0.66rem',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '1px 6px',
                  borderRadius: '8px',
                  color: '#fff',
                }}>
                  {recipe.customPackages.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Summary Pill & Selection Drawer Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '0.74rem',
              color: 'var(--cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span>{lang === 'fr' ? 'Gestionnaire :' : 'PM:'}</span>
              <strong style={{ textTransform: 'uppercase', color: '#f1f5f9' }}>{distro.packageManager}</strong>
              <InfoTooltip
                text={lang === 'fr'
                  ? `Les paquets sont résolus nativement via ${distro.packageManager.toUpperCase()} selon les dépôts de ${distro.name}.`
                  : `Packages are natively resolved via ${distro.packageManager.toUpperCase()} from ${distro.name} official repositories.`}
              />
            </div>

            {/* Bouton Panier / Ma Sélection */}
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: isDrawerOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: isDrawerOpen ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isDrawerOpen ? '#34d399' : 'var(--text-main)',
              }}
              title={lang === 'fr' ? 'Afficher la liste des logiciels choisis' : 'View selected packages'}
            >
              <CheckCircle2 size={14} color={totalSelectedCount > 0 ? '#10b981' : 'var(--text-muted)'} />
              <span>{lang === 'fr' ? 'Sélection' : 'Selected'}</span>
              <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                {totalSelectedCount}
              </span>
              {totalSelectedSizeMB > 0 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  ({totalSelectedSizeMB >= 1000 ? `${(totalSelectedSizeMB / 1000).toFixed(1)} Go` : `${totalSelectedSizeMB} Mo`})
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tiroir Rétractable de la Sélection Active (Ne pollue plus la page !) */}
        {isDrawerOpen && (
          <div style={{
            background: 'rgba(9, 13, 22, 0.85)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 0.15s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
                <span>📦</span>
                <span>{lang === 'fr' ? 'Logiciels sélectionnés dans cette recette :' : 'Selected packages in this recipe:'}</span>
                <span className="badge badge-cyan">{totalSelectedCount}</span>
              </div>
              {totalSelectedCount > 0 && (
                <button
                  onClick={clearAllPackages}
                  style={{
                    fontSize: '0.7rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={11} />
                  <span>{lang === 'fr' ? 'Tout retirer' : 'Clear All'}</span>
                </button>
              )}
            </div>

            {totalSelectedCount === 0 ? (
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '6px 0' }}>
                {lang === 'fr' ? 'Aucun paquet sélectionné pour l’instant. Cliquez sur les cartes du catalogue pour en ajouter.' : 'No packages selected yet. Click any package card to add.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '140px', overflowY: 'auto', padding: '4px 0' }}>
                {recipe.selectedPackages.map(pkgId => {
                  const pkg = SOFTWARE_PACKAGES.find(p => p.id === pkgId);
                  return (
                    <span
                      key={pkgId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#a7f3d0',
                        padding: '2px 8px',
                        borderRadius: '5px',
                        fontSize: '0.74rem',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{pkg ? pkg.name : pkgId}</span>
                      <span
                        onClick={() => togglePackage(pkgId)}
                        title={lang === 'fr' ? 'Retirer' : 'Remove'}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <X size={12} color="#f87171" />
                      </span>
                    </span>
                  );
                })}
                {recipe.customPackages.map(pkg => (
                  <span
                    key={pkg}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#fcd34d',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span>+{pkg}</span>
                    <span
                      onClick={() => removeCustomPackage(pkg)}
                      title={lang === 'fr' ? 'Retirer' : 'Remove'}
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <X size={12} color="#f87171" />
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VUE 1 : CATALOGUE DES LOGICIELS                                           */}
      {/* ========================================================================= */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Barre de Recherche et Filtres Secondaires */}
          <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Ligne 1 : Barre de Recherche + Sélecteur de Type (GUI/CLI/Services) */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                <input
                  type="text"
                  className="input-text"
                  placeholder={lang === 'fr' ? 'Rechercher un logiciel (Docker, Neovim, Blender, Steam, Rust)...' : 'Search software (Docker, Neovim, Blender, Steam, Rust)...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '36px', fontSize: '0.82rem', height: '36px' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '9px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Type Filter Pills */}
              <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { id: 'all', label: lang === 'fr' ? 'Tous' : 'All', icon: Package },
                  { id: 'gui', label: lang === 'fr' ? 'Bureau (GUI)' : 'GUI Apps', icon: Monitor },
                  { id: 'cli', label: lang === 'fr' ? 'Terminal (CLI)' : 'Terminal (CLI)', icon: Terminal },
                  { id: 'daemon', label: lang === 'fr' ? 'Services' : 'Daemons', icon: Activity },
                ].map(t => {
                  const isTypeActive = selectedType === t.id;
                  const TypeIcon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedType(t.id as any)}
                      style={{
                        fontSize: '0.74rem',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: isTypeActive ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                        border: isTypeActive ? '1px solid #38bdf8' : '1px solid transparent',
                        color: isTypeActive ? '#38bdf8' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontWeight: isTypeActive ? 600 : 400,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <TypeIcon size={12} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ligne 2 : Catégories Horizontales Épurées */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {categories.map(cat => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                const categoryPackages = cat.id === 'all'
                  ? SOFTWARE_PACKAGES
                  : SOFTWARE_PACKAGES.filter(p => p.category === cat.id);
                const selectedCount = categoryPackages.filter(p => recipe.selectedPackages.includes(p.id)).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedTag(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: isSelected ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(2, 132, 199, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: isSelected ? 'var(--cyan)' : 'var(--text-muted)',
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={13} />
                    <span>{cat.name}</span>
                    {selectedCount > 0 && (
                      <span style={{
                        fontSize: '0.64rem',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        background: isSelected ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.12)',
                        color: isSelected ? '#fff' : 'var(--text-main)',
                        fontWeight: 700,
                      }}>
                        {selectedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Ligne 3 : Packs Rapides 1-Clic & Tags Filtrants */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}>
              {/* Packs Rapides */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                  <Zap size={12} color="#c084fc" />
                  {lang === 'fr' ? 'Packs Recommandés :' : 'Curated Packs:'}
                </span>
                <button
                  onClick={() => selectPack(['docker', 'git', 'neovim', 'zsh_starship', 'htop_btop', 'fastfetch', 'cli_modern_tools'])}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px' }}
                >
                  💻 Dev & Sysadmin
                </button>
                <button
                  onClick={() => selectPack(['rust_toolchain', 'golang_toolchain', 'cpp_modern_stack', 'zig_compiler', 'cli_modern_tools'])}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px' }}
                >
                  ⚙️ Compilateurs (C/Go/Rust)
                </button>
                <button
                  onClick={() => selectPack(['ollama_ai', 'python_ai_data', 'cli_modern_tools', 'htop_btop'])}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px' }}
                >
                  🧠 IA & Données
                </button>
                <button
                  onClick={() => selectPack(['steam', 'lutris_heroic', 'retroarch_gaming', 'gamepad_drivers'])}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px' }}
                >
                  🎮 Gaming
                </button>
                <button
                  onClick={() => selectPack(['wireshark', 'nmap', 'metasploit', 'aircrack', 'john_hashcat', 'tor_privoxy', 'keepassxc'])}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px' }}
                >
                  🛡️ CyberSec
                </button>
              </div>

              {/* Tags discrets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px', marginRight: '2px' }}>
                  <Tag size={10} />
                </span>
                {allTags.slice(0, 8).map(t => {
                  const isTagActive = selectedTag === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTag(isTagActive ? null : t)}
                      style={{
                        fontSize: '0.66rem',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background: isTagActive ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: isTagActive ? '1px solid var(--purple)' : '1px solid rgba(255, 255, 255, 0.06)',
                        color: isTagActive ? '#c084fc' : 'var(--text-dim)',
                        cursor: 'pointer',
                      }}
                    >
                      #{t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grille des Applications Épurée & Contrastée */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}>
            {filteredPackages.map(pkg => {
              const isSelected = recipe.selectedPackages.includes(pkg.id);
              const pkgNameForDistro = pkg.pkgNames[distro.id] || pkg.id;

              return (
                <div
                  key={pkg.id}
                  onClick={() => togglePackage(pkg.id)}
                  style={{
                    background: isSelected ? 'rgba(2, 132, 199, 0.09)' : 'rgba(10, 15, 26, 0.7)',
                    border: isSelected ? '1px solid rgba(2, 132, 199, 0.5)' : '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 14px -2px rgba(2, 132, 199, 0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? 'var(--cyan)' : '#ffffff', margin: 0 }}>
                        {pkg.name}
                      </h3>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {pkg.appType && (
                          <span style={{
                            fontSize: '0.58rem',
                            textTransform: 'uppercase',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: 600,
                            background: pkg.appType === 'gui' ? 'rgba(59, 130, 246, 0.15)' : pkg.appType === 'daemon' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: pkg.appType === 'gui' ? '#60a5fa' : pkg.appType === 'daemon' ? '#c084fc' : 'var(--text-dim)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}>
                            {pkg.appType}
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.62rem',
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: 600,
                        }}>
                          +{pkg.sizeMB} Mo
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: '0 0 10px 0' }}>
                      {pkg.description}
                    </p>

                    {/* Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                      {pkg.tags.slice(0, 3).map(t => (
                        <span key={t} style={{
                          fontSize: '0.62rem',
                          background: 'rgba(255, 255, 255, 0.04)',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          color: 'var(--text-dim)',
                        }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Pied de Carte : Nom de Paquet Distro & Bouton Toggle */}
                  <div style={{
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.7rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span className="font-mono" style={{ color: 'var(--text-dim)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pkgNameForDistro}
                    </span>

                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: isSelected ? 'var(--cyan)' : 'var(--text-muted)',
                    }}>
                      {isSelected ? (
                        <>
                          <CheckCircle2 size={14} color="var(--cyan)" />
                          <span>{lang === 'fr' ? 'Installé' : 'Added'}</span>
                        </>
                      ) : (
                        <span>+ {lang === 'fr' ? 'Ajouter' : 'Add'}</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : STACKS & PROFILS SPÉCIALISÉS OOB                                  */}
      {/* ========================================================================= */}
      {activeTab === 'stacks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{
            padding: '12px 16px',
            background: 'rgba(168, 85, 247, 0.08)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            borderRadius: '8px',
            fontSize: '0.78rem',
            color: '#e2e8f0',
          }}>
            <span style={{ fontWeight: 700, color: '#c084fc' }}>
              {lang === 'fr' ? 'Stacks Complètes Prêtes à l’Emploi (Zéro Cosmétique) :' : 'Complete Ready-to-Use Stacks (Zero Cosmetic):'}
            </span>{' '}
            {lang === 'fr'
              ? 'Ces modules injectent des architectures logicielles complètes (démons systemd, conteneurs Docker Compose, clés GPG de dépôts officiels et règles réseau) directement dans le système compilé.'
              : 'These modules inject complete software stacks (systemd daemons, Docker Compose stacks, official GPG keyrings and networking rules) directly into the built OS.'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
            
            {/* 1. Local AI Stack Card */}
            <div style={{
              padding: '16px',
              background: recipe.enableLocalAiStack ? 'rgba(56, 189, 248, 0.1)' : 'rgba(10, 15, 28, 0.6)',
              borderRadius: '10px',
              border: recipe.enableLocalAiStack ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.15s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: recipe.enableLocalAiStack ? '12px' : '0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: recipe.enableLocalAiStack ? '#38bdf8' : '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🤖</span>
                    <span>{lang === 'fr' ? 'Stack IA Locale & Inférence (Ollama)' : 'Local AI & LLM Inference (Ollama)'}</span>
                    <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>OOB</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {lang === 'fr'
                      ? 'Service systemd autonome, pré-téléchargement de modèle et accélération GPU'
                      : 'Standalone systemd daemon, pre-pulled model and auto GPU acceleration'}
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={recipe.enableLocalAiStack ?? false}
                    onChange={(e) => onChange({ enableLocalAiStack: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {recipe.enableLocalAiStack && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      {lang === 'fr' ? 'Modèle LLM pré-embarqué :' : 'Pre-pulled LLM Model:'}
                    </label>
                    <select
                      className="select-custom font-mono"
                      style={{ fontSize: '0.78rem', width: '100%' }}
                      value={recipe.localAiModel || 'qwen2.5:0.5b'}
                      onChange={(e) => onChange({ localAiModel: e.target.value })}
                    >
                      <option value="qwen2.5:0.5b">qwen2.5:0.5b (~390 Mo - CPU/SBC/RAM 2Go+)</option>
                      <option value="tinyllama">tinyllama:latest (~630 Mo - Compact & Réactif)</option>
                      <option value="llama3.2:1b">llama3.2:1b (~1.3 Go - Meta Edge performant)</option>
                      <option value="mistral">mistral:7b (~4.1 Go - Puissance maximale)</option>
                    </select>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={recipe.enableOpenWebUi ?? false}
                        onChange={(e) => onChange({ enableOpenWebUi: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span style={{ fontSize: '0.76rem', color: '#f1f5f9' }}>
                      {lang === 'fr' ? 'Interface Web locale Open-WebUI (Port 3000)' : 'Local Open-WebUI Web Interface (Port 3000)'}
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* 2. Homelab Docker Compose Stacks Card */}
            <div style={{
              padding: '16px',
              background: recipe.enableHomelabStack ? 'rgba(16, 185, 129, 0.1)' : 'rgba(10, 15, 28, 0.6)',
              borderRadius: '10px',
              border: recipe.enableHomelabStack ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.15s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: recipe.enableHomelabStack ? '12px' : '0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: recipe.enableHomelabStack ? '#34d399' : '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🏠</span>
                    <span>{lang === 'fr' ? 'Profil Homelab & Docker Compose' : 'Homelab & Docker Compose Stacks'}</span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.62rem' }}>Docker</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {lang === 'fr'
                      ? 'Génère /opt/homelab/docker-compose.yml et un service systemd automatique'
                      : 'Generates /opt/homelab/docker-compose.yml and systemd daemon'}
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={recipe.enableHomelabStack ?? false}
                    onChange={(e) => onChange({ enableHomelabStack: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {recipe.enableHomelabStack && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {lang === 'fr' ? 'Services conteneurisés actifs :' : 'Active containerized services:'}
                  </span>
                  {[
                    { id: 'adguard', label: 'AdGuard Home (Bloqueur DNS / Port 53 & 3000)' },
                    { id: 'jellyfin', label: 'Jellyfin Media Server (Streaming / Port 8096)' },
                    { id: 'nextcloud', label: 'Nextcloud Hub (Stockage Privé / Port 8080)' },
                    { id: 'nginx_proxy_manager', label: 'Nginx Proxy Manager (Reverse Proxy SSL / Port 81)' },
                  ].map(svc => {
                    const currentServices = recipe.homelabServices || ['adguard', 'jellyfin', 'nginx_proxy_manager'];
                    const isChecked = currentServices.includes(svc.id as any);
                    return (
                      <label key={svc.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.74rem', color: '#e2e8f0' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...currentServices, svc.id as any]
                              : currentServices.filter(s => s !== svc.id);
                            onChange({ homelabServices: next });
                          }}
                        />
                        <span>{svc.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Third-party Official Repos Card */}
            <div style={{
              padding: '16px',
              background: (recipe.thirdPartyRepos && recipe.thirdPartyRepos.length > 0) ? 'rgba(168, 85, 247, 0.1)' : 'rgba(10, 15, 28, 0.6)',
              borderRadius: '10px',
              border: (recipe.thirdPartyRepos && recipe.thirdPartyRepos.length > 0) ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.15s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📦</span>
                    <span>{lang === 'fr' ? 'Dépôts Officiels Tiers & PPA' : 'Third-Party Official Repos & PPAs'}</span>
                    <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>deb822</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {lang === 'fr'
                      ? 'Trousseaux GPG signés dans /etc/apt/keyrings/ et sources modernes (sans apt-key déprécié)'
                      : 'Signed GPG keyrings in /etc/apt/keyrings/ and modern deb822 sources'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '12px' }}>
                {[
                  { id: 'vscodium', label: 'VSCodium (IDE Libre)' },
                  { id: 'docker_ce', label: 'Docker CE (Engine & CLI)' },
                  { id: 'winehq', label: 'WineHQ (Gaming / Multilib i386)' },
                  { id: 'nodesource', label: 'NodeSource (Node.js 22 LTS)' },
                  { id: 'xanmod', label: 'Noyau XanMod (Low-latency)' },
                  { id: 'brave', label: 'Brave Browser (Anti-trackers)' },
                  { id: 'librewolf', label: 'LibreWolf (Hardened Firefox)' },
                ].map(repoItem => {
                  const activeRepos = recipe.thirdPartyRepos || [];
                  const isChecked = activeRepos.includes(repoItem.id as any);
                  return (
                    <label key={repoItem.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.74rem', color: '#e2e8f0' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...activeRepos, repoItem.id as any]
                            : activeRepos.filter(r => r !== repoItem.id);
                          onChange({ thirdPartyRepos: next });
                        }}
                      />
                      <span>{repoItem.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 4. Network Security Gateway Card */}
            <div style={{
              padding: '16px',
              background: recipe.enableNetworkSecurityGateway ? 'rgba(239, 68, 68, 0.1)' : 'rgba(10, 15, 28, 0.6)',
              borderRadius: '10px',
              border: recipe.enableNetworkSecurityGateway ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.15s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: recipe.enableNetworkSecurityGateway ? '10px' : '0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: recipe.enableNetworkSecurityGateway ? '#f87171' : '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🛡️</span>
                    <span>{lang === 'fr' ? 'Passerelle Réseau & Sécurité OOB' : 'Network Security & Gateway OOB'}</span>
                    <span className="badge badge-red" style={{ fontSize: '0.62rem' }}>Passerelle</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {lang === 'fr'
                      ? 'AdGuard Home natif (Port 53/3000), WireGuard, Cockpit (Port 9090) et routage IP'
                      : 'Native AdGuard Home (53/3000), WireGuard Server, Cockpit (9090) and IP forwarding'}
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={recipe.enableNetworkSecurityGateway ?? false}
                    onChange={(e) => onChange({ enableNetworkSecurityGateway: e.target.checked })}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {recipe.enableNetworkSecurityGateway && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.74rem', color: '#e2e8f0' }}>
                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '5px 8px', borderRadius: '5px' }}>✓ AdGuard DNS port 53</div>
                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '5px 8px', borderRadius: '5px' }}>✓ WireGuard port 51820</div>
                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '5px 8px', borderRadius: '5px' }}>✓ Cockpit HTTPS port 9090</div>
                  <div style={{ background: 'rgba(0,0,0,0.35)', padding: '5px 8px', borderRadius: '5px' }}>✓ IPv4/IPv6 Forwarding</div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 3 : PAQUETS PERSONNALISÉS & IMPORT/EXPORT                            */}
      {/* ========================================================================= */}
      {activeTab === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card 1 : Ajout Manuel & Suggestions */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} color="var(--cyan)" />
              <span>{lang === 'fr' ? 'Saisie Manuelle de Paquets' : 'Manual Package Input'}</span>
              <span className="badge badge-cyan" style={{ fontSize: '0.64rem' }}>{distro.packageManager.toUpperCase()}</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {lang === 'fr'
                ? `Entrez n’importe quel nom de paquet présent dans les dépôts officiels de ${distro.name}, séparés par des espaces.`
                : `Enter any package names present in official ${distro.name} repositories, separated by spaces.`}
            </p>

            {/* Suggestions en 1-Clic */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginRight: '4px' }}>
                {lang === 'fr' ? 'Suggestions populaires :' : 'Popular 1-click additions:'}
              </span>
              {popularCustomPackages.map(pkg => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => addCustomPkgQuick(pkg)}
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: recipe.customPackages.includes(pkg) ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: recipe.customPackages.includes(pkg) ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: recipe.customPackages.includes(pkg) ? 'var(--cyan)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  +{pkg}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddCustomPackage} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                className="input-text font-mono"
                placeholder={distro.packageManager === 'apt' ? 'ex: htop curl ncdu tree ripgrep bat' : 'ex: base-devel kitty fish'}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                style={{ fontSize: '0.82rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={15} />
                <span>{lang === 'fr' ? 'Ajouter' : 'Add'}</span>
              </button>
            </form>

            {/* Liste des Paquets Personnalisés Actifs */}
            {recipe.customPackages.length > 0 && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '12px',
              }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {lang === 'fr' ? 'Paquets personnalisés actifs :' : 'Active custom packages:'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {recipe.customPackages.map(pkg => (
                    <span
                      key={pkg}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fcd34d',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontSize: '0.76rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <span>{pkg}</span>
                      <X
                        size={12}
                        style={{ cursor: 'pointer', color: '#f87171' }}
                        onClick={() => removeCustomPackage(pkg)}
                      />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2 : Import / Export de Liste */}
          <div className="glass-panel" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={16} color="var(--purple)" />
                <span>{lang === 'fr' ? 'Export & Import de Listes Logicielles' : 'Package List Export & Import'}</span>
              </h3>
              <button
                onClick={() => setShowImportExport(!showImportExport)}
                className="btn btn-secondary"
                style={{ fontSize: '0.74rem', padding: '4px 10px' }}
              >
                {showImportExport ? (lang === 'fr' ? 'Masquer' : 'Hide') : (lang === 'fr' ? 'Déplier les zones de texte' : 'Expand text areas')}
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
              {lang === 'fr'
                ? 'Exportez votre sélection sous forme de fichier texte réutilisable ou collez une liste existante issue d’une autre machine pour l’importer en masse.'
                : 'Export your selection as a reusable text list or paste a list from another machine to bulk import.'}
            </p>

            {showImportExport && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '14px',
                marginTop: '10px',
              }}>
                {/* Export Section */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--cyan)' }}>
                      {lang === 'fr' ? 'Liste exportable' : 'Exportable List'}
                    </span>
                    <button
                      onClick={copyExportToClipboard}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                    >
                      {copiedExport ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedExport ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Copier' : 'Copy')}</span>
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={exportPackageListString()}
                    className="input-text font-mono"
                    style={{ height: '110px', fontSize: '0.72rem', resize: 'vertical' }}
                  />
                </div>

                {/* Import Section */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#c084fc' }}>
                      {lang === 'fr' ? 'Importer une liste' : 'Import List'}
                    </span>
                    <button
                      onClick={handleImportText}
                      className="btn btn-primary"
                      style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                    >
                      <Plus size={12} />
                      <span>{lang === 'fr' ? 'Importer' : 'Import'}</span>
                    </button>
                  </div>
                  <textarea
                    placeholder={lang === 'fr' ? 'Collez des noms de paquets séparés par des espaces ou des retours à la ligne...' : 'Paste package names separated by spaces or newlines...'}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="input-text font-mono"
                    style={{ height: '110px', fontSize: '0.72rem', resize: 'vertical' }}
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
