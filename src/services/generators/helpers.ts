import { OSRecipe } from '../../types/os';
import { NonDebianFamily, KEYBOARD_XKB_MAP } from './types';

export function shQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function shellQuotePkgList(names: string[]): string {
  return names.map(shQuote).join(' ');
}

export function sanitizeForUnquotedHeredoc(value: string): string {
  return value.replace(/[$`\\]/g, '').trim();
}

export function sanitizeKernelCmdline(cmdline: string): string {
  return sanitizeForUnquotedHeredoc(cmdline);
}

export function sanitizeGrubTitle(value: string): string {
  return value.replace(/[";{}$`\\]/g, '').trim();
}

export function nonNativeArchNotice(unameArch: string, familyLabel: string): string {
  if (unameArch === 'x86_64') return '';
  return `echo -e "\${YELLOW}[INFO] Le bootstrap ${familyLabel} n'est pas encore câblé pour une architecture autre que x86_64 : l'image générée sera réellement x86_64, quel que soit le choix \\"${unameArch}\\" fait dans l'interface.\${NC}"\n`;
}

export function resolveXkb(keyboardLayout: string): { layout: string; variant?: string } {
  return KEYBOARD_XKB_MAP[keyboardLayout] || { layout: 'us' };
}

export function resolveDmServiceName(displayManager: string, family: 'debian' | NonDebianFamily): string | null {
  if (displayManager === 'none') return null;
  if (displayManager === 'ly') {
    return (family === 'arch' || family === 'fedora' || family === 'suse') ? 'ly@tty2.service' : null;
  }
  if (displayManager === 'gdm3') return family === 'debian' ? 'gdm3' : 'gdm';
  return displayManager;
}

export function serviceEnableCmd(service: string, family: 'debian' | NonDebianFamily): string {
  if (family === 'alpine') return `rc-update add ${service} default 2>/dev/null || true`;
  if (family === 'void') return `mkdir -p /etc/runit/runsvdir/default && ln -sf /etc/sv/${service} /etc/runit/runsvdir/default/${service} 2>/dev/null || true`;
  return `systemctl enable ${service} 2>/dev/null || true`;
}

export function dmEnableCmd(displayManager: string, family: 'debian' | NonDebianFamily): string {
  const svc = resolveDmServiceName(displayManager, family);
  if (!svc) return '';
  return serviceEnableCmd(svc, family);
}

export function firstbootTriggerCmd(family: 'debian' | NonDebianFamily): string {
  if (family === 'alpine') {
    return `cat > /etc/init.d/firstboot << 'FBSVC_EOF'
#!/sbin/openrc-run
description="OSForge Studio - script de premier demarrage"
depend() {
    need net
}
start() {
    ebegin "Execution du script de premier demarrage"
    /root/firstboot.sh
    rc-update del firstboot default 2>/dev/null || true
    eend $?
}
FBSVC_EOF
chmod +x /etc/init.d/firstboot
${serviceEnableCmd('firstboot', family)}`;
  }
  if (family === 'void') {
    return `mkdir -p /etc/sv/firstboot
cat > /etc/sv/firstboot/run << 'FBSVC_EOF'
#!/bin/sh
exec 2>&1
/root/firstboot.sh
rm -f /etc/runit/runsvdir/default/firstboot
exit 0
FBSVC_EOF
chmod +x /etc/sv/firstboot/run
${serviceEnableCmd('firstboot', family)}`;
  }
  return `cat > /etc/systemd/system/firstboot.service << 'FBSVC_EOF'
[Unit]
Description=OSForge Studio - script de premier demarrage
After=network.target

[Service]
Type=oneshot
ExecStart=/root/firstboot.sh
ExecStartPost=-/usr/bin/systemctl disable firstboot.service
RemainAfterExit=no

[Install]
WantedBy=multi-user.target
FBSVC_EOF
${serviceEnableCmd('firstboot.service', family)}`;
}

export function k3sSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.selectedPackages.includes('k3s')) return '';
  if (family === 'alpine') return '';
  if (family === 'void') {
    return `echo -e "\${YELLOW:-}[INFO] K3s n'est pas encore câblé pour Void : aucun paquet xbps réel et l'installeur officiel (get.k3s.io) ne documente pas de support runit.\${NC:-}" 2>/dev/null || true`;
  }
  return `cat > /etc/systemd/system/k3s-setup.service << 'K3SSVC_EOF'
[Unit]
Description=OSForge Studio - installation K3s (get.k3s.io)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c "curl -sfL https://get.k3s.io | sh -"
ExecStartPost=-/usr/bin/systemctl disable k3s-setup.service
RemainAfterExit=no
TimeoutStartSec=600

[Install]
WantedBy=multi-user.target
K3SSVC_EOF
${serviceEnableCmd('k3s-setup.service', family)}`;
}

export function tailscaleServiceCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.selectedPackages.includes('wireguard')) return '';
  return serviceEnableCmd('tailscaled', family);
}

export function ollamaSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.selectedPackages.includes('ollama_ai')) return '';
  if (family === 'alpine' || family === 'arch' || family === 'fedora' || family === 'suse') return '';
  if (family === 'void') {
    return `echo -e "\${YELLOW:-}[INFO] Ollama n'est pas encore câblé pour Void : aucun paquet xbps réel et l'installeur officiel (ollama.com/install.sh) ne documente pas de support runit.\${NC:-}" 2>/dev/null || true`;
  }
  return `cat > /etc/systemd/system/ollama-setup.service << 'OLLAMASVC_EOF'
[Unit]
Description=OSForge Studio - installation Ollama (ollama.com/install.sh)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/bin/sh -c "curl -fsSL https://ollama.com/install.sh | sh"
ExecStartPost=-/usr/bin/systemctl disable ollama-setup.service
RemainAfterExit=no
TimeoutStartSec=900

[Install]
WantedBy=multi-user.target
OLLAMASVC_EOF
${serviceEnableCmd('ollama-setup.service', family)}`;
}

export function opentofuSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.selectedPackages.includes('opentofu_terraform')) return '';
  if (family !== 'debian') return '';
  return `curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o /tmp/install-opentofu.sh 2>/dev/null \\
  && chmod +x /tmp/install-opentofu.sh \\
  && /tmp/install-opentofu.sh --install-method deb 2>/dev/null \\
  && rm -f /tmp/install-opentofu.sh \\
  || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation d'OpenTofu échouée (réseau indisponible pendant la compilation ?).\${NC:-}"`;
}

export function k8sCliSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.selectedPackages.includes('k8s_cli_tools')) return '';
  if (family === 'alpine' || family === 'arch' || family === 'fedora' || family === 'void') return '';
  const kubectlArch = recipe.arch === 'x86_64' ? 'amd64' : recipe.arch === 'aarch64' ? 'arm64' : recipe.arch === 'i686' ? '386' : null;
  const kubectlCmd = kubectlArch
    ? `curl -fsSL "https://dl.k8s.io/release/$(curl -fsSL https://dl.k8s.io/release/stable.txt)/bin/linux/${kubectlArch}/kubectl" -o /usr/local/bin/kubectl 2>/dev/null \\
  && chmod +x /usr/local/bin/kubectl \\
  || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation de kubectl échouée (réseau indisponible pendant la compilation ?).\${NC:-}"`
    : `echo -e "\${YELLOW:-}[INFO] kubectl n'est pas encore câblé pour l'architecture ${recipe.arch} : dl.k8s.io ne publie pas de binaire officiel pour cette cible.\${NC:-}" 2>/dev/null || true`;
  if (family === 'suse') return kubectlCmd;
  const helmCmd = `curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-4 -o /tmp/get-helm.sh 2>/dev/null \\
  && chmod 700 /tmp/get-helm.sh \\
  && /tmp/get-helm.sh 2>/dev/null \\
  && rm -f /tmp/get-helm.sh \\
  || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation de Helm échouée (réseau indisponible pendant la compilation ?).\${NC:-}"`;
  return `${kubectlCmd}\n${helmCmd}`;
}

export function zigSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.selectedPackages.includes('zig_compiler')) return '';
  if (family !== 'debian') return '';
  const zigArch = recipe.arch === 'x86_64' ? 'x86_64' : recipe.arch === 'aarch64' ? 'aarch64' : recipe.arch === 'i686' ? 'x86' : recipe.arch === 'riscv64' ? 'riscv64' : null;
  if (!zigArch) {
    return `echo -e "\${YELLOW:-}[INFO] Zig n'est pas encore câblé pour l'architecture ${recipe.arch}.\${NC:-}" 2>/dev/null || true`;
  }
  return `apt-get install -y --no-install-recommends xz-utils 2>/dev/null || true
ZIG_VERSION=$(curl -fsSL https://ziglang.org/download/index.json 2>/dev/null | grep -oE '"[0-9]+\\.[0-9]+\\.[0-9]+"[[:space:]]*:' | grep -oE '[0-9]+\\.[0-9]+\\.[0-9]+' | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)
if [ -n "\${ZIG_VERSION:-}" ]; then
  curl -fsSL "https://ziglang.org/download/\${ZIG_VERSION}/zig-${zigArch}-linux-\${ZIG_VERSION}.tar.xz" -o /tmp/zig.tar.xz 2>/dev/null \\
  && mkdir -p /opt/zig \\
  && tar -xJf /tmp/zig.tar.xz -C /opt/zig --strip-components=1 2>/dev/null \\
  && ln -sf /opt/zig/zig /usr/local/bin/zig \\
  && rm -f /tmp/zig.tar.xz \\
  || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation de Zig échouée (réseau indisponible pendant la compilation ?).\${NC:-}"
else
  echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation de Zig échouée : impossible de déterminer la dernière version stable.\${NC:-}"
fi`;
}

export function vscodiumSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.selectedPackages.includes('vscodium')) return '';
  if (family === 'arch') {
    return `echo -e "\${YELLOW:-}[INFO] VSCodium n'est pas encore câblé pour Arch : aucun paquet officiel (AUR uniquement, \\"vscodium-bin\\"), or ce générateur n'installe jamais de paquet AUR.\${NC:-}" 2>/dev/null || true`;
  }
  if (family === 'alpine') {
    return `echo -e "\${YELLOW:-}[INFO] VSCodium n'est pas encore câblé pour Alpine : le seul paquet réel (\\"vscodium\\") est dans le dépôt \\"testing\\" (instable, non activé par ce générateur).\${NC:-}" 2>/dev/null || true`;
  }
  if (family === 'fedora') {
    return `cat > /etc/yum.repos.d/vscodium.repo << 'VSCODIUMREPO_EOF'
[gitlab.com_paulcarroty_vscodium_repo]
name=gitlab.com_paulcarroty_vscodium_repo
baseurl=https://paulcarroty.gitlab.io/vscodium-deb-rpm-repo/rpms/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://gitlab.com/paulcarroty/vscodium-deb-rpm-repo/raw/master/pub.gpg
metadata_expire=1h
VSCODIUMREPO_EOF
dnf install -y codium 2>/dev/null || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation de VSCodium échouée (réseau indisponible pendant la compilation ?).\${NC:-}"`;
  }
  if (family !== 'debian') return '';
  return `apt-get install -y --no-install-recommends curl gnupg 2>/dev/null
mkdir -p /usr/share/keyrings
curl -fsSL https://gitlab.com/paulcarroty/vscodium-deb-rpm-repo/raw/master/pub.gpg 2>/dev/null | gpg --batch --yes --dearmor -o /usr/share/keyrings/vscodium-archive-keyring.gpg 2>/dev/null
echo 'deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/vscodium-archive-keyring.gpg] https://download.vscodium.com/debs vscodium main' > /etc/apt/sources.list.d/vscodium.list
apt-get update -y 2>/dev/null && apt-get install -y codium 2>/dev/null \\
  || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation de VSCodium échouée (réseau indisponible pendant la compilation ?).\${NC:-}"`;
}

export function uvSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.selectedPackages.includes('python_stack')) return '';
  if (family !== 'debian') return '';
  return `export UV_INSTALL_DIR=/usr/local/bin
export UV_NO_MODIFY_PATH=1
curl -LsSf https://astral.sh/uv/install.sh 2>/dev/null | sh 2>/dev/null \\
  || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation d'uv échouée (réseau indisponible pendant la compilation ?).\${NC:-}"`;
}

export function heroicSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.selectedPackages.includes('lutris_heroic')) return '';
  const apiUrl = 'https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest';
  if (family === 'debian') {
    return `curl -fsSL "${apiUrl}" 2>/dev/null | grep -oE '"browser_download_url": *"[^"]*\\.deb"' | grep -oE 'https://[^"]*' | head -1 > /tmp/heroic-deb-url.txt
if [ -s /tmp/heroic-deb-url.txt ]; then
  curl -fsSL "$(cat /tmp/heroic-deb-url.txt)" -o /tmp/heroic.deb 2>/dev/null \\
  && apt-get install -y /tmp/heroic.deb 2>/dev/null \\
  && rm -f /tmp/heroic.deb \\
  || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation de Heroic Games Launcher échouée (réseau indisponible pendant la compilation ?).\${NC:-}"
fi
rm -f /tmp/heroic-deb-url.txt`;
  }
  if (family === 'fedora') {
    return `curl -fsSL "${apiUrl}" 2>/dev/null | grep -oE '"browser_download_url": *"[^"]*\\.rpm"' | grep -oE 'https://[^"]*' | head -1 > /tmp/heroic-rpm-url.txt
if [ -s /tmp/heroic-rpm-url.txt ]; then
  curl -fsSL "$(cat /tmp/heroic-rpm-url.txt)" -o /tmp/heroic.rpm 2>/dev/null \\
  && dnf install -y /tmp/heroic.rpm 2>/dev/null \\
  && rm -f /tmp/heroic.rpm \\
  || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation de Heroic Games Launcher échouée (réseau indisponible pendant la compilation ?).\${NC:-}"
fi
rm -f /tmp/heroic-rpm-url.txt`;
  }
  if (family !== 'arch') return '';
  return `curl -fsSL "${apiUrl}" 2>/dev/null | grep -oE '"browser_download_url": *"[^"]*x86_64\\.AppImage"' | grep -oE 'https://[^"]*' | head -1 > /tmp/heroic-appimage-url.txt
if [ -s /tmp/heroic-appimage-url.txt ]; then
  curl -fsSL "$(cat /tmp/heroic-appimage-url.txt)" -o /tmp/heroic.AppImage 2>/dev/null \\
  && chmod +x /tmp/heroic.AppImage \\
  && mkdir -p /opt/heroic \\
  && (cd /opt/heroic && /tmp/heroic.AppImage --appimage-extract >/dev/null 2>&1) \\
  && ln -sf /opt/heroic/squashfs-root/AppRun /usr/local/bin/heroic \\
  && mkdir -p /usr/share/applications /usr/share/pixmaps \\
  && cp /opt/heroic/squashfs-root/heroic.png /usr/share/pixmaps/heroic.png \\
  && sed 's|Exec=AppRun|Exec=/opt/heroic/squashfs-root/AppRun|' /opt/heroic/squashfs-root/heroic.desktop > /usr/share/applications/heroic.desktop \\
  && rm -f /tmp/heroic.AppImage \\
  || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation de Heroic Games Launcher échouée (réseau indisponible pendant la compilation ?).\${NC:-}"
fi
rm -f /tmp/heroic-appimage-url.txt`;
}

export function metasploitSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.selectedPackages.includes('metasploit')) return '';
  if (family === 'arch') return '';
  if (family === 'alpine' || family === 'void') {
    return `echo -e "\${YELLOW:-}[INFO] Metasploit Framework n'est pas encore câblé pour ${family === 'alpine' ? 'Alpine' : 'Void'} : aucun paquet natif réel et l'installeur officiel Rapid7 ne documente pas de support apk.\${NC:-}" 2>/dev/null || true`;
  }
  return `curl -fsSL https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb -o /tmp/msfinstall 2>/dev/null \\
  && chmod 755 /tmp/msfinstall \\
  && /tmp/msfinstall 2>/dev/null \\
  && rm -f /tmp/msfinstall \\
  || echo -e "\${YELLOW:-}[AVERTISSEMENT] Installation de Metasploit Framework échouée (réseau indisponible pendant la compilation ?).\${NC:-}"`;
}

export function dmAutologinCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.user.autologin || recipe.displayManager === 'none') return '';
  const username = recipe.user.username;
  if (recipe.displayManager === 'gdm3') {
    const confPath = family === 'debian' ? '/etc/gdm3/custom.conf' : '/etc/gdm/custom.conf';
    return `mkdir -p $(dirname ${confPath})
if [ -f ${confPath} ] && grep -q '^\\[daemon\\]' ${confPath}; then
    sed -i '/^\\[daemon\\]/a AutomaticLoginEnable=true\\nAutomaticLogin='${shQuote(username)} ${confPath}
else
    printf '[daemon]\\nAutomaticLoginEnable=true\\nAutomaticLogin='${shQuote(username)}'\\n' >> ${confPath}
fi`;
  }
  if (recipe.displayManager === 'sddm') {
    const sessionName = recipe.desktop === 'kde' ? 'plasma' : recipe.desktop;
    return `mkdir -p /etc/sddm.conf.d
cat > /etc/sddm.conf.d/autologin.conf << 'SDDM_EOF'
[Autologin]
User=${username}
Session=${sessionName}
SDDM_EOF`;
  }
  if (recipe.displayManager === 'lightdm') {
    return `mkdir -p /etc/lightdm/lightdm.conf.d
cat > /etc/lightdm/lightdm.conf.d/50-autologin.conf << 'LIGHTDM_EOF'
[Seat:*]
autologin-user=${username}
autologin-user-timeout=0
LIGHTDM_EOF`;
  }
  return `echo -e "\${YELLOW:-}[INFO] Auto-login non câblé pour le gestionnaire de connexion \\"${recipe.displayManager}\\" (seuls GDM/SDDM/LightDM sont pris en charge).\${NC:-}" 2>/dev/null || true`;
}

export function kioskSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (recipe.desktop !== 'web_kiosk') return '';
  const useFirefox = (recipe.distro === 'ubuntu' || recipe.distro === 'linuxmint');
  const browserCmd = useFirefox
    ? 'firefox --kiosk --no-remote'
    : 'chromium --kiosk --no-first-run --disable-infobars --noerrdialogs';
  const url = (recipe.kioskUrl || 'about:blank').replace(/'/g, `'\\''`);
  const username = recipe.user.username;
  const autologin = (family === 'alpine' || family === 'void')
    ? `echo -e "\${YELLOW:-}[INFO] Auto-login console non câblé pour cette distribution (nécessiterait de modifier /etc/inittab ou un service runit à l'aveugle) : connexion manuelle requise, la session kiosque démarre automatiquement une fois connecté.\${NC:-}" 2>/dev/null || true`
    : `mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'GETTY_EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${username} --noclear %I $TERM
GETTY_EOF`;
  return `
${autologin}
${serviceEnableCmd('seatd', family)}
cat >> /home/${shQuote(username)}/.bash_profile << 'KIOSK_EOF'
if [ -z "\${DISPLAY:-}" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec cage -- ${browserCmd} '${url}'
fi
KIOSK_EOF
chown ${shQuote(username)}:${shQuote(username)} /home/${shQuote(username)}/.bash_profile 2>/dev/null || true`;
}

export function dotfilesCloneCmd(recipe: OSRecipe): string {
  if (!recipe.dotfilesGitUrl) return '';
  const url = recipe.dotfilesGitUrl.replace(/'/g, `'\\''`);
  const username = recipe.user.username;
  return `git clone --depth 1 '${url}' /home/${shQuote(username)}/.dotfiles 2>/dev/null || true
chown -R ${shQuote(username)}:${shQuote(username)} /home/${shQuote(username)}/.dotfiles 2>/dev/null || true`;
}

export function customServicesCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.customServices.length) return '';
  if (family === 'alpine' || family === 'void') {
    return `echo -e "\${YELLOW:-}[INFO] ${recipe.customServices.length} service(s) personnalisé(s) non câblé(s) sur cette distribution : le générateur ne produit que de vrais fichiers systemd .service, non lus par OpenRC (Alpine) ni runit (Void).\${NC:-}" 2>/dev/null || true`;
  }
  return recipe.customServices.map(svc => {
    const unitName = svc.name.replace(/\.service$/i, '').replace(/[^a-zA-Z0-9_.-]/g, '-') || 'osforge-custom';
    const execStart = svc.execStart;
    const description = svc.description || unitName;
    return `cat > /etc/systemd/system/${unitName}.service << 'UNIT_EOF'
[Unit]
Description=${description}
After=network.target

[Service]
ExecStart=${execStart}
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT_EOF
${svc.enabled ? `systemctl enable ${unitName} 2>/dev/null || true` : `# Service créé mais non activé automatiquement (case "Démarrage auto" décochée dans l'UI)`}`;
  }).join('\n');
}

export function sshHardeningCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.enableSSH) return '';
  const parts: string[] = [];
  if (recipe.security.disableRootSSH) {
    parts.push(`mkdir -p /etc/ssh
echo "PermitRootLogin no" >> /etc/ssh/sshd_config`);
  }
  if (recipe.security.fail2ban) {
    parts.push(`cat > /etc/fail2ban/jail.local << 'F2B_EOF'
[sshd]
enabled = true
F2B_EOF
${serviceEnableCmd('fail2ban', family)}`);
  }
  return parts.join('\n');
}

export function macHardeningCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.security.appArmorOrSELinux) return '';
  if (family === 'debian') {
    return serviceEnableCmd('apparmor', family);
  }
  if (family === 'fedora') {
    return `mkdir -p /etc/selinux
cat > /etc/selinux/config << 'SELINUX_EOF'
SELINUX=enforcing
SELINUXTYPE=targeted
SELINUX_EOF`;
  }
  return '';
}

export function sanitizeWifiStr(value: string): string {
  return value.replace(/[\0\r\n\\"$`]/g, '').trim();
}

export function sanitizePositiveInt(value: any): number | null {
  const n = parseInt(value, 10);
  if (!isNaN(n) && n > 0 && n <= 65535) return n;
  return null;
}

export function parseAllowedPorts(recipe: OSRecipe): number[] {
  const ports = new Set<number>();
  if (recipe.enableSSH) ports.add(22);
  if (recipe.security.allowedPorts) {
    recipe.security.allowedPorts.forEach(p => {
      const sp = sanitizePositiveInt(p);
      if (sp) ports.add(sp);
    });
  }
  if (recipe.security.customAllowedPorts) {
    const raw = recipe.security.customAllowedPorts.split(/[\s,;]+/);
    raw.forEach(r => {
      const sp = sanitizePositiveInt(r);
      if (sp) ports.add(sp);
    });
  }
  return Array.from(ports).sort((a, b) => a - b);
}

export function sanitizeGithubUser(user?: string): string {
  if (!user) return '';
  return user.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function firewallCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  const ports = parseAllowedPorts(recipe);
  const portsListStr = ports.join(' ');

  if (recipe.security.firewall === 'ufw') {
    if (family === 'suse') {
      return `echo -e "\${YELLOW:-}[INFO] UFW n'a pas de paquet officiel pour openSUSE Tumbleweed : pare-feu non configuré. Choisissez \\"nftables\\" ou \\"firewalld\\" pour cette distribution.\${NC:-}" 2>/dev/null || true`;
    }
    return `if command -v ufw &>/dev/null; then
    ufw default deny incoming || true
    ufw default allow outgoing || true
    ${ports.length > 0 ? `for port in ${portsListStr}; do ufw allow "\${port}"/tcp || true; done` : ''}
    ufw --force enable || true
fi
${serviceEnableCmd('ufw', family)}`;
  }

  if (recipe.security.firewall === 'firewalld') {
    return `if command -v firewall-cmd &>/dev/null; then
    ${serviceEnableCmd('firewalld', family)}
    ${ports.length > 0 ? `for port in ${portsListStr}; do firewall-cmd --permanent --add-port="\${port}"/tcp 2>/dev/null || true; done` : ''}
    firewall-cmd --reload 2>/dev/null || true
fi`;
  }

  if (recipe.security.firewall === 'nftables') {
    const nftPortsRule = ports.length === 1 ? `tcp dport ${ports[0]} accept` : ports.length > 1 ? `tcp dport { ${ports.join(', ')} } accept` : '';
    return `if command -v nft &>/dev/null; then
    cat > /etc/nftables.conf << 'NFT_EOF'
#!/usr/sbin/nft -f
flush ruleset
table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        ct state established,related accept
        iif lo accept
        icmp type echo-request accept
        icmpv6 type { echo-request, nd-neighbor-solicit, nd-neighbor-advert, nd-router-advert } accept
        ${nftPortsRule}
    }
    chain forward { type filter hook forward priority 0; policy drop; }
    chain output { type filter hook output priority 0; policy accept; }
}
NFT_EOF
    nft -f /etc/nftables.conf || true
fi
${serviceEnableCmd('nftables', family)}`;
  }
  return '';
}

export function networkConfigCmd(recipe: OSRecipe, _family?: 'debian' | NonDebianFamily): string {
  const parts: string[] = [];
  const net = recipe.network;

  if (net?.enableWifi && net.wifiSsid) {
    const ssid = sanitizeWifiStr(net.wifiSsid);
    const pass = sanitizeWifiStr(net.wifiPassword || '');
    parts.push(`# Configuration Wi-Fi Headless OOB
mkdir -p /etc/NetworkManager/system-connections
cat > /etc/NetworkManager/system-connections/preconfigured-wifi.nmconnection << 'WIFI_EOF'
[connection]
id=Preconfigured-Wifi
type=wifi
autoconnect=true

[wifi]
mode=infrastructure
ssid=${ssid}

[wifi-security]
key-mgmt=wpa-psk
psk=${pass}

[ipv4]
method=auto

[ipv6]
method=auto
WIFI_EOF
chmod 600 /etc/NetworkManager/system-connections/preconfigured-wifi.nmconnection 2>/dev/null || true`);
  }

  if (net?.ipMode === 'static' && net.staticIp) {
    const ip = sanitizeWifiStr(net.staticIp);
    const gw = net.gateway ? sanitizeWifiStr(net.gateway) : '';
    const dns = (net.dnsServers && net.dnsServers.length > 0) ? net.dnsServers.map(sanitizeWifiStr).join(' ') : '1.1.1.1 8.8.8.8';
    parts.push(`# Configuration IP Statique
mkdir -p /etc/systemd/network
cat > /etc/systemd/network/10-static-eth0.network << 'NET_EOF'
[Match]
Name=eth* en*

[Network]
Address=${ip}
${gw ? `Gateway=${gw}` : ''}
DNS=${dns}
NET_EOF
chmod 644 /etc/systemd/network/10-static-eth0.network 2>/dev/null || true`);
  }

  return parts.join('\n');
}

export function userSshSetupCmd(recipe: OSRecipe): string {
  const username = recipe.user.username;
  const parts: string[] = [];

  if (recipe.user.sshPublicKey || recipe.user.sshImportGithubUser) {
    parts.push(`mkdir -p /home/${shQuote(username)}/.ssh
chmod 700 /home/${shQuote(username)}/.ssh`);

    if (recipe.user.sshPublicKey) {
      const pubKey = recipe.user.sshPublicKey.trim().replace(/'/g, `'\\''`);
      parts.push(`echo '${pubKey}' > /home/${shQuote(username)}/.ssh/authorized_keys`);
    }

    if (recipe.user.sshImportGithubUser) {
      const ghUser = sanitizeGithubUser(recipe.user.sshImportGithubUser);
      if (ghUser) {
        parts.push(`if command -v curl &>/dev/null; then
    curl -sSL "https://github.com/${ghUser}.keys" >> /home/${shQuote(username)}/.ssh/authorized_keys 2>/dev/null || true
fi`);
      }
    }

    parts.push(`chmod 600 /home/${shQuote(username)}/.ssh/authorized_keys 2>/dev/null || true
chown -R ${shQuote(username)}:${shQuote(username)} /home/${shQuote(username)}/.ssh 2>/dev/null || true`);
  }

  return parts.join('\n');
}

export function vpnConfigCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  const parts: string[] = [];
  const net = recipe.network;

  if (net?.enableWireguard) {
    const privKey = net.wireguardPrivateKey ? sanitizeWifiStr(net.wireguardPrivateKey) : 'REPLACE_WITH_PRIVATE_KEY=';
    const address = net.wireguardAddress ? sanitizeWifiStr(net.wireguardAddress) : '10.10.0.2/24';
    const pubKey = net.wireguardPublicKey ? sanitizeWifiStr(net.wireguardPublicKey) : 'REPLACE_WITH_PEER_PUBLIC_KEY=';
    const endpoint = net.wireguardEndpoint ? sanitizeWifiStr(net.wireguardEndpoint) : 'vpn.example.com:51820';
    const allowedIps = net.wireguardAllowedIps ? sanitizeWifiStr(net.wireguardAllowedIps) : '0.0.0.0/0, ::/0';

    parts.push(`# Configuration VPN WireGuard (wg0)
mkdir -p /etc/wireguard
cat > /etc/wireguard/wg0.conf << 'WG_EOF'
[Interface]
PrivateKey = ${privKey}
Address = ${address}

[Peer]
PublicKey = ${pubKey}
Endpoint = ${endpoint}
AllowedIPs = ${allowedIps}
PersistentKeepalive = 25
WG_EOF
chmod 600 /etc/wireguard/wg0.conf 2>/dev/null || true
${serviceEnableCmd('wg-quick@wg0', family)}`);
  }

  if (net?.enableTailscale) {
    parts.push(`# Activation du VPN Mesh Tailscale
${serviceEnableCmd('tailscaled', family)}`);
    if (net.tailscaleAuthKey) {
      const authKey = sanitizeWifiStr(net.tailscaleAuthKey);
      parts.push(`if command -v tailscale &>/dev/null; then
    tailscale up --authkey="${authKey}" 2>/dev/null || true
fi`);
    }
  }

  return parts.join('\n');
}

export function communityReposCmd(recipe: OSRecipe, _family?: 'debian' | NonDebianFamily): string {
  if (!recipe.enableCommunityRepos) return '';
  const distroId = recipe.distro;

  if (distroId === 'arch' || distroId === 'cachyos') {
    return `# Support des dépôts et helpers communautaires AUR (Arch Linux)
echo -e "\${GREEN:-}[INFO] Activation du support des dépôts AUR...\${NC:-}" 2>/dev/null || true`;
  }
  if (distroId === 'fedora' || distroId === 'rocky') {
    return `# Activation des dépôts RPM Fusion (Free & Non-Free)
if command -v dnf &>/dev/null; then
    dnf install -y https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora 2>/dev/null || echo 41).noarch.rpm https://mirrors.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora 2>/dev/null || echo 41).noarch.rpm 2>/dev/null || true
fi`;
  }
  if (distroId === 'opensuse') {
    return `# Activation du dépôt communautaire Packman (codecs & multimédia)
if command -v zypper &>/dev/null; then
    zypper addrepo -f -c https://ftp.gwdg.de/pub/linux/misc/packman/suse/openSUSE_Tumbleweed/ packman 2>/dev/null || true
fi`;
  }
  if (distroId === 'alpine') {
    return `# Activation des dépôts communautaires Alpine (community & testing)
sed -i 's/^#//g' /etc/apk/repositories 2>/dev/null || true`;
  }
  return '';
}

export function gamingSysctlCmd(recipe: OSRecipe): string {
  if (!recipe.enableGamingOptimizations) return '';
  return `# Optimisations Système Gaming & Réseau Anti-Lag (Steam / Proton / TCP BBR+)
mkdir -p /etc/sysctl.d
cat > /etc/sysctl.d/99-gaming.conf << 'GAMING_SYSCTL_EOF'
vm.max_map_count = 2147483642
fs.file-max = 2097152
vm.swappiness = 10
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_fastopen = 3
GAMING_SYSCTL_EOF
chmod 644 /etc/sysctl.d/99-gaming.conf 2>/dev/null || true
sysctl -p /etc/sysctl.d/99-gaming.conf 2>/dev/null || true`;
}

export function steamConsoleModeCmd(recipe: OSRecipe): string {
  if (!recipe.enableSteamConsoleMode && !recipe.selectedPackages.includes('gamepad_drivers')) {
    return '';
  }

  const parts: string[] = [];

  // Règles UDEV officielles pour manettes USB/Bluetooth
  parts.push(`# Règles UDEV pour Manettes de Jeu (Steam Controller, Xbox, PlayStation DualSense, Switch Pro, 8BitDo)
mkdir -p /etc/udev/rules.d
cat > /etc/udev/rules.d/70-steam-input.rules << 'UDEV_STEAM_EOF'
# Valve USB / Bluetooth devices (Steam Controller, Steam Deck)
SUBSYSTEM=="usb", ATTRS{idVendor}=="28de", MODE="0660", TAG+="uaccess"
KERNEL=="uinput", SUBSYSTEM=="misc", MODE="0660", TAG+="uaccess", OPTIONS+="static_node=uinput"

# Sony PlayStation DualShock 4 & DualSense 5 USB & Bluetooth
KERNEL=="hidraw*", ATTRS{idVendor}=="054c", MODE="0660", TAG+="uaccess"

# Microsoft Xbox 360 / Xbox One / Series X|S USB & Wireless dongle
KERNEL=="hidraw*", ATTRS{idVendor}=="045e", MODE="0660", TAG+="uaccess"

# Nintendo Switch Pro Controller
KERNEL=="hidraw*", ATTRS{idVendor}=="057e", ATTRS{idProduct}=="2009", MODE="0660", TAG+="uaccess"

# 8BitDo Controllers
KERNEL=="hidraw*", ATTRS{idVendor}=="2dc8", MODE="0660", TAG+="uaccess"
UDEV_STEAM_EOF
chmod 644 /etc/udev/rules.d/70-steam-input.rules 2>/dev/null || true
udevadm control --reload-rules 2>/dev/null || true`);

  // Lanceur de session Steam Console (Big Picture / Gamescope)
  if (recipe.enableSteamConsoleMode) {
    parts.push(`# Lanceur de session Steam Console (Big Picture / Gamescope)
mkdir -p /usr/local/bin /etc/xdg/autostart
cat > /usr/local/bin/steam-gamescope-session << 'STEAM_SESSION_EOF'
#!/usr/bin/env bash
export ENABLE_GAMESCOPE_WSI=1
export STEAM_MULTIPLE_XWAYLANDS=1
export MANGOHUD=1

# Lancement avec Gamescope si disponible, sinon repli direct Steam GamepadUI
if command -v gamescope &>/dev/null; then
    exec gamescope -e -f -- steam -gamepadui -steamos3 "$@"
else
    exec steam -gamepadui -steamos3 "$@"
fi
STEAM_SESSION_EOF
chmod +x /usr/local/bin/steam-gamescope-session 2>/dev/null || true

# Autostart XDG au démarrage de la session graphique
cat > /etc/xdg/autostart/steam-console.desktop << 'STEAM_DESKTOP_EOF'
[Desktop Entry]
Name=Steam GamepadUI Console
Comment=Démarrage direct en mode console Steam Big Picture
Exec=/usr/local/bin/steam-gamescope-session
Icon=steam
Terminal=false
Type=Application
Categories=Game;
X-GNOME-Autostart-enabled=true
STEAM_DESKTOP_EOF
chmod 644 /etc/xdg/autostart/steam-console.desktop 2>/dev/null || true`);
  }

  return parts.join('\n');
}

export function powerSavingCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.enablePowerSaving) return '';
  return `# Gestion de l'énergie et autonomie batterie Laptop (TLP)
${serviceEnableCmd('tlp', family)}`;
}

export function shDoubleQuoteEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/["$`]/g, '\\$&');
}

export function osReleaseCmd(recipe: OSRecipe, baseId: string): string {
  const safeId = recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'osforge';
  const prettyName = `${recipe.branding.osName} ${recipe.branding.editionName}`.trim();
  return `cat > /etc/os-release << 'OSREL_EOF'
PRETTY_NAME="${shDoubleQuoteEscape(prettyName)}"
NAME="${shDoubleQuoteEscape(recipe.branding.osName)}"
VERSION="${shDoubleQuoteEscape(recipe.branding.version)} (${shDoubleQuoteEscape(recipe.branding.editionName)})"
VERSION_ID="${shDoubleQuoteEscape(recipe.branding.version)}"
ID=${safeId}
ID_LIKE=${baseId}
BUILD_ID=osforge-studio
HOME_URL="https://github.com/LordMadTrix/osforge-studio"
OSREL_EOF`;
}

export function autoSecurityUpdatesCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  if (!recipe.security.autoSecurityUpdates) return '';
  if (family === 'debian') {
    return `mkdir -p /etc/apt/apt.conf.d
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'APT_AUTO_EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT_AUTO_EOF
${serviceEnableCmd('unattended-upgrades', family)}`;
  }
  if (family === 'fedora') {
    return `if [ -f /etc/dnf/automatic.conf ]; then
    sed -i 's/^apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf 2>/dev/null || true
fi
systemctl enable dnf-automatic.timer 2>/dev/null || true
systemctl enable dnf5-automatic.timer 2>/dev/null || true`;
  }
  if (family === 'arch') {
    const label = recipe.distro === 'cachyos' ? 'CachyOS' : 'Arch Linux';
    return `echo -e "\${YELLOW:-}[INFO] Sur une distribution en rolling-release (${label}), les mises à jour automatiques non surveillées sont déconseillées pour éviter des conflits de paquets.\${NC:-}" 2>/dev/null || true`;
  }
  if (family === 'suse') {
    return `echo -e "\${YELLOW:-}[INFO] Mises à jour automatiques de sécurité non configurées par défaut sur openSUSE Tumbleweed (rolling-release).\${NC:-}" 2>/dev/null || true`;
  }
  return `echo -e "\${YELLOW:-}[INFO] Aucun démon officiel de mise à jour automatique de sécurité sur cette distribution (${family === 'alpine' ? 'Alpine' : 'Void'}).\${NC:-}" 2>/dev/null || true`;
}

export function localeSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  const loc = recipe.locale || 'en_US';
  if (family === 'debian') {
    return `echo "${loc}.UTF-8 UTF-8" >> /etc/locale.gen || true
locale-gen || true
echo "LANG=${loc}.UTF-8" > /etc/default/locale
echo "LANG=${loc}.UTF-8" > /etc/locale.conf`;
  }
  if (family === 'arch') {
    return `echo "${loc}.UTF-8 UTF-8" >> /etc/locale.gen || true
locale-gen 2>/dev/null || true
echo "LANG=${loc}.UTF-8" > /etc/locale.conf`;
  }
  if (family === 'fedora') {
    return `echo "LANG=${loc}.UTF-8" > /etc/locale.conf`;
  }
  if (family === 'suse') {
    return `echo "LANG=${loc}.UTF-8" > /etc/locale.conf
echo 'RC_LANG="${loc}.UTF-8"' > /etc/sysconfig/language 2>/dev/null || true`;
  }
  if (family === 'void') {
    return `echo "${loc}.UTF-8 UTF-8" >> /etc/default/libc-locales 2>/dev/null || true
xbps-reconfigure -f glibc-locales 2>/dev/null || true
echo "LANG=${loc}.UTF-8" > /etc/locale.conf`;
  }
  if (family === 'alpine') {
    return `mkdir -p /etc/profile.d
echo "export LANG=${loc}.UTF-8" > /etc/profile.d/locale.sh`;
  }
  return '';
}

export function cisHardeningCmd(recipe: OSRecipe, _family?: 'debian' | NonDebianFamily): string {
  const level = recipe.security.cisBenchmarkLevel ?? 0;
  if (!level) return '';

  const sysctlL1 = `fs.suid_dumpable = 0
kernel.randomize_va_space = 2
kernel.kptr_restrict = 2
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0`;

  const sysctlL2 = `kernel.yama.ptrace_scope = 2
kernel.dmesg_restrict = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1`;

  const fullSysctl = level >= 2 ? `${sysctlL1}\n${sysctlL2}` : sysctlL1;

  const umaskCmd = level >= 2 ? `
mkdir -p /etc/profile.d
cat > /etc/profile.d/99-cis-umask.sh << 'UMASK_EOF'
umask 027
UMASK_EOF
chmod 644 /etc/profile.d/99-cis-umask.sh 2>/dev/null || true` : '';

  return `# Durcissement CIS Benchmark (Niveau ${level})
mkdir -p /etc/sysctl.d /etc/security/limits.d
cat > /etc/sysctl.d/99-cis-security.conf << 'SYSCTL_EOF'
${fullSysctl}
SYSCTL_EOF
cat > /etc/security/limits.d/10-cis-coredumps.conf << 'LIMITS_EOF'
* hard core 0
LIMITS_EOF
chmod 600 /etc/shadow /etc/gshadow 2>/dev/null || true${umaskCmd}
sysctl -p /etc/sysctl.d/99-cis-security.conf 2>/dev/null || true`;
}

export function zramSetupCmd(recipe: OSRecipe, family: 'debian' | NonDebianFamily): string {
  const isZram = recipe.enableZram || recipe.security.enableZram;
  if (!isZram) return '';

  if (family === 'alpine') {
    return `if command -v zram-init &>/dev/null; then
    rc-update add zram-init default 2>/dev/null || true
fi`;
  }
  if (family === 'void') {
    return `echo -e "\${YELLOW:-}[INFO] zRAM swap compressé activé pour Void Linux (paquet zramen ou configuration /dev/zram).\${NC:-}" 2>/dev/null || true`;
  }
  return `# Configuration de la zRAM (Swap compressé en mémoire vive ZSTD)
mkdir -p /etc/systemd
cat > /etc/systemd/zram-generator.conf << 'ZRAM_EOF'
[zram0]
zram-size = min(ram / 2, 4096)
compression-algorithm = zstd
ZRAM_EOF
systemctl enable systemd-zram-setup@zram0.service 2>/dev/null || true`;
}

export function flatpakSetupCmd(recipe: OSRecipe, _family?: 'debian' | NonDebianFamily): string {
  if (!recipe.enableFlatpak) return '';
  return `# Configuration Flatpak & Dépôt distant officiel Flathub
if command -v flatpak &>/dev/null; then
    flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo 2>/dev/null || true
fi`;
}

export function batEscapePercent(value: string): string {
  return value.replace(/%/g, '%%');
}

export function yamlEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function yamlDq(value: string): string {
  return `"${yamlEscape(value)}"`;
}

export function toRuncmdBashBlock(bashSnippet: string): string {
  if (!bashSnippet.trim()) return '';
  const escaped = bashSnippet
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
  return `  - [ bash, -c, "${escaped}" ]`;
}
