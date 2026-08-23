import React, { useState } from 'react';
import { OSRecipe } from '../types/os';
import { SOFTWARE_PACKAGES } from '../data/packages';
import { DISTROS } from '../data/distros';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { Search, Package, Plus, Trash2, CheckCircle2, Shield, Gamepad2, Code, Server, Video, FileText, Cpu } from 'lucide-react';

interface PackageCatalogProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

export const PackageCatalog: React.FC<PackageCatalogProps> = ({ recipe, onChange, lang, onOpenTips }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');

  const distro = DISTROS.find(d => d.id === recipe.distro) || DISTROS[0];

  const categories: { id: string; name: string; icon: any }[] = [
    { id: 'all', name: lang === 'fr' ? 'Tous les Logiciels' : 'All Packages', icon: Package },
    { id: 'development', name: lang === 'fr' ? 'Développement' : 'Development', icon: Code },
    { id: 'security', name: lang === 'fr' ? 'Cybersécurité' : 'Cybersecurity', icon: Shield },
    { id: 'gaming', name: lang === 'fr' ? 'Gaming' : 'Gaming', icon: Gamepad2 },
    { id: 'homelab', name: lang === 'fr' ? 'Homelab & Cloud' : 'Homelab & Cloud', icon: Server },
    { id: 'multimedia', name: lang === 'fr' ? 'Multimédia' : 'Multimedia', icon: Video },
    { id: 'productivity', name: lang === 'fr' ? 'Bureautique' : 'Productivity', icon: FileText },
    { id: 'system', name: lang === 'fr' ? 'Utilitaires' : 'System Tools', icon: Cpu },
  ];

  const filteredPackages = SOFTWARE_PACKAGES.filter(pkg => {
    const matchesCategory = selectedCategory === 'all' || pkg.category === selectedCategory;
    const matchesQuery = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
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

  const handleAddCustomPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    const items = customInput.split(/[\s,]+/).filter(Boolean);
    const updated = Array.from(new Set([...recipe.customPackages, ...items]));
    onChange({ customPackages: updated });
    setCustomInput('');
  };

  const removeCustomPackage = (pkgName: string) => {
    onChange({ customPackages: recipe.customPackages.filter(p => p !== pkgName) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="packages" lang={lang} onOpenAllTips={onOpenTips} />

      {/* Search and Category Filters Header */}
      <div className="glass-panel" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
            <input
              type="text"
              className="input-text"
              placeholder={lang === 'fr' ? 'Rechercher un logiciel (Docker, Neovim, Wireshark)...' : 'Search software (Docker, Neovim, Wireshark)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', fontSize: '0.84rem' }}
            />
          </div>

          {/* Distro package manager indicator */}
          <div style={{
            background: 'rgba(14, 165, 233, 0.08)',
            border: '1px solid rgba(14, 165, 233, 0.2)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.78rem',
            color: 'var(--cyan)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span>Gestionnaire :</span>
            <strong style={{ textTransform: 'uppercase', color: '#f8fafc' }}>{distro.packageManager}</strong>
            <InfoTooltip
              text={lang === 'fr'
                ? `Les paquets seront traduits et installés nativement via ${distro.packageManager.toUpperCase()}.`
                : `Packages are natively mapped and installed via ${distro.packageManager.toUpperCase()}.`}
            />
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(14, 165, 233, 0.12)' : 'rgba(15, 23, 42, 0.6)',
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
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Packages Summary — voir et retirer d'un clic tout ce qui est déjà sélectionné */}
      {(recipe.selectedPackages.length > 0 || recipe.customPackages.length > 0) && (
        <div className="glass-panel" style={{ padding: '14px 16px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    color: '#34d399',
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
                  background: 'rgba(14, 165, 233, 0.1)',
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                  color: '#38bdf8',
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

      {/* Package Selection Grid */}
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
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? 'var(--cyan)' : '#f8fafc' }}>
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
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{pkgNameForDistro}</span>
                {isSelected && <CheckCircle2 size={15} color="var(--cyan)" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Packages Manual Input */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} color="var(--cyan)" />
          {lang === 'fr' ? 'Ajouter des Paquets Personnalisés' : 'Add Custom Packages'}
          <InfoTooltip
            text={lang === 'fr'
              ? `Entrez n’importe quel paquet disponible dans les dépôts ${distro.name}.`
              : `Enter any package name available in official ${distro.name} repositories.`}
          />
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          {lang === 'fr'
            ? `Tapez des noms de paquets natifs compatibles avec ${distro.packageManager.toUpperCase()} séparés par des espaces.`
            : `Type package names compatible with ${distro.packageManager.toUpperCase()} separated by spaces.`}
        </p>

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
                  background: 'rgba(14, 165, 233, 0.1)',
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                  color: '#38bdf8',
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
