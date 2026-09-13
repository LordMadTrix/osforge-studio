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

/**
 * Génère le script de déploiement automatisé pour Proxmox VE (qm create / qm importdisk / cloud-init)
 */
export function generateProxmoxDeployScript(recipe: OSRecipe): string {
  const osName = recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const artifactFile = `${osName}-${recipe.branding.version}-${recipe.arch}.${recipe.outputFormat === 'qcow2' ? 'qcow2' : recipe.outputFormat === 'iso_hybrid' ? 'iso' : 'raw'}`;
  const username = recipe.user.username;
  const isIso = recipe.outputFormat === 'iso_hybrid';

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Déploiement Automatisé Proxmox VE (by LordMadTrix)
# Image : ${recipe.branding.osName} (${recipe.distro.toUpperCase()} - ${recipe.arch})
# ==============================================================================

set -euo pipefail

# 1. Paramètres configurables
VM_ID="\${VM_ID:-9000}"
VM_NAME="\${VM_NAME:-${osName}-template}"
STORAGE="\${STORAGE:-local-lvm}"
BRIDGE="\${BRIDGE:-vmbr0}"
CORES="\${CORES:-4}"
MEMORY="\${MEMORY:-4096}"
IMAGE_FILE="\${IMAGE_FILE:-dist/${artifactFile}}"

CYAN='\\033[0;36m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m'

echo -e "\${CYAN}===============================================================================\${NC}"
echo -e "\${CYAN}   🚀 OSForge Studio — Déploiement Proxmox VE (QM Automation)                  \${NC}"
echo -e "\${CYAN}   VM ID: \${VM_ID} | Nom: \${VM_NAME} | Stockage: \${STORAGE}                   \${NC}"
echo -e "\${CYAN}===============================================================================\${NC}"

if [ "$(id -u)" -ne 0 ]; then
    echo -e "\${RED}[ERREUR] Ce script doit être exécuté sur votre nœud Proxmox VE en tant que root.\${NC}" >&2
    exit 1
fi

if ! command -v qm &>/dev/null; then
    echo -e "\${RED}[ERREUR] La commande 'qm' est introuvable. Ce script est dédié à Proxmox VE.\${NC}" >&2
    exit 1
fi

# 2. Destruction d'une ancienne instance si existante
if qm status "\${VM_ID}" &>/dev/null; then
    echo -e "\${YELLOW}[1/5] Destruction de l'ancienne VM \${VM_ID}...\${NC}"
    qm stop "\${VM_ID}" 2>/dev/null || true
    qm destroy "\${VM_ID}" --purge || true
fi

# 3. Création de la VM Proxmox
echo -e "\${GREEN}[2/5] Création de la VM \${VM_ID} (\${VM_NAME})...\${NC}"
qm create "\${VM_ID}" \\
    --name "\${VM_NAME}" \\
    --memory "\${MEMORY}" \\
    --cores "\${CORES}" \\
    --cpu host \\
    --net0 virtio,bridge="\${BRIDGE}" \\
    --scsihw virtio-scsi-single \\
    --serial0 socket \\
    --vga serial0 \\
    --agent enabled=1

# 4. Configuration Disque ou ISO
${isIso ? `# Mode ISO : attachement au lecteur CD-ROM
echo -e "\${GREEN}[3/5] Attachement de l'image ISO bootable...\${NC}"
qm set "\${VM_ID}" --cdrom "\${STORAGE}:iso/${artifactFile}" --boot order=ide2
qm set "\${VM_ID}" --scsi0 "\${STORAGE}:40,discard=on,ssd=1"` : `# Mode Disque Cloud (QCOW2 / RAW) : importdisk
echo -e "\${GREEN}[3/5] Importation de l'image disque \${IMAGE_FILE} sur \${STORAGE}...\${NC}"
if [ ! -f "\${IMAGE_FILE}" ]; then
    echo -e "\${RED}[ERREUR] Image disque introuvable : \${IMAGE_FILE}\${NC}"
    exit 1
fi
qm importdisk "\${VM_ID}" "\${IMAGE_FILE}" "\${STORAGE}"
qm set "\${VM_ID}" --scsi0 "\${STORAGE}:vm-\${VM_ID}-disk-0,discard=on,ssd=1"
qm set "\${VM_ID}" --boot order=scsi0`}

# 5. Lecteur Cloud-Init
echo -e "\${GREEN}[4/5] Configuration du lecteur Cloud-Init et des identifiants...\${NC}"
qm set "\${VM_ID}" --ide2 "\${STORAGE}:cloudinit"
qm set "\${VM_ID}" --ciuser "${username}"
${recipe.user.password ? `qm set "\${VM_ID}" --cipassword "${recipe.user.password}"` : ''}
${recipe.user.sshPublicKey ? `qm set "\${VM_ID}" --sshkeys <(echo "${recipe.user.sshPublicKey.trim()}")` : ''}
qm set "\${VM_ID}" --ipconfig0 ip=dhcp

# 6. Conversion en Template Proxmox
echo -e "\${GREEN}[5/5] Conversion en Template Proxmox réutilisable (Clones liés)...\${NC}"
qm template "\${VM_ID}"

echo -e "\${CYAN}===============================================================================\${NC}"
echo -e "\${GREEN}✅ Déploiement Proxmox VE Terminé avec Succès !\${NC}"
echo -e "Le template \${VM_ID} (\${VM_NAME}) est prêt à être cloné instantanément."
echo -e "\${CYAN}===============================================================================\${NC}"
`;
}

/**
 * Génère le manifeste HashiCorp Packer (template.pkr.hcl) pour CI/CD et Virtualisation Cloud
 */
export function generatePackerHcl(recipe: OSRecipe): string {
  const osName = recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const artifactFile = `${osName}-${recipe.branding.version}-${recipe.arch}.${recipe.outputFormat === 'iso_hybrid' ? 'iso' : 'qcow2'}`;
  const username = recipe.user.username;
  const password = recipe.user.password || 'forge';

  return `# ==============================================================================
# OSForge Studio — Manifeste HashiCorp Packer (template.pkr.hcl)
# Système : ${recipe.branding.osName} (${recipe.distro.toUpperCase()})
# ==============================================================================

packer {
  required_version = ">= 1.9.0"
  required_plugins {
    qemu = {
      version = ">= 1.0.10"
      source  = "github.com/hashicorp/qemu"
    }
  }
}

variable "vm_name" {
  type    = string
  default = "${osName}"
}

variable "disk_size" {
  type    = string
  default = "40G"
}

source "qemu" "osforge_build" {
  iso_url           = "dist/${artifactFile}"
  iso_checksum      = "none"
  output_directory  = "output-\${var.vm_name}"
  shutdown_command  = "echo '${password}' | sudo -S shutdown -P now"
  disk_size         = var.disk_size
  format            = "qcow2"
  accelerator       = "kvm"
  http_directory    = "http"
  ssh_username      = "${username}"
  ssh_password      = "${password}"
  ssh_timeout       = "30m"
  vm_name           = "\${var.vm_name}.qcow2"
  memory            = 4096
  cpus              = 4
  headless          = true
  qemuargs = [
    ["-m", "4096M"],
    ["-smp", "4"],
    ["-vga", "virtio"]
  ]
}

build {
  sources = ["source.qemu.osforge_build"]

  # Provisioning post-installation
  provisioner "shell" {
    inline = [
      "echo '==> Finalisation et durcissement OSForge Studio...'",
      "uname -a",
      "uptime"
    ]
  }
}
`;
}

