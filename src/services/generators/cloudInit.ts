import { OSRecipe } from '../../types/os';
import { NON_DEBIAN_DISTROS, NonDebianFamily } from './types';
import { resolvePackageList } from './packages';
import {
  shQuote,
  sanitizeGithubUser,
  parseAllowedPorts,
  resolveDmServiceName,
  dmAutologinCmd,
  kioskSetupCmd,
  yamlDq,
  toRuncmdBashBlock,
} from './helpers';

export function cloudInitServiceEnableLine(service: string, family: NonDebianFamily | undefined): string {
  if (family === 'alpine') return `  - rc-update add ${service} default 2>/dev/null || true`;
  if (family === 'void') return `  - mkdir -p /etc/runit/runsvdir/default\n  - ln -sf /etc/sv/${service} /etc/runit/runsvdir/default/${service} 2>/dev/null || true`;
  return `  - systemctl enable --now ${service} || true`;
}

export function cloudInitHardeningYaml(recipe: OSRecipe): { writeFiles: string; runcmd: string } {
  const writeFiles: string[] = [];
  const runcmd: string[] = [];
  const family = NON_DEBIAN_DISTROS[recipe.distro];

  if (recipe.security.disableRootSSH) {
    runcmd.push(`  - echo 'PermitRootLogin no' >> /etc/ssh/sshd_config`);
  }
  if (recipe.security.fail2ban) {
    writeFiles.push(`  - path: /etc/fail2ban/jail.local
    content: |
      [sshd]
      enabled = true`);
    runcmd.push(cloudInitServiceEnableLine('fail2ban', family));
  }
  if (recipe.security.appArmorOrSELinux) {
    if (!family) {
      runcmd.push(`  - systemctl enable --now apparmor || true`);
    } else if (family === 'fedora') {
      writeFiles.push(`  - path: /etc/selinux/config
    content: |
      SELINUX=enforcing
      SELINUXTYPE=targeted`);
    }
  }
  if (recipe.security.autoSecurityUpdates) {
    if (!family) {
      writeFiles.push(`  - path: /etc/apt/apt.conf.d/20auto-upgrades
    content: |
      APT::Periodic::Update-Package-Lists "1";
      APT::Periodic::Unattended-Upgrade "1";`);
      runcmd.push(cloudInitServiceEnableLine('unattended-upgrades', family));
    } else if (family === 'fedora') {
      runcmd.push(cloudInitServiceEnableLine('dnf-automatic.timer', family));
    }
  }
  const cisLevel = recipe.security.cisBenchmarkLevel ?? 0;
  if (cisLevel >= 1) {
    const sysctlContent = cisLevel >= 2
      ? `      fs.suid_dumpable = 0
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
      net.ipv6.conf.default.accept_redirects = 0
      kernel.yama.ptrace_scope = 2
      kernel.dmesg_restrict = 1
      net.ipv4.tcp_syncookies = 1
      net.ipv4.conf.all.log_martians = 1
      net.ipv4.conf.default.log_martians = 1`
      : `      fs.suid_dumpable = 0
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

    writeFiles.push(`  - path: /etc/sysctl.d/99-cis-security.conf
    content: |
${sysctlContent}`);
    writeFiles.push(`  - path: /etc/security/limits.d/10-cis-coredumps.conf
    content: |
      * hard core 0`);
    if (cisLevel >= 2) {
      writeFiles.push(`  - path: /etc/profile.d/99-cis-umask.sh
    content: |
      umask 027`);
    }
    runcmd.push(`  - chmod 600 /etc/shadow /etc/gshadow 2>/dev/null || true`);
    runcmd.push(`  - sysctl -p /etc/sysctl.d/99-cis-security.conf 2>/dev/null || true`);
  }

  if (recipe.enableZram || recipe.security.enableZram) {
    if (family !== 'alpine' && family !== 'void') {
      writeFiles.push(`  - path: /etc/systemd/zram-generator.conf
    content: |
      [zram0]
      zram-size = min(ram / 2, 4096)
      compression-algorithm = zstd`);
      runcmd.push(cloudInitServiceEnableLine('systemd-zram-setup@zram0.service', family));
    }
  }
  if (recipe.enableFlatpak) {
    runcmd.push(`  - flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo 2>/dev/null || true`);
  }
  if (recipe.dotfilesGitUrl) {
    runcmd.push(`  - git clone --depth 1 ${shQuote(recipe.dotfilesGitUrl)} /home/${shQuote(recipe.user.username)}/.dotfiles || true`);
  }
  recipe.customServices.forEach(svc => {
    const unitName = svc.name.replace(/\.service$/i, '').replace(/[^a-zA-Z0-9_.-]/g, '-') || 'osforge-custom';
    if (family === 'alpine' || family === 'void') {
      runcmd.push(`  - echo "[INFO] Service personnalise ${unitName} non cable sur cette distribution (OpenRC/runit, pas systemd)." >> /etc/motd`);
      return;
    }
    writeFiles.push(`  - path: /etc/systemd/system/${unitName}.service
    content: |
      [Unit]
      Description=${svc.description || unitName}
      After=network.target

      [Service]
      ExecStart=${svc.execStart}
      Restart=on-failure

      [Install]
      WantedBy=multi-user.target`);
    if (svc.enabled) {
      runcmd.push(`  - systemctl enable --now ${unitName} || true`);
    }
  });
  return { writeFiles: writeFiles.join('\n'), runcmd: runcmd.join('\n') };
}

export function generateCloudInitYaml(recipe: OSRecipe): string {
  const pkgs = resolvePackageList(recipe);
  const { writeFiles: hardeningWriteFiles, runcmd: hardeningRuncmd } = cloudInitHardeningYaml(recipe);
  const cloudInitFamily = NON_DEBIAN_DISTROS[recipe.distro];
  const sshEnableLine = cloudInitFamily === 'alpine'
    ? '  - rc-update add sshd default 2>/dev/null || true'
    : cloudInitFamily === 'void'
      ? '  - mkdir -p /etc/runit/runsvdir/default\n  - ln -sf /etc/sv/sshd /etc/runit/runsvdir/default/sshd 2>/dev/null || true'
      : cloudInitFamily
        ? '  - systemctl enable --now sshd || true'
        : '  - systemctl enable --now ssh || true';

  const dmService = resolveDmServiceName(recipe.displayManager, cloudInitFamily || 'debian');
  const dmEnableLine = dmService ? cloudInitServiceEnableLine(dmService, cloudInitFamily) : '';
  const dmAutologinLine = toRuncmdBashBlock(dmAutologinCmd(recipe, cloudInitFamily || 'debian'));
  const kioskLine = toRuncmdBashBlock(kioskSetupCmd(recipe, cloudInitFamily || 'debian'));

  return `#cloud-config
# ==============================================================================
# OSForge Studio — Manifeste Cloud-Init
# ==============================================================================

hostname: ${yamlDq(recipe.hostname)}
fqdn: ${yamlDq(recipe.hostname + '.local')}
manage_etc_hosts: true

users:
  - name: ${yamlDq(recipe.user.username)}
    gecos: ${yamlDq(recipe.user.fullName)}
    sudo: ${recipe.user.sudo ? 'ALL=(ALL) NOPASSWD:ALL' : 'false'}
    shell: ${recipe.user.shell}
    lock_passwd: false
    passwd: "$6$rounds=4096$salt$placeholderHashedPassword"
    ${recipe.user.sshPublicKey ? `ssh_authorized_keys:\n      - ${yamlDq(recipe.user.sshPublicKey)}` : ''}
    ${recipe.user.sshImportGithubUser ? `ssh_import_id:\n      - gh:${yamlDq(sanitizeGithubUser(recipe.user.sshImportGithubUser))}` : ''}

timezone: ${recipe.timezone}
locale: ${recipe.locale}.UTF-8

${recipe.network?.enableWifi || recipe.network?.ipMode === 'static' ? `network:
  version: 2
  ethernets:
    eth0:
      dhcp4: ${recipe.network?.ipMode === 'static' ? 'false' : 'true'}
      ${recipe.network?.ipMode === 'static' && recipe.network?.staticIp ? `addresses: [${yamlDq(recipe.network.staticIp)}]
      ${recipe.network.gateway ? `gateway4: ${yamlDq(recipe.network.gateway)}` : ''}
      nameservers:
        addresses: [${(recipe.network.dnsServers && recipe.network.dnsServers.length > 0 ? recipe.network.dnsServers : ['1.1.1.1', '8.8.8.8']).map(s => yamlDq(s)).join(', ')}]` : ''}
  ${recipe.network?.enableWifi && recipe.network?.wifiSsid ? `wifis:
    wlan0:
      dhcp4: true
      access-points:
        ${yamlDq(recipe.network.wifiSsid)}:
          password: ${yamlDq(recipe.network.wifiPassword || '')}` : ''}
` : ''}
packages:
${pkgs.map(p => `  - ${p}`).join('\n')}

package_update: true
package_upgrade: ${recipe.security.autoSecurityUpdates ? 'true' : 'false'}

write_files:
  - path: /etc/motd
    content: |
      ======================================================
      Bienvenue sur ${recipe.branding.osName} (${recipe.branding.editionName})
      Généré avec OSForge Studio
      ======================================================
${recipe.security.firewall === 'nftables' ? `  - path: /etc/nftables.conf
    content: |
      #!/usr/sbin/nft -f
      flush ruleset
      table inet filter {
          chain input {
              type filter hook input priority 0; policy drop;
              ct state established,related accept
              iif lo accept
              icmp type echo-request accept
              ${parseAllowedPorts(recipe).length > 0 ? `tcp dport { ${parseAllowedPorts(recipe).join(', ')} } accept` : ''}
          }
          chain forward { type filter hook forward priority 0; policy drop; }
          chain output { type filter hook output priority 0; policy accept; }
      }
` : ''}${hardeningWriteFiles ? hardeningWriteFiles + '\n' : ''}
runcmd:
${sshEnableLine}
${dmEnableLine ? dmEnableLine + '\n' : ''}${dmAutologinLine ? dmAutologinLine + '\n' : ''}${kioskLine ? kioskLine + '\n' : ''}  ${recipe.security.firewall === 'ufw' ? `- ufw default deny incoming\n  - ufw default allow outgoing\n${parseAllowedPorts(recipe).map(p => `  - ufw allow ${p}/tcp`).join('\n')}\n  - ufw --force enable` : ''}
  ${recipe.security.firewall === 'firewalld' ? `- systemctl enable --now firewalld || true\n${parseAllowedPorts(recipe).map(p => `  - firewall-cmd --permanent --add-port=${p}/tcp || true`).join('\n')}\n  - firewall-cmd --reload || true` : ''}
  ${recipe.security.firewall === 'nftables' ? '- nft -f /etc/nftables.conf || true\n  - systemctl enable --now nftables || true' : ''}
${hardeningRuncmd ? hardeningRuncmd + '\n' : ''}${recipe.firstBootScript ? toRuncmdBashBlock(recipe.firstBootScript) : '  - [ bash, -c, "echo Ready" ]'}
`;
}
