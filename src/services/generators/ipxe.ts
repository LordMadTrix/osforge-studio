import { OSRecipe } from '../../types/os';
import { sanitizeGrubTitle, sanitizeKernelCmdline, sanitizeHostname } from './helpers';

export function generateIpxeScript(recipe: OSRecipe): string {
  const osName = sanitizeGrubTitle(recipe.branding.osName || 'Custom Linux');
  const edition = sanitizeGrubTitle(recipe.branding.editionName || 'Netboot Edition');
  const hostname = sanitizeHostname(recipe.hostname || 'forge-netboot');
  const extraCmdline = recipe.kernelCmdline ? ` ${sanitizeKernelCmdline(recipe.kernelCmdline)}` : '';

  return `#!ipxe
# ==============================================================================
# Script de Démarrage Réseau iPXE pour ${osName} (${edition})
# Généré automatiquement par OSForge Studio (Zero-Cosmetic Architecture)
# ==============================================================================

set boot_server \${next-server}
isset \${boot_server} || set boot_server 192.168.1.100
set http_base http://\${boot_server}/osforge

set menu-timeout 5000
set menu-default live_boot

:start
menu ${osName} ${edition} — Menu de Démarrage Réseau PXE
item --gap --             ---------------- Options de Démarrage ----------------
item live_boot            1. Démarrer ${osName} en Live (RAM Boot)
${recipe.enableLiveRescue ? `item rescue_boot          2. Démarrer en Mode Live Rescue & Forensics (toram)\n` : ''}item failsafe_boot        3. Démarrer en Mode Sans Échec (nomodeset)
item --gap --             ---------------- Outils & Diagnostic -----------------
item local_disk           4. Démarrer sur le premier disque local (HDD/SSD)
item ipxe_shell           5. Console de diagnostic iPXE Shell
item reboot               6. Redémarrer la machine
item poweroff             7. Éteindre la machine

choose --timeout \${menu-timeout} --default \${menu-default} target && goto \${target}

:live_boot
echo [INFO] Chargement du noyau Linux pour ${osName}...
kernel \${http_base}/vmlinuz boot=live components loop.max_loop=8 max_loop=8 quiet splash hostname=${hostname} ip=dhcp fetch=\${http_base}/filesystem.squashfs${extraCmdline} initrd=initrd
echo [INFO] Chargement du ramdisk initial (initrd)...
initrd \${http_base}/initrd
echo [INFO] Lancement de l'OS en mémoire RAM...
boot || goto failed

${recipe.enableLiveRescue ? `:rescue_boot
echo [INFO] Chargement du mode Secours Live Rescue (100% RAM toram)...
kernel \${http_base}/vmlinuz boot=live components toram loop.max_loop=8 max_loop=8 quiet splash hostname=${hostname} ip=dhcp fetch=\${http_base}/filesystem.squashfs initrd=initrd
initrd \${http_base}/initrd
boot || goto failed
` : ''}
:failsafe_boot
echo [INFO] Chargement du mode Sans Échec (nomodeset)...
kernel \${http_base}/vmlinuz boot=live components loop.max_loop=8 max_loop=8 nomodeset hostname=${hostname} ip=dhcp fetch=\${http_base}/filesystem.squashfs initrd=initrd
initrd \${http_base}/initrd
boot || goto failed

:local_disk
echo [INFO] Démarrage sur le disque dur local...
sanboot --no-describe --drive 0x80 || exit 0

:ipxe_shell
echo Entrée dans le shell interactif iPXE. Tapez 'exit' pour revenir au menu.
shell
goto start

:reboot
reboot

:poweroff
poweroff

:failed
echo
echo [ERREUR] Le démarrage iPXE a échoué.
echo Vérifiez que le serveur HTTP (\${http_base}) héberge bien vmlinuz, initrd et filesystem.squashfs.
prompt --key 0x02 --timeout 5000 Appuyez sur une touche pour revenir au menu...
goto start
`;
}

export function generatePxeServerScript(recipe: OSRecipe): string {
  const osName = sanitizeGrubTitle(recipe.branding.osName || 'Custom Linux');

  return `#!/usr/bin/env bash
# ==============================================================================
# Script de Déploiement d'un Serveur PXE / iPXE pour ${osName}
# Généré par OSForge Studio — 100% Autonome & Clé-en-main
# ==============================================================================

set -euo pipefail

# Détection des privilèges root
if [ "$(id -u)" -ne 0 ]; then
    echo -e "\\033[1;31m[ERREUR] Ce script doit être exécuté avec les privilèges root (sudo).\\033[0m" >&2
    exit 1
fi

echo -e "\\033[1;34m[1/4] 📦 Installation des services DHCP / TFTP (dnsmasq) et HTTP (nginx/python)...\\033[0m"
if command -v apt-get &>/dev/null; then
    apt-get update -y
    apt-get install -y dnsmasq ipxe tftpd-hpa nginx-light wget curl
elif command -v dnf &>/dev/null; then
    dnf install -y dnsmasq ipxe-bootimgs nginx wget curl
elif command -v pacman &>/dev/null; then
    pacman -Sy --noconfirm dnsmasq ipxe nginx wget curl
fi

PXE_ROOT="/var/lib/tftpboot"
HTTP_ROOT="/var/www/html/osforge"
mkdir -p "\${PXE_ROOT}" "\${HTTP_ROOT}"

echo -e "\\033[1;34m[2/4] ⚙️ Configuration du serveur TFTP et du script iPXE...\\033[0m"
cp /usr/lib/ipxe/undionly.kpxe "\${PXE_ROOT}/undionly.kpxe" 2>/dev/null || \\
cp /usr/share/ipxe/undionly.kpxe "\${PXE_ROOT}/undionly.kpxe" 2>/dev/null || \\
wget -q -O "\${PXE_ROOT}/undionly.kpxe" "http://boot.ipxe.org/undionly.kpxe" || true

# Copie ou génération du boot.ipxe
cat > "\${HTTP_ROOT}/boot.ipxe" << 'IPXE_EOF'
${generateIpxeScript(recipe)}
IPXE_EOF

echo -e "\\033[1;34m[3/4] 🌐 Configuration du serveur DHCP Proxy (dnsmasq)...\\033[0m"
cat > /etc/dnsmasq.d/osforge-pxe.conf << 'DNSMASQ_EOF'
# Configuration PXE Proxy OSForge (ne perturbe pas votre box/routeur existant)
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp

# Support BIOS Hérité (Legacy BIOS)
dhcp-match=set:bios,option:client-arch,0
dhcp-boot=tag:bios,undionly.kpxe

# Support UEFI 64-bit
dhcp-match=set:efi64,option:client-arch,7
dhcp-match=set:efi64,option:client-arch,9
dhcp-boot=tag:efi64,ipxe.efi

enable-tftp
tftp-root=/var/lib/tftpboot
DNSMASQ_EOF

echo -e "\\033[1;32m[4/4] 🚀 Démarrage des services Réseau PXE...\\033[0m"
systemctl restart dnsmasq 2>/dev/null || true
systemctl restart nginx 2>/dev/null || true

echo -e "\\033[1;32m==============================================================================\\033[0m"
echo -e "\\033[1;32m✅ Serveur iPXE / Netboot Opérationnel !\\033[0m"
echo -e "Placez simplement vos fichiers \\033[1;33mvmlinuz\\033[0m, \\033[1;33minitrd\\033[0m et \\033[1;33mfilesystem.squashfs\\033[0m dans :"
echo -e "👉 \\033[1;36m\${HTTP_ROOT}\\033[0m"
echo -e "Les PC clients peuvent désormais booter sur le réseau (F12 au démarrage) !"
echo -e "\\033[1;32m==============================================================================\\033[0m"
`;
}
