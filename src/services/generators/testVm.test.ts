import { describe, it, expect } from 'vitest';
import {
  generateQemuTestBat,
  generateQemuTestSh,
  generateVirtualBoxTestBat,
  generateVirtualBoxTestSh,
  getVBoxOsType,
} from './testVm';
import { OSRecipe } from '../../types/os';

const mockIsoRecipe: OSRecipe = {
  id: 'test-iso',
  name: 'Test ISO OS',
  distro: 'debian',
  version: '13',
  arch: 'x86_64',
  desktop: 'xfce',
  displayServer: 'x11',
  kernel: 'generic',
  outputFormat: 'iso_hybrid',
  filesystem: 'ext4',
  selectedPackages: [],
  network: {},
  user: { username: 'testuser', password: 'password', sudoPasswordless: true, shell: '/bin/bash' },
  security: {} as any,
  branding: { osName: 'DebianTest', editionName: 'Light', version: '1.0' } as any,
} as unknown as OSRecipe;

const mockQcow2Recipe: OSRecipe = {
  ...mockIsoRecipe,
  id: 'test-qcow2',
  outputFormat: 'qcow2',
};

describe('Chantier 43 : Lanceur Universel de Banc d’Essai VM 1-Clic (tester-en-vm.bat & tester-en-vm.sh)', () => {
  it('génère un script batch Windows avec détection d’accélération matérielle WHPX et TCG', () => {
    const bat = generateQemuTestBat(mockIsoRecipe);
    expect(bat).toContain('@echo off');
    expect(bat).toContain('qemu-system-x86_64');
    expect(bat).toContain('-accel whpx');
    expect(bat).toContain('-accel tcg');
    expect(bat).toContain('virtio-net-pci');
    expect(bat).toContain('hostfwd=tcp::2222-:22');
  });

  it('adapte les arguments QEMU pour le format ISO (-cdrom / -boot d)', () => {
    const bat = generateQemuTestBat(mockIsoRecipe);
    expect(bat).toContain('-cdrom');
    expect(bat).toContain('-boot d');
  });

  it('adapte les arguments QEMU pour le format image disque QCOW2 (-drive if=virtio)', () => {
    const bat = generateQemuTestBat(mockQcow2Recipe);
    expect(bat).toContain('-drive file="%DIST_DIR%\\');
    expect(bat).toContain('if=virtio');
    expect(bat).toContain('format=qcow2');
  });

  it('génère un script bash Linux avec détection KVM et gestion console/display', () => {
    const sh = generateQemuTestSh(mockIsoRecipe);
    expect(sh).toContain('#!/usr/bin/env bash');
    expect(sh).toContain('/dev/kvm');
    expect(sh).toContain('-enable-kvm');
    expect(sh).toContain('hostfwd=tcp::2222-:22');
  });

  it('mappe correctement les OS Types VirtualBox pour les distributions', () => {
    expect(getVBoxOsType('debian', 'x86_64')).toBe('Debian_64');
    expect(getVBoxOsType('ubuntu', 'x86_64')).toBe('Ubuntu_64');
    expect(getVBoxOsType('arch', 'x86_64')).toBe('ArchLinux_64');
    expect(getVBoxOsType('fedora', 'x86_64')).toBe('Fedora_64');
    expect(getVBoxOsType('rocky', 'x86_64')).toBe('RedHat_64');
    expect(getVBoxOsType('opensuse', 'x86_64')).toBe('OpenSUSE_64');
  });

  it('génère un script VirtualBox Windows fonctionnel avec VBoxManage, SATA et natpf1', () => {
    const vbat = generateVirtualBoxTestBat(mockIsoRecipe);
    expect(vbat).toContain('@echo off');
    expect(vbat).toContain('VBoxManage');
    expect(vbat).toContain('createvm --name');
    expect(vbat).toContain('--ostype "Debian_64"');
    expect(vbat).toContain('--graphicscontroller vboxsvga');
    expect(vbat).toContain('--natpf1 "ssh,tcp,,2222,,22"');
    expect(vbat).toContain('--storagectl "SATA"');
    expect(vbat).toContain('startvm');
  });

  it('génère un script VirtualBox Linux/macOS avec support ISO et disque virtuel temporaire', () => {
    const vsh = generateVirtualBoxTestSh(mockIsoRecipe);
    expect(vsh).toContain('#!/usr/bin/env bash');
    expect(vsh).toContain('VBoxManage');
    expect(vsh).toContain('modifyvm "${VM_NAME}" --memory');
    expect(vsh).toContain('--graphicscontroller vboxsvga');
    expect(vsh).toContain('storageattach "${VM_NAME}" --storagectl "SATA" --port 0 --device 0 --type dvddrive');
  });
});

