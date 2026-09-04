import { OSRecipe } from '../../types/os';
import { resolvePackageList } from './packages';
import {
  shQuote,
  shellQuotePkgList,
  sanitizeKernelCmdline,
  dmEnableCmd,
  localeSetupCmd,
  userSshSetupCmd,
  networkConfigCmd,
  vpnConfigCmd,
  communityReposCmd,
  gamingSysctlCmd,
  powerSavingCmd,
  sshHardeningCmd,
  macHardeningCmd,
  firewallCmd,
  autoSecurityUpdatesCmd,
  cisHardeningCmd,
  zramSetupCmd,
  flatpakSetupCmd,
  dmAutologinCmd,
  kioskSetupCmd,
  dotfilesCloneCmd,
  customServicesCmd,
  k3sSetupCmd,
  tailscaleServiceCmd,
  ollamaSetupCmd,
  opentofuSetupCmd,
  k8sCliSetupCmd,
  zigSetupCmd,
  vscodiumSetupCmd,
  uvSetupCmd,
  heroicSetupCmd,
  metasploitSetupCmd,
  firstbootTriggerCmd,
} from './helpers';
import { generateBrandingChrootCommands } from './branding';

function generateRpiDistroSourcesList(distro: string): string {
  if (distro === 'armbian') {
    return `echo "deb http://deb.debian.org/debian bookworm main" > /etc/apt/sources.list
echo "deb [signed-by=/etc/apt/keyrings/raspberrypi.gpg.key] http://archive.raspberrypi.com/debian bookworm main" >> /etc/apt/sources.list
mkdir -p /etc/apt/keyrings
curl -fsSL http://apt.armbian.com/armbian.key | gpg --dearmor -o /etc/apt/keyrings/armbian.gpg 2>/dev/null || true
echo "deb [signed-by=/etc/apt/keyrings/armbian.gpg] http://apt.armbian.com bookworm main bookworm-utils bookworm-desktop" >> /etc/apt/sources.list`;
  }

  return `echo "deb http://deb.debian.org/debian bookworm main" > /etc/apt/sources.list
echo "deb [signed-by=/etc/apt/keyrings/raspberrypi.gpg.key] http://archive.raspberrypi.com/debian bookworm main" >> /etc/apt/sources.list`;
}

function generateRpiDistroChrootCmd(recipe: OSRecipe): string {
  const username = recipe.user.username;

  if (recipe.distro === 'dietpi') {
    return `
# Configuration spécifique DietPi (RAMlog & Bannière d'accueil)
echo "tmpfs /var/log tmpfs defaults,noatime,nosuid,nodev,noexec,mode=0755,size=50M 0 0" >> /etc/fstab
cat << 'DIETPI_WELCOME_EOF' > /etc/profile.d/dietpi-welcome.sh
#!/bin/sh
echo -e "\\033[0;32m"
echo "  ____  _      _   ____  _ "
echo " |  _ \\\\(_) ___| |_|  _ \\\\(_)"
echo " | | | | |/ _ \\\\ __| |_) | |"
echo " | |_| | |  __/ |_|  __/| |"
echo " |____/|_|\\\\___|\\\\__|_|   |_|"
echo -e "\\033[0m"
echo " DietPi v9.8 (ARM64) | RAMlog Active | RAM: \\\$(free -h 2>/dev/null | awk '/^Mem:/{print \\\$3\" / \"\\\$2}')"
echo ""
DIETPI_WELCOME_EOF
chmod +x /etc/profile.d/dietpi-welcome.sh
`;
  }

  if (recipe.distro === 'retropie') {
    return `
# Configuration RetroPie (EmulationStation, outils SDL2, Gamepads & ROMs)
apt-get install -y --no-install-recommends libsdl2-2.0-0 joystick evtest alsa-utils dialog git || true
mkdir -p /opt/retropie-setup
git clone --depth=1 https://github.com/RetroPie/RetroPie-Setup.git /opt/retropie-setup 2>/dev/null || true
chown -R ${shQuote(username)}:${shQuote(username)} /opt/retropie-setup 2>/dev/null || true

mkdir -p "/home/${shQuote(username)}/RetroPie/BIOS"
for sys in nes snes megadrive gba psx arcade n64 gbc; do
    mkdir -p "/home/${shQuote(username)}/RetroPie/roms/\\$sys"
done
chown -R ${shQuote(username)}:${shQuote(username)} "/home/${shQuote(username)}/RetroPie" 2>/dev/null || true

cat << 'GAMEPAD_EOF' > /etc/udev/rules.d/99-gamepads.rules
KERNEL=="js*", ATTRS{idVendor}=="045e", MODE="0666"
KERNEL=="js*", ATTRS{idVendor}=="054c", MODE="0666"
KERNEL=="js*", ATTRS{idVendor}=="057e", MODE="0666"
KERNEL=="js*", ATTRS{idVendor}=="2dc8", MODE="0666"
SUBSYSTEM=="input", ATTRS{name}=="*Controller*", MODE="0666"
GAMEPAD_EOF

cat << 'RETROPIE_AUTO_EOF' >> "/home/${shQuote(username)}/.profile"
if [ -z "\\$DISPLAY" ] && [ "\\\$(tty)" = "/dev/tty1" ]; then
    which emulationstation >/dev/null 2>&1 && exec emulationstation
fi
RETROPIE_AUTO_EOF
`;
  }

  if (recipe.distro === 'armbian') {
    return `
# Configuration Armbian (Télémétrie thermique SoC et outils Armbian)
apt-get install -y --no-install-recommends armbian-config zram-config || true
cat << 'ARMBIAN_MONITOR_EOF' > /usr/local/bin/armbianmonitor
#!/usr/bin/env bash
echo "Armbian SoC Telemetry Monitor — \\\$(uname -m)"
echo "CPU Freq : \\\$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq 2>/dev/null || echo 'N/A') kHz"
echo "Temp SoC : \\\$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null | awk '{printf \"%.1f°C\", \\\$1/1000}' || echo 'N/A')"
echo "Memory   : \\\$(free -h 2>/dev/null | awk '/^Mem:/{print \\\$3\" / \"\\\$2}')"
ARMBIAN_MONITOR_EOF
chmod +x /usr/local/bin/armbianmonitor
`;
  }

  if (recipe.distro === 'raspap') {
    const wifiSsid = recipe.network?.wifiSsid || 'OSForge-Pi-WiFi';
    const wifiPass = recipe.network?.wifiPassword || 'ForgeRouter2026!';
    return `
# Configuration RaspAP (Routeur Wi-Fi autonome, hostapd, DHCP dnsmasq & portail Web)
apt-get install -y --no-install-recommends hostapd dnsmasq iptables-persistent netfilter-persistent lighttpd php-cgi || true

cat << 'HOSTAPD_EOF' > /etc/hostapd/hostapd.conf
interface=wlan0
driver=nl80211
ssid=${wifiSsid}
hw_mode=g
channel=6
wmm_enabled=1
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=${wifiPass}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
HOSTAPD_EOF

cat << 'DNSMASQ_EOF' > /etc/dnsmasq.d/090_raspap.conf
interface=wlan0
dhcp-range=10.3.141.50,10.3.141.200,255.255.255.0,24h
domain=wlan
address=/gw.wlan/10.3.141.1
DNSMASQ_EOF

echo "net.ipv4.ip_forward = 1" > /etc/sysctl.d/30-raspap.conf
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE 2>/dev/null || true
netfilter-persistent save 2>/dev/null || true

mkdir -p /var/www/html
cat << 'RASPAP_WEB_EOF' > /var/www/html/index.php
<?php
\\$hostname = gethostname();
\\$ip = \\\$_SERVER['SERVER_ADDR'] ?? '10.3.141.1';
?>
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>RaspAP Dashboard</title>
<style>body{font-family:sans-serif;background:#18181b;color:#f4f4f5;padding:40px;text-align:center;}
.card{background:#27272a;padding:25px;border-radius:12px;max-width:500px;margin:auto;border:1px solid #3f3f46;}
h1{color:#e11d48;} .badge{background:#e11d48;padding:4px 8px;border-radius:6px;font-size:12px;}
</style></head><body>
<div class="card">
<h1>📡 RaspAP Gateway</h1>
<p><span class="badge">ACTIVE HOTSPOT</span></p>
<p><strong>SSID :</strong> ${wifiSsid}</p>
<p><strong>Adresse IP :</strong> <?= \\$ip ?></p>
<p><strong>Hôte :</strong> <?= \\$hostname ?></p>
<p>Routage NAT vers Ethernet & Serveur DNS/DHCP opérationnels.</p>
</div></body></html>
RASPAP_WEB_EOF
chown -R www-data:www-data /var/www/html 2>/dev/null || true
`;
  }

  return '';
}

function generateRpiBootFsExtras(recipe: OSRecipe): string {
  if (recipe.distro === 'dietpi') {
    const wifiEnabled = recipe.network?.wifiSsid ? '1' : '0';
    const wifiSsid = recipe.network?.wifiSsid || '';
    const wifiPass = recipe.network?.wifiPassword || '';
    const locale = recipe.locale || 'fr_FR.UTF-8';
    const tz = recipe.timezone || 'Europe/Paris';

    return `
# Injection de la configuration officielle DietPi headless (dietpi.txt)
cat > "\${MNT_DIR}/boot/firmware/dietpi.txt" << 'DIETPI_CFG_EOF'
AUTO_SETUP_ACCEPT_LICENSE=1
AUTO_SETUP_LOCALE=${locale}
AUTO_SETUP_KEYBOARD_LAYOUT=${recipe.keyboardLayout || 'fr'}
AUTO_SETUP_TIMEZONE=${tz}
AUTO_SETUP_NET_WIFI_ENABLED=${wifiEnabled}
${wifiSsid ? `AUTO_SETUP_NET_WIFI_SSID=${wifiSsid}\nAUTO_SETUP_NET_WIFI_KEY=${wifiPass}` : ''}
AUTO_SETUP_SSH_SERVER_INDEX=1
AUTO_SETUP_AUTOMATED=1
CONFIG_CPU_GOVERNOR=schedutil
DIETPI_CFG_EOF
`;
  }

  return '';
}

export function generateRpiSdScript(recipe: OSRecipe): string {
  const pkgs = shellQuotePkgList(resolvePackageList(recipe));
  const imgName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.img`;
  const dmCmd = dmEnableCmd(recipe.displayManager, 'debian');

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Carte SD Raspberry Pi (image .img.xz prête à flasher)
# OS: ${recipe.branding.osName} (${recipe.branding.editionName})
# Base: Raspberry Pi OS (Debian bookworm, arm64) | Format: rpi_sd
# Date de génération: ${new Date().toISOString()}
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

echo -e "\${CYAN}=======================================================\${NC}"
echo -e "\${CYAN}   🍓 OSForge Studio : Image Carte SD Raspberry Pi    \${NC}"
echo -e "\${CYAN}   Nom d'hôte         : "${shQuote(recipe.hostname)}"\${NC}"
echo -e "\${CYAN}=======================================================\${NC}"

if [[ $EUID -ne 0 ]]; then
   echo -e "\${RED}[ERREUR] Ce script doit être exécuté avec les privilèges root (sudo).\${NC}"
   exit 1
fi

WORK_DIR="/var/tmp/osforge-build-$(date +%s)"
ROOTFS_DIR="\${WORK_DIR}/rootfs"
MNT_DIR="\${WORK_DIR}/mnt"
OUTPUT_DIR="$(pwd)/dist"
mkdir -p "\${ROOTFS_DIR}" "\${MNT_DIR}" "\${OUTPUT_DIR}"

echo -e "\${YELLOW}[1/6] 📦 Installation des dépendances de compilation de l'hôte...\${NC}"
which debootstrap qemu-img parted mkfs.vfat qemu-aarch64-static xz >/dev/null 2>&1 || {
    echo -e "\${YELLOW}Installation des outils requis sur l'hôte (bootstrap + émulation ARM64)...\${NC}"
    apt-get update -y && apt-get install -y debootstrap qemu-user-static binfmt-support parted dosfstools qemu-utils xz-utils
}

echo -e "\${YELLOW}[2/6] 🏗️ Bootstrap ARM64 du système Debian de base ("${shQuote(recipe.hostname)}" / bookworm)...\${NC}"
debootstrap --arch=arm64 --foreign bookworm "\${ROOTFS_DIR}" http://deb.debian.org/debian
cp /usr/bin/qemu-aarch64-static "\${ROOTFS_DIR}/usr/bin/"
chroot "\${ROOTFS_DIR}" /debootstrap/debootstrap --second-stage

echo -e "\${YELLOW}[3/6] ⚙️ Ajout du dépôt Raspberry Pi, installation du noyau et configuration...\${NC}"
mkdir -p "\${ROOTFS_DIR}/etc/apt/keyrings"
curl -fsSL https://archive.raspberrypi.com/debian/raspberrypi.gpg.key -o "\${ROOTFS_DIR}/etc/apt/keyrings/raspberrypi.gpg.key"

mount --bind /dev "\${ROOTFS_DIR}/dev"
mount --bind /dev/pts "\${ROOTFS_DIR}/dev/pts" 2>/dev/null || true
mount --bind /proc "\${ROOTFS_DIR}/proc"
mount --bind /sys "\${ROOTFS_DIR}/sys"
cp /etc/resolv.conf "\${ROOTFS_DIR}/etc/resolv.conf" 2>/dev/null || true

cat << 'CHROOT_EOF' | chroot "\${ROOTFS_DIR}" /bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

${generateRpiDistroSourcesList(recipe.distro)}

apt-get update -y
apt-get install -y --no-install-recommends raspberrypi-kernel raspi-firmware systemd-sysv ca-certificates locales sudo curl wget gnupg iproute2 openssh-server

for pkg in ${pkgs}; do
    apt-get install -y --no-install-recommends "$pkg" || echo "Info: $pkg omis ou non disponible dans le dépôt."
done

echo ${shQuote(recipe.hostname)} > /etc/hostname
cat << 'HOSTS' > /etc/hosts
127.0.0.1   localhost ${recipe.hostname}
::1         localhost ip6-localhost ip6-loopback
HOSTS

${generateBrandingChrootCommands(recipe, 'debian')}

ln -sf /usr/share/zoneinfo/${recipe.timezone} /etc/localtime
${localeSetupCmd(recipe, 'debian')}

if ! id ${shQuote(recipe.user.username)} &>/dev/null; then
    useradd -m -s ${shQuote(recipe.user.shell)} -c ${shQuote(recipe.user.fullName)} ${shQuote(recipe.user.username)}
    echo ${shQuote(recipe.user.username)}:${shQuote(recipe.user.password || 'forge')} | chpasswd
    ${recipe.user.sudo ? `usermod -aG sudo ${shQuote(recipe.user.username)}` : ''}
fi

# Synchronisation du squelette /etc/skel vers le home utilisateur
if [ -d "/home/${shQuote(recipe.user.username)}" ]; then
    cp -rn /etc/skel/. "/home/${shQuote(recipe.user.username)}/" 2>/dev/null || true
    chown -R ${shQuote(recipe.user.username)}:${shQuote(recipe.user.username)} "/home/${shQuote(recipe.user.username)}" 2>/dev/null || true
fi
echo "root:toor" | chpasswd

${recipe.enableSSH ? 'systemctl enable ssh || true' : ''}
${userSshSetupCmd(recipe)}
${networkConfigCmd(recipe, 'debian')}
${vpnConfigCmd(recipe, 'debian')}
${communityReposCmd(recipe, 'debian')}
${gamingSysctlCmd(recipe)}
${powerSavingCmd(recipe, 'debian')}
${sshHardeningCmd(recipe, 'debian')}
${macHardeningCmd(recipe, 'debian')}
${autoSecurityUpdatesCmd(recipe, 'debian')}
${cisHardeningCmd(recipe, 'debian')}
${zramSetupCmd(recipe, 'debian')}
${flatpakSetupCmd(recipe, 'debian')}

${dmCmd}
${dmAutologinCmd(recipe, 'debian')}
${kioskSetupCmd(recipe, 'debian')}
${dotfilesCloneCmd(recipe)}
${customServicesCmd(recipe, 'debian')}
${k3sSetupCmd(recipe, 'debian')}
${tailscaleServiceCmd(recipe, 'debian')}
${ollamaSetupCmd(recipe, 'debian')}
${opentofuSetupCmd(recipe, 'debian')}
${k8sCliSetupCmd(recipe, 'debian')}
${zigSetupCmd(recipe, 'debian')}
${vscodiumSetupCmd(recipe, 'debian')}
${uvSetupCmd(recipe, 'debian')}
${heroicSetupCmd(recipe, 'debian')}
${metasploitSetupCmd(recipe, 'debian')}
${firewallCmd(recipe, 'debian')}
${generateRpiDistroChrootCmd(recipe)}

cat << 'FIRSTBOOT_EOF' > /root/firstboot.sh
#!/usr/bin/env bash
${recipe.firstBootScript || '# Aucun script first-boot spécifique'}
FIRSTBOOT_EOF
chmod +x /root/firstboot.sh
${recipe.firstBootScript ? firstbootTriggerCmd('debian') : ''}
CHROOT_EOF

umount -lf "\${ROOTFS_DIR}/sys" || true
umount -lf "\${ROOTFS_DIR}/proc" || true
umount -lf "\${ROOTFS_DIR}/dev/pts" || true
umount -lf "\${ROOTFS_DIR}/dev" || true

echo -e "\${YELLOW}[4/6] 💽 Partitionnement de l'image (FAT32 boot + ext4 root)...\${NC}"
RAW_IMG="\${OUTPUT_DIR}/${imgName}"
qemu-img create -f raw "\${RAW_IMG}" 4G
parted -s "\${RAW_IMG}" mklabel msdos
parted -s "\${RAW_IMG}" mkpart primary fat32 1MiB 257MiB
parted -s "\${RAW_IMG}" set 1 boot on
parted -s "\${RAW_IMG}" mkpart primary ext4 257MiB 100%

LOOPDEV=$(losetup -f)
losetup -P "\${LOOPDEV}" "\${RAW_IMG}"
mkfs.vfat -F 32 -n bootfs "\${LOOPDEV}p1"
mkfs.ext4 -F -L rootfs "\${LOOPDEV}p2"

mount "\${LOOPDEV}p2" "\${MNT_DIR}"
mkdir -p "\${MNT_DIR}/boot/firmware"
mount "\${LOOPDEV}p1" "\${MNT_DIR}/boot/firmware"

echo -e "\${YELLOW}[5/6] 🖲️ Copie du système de fichiers vers la carte SD...\${NC}"
cp -a "\${ROOTFS_DIR}"/. "\${MNT_DIR}"/

BOOT_UUID=$(blkid -s UUID -o value "\${LOOPDEV}p1")
ROOT_UUID=$(blkid -s UUID -o value "\${LOOPDEV}p2")

cat > "\${MNT_DIR}/etc/fstab" << FSTAB_EOF
UUID=\${ROOT_UUID} / ext4 defaults,noatime 0 1
UUID=\${BOOT_UUID} /boot/firmware vfat defaults 0 2
FSTAB_EOF

cat > "\${MNT_DIR}/boot/firmware/cmdline.txt" << CMDLINE_EOF
console=serial0,115200 console=tty1 root=UUID=\${ROOT_UUID} rootfstype=ext4 fsck.repair=yes rootwait${recipe.kernelCmdline ? ` ${sanitizeKernelCmdline(recipe.kernelCmdline)}` : ''}
CMDLINE_EOF
${generateRpiBootFsExtras(recipe)}

umount -lf "\${MNT_DIR}/boot/firmware" || true
umount -lf "\${MNT_DIR}" || true
losetup -d "\${LOOPDEV}" || true

echo -e "\${YELLOW}[6/6] 🗜️ Compression XZ de l'image (.img.xz, prête à flasher)...\${NC}"
xz -T0 -f "\${RAW_IMG}"

echo -e "\${GREEN}=======================================================\${NC}"
echo -e "\${GREEN}   ✅ Image Carte SD Raspberry Pi générée : \${OUTPUT_DIR}/${imgName}.xz\${NC}"
echo -e "\${GREEN}   Taille du fichier : $(du -h "\${OUTPUT_DIR}/${imgName}.xz" 2>/dev/null | cut -f1 || echo "OK")\${NC}"
echo -e "\${GREEN}   Flashage : Raspberry Pi Imager ou Balena Etcher (image .xz supportée nativement)\${NC}"
echo -e "\${GREEN}=======================================================\${NC}"
`;
}
