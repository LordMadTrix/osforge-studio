import React from 'react';
import { OSRecipe } from '../types/os';
import { DISTROS } from '../data/distros';
import { DESKTOPS } from '../data/desktopEnvironments';
import { calculateEstimatedSizeAndRam } from '../services/buildSimulator';
import { InfoTooltip } from './InfoTooltip';
import { Cpu, Package, Shield, Monitor, Disc, AlertTriangle } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { DISTRO_LOGOS } from '../data/logos';

interface StatsBannerProps {
  recipe: OSRecipe;
  lang: 'fr' | 'en';
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ recipe, lang }) => {
  const distro = DISTROS.find(d => d.id === recipe.distro) || DISTROS[0];
  const desktop = DESKTOPS.find(d => d.id === recipe.desktop) || DESKTOPS[0];
  const metrics = calculateEstimatedSizeAndRam(recipe);
  const totalPackagesCount = recipe.selectedPackages.length + recipe.customPackages.length;
  // 2048 Mo = limite stricte de GitHub pour un fichier de Release (2 147 483 648 octets)
  const isOverGithubReleaseLimit = metrics.isoSizeMB >= 2048;
  const isNearGithubReleaseLimit = !isOverGithubReleaseLimit && metrics.isoSizeMB >= 1800;
  const sizeColor = isOverGithubReleaseLimit ? '#f87171' : isNearGithubReleaseLimit ? '#fbbf24' : 'var(--cyan)';

  return (
    <div style={{
      background: 'rgba(26, 22, 19, 0.45)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '8px 24px',
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
        {/* Left: Distro & Name Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BrandLogo logo={DISTRO_LOGOS[distro.id]} size={16} />
          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f1f5f9' }}>
            {recipe.branding.osName || 'ForgeOS'}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            ({distro.name} • {recipe.arch} • {recipe.outputFormat})
          </span>
        </div>

        {/* Right: Metrics Grid */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Estimated ISO Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Disc size={14} color={sizeColor} />
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {lang === 'fr' ? 'Taille ISO :' : 'Est. ISO:'}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: sizeColor }}>
              {metrics.isoSizeMB >= 1000 ? `${(metrics.isoSizeMB / 1024).toFixed(2)} Go` : `${metrics.isoSizeMB} Mo`}
            </span>
            {(isOverGithubReleaseLimit || isNearGithubReleaseLimit) && (
              <AlertTriangle size={12} color={sizeColor} />
            )}
            <InfoTooltip
              text={
                isOverGithubReleaseLimit
                  ? (lang === 'fr'
                    ? 'Dépasse la limite de 2 Go des Releases GitHub : la Release automatique sera sautée, récupérez l’ISO via l’Artefact du run (14 jours). Réduisez les paquets ou le bureau pour repasser sous 2 Go.'
                    : 'Exceeds GitHub Releases’ 2 GB limit: the automatic Release will be skipped — grab the ISO from the run’s Artifact (14 days) instead. Remove packages or pick a lighter desktop to get back under 2 GB.')
                  : isNearGithubReleaseLimit
                    ? (lang === 'fr'
                      ? 'Approche la limite de 2 Go des Releases GitHub (build cloud). Surveillez la taille si vous ajoutez d’autres paquets.'
                      : 'Approaching GitHub Releases’ 2 GB limit (cloud build). Watch the size if you add more packages.')
                    : (lang === 'fr'
                      ? 'Taille calculée après compression SquashFS XZ incluant les paquets et le bureau.'
                      : 'Calculated size after SquashFS XZ compression including desktop & packages.')
              }
            />
          </div>

          {/* Estimated RAM */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Cpu size={14} color="var(--emerald)" />
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {lang === 'fr' ? 'RAM repos :' : 'Idle RAM:'}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--emerald)' }}>
              ~{metrics.ramMB} Mo
            </span>
            <InfoTooltip
              text={lang === 'fr'
                ? 'Consommation mémoire estimée au repos avec ce bureau graphique et les services actifs.'
                : 'Estimated idle RAM consumption with this desktop environment and background services.'}
            />
          </div>

          {/* Desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Monitor size={14} color="var(--violet)" />
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Bureau :
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-main)' }}>
              {desktop.name.split(' (')[0]}
            </span>
          </div>

          {/* Packages Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Package size={14} color="#f59e0b" />
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {lang === 'fr' ? 'Logiciels :' : 'Packages:'}
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b' }}>
              {totalPackagesCount}
            </span>
          </div>

          {/* Hardening Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Shield size={14} color={recipe.security.cisBenchmarkLevel > 0 ? 'var(--emerald)' : 'var(--text-dim)'} />
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              CIS :
            </span>
            <span style={{
              fontSize: '0.76rem',
              fontWeight: 600,
              color: recipe.security.cisBenchmarkLevel > 0 ? '#a3bc7d' : 'var(--text-muted)',
            }}>
              {recipe.security.cisBenchmarkLevel > 0 ? `Level ${recipe.security.cisBenchmarkLevel}` : 'Standard'}
            </span>
            <InfoTooltip
              text={lang === 'fr'
                ? 'Niveau de durcissement de sécurité selon les standards internationaux CIS Benchmark.'
                : 'Security hardening compliance profile according to CIS Benchmark standards.'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
