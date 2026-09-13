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

function batEscapeText(text: string): string {
  return text.replace(/%/g, '%%').replace(/&/g, '^&').replace(/</g, '^<').replace(/>/g, '^>');
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

  const script = `@echo off
chcp 65001 >nul
title OSForge Studio — Banc d'Essai VM QEMU (by LordMadTrix)
color 0b

reg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

echo ===============================================================================
echo   OSFORGE STUDIO — BANC D'ESSAI VM QEMU (by LordMadTrix)
echo   TESTEUR EN VM QEMU / WHPX RÉEL
echo ===============================================================================
echo   Système cible : ${batEscapeText(recipe.branding.osName)} (${batEscapeText(recipe.branding.editionName || '')})
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
set "QEMU_BIN=qemu-system-x86_64"
where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" (
        set "QEMU_BIN=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"
    ) else (
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
)

echo [1;32m[1/2] Configuration de l'accélération matérielle Windows (WHPX / KVM)...[0m
echo [1;32m[2/2] Lancement de la VM QEMU...[0m
echo.
echo Appuyez sur Ctrl+Alt+G pour libérer la souris de la fenêtre QEMU.
echo Fermez simplement la fenêtre pour éteindre la VM.
echo.

"%QEMU_BIN%" ^
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

  return script.replace(/\r?\n/g, '\r\n');
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

/**
 * Mappe l'identifiant de distribution vers l'ostype VirtualBox
 */
export function getVBoxOsType(distro: string, arch: string): string {
  const is64 = arch === 'x86_64' || arch === 'arm64' || arch === 'riscv64';
  const suffix = is64 ? '_64' : '';

  switch (distro) {
    case 'debian':
    case 'kali':
    case 'parrot':
    case 'dietpi':
      return `Debian${suffix}`;
    case 'ubuntu':
    case 'linuxmint':
    case 'popos':
      return `Ubuntu${suffix}`;
    case 'arch':
    case 'cachyos':
    case 'endeavouros':
      return `ArchLinux${suffix}`;
    case 'fedora':
      return `Fedora${suffix}`;
    case 'rocky':
    case 'almalinux':
      return `RedHat${suffix}`;
    case 'opensuse':
      return `OpenSUSE${suffix}`;
    default:
      return `Linux${suffix}`;
  }
}

/**
 * Génère le script batch Windows autonome tester-en-virtualbox.bat
 * Détecte VBoxManage, crée la machine virtuelle, configure le contrôleur SATA et lance l'OS
 */
export function generateVirtualBoxTestBat(recipe: OSRecipe): string {
  const artifactFile = getGeneratedArtifactFileName(recipe);
  const ramMB = getRecommendedVmRamMB(recipe);
  const osType = getVBoxOsType(recipe.distro, recipe.arch);
  const rawVmName = `OSForge-${recipe.branding.osName.replace(/[^a-zA-Z0-9]/g, '-')}-TestVM`;
  const isIso = recipe.outputFormat === 'iso_hybrid';

  const script = `@echo off
chcp 65001 >nul
title OSForge Studio — Banc d'Essai VirtualBox (by LordMadTrix)
color 0b

echo ===============================================================================
echo   OSFORGE STUDIO — BANC D'ESSAI VIRTUALBOX (by LordMadTrix)
echo   LANCEUR AUTOMATISÉ VIRTUALBOX (VBoxManage)
echo ===============================================================================
echo   Système cible : ${batEscapeText(recipe.branding.osName)} (${batEscapeText(recipe.branding.editionName || '')})
echo   Fichier image : ${artifactFile}
echo   RAM allouée   : ${ramMB} Mo ^| OS Type : ${osType}
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

:: Détection de VBoxManage.exe
set "VBOX_BIN="
if defined VBOX_MSI_INSTALL_PATH (
    if exist "%VBOX_MSI_INSTALL_PATH%VBoxManage.exe" set "VBOX_BIN=%VBOX_MSI_INSTALL_PATH%VBoxManage.exe"
)
if not defined VBOX_BIN (
    if exist "%ProgramFiles%\\Oracle\\VirtualBox\\VBoxManage.exe" set "VBOX_BIN=%ProgramFiles%\\Oracle\\VirtualBox\\VBoxManage.exe"
)
if not defined VBOX_BIN (
    where VBoxManage >nul 2>&1
    if %ERRORLEVEL% equ 0 set "VBOX_BIN=VBoxManage"
)

if not defined VBOX_BIN (
    echo [1;31m[ERREUR] VirtualBox n'est pas détecté sur cette machine.[0m
    echo Vous pouvez l'installer facilement via winget :
    echo   winget install Oracle.VirtualBox
    echo.
    set /p "INSTALL_VBOX=Voulez-vous lancer l'installation maintenant ? (O/N) : "
    if /i "%INSTALL_VBOX%"=="O" (
        winget install Oracle.VirtualBox
        echo Veuillez relancer ce script après l'installation.
        pause
        exit /b 0
    )
    pause
    exit /b 1
)

set "VM_NAME=${rawVmName}"
set "IMG_PATH=%DIST_DIR%\\${artifactFile}"
set "VM_DISK_DIR=%TEMP%\\OSForge-VirtualBox"
if not exist "%VM_DISK_DIR%" mkdir "%VM_DISK_DIR%"
set "TARGET_DISK=%VM_DISK_DIR%\\%VM_NAME%-disk.vdi"

echo [1/4] Nettoyage d'une éventuelle session de test précédente...
"%VBOX_BIN%" controlvm "%VM_NAME%" poweroff >nul 2>&1
"%VBOX_BIN%" unregistervm "%VM_NAME%" --delete >nul 2>&1

echo [2/4] Création de la machine virtuelle VirtualBox "%VM_NAME%"...
"%VBOX_BIN%" createvm --name "%VM_NAME%" --ostype "${osType}" --register
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Échec de création de la VM VirtualBox.
    pause
    exit /b 1
)

echo [3/4] Configuration matérielle (RAM, CPUs, VRAM, contrôleur SATA, NAT SSH)...
"%VBOX_BIN%" modifyvm "%VM_NAME%" --memory ${ramMB} --cpus 4 --vram 128 --graphicscontroller vboxsvga --boot1 dvd --boot2 disk --nic1 nat
"%VBOX_BIN%" modifyvm "%VM_NAME%" --natpf1 "ssh,tcp,,2222,,22"
"%VBOX_BIN%" storagectl "%VM_NAME%" --name "SATA" --add sata --controller IntelAHCI --bootable on

${isIso ? `:: Attachement de l'image ISO bootable
"%VBOX_BIN%" storageattach "%VM_NAME%" --storagectl "SATA" --port 0 --device 0 --type dvddrive --medium "%IMG_PATH%"

:: Création d'un disque virtuel dynamique de 40 Go pour permettre l'installation
if not exist "%TARGET_DISK%" (
    echo Création d'un disque virtuel de 40 Go pour l'installateur...
    "%VBOX_BIN%" createmedium disk --filename "%TARGET_DISK%" --size 40960 --format VDI --variant Standard
)
"%VBOX_BIN%" storageattach "%VM_NAME%" --storagectl "SATA" --port 1 --device 0 --type hdd --medium "%TARGET_DISK%"` : `:: Attachement du disque virtuel
"%VBOX_BIN%" storageattach "%VM_NAME%" --storagectl "SATA" --port 0 --device 0 --type hdd --medium "%IMG_PATH%"`}

echo [4/4] Démarrage de la machine virtuelle...
echo Redirection SSH active : localhost:2222 -> invité:22
"%VBOX_BIN%" startvm "%VM_NAME%" --type gui

echo.
echo [OK] Machine virtuelle lancée dans VirtualBox !
echo Pour supprimer la VM après vos tests, fermez simplement la fenêtre VirtualBox.
pause
`;

  return script.replace(/\r?\n/g, '\r\n');
}

/**
 * Génère le script shell Linux/macOS autonome tester-en-virtualbox.sh
 */
export function generateVirtualBoxTestSh(recipe: OSRecipe): string {
  const artifactFile = getGeneratedArtifactFileName(recipe);
  const ramMB = getRecommendedVmRamMB(recipe);
  const osType = getVBoxOsType(recipe.distro, recipe.arch);
  const rawVmName = `OSForge-${recipe.branding.osName.replace(/[^a-zA-Z0-9]/g, '-')}-TestVM`;
  const isIso = recipe.outputFormat === 'iso_hybrid';

  return `#!/usr/bin/env bash
# OSForge Studio by LordMadTrix — Banc d'Essai VM VirtualBox
set -euo pipefail

CYAN='\\033[0;36m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m'

echo -e "\${CYAN}===============================================================================\${NC}"
echo -e "\${CYAN}   🚀 OSForge Studio — Banc d'Essai VirtualBox Automatisé (by LordMadTrix)    \${NC}"
echo -e "\${CYAN}   Système : ${recipe.branding.osName} | RAM : ${ramMB} Mo | OS : ${osType} \${NC}"
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

if ! command -v VBoxManage &>/dev/null && ! command -v vboxmanage &>/dev/null; then
    echo -e "\${RED}[ERREUR] VirtualBox (VBoxManage) n'est pas installé sur ce système.\${NC}"
    echo "Installez VirtualBox via le gestionnaire de paquets de votre distribution."
    exit 1
fi

VBOX_CMD="VBoxManage"
command -v vboxmanage &>/dev/null && VBOX_CMD="vboxmanage"

VM_NAME="${rawVmName}"
DISK_TARGET="/tmp/\${VM_NAME}-disk.vdi"

echo -e "\${YELLOW}[1/4] Nettoyage de l'ancienne instance VM...\${NC}"
"\${VBOX_CMD}" controlvm "\${VM_NAME}" poweroff 2>/dev/null || true
"\${VBOX_CMD}" unregistervm "\${VM_NAME}" --delete 2>/dev/null || true

echo -e "\${GREEN}[2/4] Création de la VM '\${VM_NAME}' (\${osType})...\${NC}"
"\${VBOX_CMD}" createvm --name "\${VM_NAME}" --ostype "${osType}" --register

echo -e "\${GREEN}[3/4] Configuration mémoire, CPU, affichage et stockage...\${NC}"
"\${VBOX_CMD}" modifyvm "\${VM_NAME}" --memory ${ramMB} --cpus 4 --vram 128 --graphicscontroller vboxsvga --boot1 dvd --boot2 disk --nic1 nat
"\${VBOX_CMD}" modifyvm "\${VM_NAME}" --natpf1 "ssh,tcp,,2222,,22"
"\${VBOX_CMD}" storagectl "\${VM_NAME}" --name "SATA" --add sata --controller IntelAHCI --bootable on

${isIso ? `"\${VBOX_CMD}" storageattach "\${VM_NAME}" --storagectl "SATA" --port 0 --device 0 --type dvddrive --medium "\${IMG_PATH}"
if [ ! -f "\${DISK_TARGET}" ]; then
    "\${VBOX_CMD}" createmedium disk --filename "\${DISK_TARGET}" --size 40960 --format VDI --variant Standard
fi
"\${VBOX_CMD}" storageattach "\${VM_NAME}" --storagectl "SATA" --port 1 --device 0 --type hdd --medium "\${DISK_TARGET}"` : `"\${VBOX_CMD}" storageattach "\${VM_NAME}" --storagectl "SATA" --port 0 --device 0 --type hdd --medium "\${IMG_PATH}"`}

echo -e "\${CYAN}[4/4] Démarrage de la machine virtuelle VirtualBox...\${NC}"
"\${VBOX_CMD}" startvm "\${VM_NAME}" --type gui
echo -e "\${GREEN}==> Session VirtualBox lancée avec succès.\${NC}"
`;
}
