import { describe, it, expect } from 'vitest';
import {
  WIZARD_INTENTS,
  WIZARD_DESKTOP_CHOICES,
  WIZARD_SOFTWARE_PACKS,
  WIZARD_FORMAT_CHOICES,
  applyWizardIntentToRecipe,
} from './wizardSteps';
import { generateBuildScript, resolvePackageList } from '../services/scriptGenerators';
import { OSRecipe } from '../types/os';

const BASE_RECIPE: OSRecipe = {
  id: 'test-recipe',
  name: 'TestOS',
  description: 'Test Recipe',
  distro: 'debian',
  distroVersion: '13',
  arch: 'x86_64',
  outputFormat: 'iso_hybrid',
  desktop: 'none',
  displayManager: 'none',
  kernel: 'generic',
  selectedPackages: [],
  customPackages: [],
  branding: {
    osName: 'TestOS',
    editionName: 'Test Edition',
    version: '1.0',
    accentColor: '#0ea5e9',
    wallpaperPreset: 'minimal',
    bootSplashTheme: 'minimal',
  },
  user: {
    username: 'tester',
    fullName: 'Test User',
    password: 'password',
    sudo: true,
    autologin: true,
    shell: '/bin/bash',
  },
  hostname: 'test-box',
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  keyboardLayout: 'fr',
  enableSSH: true,
  security: {
    cisBenchmarkLevel: 1,
    firewall: 'ufw',
    appArmorOrSELinux: true,
    fail2ban: false,
    luksEncryption: false,
    disableRootSSH: true,
    autoSecurityUpdates: true,
  },
  customServices: [],
  firstBootScript: '',
};

describe('WIZARD_INTENTS — Assistant Pas-à-Pas (Mode Guidé)', () => {
  it('contient 6 profils d’objectifs guidés distincts', () => {
    expect(WIZARD_INTENTS.length).toBe(6);
    const ids = WIZARD_INTENTS.map((i) => i.id);
    expect(ids).toContain('gaming');
    expect(ids).toContain('development');
    expect(ids).toContain('daily_office');
    expect(ids).toContain('security_pentest');
    expect(ids).toContain('server_homelab');
    expect(ids).toContain('lightweight_revive');
  });

  it('chaque intention du Wizard produit une recette valide et un script de compilation exécutable', () => {
    for (const intent of WIZARD_INTENTS) {
      const recipe = applyWizardIntentToRecipe(intent, BASE_RECIPE);
      expect(recipe.distro).toBe(intent.recommendedDistro);
      expect(recipe.desktop).toBe(intent.recommendedDesktop);
      expect(recipe.kernel).toBe(intent.recommendedKernel);

      const pkgs = resolvePackageList(recipe);
      expect(pkgs.length, `Intention ${intent.id} n'a généré aucun paquet`).toBeGreaterThan(0);

      const script = generateBuildScript(recipe);
      expect(script.length, `Script pour ${intent.id} anormalement court`).toBeGreaterThan(1500);
      expect(script).not.toContain("n'est pas encore pris en charge");
    }
  });

  it('applyWizardIntentToRecipe configure le Gaming avec XanMod et les optimisations système', () => {
    const gamingIntent = WIZARD_INTENTS.find((i) => i.id === 'gaming')!;
    const recipe = applyWizardIntentToRecipe(gamingIntent, BASE_RECIPE);

    expect(recipe.enableGamingOptimizations).toBe(true);
    expect(recipe.enablePowerSaving).toBe(true);
    expect(recipe.selectedPackages).toContain('steam');
    expect(recipe.selectedPackages).toContain('gamepad_drivers');

    const script = generateBuildScript(recipe);
    expect(script).toContain('deb.xanmod.org');
    expect(script).toContain('99-gaming.conf');
  });

  it('les packs logiciels du Wizard sont tous valides et non vides', () => {
    expect(WIZARD_SOFTWARE_PACKS.length).toBeGreaterThan(4);
    for (const pack of WIZARD_SOFTWARE_PACKS) {
      expect(pack.packageIds.length).toBeGreaterThan(0);
    }
  });

  it('les choix de bureaux du Wizard contiennent au moins 5 environnements graphiques et headless', () => {
    expect(WIZARD_DESKTOP_CHOICES.length).toBeGreaterThanOrEqual(5);
  });

  it('les formats de sortie du Wizard couvrent les 4 cibles principales', () => {
    const formats = WIZARD_FORMAT_CHOICES.map((f) => f.id);
    expect(formats).toContain('iso_hybrid');
    expect(formats).toContain('wsl2_tar');
    expect(formats).toContain('qcow2');
    expect(formats).toContain('rpi_sd');
  });

  it('le Wizard applique automatiquement la toute dernière version et suite de chaque distribution', () => {
    const gamingIntent = WIZARD_INTENTS.find((i) => i.id === 'gaming')!;
    const gamingRecipe = applyWizardIntentToRecipe(gamingIntent, BASE_RECIPE);
    expect(gamingRecipe.distro).toBe('ubuntu');
    expect(gamingRecipe.distroVersion).toContain('26.04');
    expect(gamingRecipe.distroSuite).toBe('resolute');

    const devIntent = WIZARD_INTENTS.find((i) => i.id === 'development')!;
    const devRecipe = applyWizardIntentToRecipe(devIntent, BASE_RECIPE);
    expect(devRecipe.distro).toBe('debian');
    expect(devRecipe.distroVersion).toContain('13');
    expect(devRecipe.distroSuite).toBe('trixie');
  });
});

