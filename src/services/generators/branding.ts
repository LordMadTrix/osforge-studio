import { OSRecipe } from '../../types/os';
import { shQuote, shDoubleQuoteEscape } from './helpers';

/**
 * Normalise un nom d'OS en identifiant slug sécurisé (sans espaces ni caractères spéciaux)
 */
export function sanitizeOsSlug(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return slug || 'custom-linux';
}

/**
 * Valide et normalise une couleur hexadécimale (#RRGGBB)
 */
export function sanitizeHexColor(color: string, fallback = '#0ea5e9'): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

/**
 * Convertit une couleur Hex en composantes RGB (0-255)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = sanitizeHexColor(hex).replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Mappe une couleur Hex vers l'accent color prédéfini de GNOME/GTK4
 */
export function hexToGnomeAccent(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  if (r > 180 && g < 80 && b < 80) return 'red';
  if (r > 180 && g >= 80 && g < 150 && b < 80) return 'orange';
  if (r > 180 && g >= 150 && b < 80) return 'yellow';
  if (r < 80 && g > 160 && b < 100) return 'green';
  if (r < 80 && g > 160 && b > 160) return 'teal';
  if (r < 100 && g < 140 && b > 180) return 'blue';
  if (r > 140 && g < 100 && b > 180) return 'purple';
  if (r > 180 && g < 120 && b >= 120) return 'pink';
  return 'blue';
}

/**
 * Génère le contenu SVG d'un fond d'écran 1920x1080 haute résolution selon le preset
 */
export function generateWallpaperSvg(recipe: OSRecipe): string {
  const osName = recipe.branding.osName || 'Linux';
  const edition = recipe.branding.editionName || 'Edition';
  const accent = sanitizeHexColor(recipe.branding.accentColor, '#0ea5e9');
  const preset = recipe.branding.wallpaperPreset || 'minimal';

  switch (preset) {
    case 'cyberpunk':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#090514"/>
      <stop offset="60%" stop-color="#1b0833"/>
      <stop offset="100%" stop-color="#3b0f5b"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff007f"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
    <linearGradient id="grid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#090514" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#sky)"/>
  <!-- Synthwave Sun -->
  <circle cx="960" cy="580" r="280" fill="url(#sun)"/>
  <!-- Sun slices -->
  <rect x="660" y="520" width="600" height="8" fill="#1b0833"/>
  <rect x="660" y="550" width="600" height="14" fill="#1b0833"/>
  <rect x="660" y="590" width="600" height="22" fill="#1b0833"/>
  <rect x="660" y="640" width="600" height="34" fill="#1b0833"/>
  <!-- Horizon Line -->
  <line x1="0" y1="680" x2="1920" y2="680" stroke="${accent}" stroke-width="4"/>
  <!-- Perspective Grid Floor -->
  <g stroke="url(#grid)" stroke-width="1.5">
    <line x1="960" y1="680" x2="0" y2="1080"/>
    <line x1="960" y1="680" x2="200" y2="1080"/>
    <line x1="960" y1="680" x2="440" y2="1080"/>
    <line x1="960" y1="680" x2="700" y2="1080"/>
    <line x1="960" y1="680" x2="960" y2="1080"/>
    <line x1="960" y1="680" x2="1220" y2="1080"/>
    <line x1="960" y1="680" x2="1480" y2="1080"/>
    <line x1="960" y1="680" x2="1720" y2="1080"/>
    <line x1="960" y1="680" x2="1920" y2="1080"/>
    <line x1="0" y1="710" x2="1920" y2="710"/>
    <line x1="0" y1="755" x2="1920" y2="755"/>
    <line x1="0" y1="820" x2="1920" y2="820"/>
    <line x1="0" y1="910" x2="1920" y2="910"/>
    <line x1="0" y1="1025" x2="1920" y2="1025"/>
  </g>
  <!-- OS Watermark -->
  <text x="1840" y="1020" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28" fill="${accent}" text-anchor="end" opacity="0.85">${osName.toUpperCase()} // ${edition.toUpperCase()}</text>
</svg>`;

    case 'matrix':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#020803"/>
      <stop offset="100%" stop-color="#061a09"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <!-- Digital Rain Columns -->
  <g font-family="monospace" font-size="18" fill="#22c55e" opacity="0.35">
    <text x="120" y="140">0 1 0 1 1 0 0 1 0 1 1 0 1</text>
    <text x="120" y="240">K E R N E L _ O N L I N E</text>
    <text x="320" y="320">0 1 1 0 1 0 0 1 1 1 0 0 1</text>
    <text x="540" y="180">S Y S T E M _ B O O T _ O K</text>
    <text x="760" y="420">1 0 0 1 0 1 1 0 1 0 0 1 0</text>
    <text x="980" y="280">B F S _ R O O T F S _ M O U N T</text>
    <text x="1200" y="500">1 1 0 0 1 0 1 0 1 1 0 0 1</text>
    <text x="1420" y="220">S E C U R E _ C H R O O T</text>
    <text x="1640" y="380">0 1 0 1 1 0 1 0 0 1 1 0 1</text>
    <text x="1780" y="190">1 0 1 0 1 1 0 1 0 0 1 0 1</text>
  </g>
  <!-- Glowing Matrix Hexagon Core -->
  <polygon points="960,400 1090,475 1090,625 960,700 830,625 830,475" fill="none" stroke="${accent}" stroke-width="4" opacity="0.8"/>
  <polygon points="960,430 1060,490 1060,610 960,670 860,610 860,490" fill="${accent}" fill-opacity="0.08" stroke="${accent}" stroke-width="1.5" opacity="0.5"/>
  <text x="960" y="560" font-family="monospace" font-weight="900" font-size="36" fill="#ffffff" text-anchor="middle">${osName.toUpperCase()}</text>
  <text x="960" y="600" font-family="monospace" font-size="16" fill="${accent}" text-anchor="middle" letter-spacing="4">[ ${edition.toUpperCase()} ]</text>
</svg>`;

    case 'gaming_rog':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="mesh" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0b0f"/>
      <stop offset="50%" stop-color="#14141d"/>
      <stop offset="100%" stop-color="#07070a"/>
    </linearGradient>
    <linearGradient id="slash" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${accent}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ff003c" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#mesh)"/>
  <!-- High Tech Gamer Slashes -->
  <polygon points="1200,0 1450,0 1020,1080 770,1080" fill="url(#slash)"/>
  <polygon points="1470,0 1520,0 1090,1080 1040,1080" fill="${accent}" opacity="0.3"/>
  <!-- Carbon Fiber Accent Nodes -->
  <circle cx="1140" cy="540" r="180" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="8 6" opacity="0.6"/>
  <circle cx="1140" cy="540" r="220" fill="none" stroke="#ff003c" stroke-width="1" stroke-dasharray="14 10" opacity="0.4"/>
  <!-- Gamer Branding -->
  <text x="320" y="520" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="64" fill="#ffffff" letter-spacing="2">${osName.toUpperCase()}</text>
  <text x="325" y="575" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="22" fill="${accent}" letter-spacing="6">${edition.toUpperCase()} // GAMING EDITION</text>
  <line x1="325" y1="605" x2="720" y2="605" stroke="${accent}" stroke-width="3"/>
</svg>`;

    case 'deep_space':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="nebula" cx="60%" cy="45%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#4f46e5" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#030712" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="#030712"/>
  <rect width="1920" height="1080" fill="url(#nebula)"/>
  <!-- Starfield -->
  <g fill="#ffffff">
    <circle cx="210" cy="180" r="1.5" opacity="0.7"/>
    <circle cx="450" cy="320" r="2" opacity="0.9"/>
    <circle cx="820" cy="140" r="1.2" opacity="0.6"/>
    <circle cx="1100" cy="280" r="2.5" opacity="0.8"/>
    <circle cx="1340" cy="190" r="1.8" opacity="0.7"/>
    <circle cx="1600" cy="340" r="1.4" opacity="0.6"/>
    <circle cx="1780" cy="120" r="2.2" opacity="0.85"/>
    <circle cx="340" cy="780" r="1.6" opacity="0.6"/>
    <circle cx="680" cy="890" r="2.3" opacity="0.9"/>
    <circle cx="1250" cy="820" r="1.5" opacity="0.5"/>
    <circle cx="1520" cy="740" r="2.1" opacity="0.75"/>
    <circle cx="1720" cy="880" r="1.7" opacity="0.7"/>
  </g>
  <!-- Minimalist Orbit Ring -->
  <ellipse cx="960" cy="540" rx="420" ry="160" fill="none" stroke="${accent}" stroke-width="1.8" stroke-dasharray="6 4" opacity="0.7" transform="rotate(-15 960 540)"/>
  <text x="960" y="535" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="44" fill="#ffffff" text-anchor="middle" letter-spacing="4">${osName.toUpperCase()}</text>
  <text x="960" y="575" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" fill="${accent}" text-anchor="middle" letter-spacing="8">${edition.toUpperCase()}</text>
</svg>`;

    case 'minimal':
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="${accent}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <!-- Minimalist Geometry -->
  <polygon points="960,380 1100,460 1100,620 960,700 820,620 820,460" fill="none" stroke="${accent}" stroke-width="2.5" opacity="0.75"/>
  <circle cx="960" cy="540" r="45" fill="${accent}" fill-opacity="0.1" stroke="${accent}" stroke-width="1.5"/>
  <line x1="640" y1="760" x2="1280" y2="760" stroke="url(#accentLine)" stroke-width="2"/>
  <text x="960" y="810" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="32" fill="#ffffff" text-anchor="middle" letter-spacing="3">${osName}</text>
  <text x="960" y="845" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="15" fill="${accent}" text-anchor="middle" letter-spacing="5">${edition.toUpperCase()}</text>
</svg>`;
  }
}

/**
 * Génère le logo vectoriel officiel au format SVG placé dans /usr/share/pixmaps/
 */
export function generateLogoSvg(recipe: OSRecipe): string {
  const osName = recipe.branding.osName || 'Linux';
  const accent = sanitizeHexColor(recipe.branding.accentColor, '#0ea5e9');
  const initial = (osName.charAt(0) || 'L').toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="56" fill="url(#grad)"/>
  <rect x="12" y="12" width="232" height="232" rx="44" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.2"/>
  <text x="128" y="168" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="120" fill="#ffffff" text-anchor="middle">${initial}</text>
</svg>`;
}

/**
 * Génère les instructions d'écriture de /etc/os-release et /etc/issue
 */
export function generateOsReleaseCmd(recipe: OSRecipe, baseId = 'debian'): string {
  if (recipe.branding.enableCustomOsRelease === false) {
    return '# [Branding] Custom os-release desactive';
  }

  const safeId = recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'osforge';
  const prettyName = `${recipe.branding.osName} ${recipe.branding.editionName}`.trim();
  const slug = sanitizeOsSlug(recipe.branding.osName);
  const version = recipe.branding.version || '1.0';
  const logoSvg = generateLogoSvg(recipe);

  return `# ==============================================================================
# Identité de l'OS (/etc/os-release & /etc/issue)
# ==============================================================================
echo -e "\${BLUE}[BRANDING] Configuration de l'identite officielle (/etc/os-release)...\${NC}"

cat > /etc/os-release << 'OSREL_EOF'
PRETTY_NAME="${shDoubleQuoteEscape(prettyName)}"
NAME="${shDoubleQuoteEscape(recipe.branding.osName)}"
VERSION="${shDoubleQuoteEscape(recipe.branding.version)} (${shDoubleQuoteEscape(recipe.branding.editionName)})"
VERSION_ID="${shDoubleQuoteEscape(recipe.branding.version)}"
ID=${safeId}
ID_LIKE=${baseId}
BUILD_ID=osforge-studio
HOME_URL="https://github.com/LordMadTrix/osforge-studio"
LOGO=${slug}
OSREL_EOF

cp -f /etc/os-release /usr/lib/os-release 2>/dev/null || true

cat << 'ISSUE_EOF' > /etc/issue
\\033[1;36m${shDoubleQuoteEscape(recipe.branding.osName)}\\033[0m \\033[1;33m${shDoubleQuoteEscape(recipe.branding.editionName)}\\033[0m (v${version}) [\\\\n \\\\l]

ISSUE_EOF
cp -f /etc/issue /etc/issue.net 2>/dev/null || true

# Installation de l'icone officielle du systeme
mkdir -p /usr/share/pixmaps
cat << 'LOGOSVG_EOF' > /usr/share/pixmaps/${slug}.svg
${logoSvg}
LOGOSVG_EOF
`;
}

/**
 * Génère la configuration du fond d'écran pour KDE, GNOME, XFCE, SDDM et LightDM
 */
export function generateWallpaperSetupCmd(recipe: OSRecipe): string {
  const slug = sanitizeOsSlug(recipe.branding.osName);
  const wallpaperSvg = generateWallpaperSvg(recipe);
  const customUrl = recipe.branding.customWallpaperUrl?.trim();

  let fetchOrWriteScript = '';
  if (customUrl && customUrl.startsWith('http')) {
    fetchOrWriteScript = `
echo -e "\${BLUE}[BRANDING] Telechargement du fond d'ecran personnalise depuis l'URL...\${NC}"
curl -fsSL --retry 3 -o "/usr/share/backgrounds/${slug}-wallpaper.png" ${shQuote(customUrl)} || {
    echo -e "\${YELLOW}[AVERTISSEMENT] Echec de telechargement du fond d'ecran personnalise, bascule sur le SVG genere.\${NC}"
    cat << 'WALLPAPERSVG_EOF' > "/usr/share/backgrounds/${slug}-wallpaper.svg"
${wallpaperSvg}
WALLPAPERSVG_EOF
}
`;
  } else {
    fetchOrWriteScript = `
cat << 'WALLPAPERSVG_EOF' > "/usr/share/backgrounds/${slug}-wallpaper.svg"
${wallpaperSvg}
WALLPAPERSVG_EOF
`;
  }

  return `# ==============================================================================
# Fond d'écran officiel & Intégration Environnements de Bureau
# ==============================================================================
echo -e "\${BLUE}[BRANDING] Deploiement du fond d'ecran (${recipe.branding.wallpaperPreset || 'minimal'})...\${NC}"
mkdir -p /usr/share/backgrounds
mkdir -p "/usr/share/wallpapers/${slug}/contents/images"

${fetchOrWriteScript}

# Si le SVG existe, creer le lien dans le dossier des wallpapers KDE
if [ -f "/usr/share/backgrounds/${slug}-wallpaper.svg" ]; then
    cp -f "/usr/share/backgrounds/${slug}-wallpaper.svg" "/usr/share/wallpapers/${slug}/contents/images/1920x1080.svg" 2>/dev/null || true
    WALLPAPER_TARGET="/usr/share/backgrounds/${slug}-wallpaper.svg"
else
    cp -f "/usr/share/backgrounds/${slug}-wallpaper.png" "/usr/share/wallpapers/${slug}/contents/images/1920x1080.png" 2>/dev/null || true
    WALLPAPER_TARGET="/usr/share/backgrounds/${slug}-wallpaper.png"
fi

# Métadonnées pour sélecteur KDE Plasma
cat << 'METADATA_EOF' > "/usr/share/wallpapers/${slug}/metadata.json"
{
    "KPlugin": {
        "Id": "${slug}",
        "Name": "${recipe.branding.osName}",
        "Authors": [{"Name": "OSForge Studio"}]
    }
}
METADATA_EOF

# 1. Intégration GNOME / Cinnamon (via DConf local)
mkdir -p /etc/dconf/db/local.d
cat << DCONF_BG_EOF > /etc/dconf/db/local.d/01-background
[org/gnome/desktop/background]
picture-uri='file://\${WALLPAPER_TARGET}'
picture-uri-dark='file://\${WALLPAPER_TARGET}'
picture-options='zoom'
primary-color='#000000'
secondary-color='#000000'
DCONF_BG_EOF
if command -v dconf &>/dev/null; then
    dconf update 2>/dev/null || true
fi

# 2. Intégration XFCE
mkdir -p /etc/xdg/xfce4/xfconf/xfce-perchannel-xml
cat << XFCE_BG_EOF > /etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml
<?xml version="1.0" encoding="UTF-8"?>
<channel name="xfce4-desktop" version="1.0">
  <property name="backdrop" type="empty">
    <property name="screen0" type="empty">
      <property name="monitor0" type="empty">
        <property name="workspace0" type="empty">
          <property name="image-path" type="string" value="\${WALLPAPER_TARGET}"/>
          <property name="image-style" type="int" value="5"/>
        </property>
      </property>
    </property>
  </property>
</channel>
XFCE_BG_EOF

# 3. Intégration SDDM (KDE Login Greeter)
mkdir -p /usr/share/sddm/themes/breeze/components/artwork
if [ -d /usr/share/sddm/themes/breeze ]; then
    cp -f "\${WALLPAPER_TARGET}" /usr/share/sddm/themes/breeze/components/artwork/background.svg 2>/dev/null || true
fi

# 4. Intégration LightDM Greeter
if [ -f /etc/lightdm/lightdm-gtk-greeter.conf ]; then
    sed -i "s|^#\\?background=.*|background = \${WALLPAPER_TARGET}|" /etc/lightdm/lightdm-gtk-greeter.conf 2>/dev/null || true
fi
`;
}

/**
 * Configure la couleur d'accentuation et le thème sombre global (KDE, GTK 3 & 4)
 */
export function generateGlobalThemeCmd(recipe: OSRecipe): string {
  const accent = sanitizeHexColor(recipe.branding.accentColor, '#0ea5e9');
  const rgb = hexToRgb(accent);
  const gnomeAccent = hexToGnomeAccent(accent);

  return `# ==============================================================================
# Thème Sombre & Couleur d'Accentuation (${accent})
# ==============================================================================
echo -e "\${BLUE}[BRANDING] Application de la couleur d'accentuation (${accent}) et du Dark Theme...\${NC}"

# 1. Configuration globale KDE Plasma (kdeglobals)
mkdir -p /etc/xdg
cat << KDEGLOBALS_EOF >> /etc/xdg/kdeglobals
[General]
AccentColor=${rgb.r},${rgb.g},${rgb.b}
ColorScheme=BreezeDark

[KDE]
colorScheme=BreezeDark
lookAndFeelPackage=org.kde.breezedark.desktop
KDEGLOBALS_EOF

# Copie dans le squelette utilisateur /etc/skel
mkdir -p /etc/skel/.config
cp -f /etc/xdg/kdeglobals /etc/skel/.config/kdeglobals 2>/dev/null || true

# 2. Configuration GTK 3 & GTK 4 (Thème sombre + Papirus Dark si installé)
mkdir -p /etc/gtk-3.0 /etc/gtk-4.0
cat << GTK_SETTINGS_EOF > /etc/gtk-3.0/settings.ini
[Settings]
gtk-theme-name = Adwaita-dark
gtk-application-prefer-dark-theme = 1
gtk-icon-theme-name = Papirus-Dark
gtk-cursor-theme-name = Breeze_Snow
GTK_SETTINGS_EOF

cp -f /etc/gtk-3.0/settings.ini /etc/gtk-4.0/settings.ini 2>/dev/null || true

mkdir -p /etc/skel/.config/gtk-3.0 /etc/skel/.config/gtk-4.0
cp -f /etc/gtk-3.0/settings.ini /etc/skel/.config/gtk-3.0/settings.ini 2>/dev/null || true
cp -f /etc/gtk-3.0/settings.ini /etc/skel/.config/gtk-4.0/settings.ini 2>/dev/null || true

# 3. DConf Interface Sombre & Accent Color (GNOME / Libadwaita)
cat << DCONF_THEME_EOF > /etc/dconf/db/local.d/02-theme
[org/gnome/desktop/interface]
color-scheme='prefer-dark'
gtk-theme='Adwaita-dark'
icon-theme='Papirus-Dark'
accent-color='${gnomeAccent}'
DCONF_THEME_EOF
if command -v dconf &>/dev/null; then
    dconf update 2>/dev/null || true
fi
`;
}

/**
 * Configure la bannière terminal et fastfetch aux couleurs de l'OS
 */
export function generateFastfetchMotdCmd(recipe: OSRecipe): string {
  if (recipe.branding.enableFastfetchMotd === false) {
    return '# [Branding] Fastfetch / MOTD désactivé';
  }

  const osName = recipe.branding.osName || 'Linux';
  const edition = recipe.branding.editionName || 'Edition';
  const version = recipe.branding.version || '1.0';
  const accent = sanitizeHexColor(recipe.branding.accentColor, '#0ea5e9');

  return `# ==============================================================================
# Bannière Terminal & Fastfetch aux Couleurs de l'OS
# ==============================================================================
echo -e "\${BLUE}[BRANDING] Configuration de Fastfetch et de la banniere terminal...\${NC}"

# 1. Bannière d'accueil MOTD (affichée sur TTY et connexions SSH)
cat << 'MOTD_EOF' > /etc/motd
\\033[1;36m╔═══════════════════════════════════════════════════════════════════════════╗\\033[0m
\\033[1;36m║\\033[0m  \\033[1;37m${osName}\\033[0m — \\033[1;33m${edition}\\033[0m (v${version})                                     \\033[1;36m║\\033[0m
\\033[1;36m║\\033[0m  Système optimisé généré avec \\033[1;35mOSForge Studio\\033[0m                             \\033[1;36m║\\033[0m
\\033[1;36m╚═══════════════════════════════════════════════════════════════════════════╝\\033[0m
MOTD_EOF

# 2. Configuration personnalisée de Fastfetch
mkdir -p /etc/fastfetch
cat << 'FASTFETCH_CONF_EOF' > /etc/fastfetch/config.jsonc
{
  "$schema": "https://github.com/fastfetch-cli/fastfetch/raw/dev/doc/json_schema.json",
  "logo": {
    "type": "small",
    "color": { "1": "${accent}" }
  },
  "display": {
    "separator": " ➜ ",
    "color": {
      "keys": "${accent}",
      "title": "${accent}"
    }
  },
  "modules": [
    "title",
    "separator",
    "os",
    "host",
    "kernel",
    "uptime",
    "packages",
    "shell",
    "display",
    "de",
    "wm",
    "terminal",
    "cpu",
    "gpu",
    "memory",
    "break",
    "colors"
  ]
}
FASTFETCH_CONF_EOF

# 3. Script d'accueil interactif dans /etc/profile.d/ (lance fastfetch sur shell interactif)
cat << 'PROFILE_FASTFETCH_EOF' > /etc/profile.d/00-fastfetch-welcome.sh
#!/bin/sh
if [ -n "$PS1" ] && [ -t 1 ] && command -v fastfetch >/dev/null 2>&1; then
    fastfetch
fi
PROFILE_FASTFETCH_EOF
chmod +x /etc/profile.d/00-fastfetch-welcome.sh
`;
}

/**
 * Configure Plymouth (Boot Splash animé)
 */
export function generatePlymouthCmd(recipe: OSRecipe): string {
  const theme = recipe.branding.bootSplashTheme || 'spinner';
  let plymouthTheme = 'spinner';
  if (theme === 'bgrt') plymouthTheme = 'bgrt';
  else if (theme === 'fade-in') plymouthTheme = 'fade-in';
  else if (theme === 'minimal') plymouthTheme = 'spinner';
  else if (theme === 'cyberpunk' || theme === 'matrix') plymouthTheme = 'glow';

  return `# ==============================================================================
# Configuration Plymouth (Boot Splash : ${plymouthTheme})
# ==============================================================================
if command -v plymouth-set-default-theme &>/dev/null; then
    echo -e "\${BLUE}[BRANDING] Activation du theme Plymouth : ${plymouthTheme}...\${NC}"
    plymouth-set-default-theme -R "${plymouthTheme}" 2>/dev/null || plymouth-set-default-theme -R "spinner" 2>/dev/null || true
fi
`;
}

/**
 * Génère le thème de démarrage graphique GRUB 2 (theme.txt)
 */
export function generateGrubThemeCmd(recipe: OSRecipe): string {
  if (recipe.branding.enableGrubTheme === false) {
    return '# [Branding] Thème GRUB graphique non requis';
  }

  const slug = sanitizeOsSlug(recipe.branding.osName);
  const osName = recipe.branding.osName || 'Linux';
  const edition = recipe.branding.editionName || 'Edition';
  const accent = sanitizeHexColor(recipe.branding.accentColor, '#0ea5e9');

  return `# ==============================================================================
# Thème Graphique GRUB 2 HD (${osName})
# ==============================================================================
echo -e "\${BLUE}[BRANDING] Installation du theme graphique GRUB 2...\${NC}"
mkdir -p "/boot/grub/themes/${slug}"

cat << 'GRUBTHEME_EOF' > "/boot/grub/themes/${slug}/theme.txt"
# OSForge Studio - GRUB 2 Theme
title-text: "${osName} (${edition})"
title-font: "DejaVu Sans Bold 18"
title-color: "${accent}"
desktop-color: "#0a0c14"
message-font: "DejaVu Sans Regular 14"
message-color: "#94a3b8"
terminal-font: "Fixed 14"

+ boot_menu {
    left = 20%
    top = 30%
    width = 60%
    height = 50%
    item_font = "DejaVu Sans Regular 16"
    item_color = "#94a3b8"
    selected_item_color = "#ffffff"
    selected_item_pixmap_style = "select_*.png"
    item_height = 40
    item_padding = 10
    item_spacing = 15
}

+ progress_bar {
    id = "__timeout__"
    left = 20%
    top = 85%
    width = 60%
    height = 12
    show_text = true
    font = "DejaVu Sans Regular 12"
    text_color = "${accent}"
    fg_color = "${accent}"
    bg_color = "#1e293b"
}
GRUBTHEME_EOF

# Activation du theme dans /etc/default/grub si present
if [ -f /etc/default/grub ]; then
    sed -i '/^GRUB_THEME=/d' /etc/default/grub
    echo 'GRUB_THEME="/boot/grub/themes/${slug}/theme.txt"' >> /etc/default/grub
    if command -v update-grub &>/dev/null; then
        update-grub 2>/dev/null || true
    fi
fi
`;
}

/**
 * Point d'entrée consolidé qui regroupe toute la personnalisation système
 */
export function generateBrandingChrootCommands(recipe: OSRecipe, baseId = 'debian'): string {
  return `# ==============================================================================
# 🎨 PERSONNALISATION INTEGRALE DE L'OS (BRANDING & DESIGN SYSTEM)
# ==============================================================================
${generateOsReleaseCmd(recipe, baseId)}

${generateWallpaperSetupCmd(recipe)}

${generateGlobalThemeCmd(recipe)}

${generateFastfetchMotdCmd(recipe)}

${generatePlymouthCmd(recipe)}

${generateGrubThemeCmd(recipe)}
`;
}
