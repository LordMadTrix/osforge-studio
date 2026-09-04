import { OSRecipe } from '../../types/os';
import { resolvePackageList } from './packages';

/**
 * Generates the Dockerfile to build the OS in an isolated container
 */
export function generateDockerfile(recipe: OSRecipe): string {
  return `# ==============================================================================
# OSForge Studio — Dockerfile de Compilation d'ISO Isolée (${recipe.branding.osName})
# Construction garantie reproductible sans impacter la machine hôte
# ==============================================================================
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Outils de construction d'images Linux & ISO
RUN apt-get update && apt-get install -y --no-install-recommends \\
    debootstrap \\
    xorriso \\
    mtools \\
    grub-pc-bin \\
    grub-efi-amd64-bin \\
    squashfs-tools \\
    dosfstools \\
    rsync \\
    curl \\
    ca-certificates \\
    xz-utils \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /osbuilder

COPY build.sh /osbuilder/build.sh
RUN chmod +x /osbuilder/build.sh

VOLUME ["/osbuilder/dist"]

ENTRYPOINT ["/osbuilder/build.sh"]
`;
}

/**
 * Generates an OCI-compliant Containerfile / Dockerfile for the recipe
 */
export function generateContainerfile(recipe: OSRecipe): string {
  const distro = recipe.distro;
  const pkgs = resolvePackageList(recipe);
  const username = recipe.user.username;
  const isDebianLike = distro === 'debian' || distro === 'ubuntu' || distro === 'kali' || distro === 'raspbian' || distro === 'linuxmint' || distro === 'popos' || distro === 'parrot' || distro === 'dietpi' || distro === 'retropie' || distro === 'armbian' || distro === 'raspap';
  const isArchLike = distro === 'arch' || distro === 'cachyos' || distro === 'endeavouros';

  let baseImage = 'debian:bookworm-slim';
  let pkgInstallCmd = `RUN apt-get update && apt-get install -y --no-install-recommends \\\n    ${pkgs.join(' \\\n    ')} \\\n    && rm -rf /var/lib/apt/lists/*`;

  if (distro === 'ubuntu' || distro === 'linuxmint' || distro === 'popos') {
    baseImage = 'ubuntu:noble';
    pkgInstallCmd = `RUN apt-get update && apt-get install -y --no-install-recommends \\\n    ${pkgs.join(' \\\n    ')} \\\n    && rm -rf /var/lib/apt/lists/*`;
  } else if (distro === 'kali') {
    baseImage = 'kalilinux/kali-rolling';
    pkgInstallCmd = `RUN apt-get update && apt-get install -y --no-install-recommends \\\n    ${pkgs.join(' \\\n    ')} \\\n    && rm -rf /var/lib/apt/lists/*`;
  } else if (distro === 'parrot') {
    baseImage = 'parrotsec/security:latest';
    pkgInstallCmd = `RUN apt-get update && apt-get install -y --no-install-recommends \\\n    ${pkgs.join(' \\\n    ')} \\\n    && rm -rf /var/lib/apt/lists/*`;
  } else if (isArchLike) {
    baseImage = 'archlinux:latest';
    pkgInstallCmd = `RUN pacman -Syu --noconfirm && pacman -S --noconfirm --needed \\\n    ${pkgs.join(' \\\n    ')} \\\n    && pacman -Scc --noconfirm`;
  } else if (distro === 'fedora') {
    baseImage = 'fedora:41';
    pkgInstallCmd = `RUN dnf install -y \\\n    ${pkgs.join(' \\\n    ')} \\\n    && dnf clean all`;
  } else if (distro === 'rocky' || distro === 'almalinux') {
    baseImage = distro === 'almalinux' ? 'almalinux:9' : 'rockylinux:9';
    pkgInstallCmd = `RUN dnf install -y \\\n    ${pkgs.join(' \\\n    ')} \\\n    && dnf clean all`;
  } else if (distro === 'alpine') {
    baseImage = 'alpine:latest';
    pkgInstallCmd = `RUN apk add --no-cache \\\n    ${pkgs.join(' \\\n    ')}`;
  } else if (distro === 'opensuse') {
    baseImage = 'opensuse/tumbleweed:latest';
    pkgInstallCmd = `RUN zypper refresh && zypper install -y --no-recommends \\\n    ${pkgs.join(' \\\n    ')} \\\n    && zypper clean -a`;
  } else if (distro === 'void') {
    baseImage = 'ghcr.io/void-linux/void-linux:latest-full-x86_64';
    pkgInstallCmd = `RUN xbps-install -Syu && xbps-install -y \\\n    ${pkgs.join(' \\\n    ')} \\\n    && rm -rf /var/cache/xbps/*`;
  }

  const userCmd = isDebianLike
    ? `RUN if ! id ${username} &>/dev/null; then useradd -m -s ${recipe.user.shell} ${username}; echo "${username}:${recipe.user.password || 'forge'}" | chpasswd; ${recipe.user.sudo ? `usermod -aG sudo ${username} && echo "${username} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-user` : ''}; fi`
    : distro === 'alpine'
      ? `RUN adduser -D -s ${recipe.user.shell} ${username} && echo "${username}:${recipe.user.password || 'forge'}" | chpasswd && ${recipe.user.sudo ? `echo "${username} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-user` : ''}`
      : `RUN if ! id ${username} &>/dev/null; then useradd -m -s ${recipe.user.shell} ${username}; echo "${username}:${recipe.user.password || 'forge'}" | chpasswd; ${recipe.user.sudo ? `usermod -aG wheel ${username} 2>/dev/null || true; echo "${username} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/90-user` : ''}; fi`;

  return `# ==============================================================================
# OSForge Studio — Containerfile / Dockerfile OCI (${recipe.branding.osName})
# Base: ${baseImage} | Distribution: ${recipe.distro}
# ==============================================================================

FROM ${baseImage}

LABEL org.opencontainers.image.title="${recipe.branding.osName}" \\
      org.opencontainers.image.description="${recipe.description || 'OSForge Custom Container'}" \\
      org.opencontainers.image.version="${recipe.branding.version}" \\
      org.opencontainers.image.vendor="OSForge Studio"

ENV LANG=${recipe.locale}.UTF-8 \\
    LC_ALL=${recipe.locale}.UTF-8 \\
    TZ=${recipe.timezone} \\
    DEBIAN_FRONTEND=noninteractive

${pkgInstallCmd}

${userCmd}

${recipe.dotfilesGitUrl ? `RUN git clone --depth 1 "${recipe.dotfilesGitUrl}" /home/${username}/.dotfiles && chown -R ${username}:${username} /home/${username}/.dotfiles 2>/dev/null || true` : ''}

USER ${username}
WORKDIR /home/${username}

${recipe.firstBootScript ? `# Script d'initialisation personnalisé
RUN << 'FIRSTBOOT_EOF'
${recipe.firstBootScript}
FIRSTBOOT_EOF` : ''}

ENTRYPOINT ["${recipe.user.shell}"]
CMD ["-l"]
`;
}

/**
 * Generates OpenFactory-compatible JSON recipe
 */
export function generateRecipeJson(recipe: OSRecipe): string {
  return JSON.stringify(recipe, null, 2);
}

/**
 * Generates an Ansible Playbook (playbook.yml) for declarative OS configuration & provisioning
 */
export function generateAnsiblePlaybook(recipe: OSRecipe): string {
  const pkgs = resolvePackageList(recipe);
  const username = recipe.user.username;

  return `---
# ==============================================================================
# OSForge Studio — Manifeste Ansible Playbook
# Système Cible : ${recipe.branding.osName} (${recipe.distro.toUpperCase()})
# ==============================================================================

- name: Provisioning et Configuration de ${recipe.branding.osName}
  hosts: all
  become: true
  vars:
    os_user: "${username}"
    os_hostname: "${recipe.hostname}"
    os_timezone: "${recipe.timezone}"
    os_locale: "${recipe.locale}.UTF-8"

  tasks:
    - name: Définir le nom d'hôte de la machine
      ansible.builtin.hostname:
        name: "{{ os_hostname }}"

    - name: Créer le compte utilisateur principal
      ansible.builtin.user:
        name: "{{ os_user }}"
        comment: "${recipe.user.fullName}"
        shell: "${recipe.user.shell}"
        groups: sudo,wheel
        append: true
        state: present

    ${recipe.user.sshPublicKey ? `- name: Injecter la clé publique SSH autorisée
      ansible.posix.authorized_key:
        user: "{{ os_user }}"
        state: present
        key: "${recipe.user.sshPublicKey.trim()}"` : ''}

    - name: Installer les paquets logiciels sélectionnés
      ansible.builtin.package:
        name:
${pkgs.map((p) => `          - ${p}`).join('\n')}
        state: present

    ${recipe.enableSSH ? `- name: Activer et démarrer le service SSH
      ansible.builtin.systemd:
        name: sshd
        enabled: true
        state: started
      ignore_errors: true` : ''}

    ${recipe.security.firewall !== 'none' ? `- name: Activer le service de pare-feu (${recipe.security.firewall})
      ansible.builtin.systemd:
        name: ${recipe.security.firewall === 'firewalld' ? 'firewalld' : recipe.security.firewall === 'ufw' ? 'ufw' : 'nftables'}
        enabled: true
        state: started
      ignore_errors: true` : ''}

    ${recipe.enableGamingOptimizations ? `- name: Appliquer les optimisations système Gaming (vm.max_map_count)
      ansible.posix.sysctl:
        name: vm.max_map_count
        value: '2147483642'
        state: present
        reload: true
        sysctl_file: /etc/sysctl.d/99-gaming.conf` : ''}

    ${recipe.enablePowerSaving ? `- name: Activer le gestionnaire d'énergie batterie TLP
      ansible.builtin.systemd:
        name: tlp
        enabled: true
        state: started
      ignore_errors: true` : ''}

    ${recipe.network?.enableWireguard ? `- name: Activer le service VPN WireGuard wg0
      ansible.builtin.systemd:
        name: wg-quick@wg0
        enabled: true
        state: started
      ignore_errors: true` : ''}
`;
}

/**
 * Generates a Terraform / OpenTofu (main.tf) infrastructure manifest
 */
export function generateTerraformTf(recipe: OSRecipe): string {
  return `# ==============================================================================
# OSForge Studio — Infrastructure-as-Code (Terraform / OpenTofu)
# Déploiement Cloud & Machine Virtuelle : ${recipe.branding.osName}
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

# 1. Génération locale du fichier cloud-init user-data
resource "local_file" "cloud_init" {
  filename = "\${path.module}/cloud-init.yaml"
  content  = file("\${path.module}/cloud-init.yaml")
}

# 2. Récapitulatif du déploiement
output "osforge_vm_spec" {
  value = {
    os_name       = "${recipe.branding.osName}"
    distro        = "${recipe.distro}"
    arch          = "${recipe.arch}"
    hostname      = "${recipe.hostname}"
    user          = "${recipe.user.username}"
    output_format = "${recipe.outputFormat}"
    cloud_init    = local_file.cloud_init.filename
  }
}
`;
}
