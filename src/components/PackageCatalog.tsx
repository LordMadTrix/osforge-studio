import React, { useState } from 'react';
import { OSRecipe, PackageCategory } from '../types/os';
import { SOFTWARE_PACKAGES } from '../data/packages';
import { DISTROS } from '../data/distros';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { 
  Search, Package, Plus, Trash2, CheckCircle2, Shield, Gamepad2, Code, Server, 
  Video, FileText, Cpu, Sparkles, Radio, Zap, RotateCcw, CheckCheck, Tag
} from 'lucide-react';

interface PackageCatalogProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

export const PackageCatalog: React.FC<PackageCatalogProps> = ({ recipe, onChange, lang, onOpenTips }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState<string>('');

  const distro = DISTROS.find(d => d.id === recipe.distro) || DISTROS[0];

  const categories: { id: string; name: string; icon: any; categoryKey?: PackageCategory }[] = [
    { id: 'all', name: lang === 'fr' ? 'Tous les Logiciels' : 'All Packages', icon: Package },
    { id: 'ai', name: lang === 'fr' ? 'Intelligence Artificielle' : 'Artificial Intelligence', icon: Sparkles, categoryKey: 'ai' },
    { id: 'development', name: lang === 'fr' ? 'Développement & DevOps' : 'Development & DevOps', icon: Code, categoryKey: 'development' },
    { id: 'audio', name: lang === 'fr' ? 'Studio Audio & MAO' : 'Audio & Music Studio', icon: Radio, categoryKey: 'audio' },
    { id: 'security', name: lang === 'fr' ? 'Cybersécurité' : 'Cybersecurity', icon: Shield, categoryKey: 'security' },
    { id: 'gaming', name: lang === 'fr' ? 'Gaming' : 'Gaming', icon: Gamepad2, categoryKey: 'gaming' },
    { id: 'homelab', name: lang === 'fr' ? 'Homelab & Cloud' : 'Homelab & Cloud', icon: Server, categoryKey: 'homelab' },
    { id: 'multimedia', name: lang === 'fr' ? 'Multimédia' : 'Multimedia', icon: Video, categoryKey: 'multimedia' },
    { id: 'productivity', name: lang === 'fr' ? 'Bureautique & Mail' : 'Productivity & Office', icon: FileText, categoryKey: 'productivity' },
    { id: 'system', name: lang === 'fr' ? 'Utilitaires & CLI Rust' : 'System Tools & Rust CLI', icon: Cpu, categoryKey: 'system' },
  ];

  // Extraction de tous les tags uniques pour filtrage rapide
  const allTags = Array.from(new Set(SOFTWARE_PACKAGES.flatMap(p => p.tags))).slice(0, 14);

  // Suggestions de paquets personnalisés populaires
  const popularCustomPackages = ['jq', 'tree', 'ncdu', 'micro', 'fish', 'zellij', 'tmux', 'lazygit', 'eza', 'bat', 'strace', 'gdb'];

  const filteredPackages = SOFTWARE_PACKAGES.filter(pkg => {
    const matchesCategory = selectedCategory === 'all' || pkg.category === selectedCategory;
    const matchesTag = !selectedTag || pkg.tags.includes(selectedTag);
    const matchesQuery = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesTag && matchesQuery;
  });

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="packages" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 1. Header with Search, Pack Actions & Quick Filters */}
      <div className="glass-panel" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              className="input-text"
              placeholder={lang === 'fr' ? 'Rechercher un logiciel (Docker, Ollama, Ardour, Wireshark, Rust)...' : 'Search software (Docker, Ollama, Ardour, Wireshark, Rust)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', fontSize: '0.84rem' }}
            />
          </div>

          {/* Distro package manager indicator */}
          <div style={{
            background: 'rgba(249, 115, 22, 0.08)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            color: 'var(--cyan)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>{lang === 'fr' ? 'Gestionnaire :' : 'Package Manager:'}</span>
            <strong style={{ textTransform: 'uppercase', color: 'var(--text-main)' }}>{distro.packageManager}</strong>
            <InfoTooltip
              text={lang === 'fr'
                ? `Les paquets sont traduits et installés nativement via ${distro.packageManager.toUpperCase()} selon les dépôts officiels de ${distro.name}.`
                : `Packages are natively mapped and installed via ${distro.packageManager.toUpperCase()} from official ${distro.name} repositories.`}
            />
          </div>

          {/* Size impact pill */}
          {recipe.selectedPackages.length > 0 && (
            <div style={{
              background: 'rgba(132, 160, 92, 0.1)',
              border: '1px solid rgba(132, 160, 92, 0.25)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              color: '#a3bc7d',
              fontWeight: 600,
            }}>
              ~{totalSelectedSizeMB >= 1000 ? `${(totalSelectedSizeMB / 1000).toFixed(1)} Go` : `${totalSelectedSizeMB} Mo`}
            </div>
          )}
        </div>

        {/* Quick Pack Curated Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
            <Zap size={13} color="var(--purple)" />
            {lang === 'fr' ? 'Packs Rapides :' : 'Quick Packs:'}
          </span>
          <button
            onClick={() => selectPack(['docker', 'git', 'neovim', 'zsh_starship', 'htop_btop', 'fastfetch', 'cli_modern_tools'])}
            className="btn btn-secondary"
            style={{ fontSize: '0.72rem', padding: '4px 9px', borderRadius: '5px' }}
          >
            💻 {lang === 'fr' ? 'Pack Dev & Sysadmin' : 'Dev & Sysadmin Pack'}
          </button>
          <button
            onClick={() => selectPack(['ollama_ai', 'python_ai_data', 'cli_modern_tools', 'htop_btop'])}
            className="btn btn-secondary"
            style={{ fontSize: '0.72rem', padding: '4px 9px', borderRadius: '5px' }}
          >
            🧠 {lang === 'fr' ? 'Pack IA & LLM' : 'AI & LLM Pack'}
          </button>
          <button
            onClick={() => selectPack(['ardour_daw', 'audacity', 'vlc_media', 'mpv_player'])}
            className="btn btn-secondary"
            style={{ fontSize: '0.72rem', padding: '4px 9px', borderRadius: '5px' }}
          >
            🎛️ {lang === 'fr' ? 'Pack Studio MAO' : 'Audio Studio Pack'}
          </button>
          <button
            onClick={() => selectPack(['wireshark', 'nmap', 'metasploit', 'aircrack', 'john_hashcat', 'tor_privoxy', 'keepassxc'])}
            className="btn btn-secondary"
            style={{ fontSize: '0.72rem', padding: '4px 9px', borderRadius: '5px' }}
          >
            🛡️ {lang === 'fr' ? 'Pack CyberSec & RedTeam' : 'CyberSec Pack'}
          </button>
          {(recipe.selectedPackages.length > 0 || recipe.customPackages.length > 0) && (
            <button
              onClick={clearAllPackages}
              style={{
                fontSize: '0.72rem',
                padding: '4px 9px',
                borderRadius: '5px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCcw size={11} />
              {lang === 'fr' ? 'Tout désélectionner' : 'Clear All'}
            </button>
          )}
        </div>

        {/* Category Pills with Count Badges */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', marginBottom: '8px' }}>
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
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(249, 115, 22, 0.14)' : 'rgba(26, 22, 19, 0.6)',
                  color: isSelected ? 'var(--cyan)' : 'var(--text-muted)',
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={13} />
                <span>{cat.name}</span>
                {selectedCount > 0 && (
                  <span style={{
                    fontSize: '0.66rem',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: isSelected ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.1)',
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

        {/* Interactive Tag Filter Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingTop: '4px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '2px' }}>
            <Tag size={11} /> {lang === 'fr' ? 'Filtres :' : 'Tags:'}
          </span>
          {allTags.map(t => {
            const isTagActive = selectedTag === t;
            return (
              <button
                key={t}
                onClick={() => setSelectedTag(isTagActive ? null : t)}
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: isTagActive ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: isTagActive ? '1px solid var(--purple)' : '1px solid var(--border-subtle)',
                  color: isTagActive ? '#c084fc' : 'var(--text-dim)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                #{t}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Packages Summary — voir et retirer d'un clic tout ce qui est déjà sélectionné */}
      {(recipe.selectedPackages.length > 0 || recipe.customPackages.length > 0) && (
        <div className="glass-panel" style={{ padding: '14px 16px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={15} color="var(--emerald)" />
            {lang === 'fr' ? 'Logiciels déjà sélectionnés' : 'Already Selected Software'}
            <span className="badge badge-emerald" style={{ fontSize: '0.64rem' }}>
              {recipe.selectedPackages.length + recipe.customPackages.length}
            </span>
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {recipe.selectedPackages.map(pkgId => {
              const pkg = SOFTWARE_PACKAGES.find(p => p.id === pkgId);
              return (
                <span
                  key={pkgId}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(132, 160, 92, 0.1)',
                    border: '1px solid rgba(132, 160, 92, 0.25)',
                    color: '#a3bc7d',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontSize: '0.78rem',
                  }}
                >
                  {pkg?.name || pkgId}
                  <Trash2
                    size={12}
                    style={{ cursor: 'pointer', color: '#f87171' }}
                    onClick={() => togglePackage(pkgId)}
                  />
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
                  background: 'rgba(249, 115, 22, 0.1)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                  color: '#fb923c',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {pkg}
                <Trash2
                  size={12}
                  style={{ cursor: 'pointer', color: '#f87171' }}
                  onClick={() => removeCustomPackage(pkg)}
                />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Package Selection Grid */}
      <div className="cards-grid">
        {filteredPackages.map(pkg => {
          const isSelected = recipe.selectedPackages.includes(pkg.id);
          const pkgNameForDistro = pkg.pkgNames[distro.id] || pkg.id;

          return (
            <div
              key={pkg.id}
              onClick={() => togglePackage(pkg.id)}
              className={`select-card ${isSelected ? 'selected' : ''}`}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? 'var(--cyan)' : 'var(--text-main)' }}>
                    {pkg.name}
                  </h3>
                  <span className="badge badge-emerald" style={{ fontSize: '0.64rem' }}>
                    +{pkg.sizeMB} Mo
                  </span>
                </div>

                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.35', marginBottom: '8px' }}>
                  {pkg.description}
                </p>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '8px' }}>
                  {pkg.tags.map(t => (
                    <span key={t} style={{
                      fontSize: '0.64rem',
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

              <div style={{
                paddingTop: '6px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.7rem',
                color: 'var(--text-dim)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span className="font-mono" style={{ color: 'var(--text-muted)', maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pkgNameForDistro}
                </span>
                {isSelected ? (
                  <CheckCircle2 size={15} color="var(--cyan)" />
                ) : (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>+</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Custom Packages Manual Input with Popular Suggestions */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} color="var(--cyan)" />
          {lang === 'fr' ? 'Ajouter des Paquets Personnalisés' : 'Add Custom Packages'}
          <InfoTooltip
            text={lang === 'fr'
              ? `Entrez n’importe quel paquet disponible dans les dépôts officiels de ${distro.name}.`
              : `Enter any package name available in official ${distro.name} repositories.`}
          />
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
          {lang === 'fr'
            ? `Tapez des noms de paquets natifs compatibles avec ${distro.packageManager.toUpperCase()} séparés par des espaces.`
            : `Type package names compatible with ${distro.packageManager.toUpperCase()} separated by spaces.`}
        </p>

        {/* Popular 1-Click Suggestions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {lang === 'fr' ? 'Suggestions en 1 clic :' : '1-Click Suggestions:'}
          </span>
          {popularCustomPackages.map(pkg => (
            <button
              key={pkg}
              type="button"
              onClick={() => addCustomPkgQuick(pkg)}
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                padding: '2px 7px',
                borderRadius: '4px',
                background: recipe.customPackages.includes(pkg) ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: recipe.customPackages.includes(pkg) ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                color: recipe.customPackages.includes(pkg) ? 'var(--cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              +{pkg}
            </button>
          ))}
        </div>

        <form onSubmit={handleAddCustomPackage} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            className="input-text font-mono"
            placeholder={distro.packageManager === 'apt' ? 'ex: htop curl ncdu tree ripgrep' : 'ex: base-devel kitty fish'}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary" style={{ padding: '0 16px' }}>
            <Plus size={14} />
            {lang === 'fr' ? 'Ajouter' : 'Add'}
          </button>
        </form>

        {/* Custom Packages List */}
        {recipe.customPackages.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {recipe.customPackages.map(pkg => (
              <span
                key={pkg}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(249, 115, 22, 0.1)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                  color: '#fb923c',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {pkg}
                <Trash2
                  size={12}
                  style={{ cursor: 'pointer', color: '#f87171' }}
                  onClick={() => removeCustomPackage(pkg)}
                />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
