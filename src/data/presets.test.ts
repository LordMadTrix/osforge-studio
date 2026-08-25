import { describe, it, expect } from 'vitest';
import { DISTRO_PRESETS } from './presets';
import { generateBuildScript } from '../services/scriptGenerators';
import { OSRecipe } from '../types/os';

const DEFAULTS: OSRecipe = {
  id: 'd', name: 'd', description: 'd',
  distro: 'debian', distroVersion: '', arch: 'x86_64', outputFormat: 'iso_hybrid',
  desktop: 'none', displayManager: 'none', kernel: 'generic',
  selectedPackages: [], customPackages: [],
  branding: { osName: 'D', editionName: 'D', version: '1.0', accentColor: '#000', wallpaperPreset: 'd', bootSplashTheme: 'classic' },
  user: { username: 'u', fullName: 'U', sudo: true, autologin: false, shell: '/bin/bash' },
  hostname: 'd', timezone: 'UTC', locale: 'en_US', keyboardLayout: 'us',
  enableSSH: true,
  security: { cisBenchmarkLevel: 0, firewall: 'none', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: false },
  customServices: [], firstBootScript: '',
};

function recipeFromPreset(partial: Partial<OSRecipe>): OSRecipe {
  return {
    ...DEFAULTS,
    ...partial,
    security: { ...DEFAULTS.security, ...partial.security },
    user: { ...DEFAULTS.user, ...partial.user },
    branding: { ...DEFAULTS.branding, ...partial.branding },
  } as OSRecipe;
}

describe('DISTRO_PRESETS — bug réel MAJEUR trouvé en auditant : 2 presets ("devops_hyprland", "ai_llm_station") combinaient distro="arch" avec outputFormat="iso_hybrid" — un format que generateNonDebianBuildScript() refuse explicitement pour Arch/CachyOS/Fedora/Rocky/Alpine/openSUSE/Void (ISO live bootable non implémentée pour ces familles, refus honnête déjà en place). Choisir l\'un de ces presets et cliquer "Générer" produisait un script de 727 caractères refusant de continuer, pas la station de travail annoncée par son titre et ses "highlights". "ai_llm_station" avait un second bug dans la même veine : "XanMod" annoncé dans le titre/highlights alors que XanMod n\'a aucun paquet officiel pour Arch (repli silencieux vers un noyau générique). Les deux corrigés vers "qcow2" (image disque réellement bootable, déjà vérifiée par boot QEMU pour Arch cette session) et "zen" (noyau réellement câblé pour Arch, même promesse de réactivité tenue honnêtement)', () => {
  it('chaque preset du catalogue produit un vrai script de build, jamais un refus "format non pris en charge" (empêche toute régression future, pas seulement les 2 presets déjà trouvés)', () => {
    for (const preset of DISTRO_PRESETS) {
      const recipe = recipeFromPreset(preset.recipe);
      const script = generateBuildScript(recipe);
      expect(script.length, `preset "${preset.id}" (${recipe.distro} + ${recipe.outputFormat}) produit un script anormalement court`).toBeGreaterThan(2000);
      expect(script, `preset "${preset.id}" refuse le format choisi`).not.toContain("n'est pas encore pris en charge");
    }
  });

  it('devops_hyprland : utilise "qcow2" (pas "iso_hybrid", refusé par Arch) et produit un script réel', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'devops_hyprland')!;
    expect(preset.recipe.outputFormat).toBe('qcow2');
    const script = generateBuildScript(recipeFromPreset(preset.recipe));
    expect(script).toContain('grub-install');
  });

  it('ai_llm_station : utilise "qcow2" et le noyau "zen" (pas "xanmod", inexistant pour Arch)', () => {
    const preset = DISTRO_PRESETS.find(p => p.id === 'ai_llm_station')!;
    expect(preset.recipe.outputFormat).toBe('qcow2');
    expect(preset.recipe.kernel).toBe('zen');
    const script = generateBuildScript(recipeFromPreset(preset.recipe));
    expect(script).toContain('linux-zen');
    expect(script).not.toContain('xanmod');
  });
});
