// Remplace l'ancien catalogue UPSTREAM_FEED (services/versionChecker.ts, supprimé) qui affichait
// des numéros de version et des dates ("Août 2026", "Resolute Raccoon"…) 100% inventés en dur.
// Ici, chaque entrée est récupérée en direct depuis une vraie API publique, vérifiée en live via
// curl avant intégration (headers CORS confirmés) — exactement le même standard que
// KernelUpdateChecker.tsx. Quand aucune source publique fiable et accessible en CORS n'existe
// (ex. GNOME/XFCE hébergés sur des GitLab auto-hébergés sans en-tête Access-Control-Allow-Origin,
// vérifié en direct), l'entrée le dit explicitement au lieu de fabriquer une valeur.

export interface LiveVersionItem {
  id: string;
  name: string;
  category: 'distro' | 'desktop';
  latest: string | null;
  codename?: string;
  releaseDate: string | null;
  channel: 'stable' | 'beta' | 'rolling' | 'lts';
  sourceUrl: string;
  isLive: boolean;
  note?: string;
}

interface EndOfLifeCycle {
  cycle: string;
  codename?: string;
  latest?: string;
  releaseDate?: string;
  latestReleaseDate?: string;
  lts?: boolean;
}

async function fetchEndOfLife(slug: string): Promise<EndOfLifeCycle[] | null> {
  try {
    const res = await fetch(`https://endoflife.date/api/${slug}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function pickLatestStable(cycles: EndOfLifeCycle[]): EndOfLifeCycle | undefined {
  // endoflife.date liste du plus récent au plus ancien ; on prend le premier non-EOL,
  // à défaut le tout premier de la liste.
  return cycles[0];
}

async function endOfLifeDistro(
  id: string,
  name: string,
  slug: string,
  channel: 'stable' | 'lts' = 'stable'
): Promise<LiveVersionItem> {
  const cycles = await fetchEndOfLife(slug);
  const sourceUrl = `https://endoflife.date/${slug}`;
  if (!cycles || cycles.length === 0) {
    return {
      id, name, category: 'distro', latest: null, releaseDate: null,
      channel, sourceUrl, isLive: false,
      note: 'Source en direct temporairement indisponible (endoflife.date).',
    };
  }
  const top = pickLatestStable(cycles);
  return {
    id, name, category: 'distro',
    latest: top?.latest || top?.cycle || null,
    codename: top?.codename,
    releaseDate: top?.latestReleaseDate || top?.releaseDate || null,
    channel: top?.lts ? 'lts' : channel,
    sourceUrl, isLive: true,
  };
}

async function endOfLifeDesktop(id: string, name: string, slug: string): Promise<LiveVersionItem> {
  const cycles = await fetchEndOfLife(slug);
  const sourceUrl = `https://endoflife.date/${slug}`;
  if (!cycles || cycles.length === 0) {
    return {
      id, name, category: 'desktop', latest: null, releaseDate: null,
      channel: 'stable', sourceUrl, isLive: false,
      note: 'Source en direct temporairement indisponible (endoflife.date).',
    };
  }
  const top = pickLatestStable(cycles);
  return {
    id, name, category: 'desktop',
    latest: top?.latest || top?.cycle || null,
    releaseDate: top?.latestReleaseDate || top?.releaseDate || null,
    channel: 'stable', sourceUrl, isLive: true,
  };
}

interface GitHubTag {
  name: string;
}

// Extrait le segment numérique en tête d'un tag ("6.7.5-unstable" -> [6,7,5]) pour comparer les
// versions sans dépendre de l'ordre de renvoi de l'API tags (vérifié en direct : GitHub ne trie
// PAS /tags par version ni par date — swaywm/sway renvoyait "v1.5-rc2" (2019) avant "1.12" (2026),
// et i3/i3 renvoyait un tag de branche "tree-pr4" sans rapport avec une version réelle).
// Recherche N'IMPORTE OÙ dans la chaîne (pas seulement en tête) : certains projets préfixent
// leurs tags par le nom du composant, ex. xfce-mirror/xfce4-session utilise
// "xfce4-session-4.20.4" — un ancrage en tête aurait matché le "4" isolé de "xfce4" au lieu de
// "4.20.4". Exige au moins un point pour éviter justement de matcher ce genre de "4" isolé.
function extractVersion(tag: string): string | null {
  return tag.match(/\d+\.\d+(\.\d+)*/)?.[0] ?? null;
}

function versionKey(tag: string): number[] {
  const digits = extractVersion(tag) ?? '0';
  return digits.split('.').map(Number);
}

function compareVersions(a: string, b: string): number {
  const ka = versionKey(a);
  const kb = versionKey(b);
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const diff = (ka[i] || 0) - (kb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// api.github.com envoie "Access-Control-Allow-Origin: *" (vérifié en live cette session pour
// KernelUpdateChecker) — contrairement à kernel.org ou aux instances GitLab auto-hébergées de
// GNOME/XFCE (testées en direct, aucun en-tête CORS), donc utilisable directement depuis le
// navigateur pour tout projet réellement hébergé sur GitHub.
async function githubLatestTag(
  id: string,
  name: string,
  category: 'distro' | 'desktop',
  repo: string,
  channel: 'stable' | 'beta' = 'stable'
): Promise<LiveVersionItem> {
  const sourceUrl = `https://github.com/${repo}/releases`;
  try {
    // 1) La "vraie" dernière release, marquée comme telle par les mainteneurs eux-mêmes —
    // fiable quand le projet en publie (confirmé : hyprwm/Hyprland, swaywm/sway, lxqt/lxqt,
    // pop-os/cosmic-epoch en ont toutes une).
    const relRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    if (relRes.status === 403) throw new Error('rate-limit');
    if (relRes.ok) {
      const rel = await relRes.json();
      if (rel?.tag_name) {
        return {
          id, name, category, latest: String(rel.tag_name).replace(/^v/i, ''),
          releaseDate: rel.published_at ? String(rel.published_at).slice(0, 10) : null,
          channel, sourceUrl, isLive: true,
        };
      }
    }
    // 2) Repli : certains projets (i3/i3, linuxmint/cinnamon) ne publient aucune "Release"
    // GitHub, seulement des tags — on filtre alors aux tags qui ressemblent à un vrai numéro
    // de version et on prend le plus élevé numériquement (jamais tags[0] brut, non fiable).
    const tagRes = await fetch(`https://api.github.com/repos/${repo}/tags?per_page=100`);
    if (!tagRes.ok) throw new Error(`HTTP ${tagRes.status}`);
    const tags: GitHubTag[] = await tagRes.json();
    const versioned = tags.filter(t => extractVersion(t.name) !== null);
    if (!versioned.length) throw new Error('Aucun tag versionné');
    versioned.sort((a, b) => compareVersions(b.name, a.name));
    return {
      id, name, category, latest: extractVersion(versioned[0].name) ?? versioned[0].name,
      releaseDate: null, channel, sourceUrl: `https://github.com/${repo}/tags`, isLive: true,
    };
  } catch (err) {
    return {
      id, name, category, latest: null, releaseDate: null,
      channel, sourceUrl, isLive: false,
      note: err instanceof Error && err.message === 'rate-limit'
        ? 'Limite de requêtes GitHub atteinte pour votre connexion (60/heure sans authentification) : réessayez plus tard.'
        : 'Source en direct temporairement indisponible (api.github.com).',
    };
  }
}

function honestGap(
  id: string,
  name: string,
  category: 'distro' | 'desktop',
  channel: 'stable' | 'rolling',
  note: string,
  sourceUrl: string
): LiveVersionItem {
  return { id, name, category, latest: null, releaseDate: null, channel, sourceUrl, isLive: false, note };
}

export async function fetchLiveDistroVersions(): Promise<LiveVersionItem[]> {
  const results = await Promise.all([
    endOfLifeDistro('debian', 'Debian GNU/Linux', 'debian'),
    endOfLifeDistro('ubuntu', 'Ubuntu', 'ubuntu'),
    endOfLifeDistro('linuxmint', 'Linux Mint', 'linuxmint'),
    endOfLifeDistro('fedora', 'Fedora Linux', 'fedora'),
    endOfLifeDistro('alpine', 'Alpine Linux', 'alpine-linux'),
    endOfLifeDistro('opensuse', 'openSUSE Leap', 'opensuse'),
    endOfLifeDistro('rocky', 'Rocky Linux', 'rocky-linux'),
    endOfLifeDistro('almalinux', 'AlmaLinux OS', 'almalinux'),
    endOfLifeDistro('popos', 'Pop!_OS', 'pop-os'),
    endOfLifeDistro('nixos', 'NixOS', 'nixos'),
    Promise.resolve(honestGap('arch', 'Arch Linux', 'distro', 'rolling',
      'Rolling release officielle : pas de numéro de version à suivre, le dépôt est toujours à jour par nature.',
      'https://archlinux.org/download/')),
    Promise.resolve(honestGap('endeavouros', 'EndeavourOS', 'distro', 'rolling',
      'Rolling release basée sur Arch : pas de cycle figé, dépôts Arch toujours à jour.',
      'https://endeavouros.com/')),
    Promise.resolve(honestGap('cachyos', 'CachyOS', 'distro', 'rolling',
      'Rolling release basée sur Arch : aucune API publique de suivi de version trouvée (vérifié).',
      'https://cachyos.org/download/')),
    Promise.resolve(honestGap('void', 'Void Linux', 'distro', 'rolling',
      'Rolling release officielle : aucune API publique de suivi de version trouvée (vérifié).',
      'https://voidlinux.org/download/')),
    Promise.resolve(honestGap('kali', 'Kali Linux', 'distro', 'rolling',
      'Rolling release officielle : aucune API publique de suivi de version trouvée (vérifié).',
      'https://www.kali.org/get-kali/')),
    Promise.resolve(honestGap('parrot', 'Parrot Security OS', 'distro', 'rolling',
      'Rolling release basée sur Debian : cycle de mise à jour continu.',
      'https://www.parrotsec.org/')),
    Promise.resolve(honestGap('raspbian', 'Raspberry Pi OS', 'distro', 'stable',
      'Basée sur Debian : suit la version stable de Debian ci-dessus, pas de cycle de version propre.',
      'https://www.raspberrypi.com/software/')),
    githubLatestTag('dietpi', 'DietPi OS', 'distro', 'MichaIng/DietPi'),
    githubLatestTag('retropie', 'RetroPie', 'distro', 'RetroPie/RetroPie-Setup'),
    githubLatestTag('armbian', 'Armbian Linux', 'distro', 'armbian/build'),
    githubLatestTag('raspap', 'RaspAP', 'distro', 'RaspAP/raspap-webgui'),
  ]);
  return results;
}

export async function fetchLiveDesktopVersions(): Promise<LiveVersionItem[]> {
  const results = await Promise.all([
    endOfLifeDesktop('kde', 'KDE Plasma', 'kde-plasma'),
    githubLatestTag('hyprland', 'Hyprland', 'desktop', 'hyprwm/Hyprland'),
    githubLatestTag('sway', 'Sway', 'desktop', 'swaywm/sway'),
    githubLatestTag('i3wm', 'i3 Window Manager', 'desktop', 'i3/i3'),
    githubLatestTag('lxqt', 'LXQt', 'desktop', 'lxqt/lxqt'),
    githubLatestTag('cinnamon', 'Cinnamon', 'desktop', 'linuxmint/cinnamon'),
    githubLatestTag('cosmic', 'System76 COSMIC', 'desktop', 'pop-os/cosmic-epoch', 'beta'),
    githubLatestTag('bspwm', 'BSPWM', 'desktop', 'baskerville/bspwm'),
    githubLatestTag('wayfire', 'Wayfire 3D', 'desktop', 'WayfireWM/wayfire'),
    githubLatestTag('qtile', 'Qtile', 'desktop', 'qtile/qtile'),
    githubLatestTag('pantheon', 'Pantheon', 'desktop', 'elementary/gala'),
    // GNOME et Xfce sont développés sur gitlab.gnome.org / gitlab.xfce.org (auto-hébergés, sans
    // en-tête CORS — vérifié en direct, injoignables depuis un navigateur), mais tous deux
    // publient un vrai mirroir en lecture seule sur GitHub (confirmé en direct : github.com/GNOME
    // et github.com/xfce-mirror existent et sont à jour), utilisable via la même API GitHub.
    githubLatestTag('gnome', 'GNOME', 'desktop', 'GNOME/gnome-shell'),
    githubLatestTag('xfce', 'Xfce', 'desktop', 'xfce-mirror/xfce4-session'),
    githubLatestTag('niri', 'Niri', 'desktop', 'YaLTeR/niri'),
    githubLatestTag('mate', 'MATE', 'desktop', 'mate-desktop/mate-desktop'),
    githubLatestTag('budgie', 'Budgie', 'desktop', 'BuddiesOfBudgie/budgie-desktop'),
    githubLatestTag('openbox', 'Openbox', 'desktop', 'danakj/openbox'),
    githubLatestTag('deepin', 'Deepin Desktop', 'desktop', 'linuxdeepin/dde-shell'),
    Promise.resolve(honestGap('lxde', 'LXDE', 'desktop', 'rolling',
      'Projet éclaté en une dizaine de sous-dépôts séparés (lxpanel, pcmanfm, lxde-common...), sans release unifiée à suivre.',
      'https://www.lxde.org/')),
  ]);
  return results;
}
