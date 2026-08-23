import { OSRecipe } from '../types/os';

export interface UpstreamComponent {
  id: string;
  name: string;
  category: 'kernel' | 'distro' | 'desktop' | 'toolchain' | 'security';
  currentInApp: string;
  latestUpstream: string;
  releaseDate: string;
  channel: 'stable' | 'beta' | 'lts' | 'testing' | 'rolling';
  changelogSummary: string;
  status: 'up_to_date' | 'update_available' | 'beta_available';
}

export const UPSTREAM_FEED: UpstreamComponent[] = [
  // Kernels
  {
    id: 'kernel-mainline',
    name: 'Linux Kernel Mainline',
    category: 'kernel',
    currentInApp: 'v7.1.9',
    latestUpstream: 'v7.2 Mainline (kernel.org)',
    releaseDate: 'Août 2026',
    channel: 'beta',
    changelogSummary: 'Support natif RDNA4, Intel Xe2, WiFi 7 & EEVDF scheduler v3.2.',
    status: 'beta_available',
  },
  {
    id: 'kernel-stable',
    name: 'Linux Kernel Stable (kernel.org)',
    category: 'kernel',
    currentInApp: 'v7.1.0',
    latestUpstream: 'v7.1.9 Stable',
    releaseDate: 'Août 2026',
    channel: 'stable',
    changelogSummary: 'Branche stable officielle la plus récente de kernel.org avec tous les correctifs de sécurité.',
    status: 'update_available',
  },
  {
    id: 'kernel-lts',
    name: 'Linux Kernel 6.12 LTS',
    category: 'kernel',
    currentInApp: 'v6.12.10',
    latestUpstream: 'v6.12.14 LTS (Support 2024-2029)',
    releaseDate: 'Août 2026',
    channel: 'lts',
    changelogSummary: 'Branche LTS officielle supportée à long terme.',
    status: 'update_available',
  },
  {
    id: 'kernel-cachyos',
    name: 'Linux Kernel CachyOS BORE',
    category: 'kernel',
    currentInApp: 'v7.1.0',
    latestUpstream: 'v7.1.9-cachyos (BORE v5.4)',
    releaseDate: 'Août 2026',
    channel: 'stable',
    changelogSummary: 'Ordonnanceur BORE optimisé pour Ryzen 9000 & Intel Core Ultra 200.',
    status: 'update_available',
  },

  // Distributions
  {
    id: 'distro-debian',
    name: 'Debian GNU/Linux',
    category: 'distro',
    currentInApp: '12 (Bookworm)',
    latestUpstream: '13 (Trixie Stable) & 14 (Forky Testing)',
    releaseDate: 'Août 2026',
    channel: 'stable',
    changelogSummary: 'Debian 13 est la version Stable officielle, Debian 14 Forky est la branche Testing.',
    status: 'update_available',
  },
  {
    id: 'distro-ubuntu',
    name: 'Ubuntu Linux',
    category: 'distro',
    currentInApp: '24.04 LTS',
    latestUpstream: '26.04 LTS ("Resolute Raccoon")',
    releaseDate: 'Août 2026',
    channel: 'stable',
    changelogSummary: 'Nouvelle LTS majeure avec support étendu et GNOME 48.',
    status: 'update_available',
  },
  {
    id: 'distro-fedora',
    name: 'Fedora Linux',
    category: 'distro',
    currentInApp: '42',
    latestUpstream: 'Fedora 44 (Stable) / 45 (Rawhide)',
    releaseDate: 'Août 2026',
    channel: 'stable',
    changelogSummary: 'Fedora 44 est la version stable active avec DNF5 C++ et Wayland complet.',
    status: 'update_available',
  },
  {
    id: 'distro-alpine',
    name: 'Alpine Linux',
    category: 'distro',
    currentInApp: '3.21',
    latestUpstream: '3.24.1 (Stable) / Edge',
    releaseDate: 'Août 2026',
    channel: 'stable',
    changelogSummary: 'Musl 1.2.5, OpenSSL 3.4 et ISO réduite à 48 Mo.',
    status: 'update_available',
  },
  {
    id: 'distro-cachyos',
    name: 'CachyOS Rolling Release',
    category: 'distro',
    currentInApp: '2026.01',
    latestUpstream: 'Snapshot 260809 (Août 2026)',
    releaseDate: 'Août 2026',
    channel: 'rolling',
    changelogSummary: 'Dernière image ISO Rolling avec paquets x86-64-v4 et archinstall v3.',
    status: 'update_available',
  },

  // Desktop Environments
  {
    id: 'desktop-hyprland',
    name: 'Hyprland Wayland Compositor',
    category: 'desktop',
    currentInApp: 'v0.46.0',
    latestUpstream: 'v0.47.2 (Aquamarine Backend)',
    releaseDate: 'Août 2026',
    channel: 'stable',
    changelogSummary: 'Backend de rendu Aquamarine, élimination du tearing et shaders personnalisés.',
    status: 'update_available',
  },
  {
    id: 'desktop-cosmic',
    name: 'System76 COSMIC Desktop',
    category: 'desktop',
    currentInApp: 'Alpha 5',
    latestUpstream: 'Beta 1 (Rust 1.85)',
    releaseDate: 'Août 2026',
    channel: 'beta',
    changelogSummary: 'Version Beta publique stabilisée avec applets Wayland modulaires et tiling.',
    status: 'beta_available',
  },
  {
    id: 'desktop-kde',
    name: 'KDE Plasma',
    category: 'desktop',
    currentInApp: '6.2.4',
    latestUpstream: 'Plasma 6.3.1 (Qt 6.8)',
    releaseDate: 'Août 2026',
    channel: 'stable',
    changelogSummary: 'Gestionnaire de fenêtres KWin optimisé et support complet du VRR.',
    status: 'update_available',
  },
];

export function checkRecipeUpdates(recipe: OSRecipe) {
  const updatesAvailable: UpstreamComponent[] = [];

  const distroUpdate = UPSTREAM_FEED.find(u => u.category === 'distro' && u.id.includes(recipe.distro));
  if (distroUpdate) updatesAvailable.push(distroUpdate);

  const kernelUpdate = UPSTREAM_FEED.find(u => u.category === 'kernel' && (u.id.includes(recipe.kernel) || recipe.kernel === 'generic'));
  if (kernelUpdate) updatesAvailable.push(kernelUpdate);

  const desktopUpdate = UPSTREAM_FEED.find(u => u.category === 'desktop' && u.id.includes(recipe.desktop));
  if (desktopUpdate) updatesAvailable.push(desktopUpdate);

  return {
    totalUpdates: updatesAvailable.length,
    updates: updatesAvailable,
    allFeed: UPSTREAM_FEED,
  };
}
