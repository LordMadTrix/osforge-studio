import { OSRecipe } from '../../types/os';

/**
 * Génère les règles udev officielles Khronos OpenXR / xr-hardware
 * Permet l'accès direct aux casques VR (Valve Index, HTC Vive, Meta Quest, Bigscreen Beyond, WMR, PSVR2)
 * sans nécessiter de privilèges root.
 */
export function generateXrHardwareUdevRules(): string {
  return `# OSForge Studio by LordMadTrix — Khronos XR Hardware & VR Headsets Udev Rules
# Valve Index & SteamVR Controllers / Base Stations
ATTRS{idVendor}=="28de", ATTRS{idProduct}=="2000", MODE="0666", GROUP="plugdev", TAG+="uaccess"
ATTRS{idVendor}=="28de", ATTRS{idProduct}=="2101", MODE="0666", GROUP="plugdev", TAG+="uaccess"
ATTRS{idVendor}=="28de", ATTRS{idProduct}=="2102", MODE="0666", GROUP="plugdev", TAG+="uaccess"
ATTRS{idVendor}=="28de", ATTRS{idProduct}=="2300", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# HTC Vive, Vive Pro, Vive Cosmos & Trackers
ATTRS{idVendor}=="0bb4", ATTRS{idProduct}=="2c87", MODE="0666", GROUP="plugdev", TAG+="uaccess"
ATTRS{idVendor}=="0bb4", ATTRS{idProduct}=="0306", MODE="0666", GROUP="plugdev", TAG+="uaccess"
ATTRS{idVendor}=="0bb4", ATTRS{idProduct}=="0309", MODE="0666", GROUP="plugdev", TAG+="uaccess"
ATTRS{idVendor}=="0bb4", ATTRS{idProduct}=="030a", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Meta Quest / Oculus Rift CV1 & Rift S (USB Link, Fastboot & ADB)
ATTRS{idVendor}=="2833", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Bigscreen Beyond
ATTRS{idVendor}=="35bd", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Sony PlayStation VR & PSVR2 PC Adapter
ATTRS{idVendor}=="054c", ATTRS{idProduct}=="09af", MODE="0666", GROUP="plugdev", TAG+="uaccess"
ATTRS{idVendor}=="054c", ATTRS{idProduct}=="0cde", MODE="0666", GROUP="plugdev", TAG+="uaccess"

# Windows Mixed Reality (HP Reverb G2, Samsung Odyssey)
ATTRS{idVendor}=="045e", ATTRS{idProduct}=="0659", MODE="0666", GROUP="plugdev", TAG+="uaccess"
ATTRS{idVendor}=="03f0", ATTRS{idProduct}=="0580", MODE="0666", GROUP="plugdev", TAG+="uaccess"
`;
}

/**
 * Génère les règles udev universelles pour Imprimantes 3D et Graveurs Laser CNC
 * Couvre l'ensemble des puces USB-Série courantes (CH340, CP210x, FTDI, STM32, Arduino)
 */
export function generate3dPrintLaserUdevRules(): string {
  return `# OSForge Studio by LordMadTrix — 3D Printers & Laser Engravers USB-Serial Udev Rules
# Qinheng Electronics CH340 / CH341 (Creality Ender, Ortur, TwoTrees, Elegoo)
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", MODE="0666", GROUP="dialout", TAG+="uaccess"
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="5523", MODE="0666", GROUP="dialout", TAG+="uaccess"
SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="e523", MODE="0666", GROUP="dialout", TAG+="uaccess"

# Silicon Labs CP2102 / CP2104 / CP210x (Sculpfun, Atomstack, Voron, ESP32 Laser)
SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE="0666", GROUP="dialout", TAG+="uaccess"
SUBSYSTEM=="tty", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea70", MODE="0666", GROUP="dialout", TAG+="uaccess"

# FTDI FT232R / FT232H (Prusa MK3S, CNC xPro, Smoothieboard)
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", MODE="0666", GROUP="dialout", TAG+="uaccess"
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6015", MODE="0666", GROUP="dialout", TAG+="uaccess"

# STMicroelectronics Virtual COM Port (STM32 BTT SKR, Robin Nano, Prusa Mini/MK4)
SUBSYSTEM=="tty", ATTRS{idVendor}=="0483", ATTRS{idProduct}=="5740", MODE="0666", GROUP="dialout", TAG+="uaccess"

# Arduino / Atmel Mega2560 & Uno (RepRap RAMPS, CNC Shields)
SUBSYSTEM=="tty", ATTRS{idVendor}=="2341", MODE="0666", GROUP="dialout", TAG+="uaccess"
SUBSYSTEM=="tty", ATTRS{idVendor}=="03eb", ATTRS{idProduct}=="204b", MODE="0666", GROUP="dialout", TAG+="uaccess"

# Raspberry Pi RP2040 (Klipper MCU, Voron CanBridge)
SUBSYSTEM=="tty", ATTRS{idVendor}=="2e8a", ATTRS{idProduct}=="000a", MODE="0666", GROUP="dialout", TAG+="uaccess"
`;
}

/**
 * Génère le script CLI de diagnostic VR (/usr/local/bin/osforge-vr-doctor)
 */
export function generateVrDoctorScript(): string {
  return `#!/usr/bin/env bash
# OSForge Studio by LordMadTrix — Assistant Diagnostic Casques VR & OpenXR
set -euo pipefail

echo "========================================================"
echo " 🥽 OSForge VR Doctor — Diagnostic Réalité Virtuelle"
echo " Conçu & Forgé par LordMadTrix"
echo "========================================================"

echo -e "\\n==> [1/4] Vérification des Règles Udev Matérielles..."
if [ -f "/etc/udev/rules.d/70-xrhardware.rules" ] || [ -f "/usr/lib/udev/rules.d/70-xrhardware.rules" ]; then
    echo "  [✓] Règles udev XR Hardware présentes."
else
    echo "  [!] Règles udev XR Hardware manquantes dans /etc/udev/rules.d/."
fi

echo -e "\\n==> [2/4] Vérification des Groupes Utilisateur..."
CURRENT_USER="\${USER:-$(whoami)}"
for G in plugdev video input games; do
    if id -nG "\${CURRENT_USER}" | grep -qw "\${G}"; then
        echo "  [✓] Utilisateur membre du groupe: \${G}"
    else
        echo "  [-] Utilisateur non membre du groupe: \${G} (recommandé pour la VR)"
    fi
done

echo -e "\\n==> [3/4] Vérification du Runtime OpenXR & Service Monado..."
if [ -f "/etc/xdg/openxr/1/active_runtime.json" ] || [ -f "\${HOME}/.config/openxr/1/active_runtime.json" ]; then
    echo "  [✓] Manifeste OpenXR actif détecté."
else
    echo "  [i] Aucun manifeste OpenXR explicite (SteamVR ou Monado configurera le runtime au premier lancement)."
fi

if systemctl is-active --quiet avahi-daemon 2>/dev/null; then
    echo "  [✓] Démon Avahi mDNS actif (découverte sans fil Quest / Pico opérationnelle)."
else
    echo "  [-] Démon Avahi mDNS inactif (WiVRn / ALVR sans fil nécessite avahi-daemon)."
fi

echo -e "\\n==> [4/4] Périphériques VR USB connectés :"
lsusb | grep -iE "valve|htc|oculus|meta|pico|sony|bigscreen|wivrn" || echo "  (Aucun casque VR filaire détecté en USB actuellement)"

echo -e "\\nDiagnostic terminé !"
`;
}

/**
 * Génère le script CLI de diagnostic Maker (/usr/local/bin/osforge-maker-doctor)
 */
export function generateMakerDoctorScript(): string {
  return `#!/usr/bin/env bash
# OSForge Studio by LordMadTrix — Assistant Diagnostic Impression 3D & Graveur Laser
set -euo pipefail

echo "========================================================"
echo " 🖨️ OSForge Maker Doctor — Diagnostic Impression 3D & Laser"
echo " Conçu & Forgé par LordMadTrix"
echo "========================================================"

echo -e "\\n==> [1/4] Vérification du Conflit BRLTTY (Démon Braille USB)..."
if systemctl is-active --quiet brltty 2>/dev/null || systemctl is-active --quiet brltty-udev 2>/dev/null; then
    echo "  [!] ALERTE : brltty est actif ! Il risque de couper la connexion USB de votre imprimante 3D / laser."
    echo "      Exécutez : sudo systemctl mask brltty.service brltty-udev.service"
else
    echo "  [✓] Démon brltty masqué ou inactif (aucun conflit port série)."
fi

echo -e "\\n==> [2/4] Vérification des Groupes Port Série..."
CURRENT_USER="\${USER:-$(whoami)}"
for G in dialout uucp; do
    if id -nG "\${CURRENT_USER}" | grep -qw "\${G}"; then
        echo "  [✓] Utilisateur membre du groupe: \${G} (accès direct /dev/ttyUSB* et /dev/ttyACM*)"
    fi
done

echo -e "\\n==> [3/4] Règles Udev 3D & Laser..."
if [ -f "/etc/udev/rules.d/99-osforge-3dprint-laser.rules" ]; then
    echo "  [✓] Règles udev USB-Série CH340/CP210x/FTDI configurées."
else
    echo "  [-] Règles udev manquantes."
fi

echo -e "\\n==> [4/4] Ports Série USB Détectés :"
SERIAL_PORTS=$(ls -1 /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || true)
if [ -n "\${SERIAL_PORTS}" ]; then
    echo "\${SERIAL_PORTS}" | while read -r P; do
        PERMS=$(ls -l "\${P}")
        echo "  [+] Port trouvé : \${P} -> \${PERMS}"
    done
else
    echo "  (Aucun port série USB /dev/ttyUSB* ou /dev/ttyACM* détecté actuellement)"
fi

echo -e "\\nDiagnostic terminé !"
`;
}

/**
 * Génère l'ensemble des commandes chroot pour injecter les règles udev, groupes, masquage brltty et outils
 */
export function generateMakerHardwareChrootCommands(recipe: OSRecipe): string {
  const isVrSelected = recipe.selectedPackages.some(p =>
    ['openxr_runtime', 'vr_headset_drivers', 'vr_wireless_streaming'].includes(p)
  );
  const isMakerSelected = recipe.selectedPackages.some(p =>
    ['prusa_slicer', 'freecad_openscad', 'laser_cnc_vector', 'hardware_serial_dialout'].includes(p)
  );

  if (!isVrSelected && !isMakerSelected) {
    return '';
  }

  let script = `
# ==============================================================================
# 🥽 & 🖨️ OSForge Studio — Hardware Automation (VR & 3D Print/Laser by LordMadTrix)
# ==============================================================================
`;

  if (isVrSelected) {
    script += `
echo -e "\${BLUE}[HARDWARE-VR] Configuration de l'écosystème Réalité Virtuelle & OpenXR...\${NC}"

# 1. Déploiement des règles udev universelles Khronos xr-hardware
mkdir -p /etc/udev/rules.d
cat << 'XR_UDEV_EOF' > /etc/udev/rules.d/70-xrhardware.rules
${generateXrHardwareUdevRules()}XR_UDEV_EOF

# 2. Ajout de l'utilisateur aux groupes nécessaires pour la VR
groupadd -r plugdev 2>/dev/null || true
groupadd -r games 2>/dev/null || true
usermod -aG plugdev,video,audio,input,games "${recipe.user.username}" 2>/dev/null || true

# 3. Activation du service Avahi pour la découverte sans-fil mDNS (Meta Quest & Pico)
if command -v systemctl >/dev/null 2>&1; then
    systemctl enable avahi-daemon 2>/dev/null || true
elif command -v rc-update >/dev/null 2>&1; then
    rc-update add avahi-daemon default 2>/dev/null || true
fi

# 4. Script utilitaire de diagnostic VR (/usr/local/bin/osforge-vr-doctor)
mkdir -p /usr/local/bin
cat << 'VR_DOCTOR_EOF' > /usr/local/bin/osforge-vr-doctor
${generateVrDoctorScript()}VR_DOCTOR_EOF
chmod +x /usr/local/bin/osforge-vr-doctor
`;
  }

  if (isMakerSelected) {
    script += `
echo -e "\${BLUE}[HARDWARE-MAKER] Configuration Impression 3D, Graveur Laser & Ports Série...\${NC}"

# 1. Déploiement des règles udev USB-Série (CH340, CP210x, FTDI, STM32)
mkdir -p /etc/udev/rules.d
cat << 'MAKER_UDEV_EOF' > /etc/udev/rules.d/99-osforge-3dprint-laser.rules
${generate3dPrintLaserUdevRules()}MAKER_UDEV_EOF

# 2. Neutralisation du conflit BRLTTY qui déconnecte les imprimantes et lasers en USB
if command -v systemctl >/dev/null 2>&1; then
    systemctl mask brltty.service brltty-udev.service 2>/dev/null || true
fi

# 3. Ajout de l'utilisateur aux groupes de communication série (dialout sur Debian/Fedora, uucp sur Arch)
groupadd -r dialout 2>/dev/null || true
groupadd -r uucp 2>/dev/null || true
usermod -aG dialout,uucp "${recipe.user.username}" 2>/dev/null || true

# 4. Script utilitaire de diagnostic Impression 3D & Laser (/usr/local/bin/osforge-maker-doctor)
mkdir -p /usr/local/bin
cat << 'MAKER_DOCTOR_EOF' > /usr/local/bin/osforge-maker-doctor
${generateMakerDoctorScript()}MAKER_DOCTOR_EOF
chmod +x /usr/local/bin/osforge-maker-doctor
`;
  }

  return script;
}
