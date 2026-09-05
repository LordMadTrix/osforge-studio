import { OSRecipe } from '../../types/os';

/**
 * Génère la configuration de démarrage pour systemd-boot (UEFI moderne < 0.5s)
 */
export function generateSystemdBootConfig(recipe: OSRecipe, kernelPath = '/vmlinuz', initrdPath = '/initrd.img', rootArg = 'root=UUID=${ROOT_UUID} rw'): { loaderConf: string; entryConf: string } {
  const osTitle = recipe.branding.osName;
  const entryId = recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-');

  const loaderConf = `# OSForge Studio by LordMadTrix — systemd-boot configuration
default ${entryId}.conf
timeout 3
console-mode max
editor no
`;

  const entryConf = `title   ${osTitle} (${recipe.branding.editionName})
linux   ${kernelPath}
initrd  ${initrdPath}
options ${rootArg} quiet splash
`;

  return { loaderConf, entryConf };
}

/**
 * Génère la configuration rEFInd (Gestionnaire graphique multi-boot EFI avec souris et détection automatique)
 */
export function generateRefindConfig(recipe: OSRecipe): string {
  const osTitle = recipe.branding.osName;
  const accentHex = recipe.branding.accentColor || '#0ea5e9';

  return `# OSForge Studio by LordMadTrix — rEFInd Graphical Boot Manager
# Accent Color: ${accentHex}
timeout 5
shutdown_after_timeout false
use_graphics_for osx,linux,windows
showtools shell,memtest,gdisk,about,reboot,exit,poweroff

# Résolution et style visuel HD
resolution max
enable_mouse
mouse_speed 4

# Thème sombre et épuré
banner_scale fillscreen
selection_big selection-big.png
selection_small selection-small.png

# Entrée personnalisée principale
menuentry "${osTitle}" {
    icon     /EFI/refind/icons/os_${osTitle.toLowerCase().replace(/[^a-z0-9]/g, '')}.png
    loader   /boot/vmlinuz
    initrd   /boot/initrd.img
    options  "root=UUID=\${ROOT_UUID} rw quiet splash"
    submenuentry "Mode Rescue (Single User)" {
        add_options "single"
    }
}
`;
}

/**
 * Génère le script d'installation et de configuration dans le chroot pour systemd-boot ou rEFInd
 */
export function generateAlternativeBootloaderCommands(recipe: OSRecipe, _distroFamily = 'debian'): string {
  const bootloader = recipe.bootloader || 'grub2';
  if (bootloader === 'grub2') return '';

  const osTitle = recipe.branding.osName;
  const entryId = osTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');

  if (bootloader === 'systemd-boot') {
    return `
# ==============================================================================
# ⚡ Installation et Configuration de systemd-boot (UEFI Instant-Boot)
# ==============================================================================
echo -e "\${BLUE}[BOOTLOADER] Configuration de systemd-boot (amorçage ultra-rapide)...\${NC}"

if command -v bootctl &>/dev/null; then
    bootctl --path=/boot install 2>/dev/null || true
    mkdir -p /boot/loader/entries

    cat > /boot/loader/loader.conf << 'LOADER_CONF_EOF'
default ${entryId}.conf
timeout 2
console-mode max
editor no
LOADER_CONF_EOF

    KVER=$(ls /lib/modules 2>/dev/null | head -1 || echo "generic")
    cat > "/boot/loader/entries/${entryId}.conf" << ENTRY_EOF
title   ${osTitle} (${recipe.branding.editionName})
linux   /vmlinuz-\${KVER}
initrd  /initrd.img-\${KVER}
options root=UUID=\${ROOT_UUID} rw quiet splash
ENTRY_EOF
    echo -e "\${GREEN}[BOOTLOADER] systemd-boot configuré avec succès dans /boot/loader.\${NC}"
else
    echo -e "\${YELLOW}[INFO] bootctl non disponible sur cette base, GRUB 2 reste le chargeur principal.\${NC}"
fi
`;
  }

  if (bootloader === 'refind') {
    const refindConfig = generateRefindConfig(recipe);
    return `
# ==============================================================================
# 🖲️ Installation et Configuration de rEFInd (Gestionnaire Graphique Multi-OS)
# ==============================================================================
echo -e "\${BLUE}[BOOTLOADER] Configuration de rEFInd (menu graphique multi-boot EFI)...\${NC}"

if command -v refind-install &>/dev/null; then
    refind-install --yes 2>/dev/null || true
    mkdir -p /boot/EFI/refind
    cat > /boot/EFI/refind/refind.conf << 'REFIND_CONF_EOF'
${refindConfig}REFIND_CONF_EOF
    echo -e "\${GREEN}[BOOTLOADER] rEFInd installé et configuré avec succès dans /boot/EFI/refind.\${NC}"
else
    echo -e "\${YELLOW}[INFO] refind-install non disponible sur cette base, GRUB 2 reste le chargeur actif.\${NC}"
fi
`;
  }

  return '';
}
