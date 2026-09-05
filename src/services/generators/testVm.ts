import { OSRecipe } from '../../types/os';

/**
 * Calcule le nom de fichier d'image généré selon la recette
 */
export function getGeneratedArtifactFileName(recipe: OSRecipe): string {
  const baseName = recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const version = recipe.branding.version;
  const arch = recipe.arch;

  switch (recipe.outputFormat) {
    case 'iso_hybrid':
      return `${baseName}-${version}-${arch}.iso`;
    case 'qcow2':
    case 'proxmox_qcow2':
      return `${baseName}-${version}-${arch}.qcow2`;
    case 'vmdk':
      return `${baseName}-${version}-${arch}.vmdk`;
    case 'vdi':
      return `${baseName}-${version}-${arch}.vdi`;
    case 'ami_raw':
    case 'raw_img':
      return `${baseName}-${version}-${arch}.img`;
    default:
      return `${baseName}-${version}-${arch}.img`;
  }
}

/**
 * Détermine la RAM recommandée pour tester la VM selon le bureau
 */
export function getRecommendedVmRamMB(recipe: OSRecipe): number {
  if (['gnome', 'kde', 'cinnamon', 'deepin', 'budgie', 'cosmic'].includes(recipe.desktop)) {
    return 4096;
  }
  if (['xfce', 'mate', 'lxqt', 'lxde', 'hyprland', 'sway', 'i3wm'].includes(recipe.desktop)) {
    return 2048;
  }
  return 1024;
}

/**
 * Génère le script batch Windows autonome tester-en-vm.bat
 * Détecte WHPX, configure le bus virtio, et démarre la VM QEMU locale
 */
export function generateQemuTestBat(recipe: OSRecipe): string {
  const artifactFile = getGeneratedArtifactFileName(recipe);
  const ramMB = getRecommendedVmRamMB(recipe);
  const isIso = recipe.outputFormat === 'iso_hybrid';

  const driveArg = isIso
    ? `-cdrom "%DIST_DIR%\\${artifactFile}" -boot d`
    : `-drive file="%DIST_DIR%\\${artifactFile}",format=${recipe.outputFormat === 'qcow2' ? 'qcow2' : recipe.outputFormat === 'vmdk' ? 'vmdk' : 'raw'},if=virtio`;

  return `@echo off
chcp 65001 >nul
title OSForge Studio — Banc d'Essai VM QEMU (by LordMadTrix)
color 0b

reg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

echo ===============================================================================
echo      [1;36m  ___  ____  _____                     ____  _             _ _        [0m
echo      [1;36m / _ \\/ ___||  ___|__  _ __ __ _  ___ / ___|| |_ _   _  __| (_) ___   [0m
echo      [1;36m| | | \\___ \\| |_ / _ \\| '__/ _\` |/ _ \\\\___ \\| __| | | |/ _\` | |/ _ \\  [0m
echo      [1;36m| |_| |___) |  _| (_) | | | (_| |  __/ ___) | |_| |_| | (_| | | (_) | [0m
echo      [1;36m \\___/|____/|_|  \\___/|_|  \\__, |\\___|____/ \\__|\\__,_|\\__,_|_|\\___/  [0m
echo      [1;36m                           |___/     TESTEUR EN VM QEMU/WHPX RÉEL  [0m
echo ===============================================================================
echo   Système cible : ${recipe.branding.osName} (${recipe.branding.editionName})
echo   Fichier image : ${artifactFile}
echo   RAM allouée   : ${ramMB} Mo
echo ===============================================================================
echo.

set "DIST_DIR=%~dp0dist"
if not exist "%DIST_DIR%\\${artifactFile}" (
    set "DIST_DIR=%~dp0"
)

if not exist "%DIST_DIR%\\${artifactFile}" (
    echo [1;31m[ERREUR] Image introuvable : %DIST_DIR%\\${artifactFile}[0m
    echo Veuillez d'abord construire l'image avec auto-build.bat ou build.sh.
    pause
    exit /b 1
)

:: Vérification de la présence de QEMU
where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [1;33m[INFO] QEMU n'est pas détecté dans le PATH Windows.[0m
    echo Installation recommandée en 1 clic via winget :
    echo   winget install SoftwareFreedomConservancy.QEMU
    echo.
    set /p "INSTALL_QEMU=Voulez-vous lancer l'installation maintenant ? (O/N) : "
    if /i "%INSTALL_QEMU%"=="O" (
        winget install SoftwareFreedomConservancy.QEMU
        echo Veuillez relancer ce script après l'installation.
        pause
        exit /b 0
    )
    pause
    exit /b 1
)

echo [1;32m[1/2] Configuration de l'accélération matérielle Windows (WHPX / KVM)...[0m
echo [1;32m[2/2] Lancement de la VM QEMU...[0m
echo.
echo Appuyez sur Ctrl+Alt+G pour libérer la souris de la fenêtre QEMU.
echo Fermez simplement la fenêtre pour éteindre la VM.
echo.

qemu-system-x86_64 ^
    -accel whpx -accel tcg ^
    -m ${ramMB} ^
    -smp 4 ^
    -vga std ^
    -device virtio-net-pci,netdev=net0 ^
    -netdev user,id=net0,hostfwd=tcp::2222-:22 ^
    ${driveArg}

echo.
echo [1;36m[FIN] Session VM terminée.[0m
pause
`;
}

/**
 * Génère le script shell Linux autonome tester-en-vm.sh
 * Exploite KVM (/dev/kvm) et VirtIO pour un démarrage ultra-rapide
 */
export function generateQemuTestSh(recipe: OSRecipe): string {
  const artifactFile = getGeneratedArtifactFileName(recipe);
  const ramMB = getRecommendedVmRamMB(recipe);
  const isIso = recipe.outputFormat === 'iso_hybrid';

  const driveArg = isIso
    ? `-cdrom "\${IMG_PATH}" -boot d`
    : `-drive file="\${IMG_PATH}",format=${recipe.outputFormat === 'qcow2' ? 'qcow2' : recipe.outputFormat === 'vmdk' ? 'vmdk' : 'raw'},if=virtio`;

  return `#!/usr/bin/env bash
# OSForge Studio by LordMadTrix — Banc d'Essai VM QEMU/KVM
set -euo pipefail

CYAN='\\033[0;36m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m'

echo -e "\${CYAN}===============================================================================\${NC}"
echo -e "\${CYAN}   🚀 OSForge Studio — Banc d'Essai VM Automatisé (by LordMadTrix)           \${NC}"
echo -e "\${CYAN}   Système : ${recipe.branding.osName} | RAM : ${ramMB} Mo | Format : ${recipe.outputFormat} \${NC}"
echo -e "\${CYAN}===============================================================================\${NC}"

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
IMG_PATH="\${SCRIPT_DIR}/dist/${artifactFile}"

if [ ! -f "\${IMG_PATH}" ]; then
    IMG_PATH="\${SCRIPT_DIR}/${artifactFile}"
fi

if [ ! -f "\${IMG_PATH}" ]; then
    echo -e "\${RED}[ERREUR] Image introuvable : \${IMG_PATH}\${NC}"
    echo "Construisez d'abord l'image avec sudo ./build.sh"
    exit 1
fi

if ! command -v qemu-system-x86_64 &>/dev/null; then
    echo -e "\${YELLOW}[INFO] QEMU non trouvé. Installation automatique...\${NC}"
    if command -v apt-get &>/dev/null; then
        sudo apt-get update && sudo apt-get install -y qemu-system-x86
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm qemu-desktop
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y qemu-system-x86
    fi
fi

ACCEL_OPTS="-accel tcg"
if [ -e "/dev/kvm" ] && [ -r "/dev/kvm" ] && [ -w "/dev/kvm" ]; then
    echo -e "\${GREEN}⚡ Accélération matérielle KVM activée (/dev/kvm)\${NC}"
    ACCEL_OPTS="-enable-kvm"
elif [ -e "/dev/kvm" ]; then
    echo -e "\${YELLOW}⚠️ Accès KVM restreint (sudo recommandé pour vitesse maximale)\${NC}"
    ACCEL_OPTS="-enable-kvm"
else
    echo -e "\${YELLOW}⚠️ Émulation logicielle TCG (KVM absent)\${NC}"
fi

echo -e "\${GREEN}==> Démarrage de la machine virtuelle...\${NC}"
echo "    Port SSH transféré : localhost:2222 -> invité:22"
echo "    Appuyez sur Ctrl+Alt+G pour libérer la souris."

qemu-system-x86_64 \\
    \${ACCEL_OPTS} \\
    -m ${ramMB} \\
    -smp 4 \\
    -vga std \\
    -device virtio-net-pci,netdev=net0 \\
    -netdev user,id=net0,hostfwd=tcp::2222-:22 \\
    ${driveArg}

echo -e "\${CYAN}==> VM arrêtée proprement.\${NC}"
`;
}
