import { describe, it, expect } from 'vitest';
import { DISTROS } from './distros';
import { KERNEL_OPTIONS, KernelCategory } from './kernels';
import { DESKTOPS } from './desktopEnvironments';
import { DistroCategory } from '../types/os';

describe('Catégorisation des Éléments du Studio Expert (Distributions, Noyaux & Bureaux)', () => {
  describe('Distributions Linux (DISTROS)', () => {
    const validDistroCategories: DistroCategory[] = [
      'general',
      'gaming',
      'enterprise',
      'security',
      'sbc_iot',
      'minimal',
    ];

    it('doit posséder 21 distributions déclarées dans le catalogue', () => {
      expect(DISTROS.length).toBe(21);
    });

    it('chaque distribution du catalogue doit posséder une catégorie valide', () => {
      DISTROS.forEach(d => {
        expect(d.category, `Distribution ${d.id} (${d.name}) n'a pas de catégorie définie`).toBeDefined();
        expect(validDistroCategories).toContain(d.category);
      });
    });

    it('chaque catégorie de distribution doit contenir au moins une distribution', () => {
      validDistroCategories.forEach(cat => {
        const matches = DISTROS.filter(d => d.category === cat);
        expect(matches.length, `La catégorie de distribution ${cat} est vide`).toBeGreaterThan(0);
      });
    });

    it('la catégorie "gaming" doit inclure CachyOS, EndeavourOS et RetroPie', () => {
      const gamingDistros = DISTROS.filter(d => d.category === 'gaming').map(d => d.id);
      expect(gamingDistros).toContain('cachyos');
      expect(gamingDistros).toContain('endeavouros');
      expect(gamingDistros).toContain('retropie');
    });

    it('la catégorie "security" doit inclure Kali et Parrot', () => {
      const secDistros = DISTROS.filter(d => d.category === 'security').map(d => d.id);
      expect(secDistros).toContain('kali');
      expect(secDistros).toContain('parrot');
    });

    it('la catégorie "enterprise" doit inclure Rocky Linux et AlmaLinux', () => {
      const entDistros = DISTROS.filter(d => d.category === 'enterprise').map(d => d.id);
      expect(entDistros).toContain('rocky');
      expect(entDistros).toContain('almalinux');
    });

    it('la catégorie "sbc_iot" doit inclure Raspberry Pi OS, DietPi, Armbian et RaspAP', () => {
      const sbcDistros = DISTROS.filter(d => d.category === 'sbc_iot').map(d => d.id);
      expect(sbcDistros).toContain('raspbian');
      expect(sbcDistros).toContain('dietpi');
      expect(sbcDistros).toContain('armbian');
      expect(sbcDistros).toContain('raspap');
    });

    it('la catégorie "minimal" doit inclure Arch, Alpine, Void et NixOS', () => {
      const minDistros = DISTROS.filter(d => d.category === 'minimal').map(d => d.id);
      expect(minDistros).toContain('arch');
      expect(minDistros).toContain('alpine');
      expect(minDistros).toContain('void');
      expect(minDistros).toContain('nixos');
    });
  });

  describe('Noyaux Linux (KERNEL_OPTIONS)', () => {
    const validKernelCategories: KernelCategory[] = [
      'gaming',
      'stable',
      'security',
      'specialized',
    ];

    it('doit posséder 13 options de noyaux Linux dans le catalogue', () => {
      expect(KERNEL_OPTIONS.length).toBe(13);
    });

    it('chaque noyau du catalogue doit posséder une catégorie valide', () => {
      KERNEL_OPTIONS.forEach(k => {
        expect(k.category, `Noyau ${k.id} (${k.name}) n'a pas de catégorie définie`).toBeDefined();
        expect(validKernelCategories).toContain(k.category);
      });
    });

    it('chaque catégorie de noyau doit contenir au moins un noyau', () => {
      validKernelCategories.forEach(cat => {
        const matches = KERNEL_OPTIONS.filter(k => k.category === cat);
        expect(matches.length, `La catégorie de noyau ${cat} est vide`).toBeGreaterThan(0);
      });
    });

    it('la catégorie "gaming" pour les noyaux doit regrouper les 5 noyaux optimisés faible latence', () => {
      const gamingKernels = KERNEL_OPTIONS.filter(k => k.category === 'gaming').map(k => k.id);
      expect(gamingKernels).toEqual(expect.arrayContaining(['cachyos', 'tkg', 'xanmod', 'liquorix', 'zen']));
      expect(gamingKernels.length).toBe(5);
    });

    it('la catégorie "stable" pour les noyaux doit contenir generic et lts', () => {
      const stableKernels = KERNEL_OPTIONS.filter(k => k.category === 'stable').map(k => k.id);
      expect(stableKernels).toContain('generic');
      expect(stableKernels).toContain('lts');
      expect(stableKernels.length).toBe(2);
    });

    it('la catégorie "security" pour les noyaux doit contenir hardened, realtime et libre', () => {
      const secKernels = KERNEL_OPTIONS.filter(k => k.category === 'security').map(k => k.id);
      expect(secKernels).toContain('hardened');
      expect(secKernels).toContain('realtime');
      expect(secKernels).toContain('libre');
      expect(secKernels.length).toBe(3);
    });

    it('la catégorie "specialized" pour les noyaux doit contenir cloud_micro, surface et mainline_beta', () => {
      const specKernels = KERNEL_OPTIONS.filter(k => k.category === 'specialized').map(k => k.id);
      expect(specKernels).toContain('cloud_micro');
      expect(specKernels).toContain('surface');
      expect(specKernels).toContain('mainline_beta');
      expect(specKernels.length).toBe(3);
    });
  });

  describe('Environnements de Bureau (DESKTOPS)', () => {
    const validDesktopTypes = [
      'Full Desktop',
      'Tiling WM',
      'Lightweight',
      'Headless',
      'Appliance',
      'Next-Gen Rust',
    ];

    it('doit posséder 21 environnements de bureau dans le catalogue', () => {
      expect(DESKTOPS.length).toBe(21);
    });

    it('chaque environnement de bureau doit posséder un type valide', () => {
      DESKTOPS.forEach(de => {
        expect(validDesktopTypes).toContain(de.type);
      });
    });

    it('les types "Full Desktop" doivent comporter les bureaux complets', () => {
      const fullDesktops = DESKTOPS.filter(d => d.type === 'Full Desktop').map(d => d.id);
      expect(fullDesktops).toContain('kde');
      expect(fullDesktops).toContain('gnome');
      expect(fullDesktops).toContain('cinnamon');
      expect(fullDesktops).toContain('mate');
      expect(fullDesktops).toContain('budgie');
      expect(fullDesktops).toContain('deepin');
      expect(fullDesktops).toContain('pantheon');
      expect(fullDesktops).toContain('wayfire');
    });

    it('les types "Tiling WM" doivent comporter les WMs en mosaïque', () => {
      const tilingDesktops = DESKTOPS.filter(d => d.type === 'Tiling WM').map(d => d.id);
      expect(tilingDesktops).toContain('hyprland');
      expect(tilingDesktops).toContain('sway');
      expect(tilingDesktops).toContain('i3wm');
      expect(tilingDesktops).toContain('bspwm');
      expect(tilingDesktops).toContain('qtile');
    });

    it('les types "Next-Gen Rust" doivent comporter COSMIC et Niri', () => {
      const rustDesktops = DESKTOPS.filter(d => d.type === 'Next-Gen Rust').map(d => d.id);
      expect(rustDesktops).toContain('cosmic');
      expect(rustDesktops).toContain('niri');
    });

    it('les types "Lightweight" doivent comporter XFCE, LXQt, LXDE et Openbox', () => {
      const lightDesktops = DESKTOPS.filter(d => d.type === 'Lightweight').map(d => d.id);
      expect(lightDesktops).toContain('xfce');
      expect(lightDesktops).toContain('lxqt');
      expect(lightDesktops).toContain('lxde');
      expect(lightDesktops).toContain('openbox');
    });

    it('les types spécialisés doivent inclure none (Headless) et web_kiosk (Appliance)', () => {
      const headless = DESKTOPS.find(d => d.id === 'none');
      const kiosk = DESKTOPS.find(d => d.id === 'web_kiosk');
      expect(headless?.type).toBe('Headless');
      expect(kiosk?.type).toBe('Appliance');
    });
  });
});
