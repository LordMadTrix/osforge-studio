import { describe, it, expect } from 'vitest';
import {
  generateSystemdBootConfig,
  generateRefindConfig,
  generateAlternativeBootloaderCommands,
} from './bootloader';
import { OSRecipe } from '../../types/os';

const baseRecipe: OSRecipe = {
  id: 'test-bootloader',
  name: 'Test Bootloader OS',
  distro: 'debian',
  version: '13',
  arch: 'x86_64',
  desktop: 'gnome',
  displayServer: 'wayland',
  kernel: 'generic',
  outputFormat: 'iso_hybrid',
  filesystem: 'ext4',
  selectedPackages: [],
  network: {},
  user: { username: 'testuser', password: 'password', sudoPasswordless: true, shell: '/bin/bash' },
  security: {} as any,
  branding: { osName: 'FastOS', editionName: 'Speed', version: '2.0', accentColor: '#38bdf8' } as any,
} as unknown as OSRecipe;

describe('Chantier 44 : Sélecteur de Chargeur d’Amorçage (systemd-boot & rEFInd)', () => {
  it('génère une configuration loader.conf et entries/ pour systemd-boot', () => {
    const { loaderConf, entryConf } = generateSystemdBootConfig(baseRecipe);
    expect(loaderConf).toContain('default fastos.conf');
    expect(loaderConf).toContain('timeout 3');
    expect(entryConf).toContain('title   FastOS (Speed)');
    expect(entryConf).toContain('options root=UUID=${ROOT_UUID} rw quiet splash');
  });

  it('génère un fichier de configuration rEFInd avec gestion graphique et accent color', () => {
    const refindConf = generateRefindConfig(baseRecipe);
    expect(refindConf).toContain('timeout 5');
    expect(refindConf).toContain('enable_mouse');
    expect(refindConf).toContain('menuentry "FastOS"');
    expect(refindConf).toContain('Accent Color: #38bdf8');
  });

  it('génère les commandes chroot pour bootctl (systemd-boot)', () => {
    const recipe: OSRecipe = { ...baseRecipe, bootloader: 'systemd-boot' };
    const cmds = generateAlternativeBootloaderCommands(recipe, 'debian');
    expect(cmds).toContain('bootctl --path=/boot install');
    expect(cmds).toContain('/boot/loader/loader.conf');
    expect(cmds).toContain('/boot/loader/entries/fastos.conf');
  });

  it('génère les commandes chroot pour refind-install', () => {
    const recipe: OSRecipe = { ...baseRecipe, bootloader: 'refind' };
    const cmds = generateAlternativeBootloaderCommands(recipe, 'debian');
    expect(cmds).toContain('refind-install --yes');
    expect(cmds).toContain('/boot/EFI/refind/refind.conf');
  });

  it('ne produit aucune commande alternative si GRUB 2 est sélectionné', () => {
    const recipe: OSRecipe = { ...baseRecipe, bootloader: 'grub2' };
    const cmds = generateAlternativeBootloaderCommands(recipe, 'debian');
    expect(cmds).toBe('');
  });
});
