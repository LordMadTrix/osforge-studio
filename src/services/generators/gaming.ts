import { OSRecipe, MangoHudPreset } from '../../types/os';

/**
 * Génère le fichier de configuration officiel MangoHUD (~/.config/MangoHud/MangoHud.conf)
 * Selon le preset sélectionné dans l'interface OSForge Studio
 */
export function generateMangoHudConfig(preset: MangoHudPreset = 'compact_topbar'): string {
  switch (preset) {
    case 'minimal_fps':
      return `# OSForge Studio by LordMadTrix — MangoHud Minimal FPS
legacy_layout=0
fps
fps_only
font_size=18
position=top-right
background_alpha=0.2
round_corners=6
`;

    case 'full_hud':
      return `# OSForge Studio by LordMadTrix — MangoHud Full Performance Overlay
legacy_layout=0
gpu_stats
gpu_temp
gpu_core_clock
gpu_mem_clock
gpu_power
gpu_load_change
cpu_stats
cpu_temp
cpu_power
cpu_mhz
vram
ram
fps
frametime=1
frame_timing=1
histogram
font_size=20
position=top-left
background_alpha=0.65
background_color=0a0c14
text_color=ffffff
gpu_color=06b6d4
cpu_color=3b82f6
vram_color=a855f7
ram_color=ec4899
round_corners=8
`;

    case 'steamos_style':
      return `# OSForge Studio by LordMadTrix — MangoHud SteamOS / Deck Style
legacy_layout=0
horizontal
battery
fps
frametime=1
cpu_stats
gpu_stats
vram
ram
font_size=22
position=top-left
background_alpha=0.75
background_color=090d16
round_corners=10
`;

    case 'compact_topbar':
    default:
      return `# OSForge Studio by LordMadTrix — MangoHud Compact TopBar
legacy_layout=0
horizontal
fps
frametime=0
frame_timing=0
cpu_stats
cpu_temp
gpu_stats
gpu_temp
ram
vram
font_size=16
position=top-center
background_alpha=0.45
background_color=090d16
round_corners=6
`;
  }
}

/**
 * Génère le script d'installation automatique de la dernière version de Proton-GE
 * Télécharge et déploie dans le dossier compatibilitytools.d de Steam
 */
export function generateProtonGEInstallerScript(): string {
  return `#!/usr/bin/env bash
# OSForge Studio by LordMadTrix — Installeur Automatisé Proton-GE (GloriousEggroll)
set -euo pipefail

echo "==> [OSForge Gaming] Détection de la dernière release Proton-GE..."
STEAM_COMPAT_DIR="\${HOME}/.steam/root/compatibilitytools.d"
mkdir -p "\${STEAM_COMPAT_DIR}"

LATEST_RELEASE_URL=$(curl -sSL "https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases/latest" | grep -oP '"browser_download_url": "\\K(https://[^"]*\\.tar\\.gz)' | head -1 || true)

if [ -n "\${LATEST_RELEASE_URL}" ]; then
    TAR_NAME=$(basename "\${LATEST_RELEASE_URL}")
    echo "==> [OSForge Gaming] Téléchargement de \${TAR_NAME}..."
    TMP_DIR=$(mktemp -d)
    curl -fSL "\${LATEST_RELEASE_URL}" -o "\${TMP_DIR}/\${TAR_NAME}"
    echo "==> [OSForge Gaming] Extraction dans \${STEAM_COMPAT_DIR}..."
    tar -xzf "\${TMP_DIR}/\${TAR_NAME}" -C "\${STEAM_COMPAT_DIR}/"
    rm -rf "\${TMP_DIR}"
    echo "==> [OSForge Gaming] Proton-GE installé avec succès !"
else
    echo "==> [OSForge Gaming] Note: Impossible de récupérer la release automatique (réseau requis). Relancez ce script une fois connecté."
fi
`;
}

/**
 * Génère la règle Polkit autorisant CoreCtrl pour l'overclocking/undervolting sans mot de passe root
 */
export function generateCoreCtrlPolkitRules(): string {
  return `// OSForge Studio by LordMadTrix — CoreCtrl Hardware Overclocking Permission
polkit.addRule(function(action, subject) {
    if ((action.id == "org.corectrl.helper.init" ||
         action.id == "org.corectrl.helper.stage") &&
        subject.isInGroup("users")) {
        return polkit.Result.YES;
    }
});
`;
}

/**
 * Génère la configuration PipeWire pour le mode audio ultra-faible latence (< 2ms)
 */
export function generatePipewireLowLatencyConfig(quantum: 64 | 128 | 256 | 512 = 128): string {
  return `# OSForge Studio by LordMadTrix — PipeWire Ultra Low-Latency Config
context.properties = {
    default.clock.rate          = 48000
    default.clock.allowed-rates = [ 44100, 48000, 96000 ]
    default.clock.quantum       = ${quantum}
    default.clock.min-quantum   = 32
    default.clock.max-quantum   = 1024
}
`;
}

/**
 * Génère l'ensemble des commandes chroot pour appliquer la stack Gaming & Performance
 */
export function generateGamingChrootCommands(recipe: OSRecipe): string {
  if (!recipe.enableGamingOptimizations && !recipe.gamingConfig?.enableMangoHud && !recipe.gamingConfig?.enableProtonGE) {
    return '';
  }

  const preset = recipe.gamingConfig?.mangoHudPreset || 'compact_topbar';
  const mangoHudConfig = generateMangoHudConfig(preset);
  const lowLatencyQuantum = recipe.gamingConfig?.pipewireQuantumLatency || 128;
  const pipewireConfig = generatePipewireLowLatencyConfig(lowLatencyQuantum);
  const polkitCoreCtrl = generateCoreCtrlPolkitRules();

  return `
# ==============================================================================
# 🎮 OSForge Studio Gaming & Performance Engine (by LordMadTrix)
# ==============================================================================
echo -e "\${BLUE}[GAMING] Configuration du moteur de performance et de latence...\${NC}"

# 1. Configuration MangoHUD (~/.config/MangoHud/MangoHud.conf)
mkdir -p /etc/MangoHud /etc/skel/.config/MangoHud
cat << 'MANGOHUD_EOF' > /etc/MangoHud/MangoHud.conf
${mangoHudConfig}MANGOHUD_EOF
cp /etc/MangoHud/MangoHud.conf /etc/skel/.config/MangoHud/MangoHud.conf

if [ -d "/home/${recipe.user.username}" ]; then
    mkdir -p "/home/${recipe.user.username}/.config/MangoHud"
    cp /etc/MangoHud/MangoHud.conf "/home/${recipe.user.username}/.config/MangoHud/MangoHud.conf"
    chown -R "${recipe.user.username}:${recipe.user.username}" "/home/${recipe.user.username}/.config/MangoHud" 2>/dev/null || true
fi

# 2. Configuration PipeWire Ultra-Faible Latence (Quantum = ${lowLatencyQuantum})
mkdir -p /etc/pipewire/pipewire.conf.d
cat << 'PIPEWIRE_LL_EOF' > /etc/pipewire/pipewire.conf.d/10-lowlatency.conf
${pipewireConfig}PIPEWIRE_LL_EOF

# 3. Règles Polkit CoreCtrl (GPU Undervolt/Overclock sans prompt)
mkdir -p /etc/polkit-1/rules.d
cat << 'CORECTRL_POLKIT_EOF' > /etc/polkit-1/rules.d/90-corectrl.rules
${polkitCoreCtrl}CORECTRL_POLKIT_EOF

# 4. Script d'installation automatisée Proton-GE (Steam GloriousEggroll)
${recipe.gamingConfig?.enableProtonGE ? `
mkdir -p /usr/local/bin
cat << 'PROTONGE_INSTALLER_EOF' > /usr/local/bin/osforge-install-proton-ge
${generateProtonGEInstallerScript()}PROTONGE_INSTALLER_EOF
chmod +x /usr/local/bin/osforge-install-proton-ge
` : ''}
`;
}
