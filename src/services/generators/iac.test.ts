import { describe, it, expect } from 'vitest';
import {
  generateDockerfile,
  generateContainerfile,
  generateAnsiblePlaybook,
  generateTerraformTf,
  generateProxmoxDeployScript,
  generatePackerHcl,
} from './iac';
import { OSRecipe } from '../../types/os';

const mockRecipe: OSRecipe = {
  id: 'test-cloud',
  name: 'Forge Cloud Image',
  description: 'Test cloud image',
  distro: 'debian',
  distroVersion: '13 (Trixie)',
  arch: 'x86_64',
  desktop: 'none',
  displayManager: 'none',
  kernel: 'generic',
  outputFormat: 'qcow2',
  hostname: 'cloud-node',
  locale: 'en_US',
  timezone: 'UTC',
  keyboardLayout: 'us',
  selectedPackages: ['docker', 'git'],
  customPackages: [],
  customServices: [],
  firstBootScript: '',
  user: {
    username: 'cloudadmin',
    fullName: 'Cloud Administrator',
    password: 'CloudSecurePassword2026!',
    sudo: true,
    autologin: false,
    shell: '/bin/bash',
    sshPublicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG... user@host',
  },
  branding: {
    osName: 'ForgeCloud',
    editionName: 'Server Pro',
    version: '2.0',
    accentColor: '#0ea5e9',
    wallpaperPreset: 'minimal',
    bootSplashTheme: 'minimal',
  },
  security: {
    cisBenchmarkLevel: 1,
    firewall: 'ufw',
    appArmorOrSELinux: true,
    fail2ban: false,
    luksEncryption: false,
    disableRootSSH: true,
    autoSecurityUpdates: true,
  },
  enableSSH: true,
};

describe('Chantier 4 : Proxmox VE & Packer Cloud Templates (iac.ts)', () => {
  it('génère un script de déploiement Proxmox VE avec qm create, importdisk et cloud-init', () => {
    const pve = generateProxmoxDeployScript(mockRecipe);
    expect(pve).toContain('#!/usr/bin/env bash');
    expect(pve).toContain('qm create "${VM_ID}"');
    expect(pve).toContain('--scsihw virtio-scsi-single');
    expect(pve).toContain('qm importdisk "${VM_ID}" "${IMAGE_FILE}" "${STORAGE}"');
    expect(pve).toContain('qm set "${VM_ID}" --ide2 "${STORAGE}:cloudinit"');
    expect(pve).toContain('qm set "${VM_ID}" --ciuser "cloudadmin"');
    expect(pve).toContain('qm template "${VM_ID}"');
  });

  it('adapte le script Proxmox VE en mode ISO bootable', () => {
    const isoRecipe: OSRecipe = { ...mockRecipe, outputFormat: 'iso_hybrid' };
    const pve = generateProxmoxDeployScript(isoRecipe);
    expect(pve).toContain('--cdrom "${STORAGE}:iso/');
    expect(pve).toContain('--scsi0 "${STORAGE}:40,discard=on,ssd=1"');
  });

  it('génère un manifeste HashiCorp Packer template.pkr.hcl valide', () => {
    const packer = generatePackerHcl(mockRecipe);
    expect(packer).toContain('packer {');
    expect(packer).toContain('source "qemu" "osforge_build"');
    expect(packer).toContain('accelerator       = "kvm"');
    expect(packer).toContain('ssh_username      = "cloudadmin"');
    expect(packer).toContain('shutdown_command');
    expect(packer).toContain('build {');
  });

  it('génère Dockerfile, Containerfile, Ansible et Terraform existants', () => {
    expect(generateDockerfile(mockRecipe)).toContain('FROM debian:bookworm-slim');
    expect(generateContainerfile(mockRecipe)).toContain('FROM debian:bookworm-slim');
    expect(generateAnsiblePlaybook(mockRecipe)).toContain('ansible.builtin.hostname:');
    expect(generateTerraformTf(mockRecipe)).toContain('terraform {');
  });
});
