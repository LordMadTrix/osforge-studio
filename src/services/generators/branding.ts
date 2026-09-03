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

    case 'nordic_frost':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="frostBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="iceAurora" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#88c0d0" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="${accent}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#81a1c1" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#frostBg)"/>
  <!-- Geometric Ice Peak -->
  <polygon points="960,260 1260,780 660,780" fill="none" stroke="${accent}" stroke-width="2.5" opacity="0.8"/>
  <polygon points="960,340 1180,780 740,780" fill="url(#iceAurora)" opacity="0.3"/>
  <polygon points="960,420 1100,780 820,780" fill="none" stroke="#88c0d0" stroke-width="1.5" opacity="0.5"/>
  <line x1="400" y1="840" x2="1520" y2="840" stroke="url(#iceAurora)" stroke-width="2"/>
  <text x="960" y="890" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="4">${osName}</text>
  <text x="960" y="925" font-family="system-ui, -apple-system, sans-serif" font-weight="500" font-size="16" fill="#88c0d0" text-anchor="middle" letter-spacing="6">NORDIC FROST // ${edition.toUpperCase()}</text>
</svg>`;

    case 'sunset_synthwave':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="sunsetSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#180b2c"/>
      <stop offset="45%" stop-color="#3b0764"/>
      <stop offset="100%" stop-color="#701a75"/>
    </linearGradient>
    <linearGradient id="retroSun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="60%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#sunsetSky)"/>
  <circle cx="960" cy="560" r="260" fill="url(#retroSun)"/>
  <rect x="680" y="510" width="560" height="9" fill="#3b0764"/>
  <rect x="680" y="540" width="560" height="15" fill="#3b0764"/>
  <rect x="680" y="580" width="560" height="22" fill="#3b0764"/>
  <rect x="680" y="630" width="560" height="32" fill="#3b0764"/>
  <line x1="0" y1="680" x2="1920" y2="680" stroke="#f43f5e" stroke-width="3"/>
  <text x="960" y="760" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="38" fill="#ffffff" text-anchor="middle" letter-spacing="6">${osName.toUpperCase()}</text>
  <text x="960" y="800" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" fill="#fbbf24" text-anchor="middle" letter-spacing="5">SYNTHWAVE // ${edition.toUpperCase()}</text>
</svg>`;

    case 'emerald_forest':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="emeraldBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#022c22"/>
      <stop offset="50%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#021f18"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#emeraldBg)"/>
  <polygon points="960,320 1140,420 1140,640 960,740 780,640 780,420" fill="none" stroke="#10b981" stroke-width="3" opacity="0.8"/>
  <circle cx="960" cy="530" r="60" fill="#10b981" fill-opacity="0.15" stroke="#34d399" stroke-width="2"/>
  <line x1="500" y1="800" x2="1420" y2="800" stroke="#10b981" stroke-width="2" opacity="0.6"/>
  <text x="960" y="850" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="4">${osName}</text>
  <text x="960" y="885" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="15" fill="#34d399" text-anchor="middle" letter-spacing="6">EMERALD BIO-CORE // ${edition.toUpperCase()}</text>
</svg>`;

    case 'tokyo_neon':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="tokyoBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b0f19"/>
      <stop offset="50%" stop-color="#1a1b26"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#tokyoBg)"/>
  <circle cx="960" cy="520" r="180" fill="none" stroke="#7aa2f7" stroke-width="3" opacity="0.75"/>
  <polygon points="960,380 1080,450 1080,590 960,660 840,590 840,450" fill="#bb9af7" fill-opacity="0.12" stroke="#bb9af7" stroke-width="2"/>
  <line x1="600" y1="740" x2="1320" y2="740" stroke="#7aa2f7" stroke-width="2"/>
  <text x="960" y="790" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="4">${osName}</text>
  <text x="960" y="825" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="15" fill="#bb9af7" text-anchor="middle" letter-spacing="5">TOKYO NIGHT // ${edition.toUpperCase()}</text>
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
    # Fallback rasterise PNG si rsvg-convert est disponible
    if command -v rsvg-convert &>/dev/null; then
        rsvg-convert -w 1920 -h 1080 "/usr/share/backgrounds/${slug}-wallpaper.svg" -o "/usr/share/backgrounds/${slug}-wallpaper.png" 2>/dev/null || true
        cp -f "/usr/share/backgrounds/${slug}-wallpaper.png" "/usr/share/wallpapers/${slug}/contents/images/1920x1080.png" 2>/dev/null || true
    fi
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

# 1. Configuration des thèmes par défaut KDE Plasma (Breeze / BreezeDark defaults)
for BREEZE_DIR in /usr/share/plasma/look-and-feel/org.kde.breeze*.desktop/contents; do
    if [ -d "$BREEZE_DIR" ]; then
        if [ -f "$BREEZE_DIR/defaults" ]; then
            sed -i "s|^defaultWallpaperTheme=.*|defaultWallpaperTheme=${slug}|" "$BREEZE_DIR/defaults" 2>/dev/null || true
            grep -q 'defaultWallpaperTheme' "$BREEZE_DIR/defaults" 2>/dev/null || echo "defaultWallpaperTheme=${slug}" >> "$BREEZE_DIR/defaults"
        else
            printf "[Wallpaper]\\ndefaultWallpaperTheme=${slug}\\n" > "$BREEZE_DIR/defaults" 2>/dev/null || true
        fi
    fi
done

# Script de mise à jour du layout Plasma (exécuté par plasma-shell au 1er boot)
mkdir -p /usr/share/plasma/shells/org.kde.plasma.desktop/contents/updates
cat << 'PLASMA_UPDATE_EOF' > /usr/share/plasma/shells/org.kde.plasma.desktop/contents/updates/00-osforge-theme.js
var allDesktops = desktops();
for (var i = 0; i < allDesktops.length; i++) {
    var d = allDesktops[i];
    d.wallpaperPlugin = "org.kde.image";
    d.currentConfigGroup = Array("Wallpaper", "org.kde.image", "General");
    d.writeConfig("Image", "file:///usr/share/backgrounds/${slug}-wallpaper.svg");
}
PLASMA_UPDATE_EOF

# 2. Profil DConf système indispensable (GNOME / Cinnamon / MATE)
mkdir -p /etc/dconf/profile /etc/dconf/db/local.d
cat << 'DCONF_PROFILE_EOF' > /etc/dconf/profile/user
user-db:user
system-db:local
DCONF_PROFILE_EOF

cat << DCONF_BG_EOF > /etc/dconf/db/local.d/01-background
[org/gnome/desktop/background]
picture-uri='file:///usr/share/backgrounds/${slug}-wallpaper.svg'
picture-uri-dark='file:///usr/share/backgrounds/${slug}-wallpaper.svg'
picture-options='zoom'
primary-color='#000000'
secondary-color='#000000'

[org/cinnamon/desktop/background]
picture-uri='file:///usr/share/backgrounds/${slug}-wallpaper.svg'
picture-options='zoom'

[org/mate/desktop/background]
picture-filename='/usr/share/backgrounds/${slug}-wallpaper.svg'
picture-options='zoom'
DCONF_BG_EOF

if command -v dconf &>/dev/null; then
    dconf update 2>/dev/null || true
fi

# 3. Intégration XFCE (Multi-moniteurs physique & virtuel QEMU/VirtualBox)
mkdir -p /etc/xdg/xfce4/xfconf/xfce-perchannel-xml /etc/skel/.config/xfce4/xfconf/xfce-perchannel-xml
cat << XFCE_BG_EOF > /etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml
<?xml version="1.0" encoding="UTF-8"?>
<channel name="xfce4-desktop" version="1.0">
  <property name="backdrop" type="empty">
    <property name="screen0" type="empty">
      <property name="monitor0" type="empty">
        <property name="workspace0" type="empty">
          <property name="image-path" type="string" value="/usr/share/backgrounds/${slug}-wallpaper.svg"/>
          <property name="last-image" type="string" value="/usr/share/backgrounds/${slug}-wallpaper.svg"/>
          <property name="image-style" type="int" value="5"/>
        </property>
      </property>
      <property name="monitorVirtual1" type="empty">
        <property name="workspace0" type="empty">
          <property name="image-path" type="string" value="/usr/share/backgrounds/${slug}-wallpaper.svg"/>
          <property name="last-image" type="string" value="/usr/share/backgrounds/${slug}-wallpaper.svg"/>
          <property name="image-style" type="int" value="5"/>
        </property>
      </property>
      <property name="monitorVirtual-1" type="empty">
        <property name="workspace0" type="empty">
          <property name="image-path" type="string" value="/usr/share/backgrounds/${slug}-wallpaper.svg"/>
          <property name="last-image" type="string" value="/usr/share/backgrounds/${slug}-wallpaper.svg"/>
          <property name="image-style" type="int" value="5"/>
        </property>
      </property>
      <property name="monitorHDMI-1" type="empty">
        <property name="workspace0" type="empty">
          <property name="image-path" type="string" value="/usr/share/backgrounds/${slug}-wallpaper.svg"/>
          <property name="last-image" type="string" value="/usr/share/backgrounds/${slug}-wallpaper.svg"/>
          <property name="image-style" type="int" value="5"/>
        </property>
      </property>
      <property name="monitoreDP-1" type="empty">
        <property name="workspace0" type="empty">
          <property name="image-path" type="string" value="/usr/share/backgrounds/${slug}-wallpaper.svg"/>
          <property name="last-image" type="string" value="/usr/share/backgrounds/${slug}-wallpaper.svg"/>
          <property name="image-style" type="int" value="5"/>
        </property>
      </property>
    </property>
  </property>
</channel>
XFCE_BG_EOF
cp -f /etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml /etc/skel/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml 2>/dev/null || true

# 4. Intégration LXQt et LXDE
mkdir -p /etc/xdg/pcmanfm-qt/lxqt /etc/skel/.config/pcmanfm-qt/lxqt
cat << LXQT_WALL_EOF > /etc/xdg/pcmanfm-qt/lxqt/settings.conf
[General]
WallpaperMode=stretch
Wallpaper=/usr/share/backgrounds/${slug}-wallpaper.svg
LXQT_WALL_EOF
cp -f /etc/xdg/pcmanfm-qt/lxqt/settings.conf /etc/skel/.config/pcmanfm-qt/lxqt/settings.conf 2>/dev/null || true

mkdir -p /etc/xdg/pcmanfm/default /etc/skel/.config/pcmanfm/default
cat << LXDE_WALL_EOF > /etc/xdg/pcmanfm/default/pcmanfm.conf
[desktop]
wallpaper_mode=stretch
wallpaper=/usr/share/backgrounds/${slug}-wallpaper.svg
LXDE_WALL_EOF
cp -f /etc/xdg/pcmanfm/default/pcmanfm.conf /etc/skel/.config/pcmanfm/default/pcmanfm.conf 2>/dev/null || true

# 5. Intégration SDDM (KDE Login Greeter)
mkdir -p /usr/share/sddm/themes/breeze/components/artwork /usr/share/sddm/themes/debian-breeze/components/artwork
for SDDM_DIR in /usr/share/sddm/themes/*breeze*/components/artwork; do
    if [ -d "$SDDM_DIR" ]; then
        cp -f "$WALLPAPER_TARGET" "$SDDM_DIR/background.svg" 2>/dev/null || cp -f "$WALLPAPER_TARGET" "$SDDM_DIR/background.png" 2>/dev/null || true
    fi
done

# 6. Intégration LightDM Greeter
if [ -f /etc/lightdm/lightdm-gtk-greeter.conf ]; then
    sed -i "s|^#\\?background=.*|background = $WALLPAPER_TARGET|" /etc/lightdm/lightdm-gtk-greeter.conf 2>/dev/null || true
fi
`;
}

/**
 * Mappe l'identifiant d'icône vers le nom de dossier de thème d'icônes officiel
 */
export function mapIconThemeName(theme?: string): string {
  switch (theme) {
    case 'papirus-light': return 'Papirus-Light';
    case 'breeze-dark': return 'breeze-dark';
    case 'breeze': return 'breeze';
    case 'adwaita': return 'Adwaita';
    case 'yaru-dark': return 'Yaru-dark';
    case 'papirus-dark':
    default:
      return 'Papirus-Dark';
  }
}

/**
 * Mappe l'identifiant de curseur vers le nom de thème de curseur officiel
 */
export function mapCursorThemeName(theme?: string): string {
  switch (theme) {
    case 'bibata-modern': return 'Bibata-Modern-Classic';
    case 'adwaita': return 'Adwaita';
    case 'dmz-black': return 'DMZ-Black';
    case 'breeze':
    default:
      return 'breeze_cursors';
  }
}

/**
 * Mappe l'identifiant de police UI vers la chaîne de police officielle
 */
export function mapFontFamilyName(font?: string): string {
  switch (font) {
    case 'roboto': return 'Roboto';
    case 'cantarell': return 'Cantarell';
    case 'dejavu': return 'DejaVu Sans';
    case 'jetbrains-mono': return 'JetBrains Mono';
    case 'fira-code': return 'Fira Code';
    case 'inter':
    default:
      return 'Inter';
  }
}

/**
 * Mappe l'identifiant de police monospace vers la police terminal
 */
export function mapMonoFontFamilyName(mono?: string): string {
  switch (mono) {
    case 'fira-code': return 'Fira Code';
    case 'hack': return 'Hack';
    case 'cascadia-code': return 'Cascadia Code';
    case 'jetbrains-mono':
    default:
      return 'JetBrains Mono';
  }
}

/**
 * Configure la couleur d'accentuation, le thème sombre, les icônes, curseurs et dispositions (KDE, GNOME, XFCE, GTK)
 */
export function generateGlobalThemeCmd(recipe: OSRecipe): string {
  const accent = sanitizeHexColor(recipe.branding.accentColor, '#0ea5e9');
  const rgb = hexToRgb(accent);
  const gnomeAccent = hexToGnomeAccent(accent);
  const iconTheme = mapIconThemeName(recipe.branding.iconTheme);
  const cursorTheme = mapCursorThemeName(recipe.branding.cursorTheme);
  const uiFont = mapFontFamilyName(recipe.branding.fontFamily);
  const monoFont = mapMonoFontFamilyName(recipe.branding.monoFontFamily);
  const buttonsOnLeft = recipe.branding.windowButtonsPosition === 'left';

  return `# ==============================================================================
# Thème Sombre, Icônes (${iconTheme}), Curseurs (${cursorTheme}) & Fenêtres
# ==============================================================================
echo -e "\${BLUE}[BRANDING] Configuration des themes d'icones (${iconTheme}), curseurs (${cursorTheme}) et polices...\${NC}"

# 1. Configuration globale KDE Plasma (kdeglobals, kcminputrc, kwinrc)
mkdir -p /etc/xdg
cat << KDEGLOBALS_EOF >> /etc/xdg/kdeglobals
[General]
AccentColor=${rgb.r},${rgb.g},${rgb.b}
LastUsedCustomAccentColor=${rgb.r},${rgb.g},${rgb.b}
accentColorFromWallpaper=false
ColorScheme=BreezeDark
font=${uiFont},10,-1,5,50,0,0,0,0,0
fixed=${monoFont},10,-1,5,50,0,0,0,0,0

[KDE]
colorScheme=BreezeDark
lookAndFeelPackage=org.kde.breezedark.desktop

[Icons]
Theme=${iconTheme}
KDEGLOBALS_EOF

cat << KCMINPUT_EOF > /etc/xdg/kcminputrc
[Mouse]
cursorTheme=${cursorTheme}
cursorSize=24
KCMINPUT_EOF

cat << KWINRC_EOF > /etc/xdg/kwinrc
[org.kde.kdecoration2]
ButtonsOnLeft=${buttonsOnLeft ? 'XAI' : 'M'}
ButtonsOnRight=${buttonsOnLeft ? 'M' : 'IAX'}
KWINRC_EOF

# Copie dans le squelette utilisateur /etc/skel
mkdir -p /etc/skel/.config
cp -f /etc/xdg/kdeglobals /etc/skel/.config/kdeglobals 2>/dev/null || true
cp -f /etc/xdg/kcminputrc /etc/skel/.config/kcminputrc 2>/dev/null || true
cp -f /etc/xdg/kwinrc /etc/skel/.config/kwinrc 2>/dev/null || true

# 2. Configuration GTK 3 & GTK 4
mkdir -p /etc/gtk-3.0 /etc/gtk-4.0
cat << GTK_SETTINGS_EOF > /etc/gtk-3.0/settings.ini
[Settings]
gtk-theme-name = Adwaita-dark
gtk-application-prefer-dark-theme = 1
gtk-icon-theme-name = ${iconTheme}
gtk-cursor-theme-name = ${cursorTheme}
gtk-font-name = ${uiFont} 10
GTK_SETTINGS_EOF

cp -f /etc/gtk-3.0/settings.ini /etc/gtk-4.0/settings.ini 2>/dev/null || true

mkdir -p /etc/skel/.config/gtk-3.0 /etc/skel/.config/gtk-4.0
cp -f /etc/gtk-3.0/settings.ini /etc/skel/.config/gtk-3.0/settings.ini 2>/dev/null || true
cp -f /etc/gtk-3.0/settings.ini /etc/skel/.config/gtk-4.0/settings.ini 2>/dev/null || true

# 3. Thème de curseur par défaut (X11 & Wayland)
mkdir -p /usr/share/icons/default
cat << CURSOR_DEF_EOF > /usr/share/icons/default/index.theme
[Icon Theme]
Name=Default
Comment=Default Cursor Theme
Inherits=${cursorTheme}
CURSOR_DEF_EOF

# 4. Configuration XFCE (xsettings & xfwm4)
mkdir -p /etc/xdg/xfce4/xfconf/xfce-perchannel-xml /etc/skel/.config/xfce4/xfconf/xfce-perchannel-xml
cat << XFSETTINGS_EOF > /etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml
<?xml version="1.0" encoding="UTF-8"?>
<channel name="xsettings" version="1.0">
  <property name="Net" type="empty">
    <property name="ThemeName" type="string" value="Adwaita-dark"/>
    <property name="IconThemeName" type="string" value="${iconTheme}"/>
  </property>
  <property name="Gtk" type="empty">
    <property name="CursorThemeName" type="string" value="${cursorTheme}"/>
    <property name="FontName" type="string" value="${uiFont} 10"/>
    <property name="MonospaceFontName" type="string" value="${monoFont} 10"/>
  </property>
</channel>
XFSETTINGS_EOF
cp -f /etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml /etc/skel/.config/xfce4/xfconf/xfce-perchannel-xml/xsettings.xml 2>/dev/null || true

cat << XFWM4_EOF > /etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml
<?xml version="1.0" encoding="UTF-8"?>
<channel name="xfwm4" version="1.0">
  <property name="general" type="empty">
    <property name="button_layout" type="string" value="${buttonsOnLeft ? 'CHM|' : 'O|HMC'}"/>
    <property name="theme" type="string" value="Default-hdpi"/>
  </property>
</channel>
XFWM4_EOF
cp -f /etc/xdg/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml /etc/skel/.config/xfce4/xfconf/xfce-perchannel-xml/xfwm4.xml 2>/dev/null || true

# 5. DConf Interface Sombre & Accent Color (GNOME / Libadwaita / Cinnamon / MATE)
cat << DCONF_THEME_EOF > /etc/dconf/db/local.d/02-theme
[org/gnome/desktop/interface]
color-scheme='prefer-dark'
gtk-theme='Adwaita-dark'
icon-theme='${iconTheme}'
cursor-theme='${cursorTheme}'
font-name='${uiFont} 10'
monospace-font-name='${monoFont} 10'
accent-color='${gnomeAccent}'

[org/gnome/desktop/wm/preferences]
button-layout='${buttonsOnLeft ? 'close,minimize,maximize:' : 'appmenu:minimize,maximize,close'}'

[org/cinnamon/desktop/interface]
gtk-theme='Adwaita-dark'
icon-theme='${iconTheme}'
cursor-theme='${cursorTheme}'
font-name='${uiFont} 10'
monospace-font-name='${monoFont} 10'

[org/mate/desktop/interface]
gtk-theme='Adwaita-dark'
icon-theme='${iconTheme}'
cursor-theme='${cursorTheme}'
font-name='${uiFont} 10'
monospace-font-name='${monoFont} 10'
DCONF_THEME_EOF

if command -v dconf &>/dev/null; then
    dconf update 2>/dev/null || true
fi
`;
}

/**
 * Configure un lanceur d'application Autostart Freedesktop pour forcer l'application
 * des thèmes, couleurs et fonds d'écran à l'ouverture de la session graphique utilisateur.
 */
export function generateAutostartThemeCmd(recipe: OSRecipe): string {
  const slug = sanitizeOsSlug(recipe.branding.osName);
  const accent = sanitizeHexColor(recipe.branding.accentColor, '#0ea5e9');
  const gnomeAccent = hexToGnomeAccent(accent);
  const iconTheme = mapIconThemeName(recipe.branding.iconTheme);
  const cursorTheme = mapCursorThemeName(recipe.branding.cursorTheme);
  const username = recipe.user?.username || 'forge';

  return `# ==============================================================================
# Script Autostart Universel d'Application du Thème & Design System
# ==============================================================================
echo -e "\${BLUE}[BRANDING] Deploiement de l'autostart d'application du theme...\${NC}"
mkdir -p /usr/local/bin /etc/xdg/autostart /etc/skel/.config/autostart

cat << 'AUTOSTART_SH_EOF' > /usr/local/bin/osforge-apply-theme.sh
#!/bin/sh
# OSForge Studio - Application dynamique des composants visuels au login
WALLPAPER="/usr/share/backgrounds/${slug}-wallpaper.svg"
[ -f "$WALLPAPER" ] || WALLPAPER="/usr/share/backgrounds/${slug}-wallpaper.png"

# 1. KDE Plasma (plasma-apply-*)
if command -v plasma-apply-wallpaperimage >/dev/null 2>&1 && [ -f "$WALLPAPER" ]; then
    plasma-apply-wallpaperimage "$WALLPAPER" >/dev/null 2>&1 || true
fi
if command -v plasma-apply-colorscheme >/dev/null 2>&1; then
    plasma-apply-colorscheme BreezeDark >/dev/null 2>&1 || true
fi
if command -v plasma-apply-cursortheme >/dev/null 2>&1; then
    plasma-apply-cursortheme "${cursorTheme}" >/dev/null 2>&1 || true
fi

# 2. GNOME / Cinnamon / MATE (gsettings au niveau utilisateur actif)
if command -v gsettings >/dev/null 2>&1; then
    gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark' >/dev/null 2>&1 || true
    gsettings set org.gnome.desktop.interface gtk-theme 'Adwaita-dark' >/dev/null 2>&1 || true
    gsettings set org.gnome.desktop.interface icon-theme '${iconTheme}' >/dev/null 2>&1 || true
    gsettings set org.gnome.desktop.interface cursor-theme '${cursorTheme}' >/dev/null 2>&1 || true
    gsettings set org.gnome.desktop.interface accent-color '${gnomeAccent}' >/dev/null 2>&1 || true
    if [ -f "$WALLPAPER" ]; then
        gsettings set org.gnome.desktop.background picture-uri "file://$WALLPAPER" >/dev/null 2>&1 || true
        gsettings set org.gnome.desktop.background picture-uri-dark "file://$WALLPAPER" >/dev/null 2>&1 || true
        gsettings set org.cinnamon.desktop.background picture-uri "file://$WALLPAPER" >/dev/null 2>&1 || true
    fi
fi

# 3. XFCE (xfconf-query au niveau utilisateur actif)
if command -v xfconf-query >/dev/null 2>&1 && [ -f "$WALLPAPER" ]; then
    for prop in $(xfconf-query -c xfce4-desktop -l 2>/dev/null | grep -E 'last-image$|image-path$'); do
        xfconf-query -c xfce4-desktop -p "$prop" -s "$WALLPAPER" >/dev/null 2>&1 || true
    done
    xfconf-query -c xsettings -p /Net/ThemeName -s "Adwaita-dark" >/dev/null 2>&1 || true
    xfconf-query -c xsettings -p /Net/IconThemeName -s "${iconTheme}" >/dev/null 2>&1 || true
    xfconf-query -c xsettings -p /Gtk/CursorThemeName -s "${cursorTheme}" >/dev/null 2>&1 || true
fi
AUTOSTART_SH_EOF
chmod +x /usr/local/bin/osforge-apply-theme.sh

cat << 'AUTOSTART_DESKTOP_EOF' > /etc/xdg/autostart/osforge-branding.desktop
[Desktop Entry]
Type=Application
Name=OSForge Branding Enforcer
Comment=Applique les couleurs et themes au demarrage de session
Exec=/usr/local/bin/osforge-apply-theme.sh
Hidden=false
NoDisplay=true
X-GNOME-Autostart-enabled=true
X-KDE-autostart-phase=2
AUTOSTART_DESKTOP_EOF

cp -f /etc/xdg/autostart/osforge-branding.desktop /etc/skel/.config/autostart/osforge-branding.desktop 2>/dev/null || true

# Synchronisation du squelette /etc/skel vers le home utilisateur principal s'il existe deja
if [ -d "/home/${username}" ]; then
    cp -rn /etc/skel/. "/home/${username}/" 2>/dev/null || true
    chown -R "${username}:${username}" "/home/${username}" 2>/dev/null || true
fi
`;
}

/**
 * Configure les règles Fontconfig par défaut (/etc/fonts/local.conf)
 */
export function generateFontconfigCmd(recipe: OSRecipe): string {
  const uiFont = mapFontFamilyName(recipe.branding.fontFamily);
  const monoFont = mapMonoFontFamilyName(recipe.branding.monoFontFamily);

  return `# ==============================================================================
# Configuration Fontconfig Locale (/etc/fonts/local.conf)
# ==============================================================================
mkdir -p /etc/fonts
cat << 'FONTS_CONF_EOF' > /etc/fonts/local.conf
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <!-- Priorité pour police sans-serif (Interface) -->
  <alias>
    <family>sans-serif</family>
    <prefer>
      <family>${uiFont}</family>
      <family>DejaVu Sans</family>
      <family>Noto Sans</family>
    </prefer>
  </alias>
  <!-- Priorité pour police monospace (Terminal & Code) -->
  <alias>
    <family>monospace</family>
    <prefer>
      <family>${monoFont}</family>
      <family>DejaVu Sans Mono</family>
      <family>monospace</family>
    </prefer>
  </alias>
</fontconfig>
FONTS_CONF_EOF

if command -v fc-cache &>/dev/null; then
    fc-cache -f 2>/dev/null || true
fi
`;
}

/**
 * Configure la palette de couleurs des terminaux (Kitty, Alacritty, XFCE Terminal)
 */
export function generateTerminalThemeCmd(recipe: OSRecipe): string {
  const scheme = recipe.branding.terminalColorScheme || 'tokyo-night';
  const monoFont = mapMonoFontFamilyName(recipe.branding.monoFontFamily);

  // Définition des palettes de couleurs complètes (bg, fg, 16 couleurs ANSI)
  type Palette = { bg: string; fg: string; c0: string; c1: string; c2: string; c3: string; c4: string; c5: string; c6: string; c7: string };
  const palettes: Record<string, Palette> = {
    'tokyo-night': { bg: '#1a1b26', fg: '#c0caf5', c0: '#15161e', c1: '#f7768e', c2: '#9ece6a', c3: '#e0af68', c4: '#7aa2f7', c5: '#bb9af7', c6: '#7dcfff', c7: '#a9b1d6' },
    'catppuccin-mocha': { bg: '#1e1e2e', fg: '#cdd6f4', c0: '#45475a', c1: '#f38ba8', c2: '#a6e3a1', c3: '#f9e2af', c4: '#89b4fa', c5: '#cba6f7', c6: '#94e2d5', c7: '#bac2de' },
    'dracula': { bg: '#282a36', fg: '#f8f8f2', c0: '#21222c', c1: '#ff5555', c2: '#50fa7b', c3: '#f1fa8c', c4: '#bd93f9', c5: '#ff79c6', c6: '#8be9fd', c7: '#f8f8f2' },
    'nord': { bg: '#2e3440', fg: '#d8dee9', c0: '#3b4252', c1: '#bf616a', c2: '#a3be8c', c3: '#ebcb8b', c4: '#81a1c1', c5: '#b48ead', c6: '#88c0d0', c7: '#e5e9f0' },
    'gruvbox-dark': { bg: '#282828', fg: '#ebdbb2', c0: '#282828', c1: '#cc241d', c2: '#98971a', c3: '#d79921', c4: '#458588', c5: '#b16286', c6: '#689d6a', c7: '#a89984' },
    'cyberpunk-neon': { bg: '#080811', fg: '#00ffcc', c0: '#0e101a', c1: '#ff0055', c2: '#39ff14', c3: '#ffe600', c4: '#00e5ff', c5: '#ff007f', c6: '#00ffff', c7: '#ffffff' },
  };

  const pal = palettes[scheme] || palettes['tokyo-night'];

  return `# ==============================================================================
# Thème de Terminal & Palette de Couleurs (${scheme})
# ==============================================================================
echo -e "\${BLUE}[BRANDING] Configuration du theme terminal (${scheme})...\${NC}"

# 1. Kitty Terminal
mkdir -p /etc/xdg/kitty /etc/skel/.config/kitty
cat << 'KITTY_THEME_EOF' > /etc/xdg/kitty/kitty.conf
# OSForge Studio - Theme: ${scheme}
font_family      ${monoFont}
font_size        11.0
background       ${pal.bg}
foreground       ${pal.fg}
cursor           ${pal.fg}
selection_background ${pal.c4}
selection_foreground ${pal.bg}
color0  ${pal.c0}
color1  ${pal.c1}
color2  ${pal.c2}
color3  ${pal.c3}
color4  ${pal.c4}
color5  ${pal.c5}
color6  ${pal.c6}
color7  ${pal.c7}
KITTY_THEME_EOF
cp -f /etc/xdg/kitty/kitty.conf /etc/skel/.config/kitty/kitty.conf 2>/dev/null || true

# 2. Alacritty Terminal
mkdir -p /etc/xdg/alacritty /etc/skel/.config/alacritty
cat << 'ALACRITTY_THEME_EOF' > /etc/xdg/alacritty/alacritty.toml
[font]
size = 11.0
[font.normal]
family = "${monoFont}"

[colors.primary]
background = "${pal.bg}"
foreground = "${pal.fg}"

[colors.normal]
black   = "${pal.c0}"
red     = "${pal.c1}"
green   = "${pal.c2}"
yellow  = "${pal.c3}"
blue    = "${pal.c4}"
magenta = "${pal.c5}"
cyan    = "${pal.c6}"
white   = "${pal.c7}"
ALACRITTY_THEME_EOF
cp -f /etc/xdg/alacritty/alacritty.toml /etc/skel/.config/alacritty/alacritty.toml 2>/dev/null || true

# 3. XFCE Terminal
mkdir -p /etc/xdg/xfce4/terminal /etc/skel/.config/xfce4/terminal
cat << 'XFCETERM_EOF' > /etc/xdg/xfce4/terminal/terminalrc
[Configuration]
FontName=${monoFont} 10
ColorPalette=${pal.c0};${pal.c1};${pal.c2};${pal.c3};${pal.c4};${pal.c5};${pal.c6};${pal.c7};${pal.c0};${pal.c1};${pal.c2};${pal.c3};${pal.c4};${pal.c5};${pal.c6};${pal.c7}
ColorBackground=${pal.bg}
ColorForeground=${pal.fg}
ColorCursor=${pal.fg}
XFCETERM_EOF
cp -f /etc/xdg/xfce4/terminal/terminalrc /etc/skel/.config/xfce4/terminal/terminalrc 2>/dev/null || true
`;
}

/**
 * Configure les alias shell de productivité (/etc/profile.d/99-osforge-aliases.sh)
 */
export function generateProAliasesCmd(recipe: OSRecipe): string {
  if (recipe.branding.enableProAliases === false) {
    return '# [Branding] Aliases pro désactivés';
  }

  const pkgMgr = recipe.distro === 'arch' || recipe.distro === 'cachyos' ? 'pacman -Syu'
    : recipe.distro === 'fedora' || recipe.distro === 'rocky' ? 'dnf upgrade --refresh'
    : recipe.distro === 'alpine' ? 'apk update && apk upgrade'
    : recipe.distro === 'opensuse' ? 'zypper refresh && zypper update'
    : recipe.distro === 'void' ? 'xbps-install -Su'
    : 'apt update && apt upgrade -y';

  return `# ==============================================================================
# Raccourcis & Aliases Shell Pro (/etc/profile.d/99-osforge-aliases.sh)
# ==============================================================================
cat << 'ALIASES_EOF' > /etc/profile.d/99-osforge-aliases.sh
#!/bin/sh
# Aliases de navigation et confort
alias ll='ls -la --color=auto 2>/dev/null || ls -la'
alias la='ls -A --color=auto 2>/dev/null || ls -A'
alias l='ls -CF --color=auto 2>/dev/null || ls -CF'
alias grep='grep --color=auto'
alias df='df -h'
alias free='free -h'
alias cls='clear'

# Utilitaires système en 1 mot
alias ports='netstat -tulanp 2>/dev/null || ss -tulanp 2>/dev/null || lsof -i'
alias myip='curl -sSL https://ifconfig.me/ip 2>/dev/null || hostname -I | cut -d" " -f1'
alias memtop='ps aux --sort=-%mem 2>/dev/null | head -n 11'
alias cputop='ps aux --sort=-%cpu 2>/dev/null | head -n 11'
alias sysupdate='sudo ${pkgMgr}'
ALIASES_EOF
chmod +x /etc/profile.d/99-osforge-aliases.sh
`;
}

/**
 * Configure le carillon audio ou son de démarrage (/etc/xdg/autostart/)
 */
export function generateStartupSoundCmd(recipe: OSRecipe): string {
  if (!recipe.branding.enableStartupSound) {
    return '# [Branding] Son de démarrage non activé';
  }

  return `# ==============================================================================
# Son de Démarrage / Chime Audio de Bienvenue
# ==============================================================================
mkdir -p /usr/local/bin /etc/xdg/autostart
cat << 'SOUND_SCRIPT_EOF' > /usr/local/bin/osforge-startup-sound.sh
#!/bin/sh
sleep 1
if command -v pw-play >/dev/null 2>&1; then
    pw-play /usr/share/sounds/freedesktop/stereo/service-login.oga 2>/dev/null || true
elif command -v paplay >/dev/null 2>&1; then
    paplay /usr/share/sounds/freedesktop/stereo/service-login.oga 2>/dev/null || true
elif command -v aplay >/dev/null 2>&1; then
    aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true
fi
SOUND_SCRIPT_EOF
chmod +x /usr/local/bin/osforge-startup-sound.sh

cat << 'SOUND_DESKTOP_EOF' > /etc/xdg/autostart/osforge-startup-sound.desktop
[Desktop Entry]
Type=Application
Name=Startup Chime
Exec=/usr/local/bin/osforge-startup-sound.sh
Hidden=false
NoDisplay=true
X-GNOME-Autostart-enabled=true
SOUND_DESKTOP_EOF
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

${generateFontconfigCmd(recipe)}

${generateTerminalThemeCmd(recipe)}

${generateProAliasesCmd(recipe)}

${generateStartupSoundCmd(recipe)}

${generateFastfetchMotdCmd(recipe)}

${generateAutostartThemeCmd(recipe)}

${generatePlymouthCmd(recipe)}

${generateGrubThemeCmd(recipe)}
`;
}
