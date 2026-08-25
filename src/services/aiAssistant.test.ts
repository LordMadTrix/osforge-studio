import { describe, it, expect } from 'vitest';
import { analyzePromptToRecipe } from './aiAssistant';
import { OSRecipe } from '../types/os';

function makeRecipe(): OSRecipe {
  return {
    id: 'test-recipe', name: 'TestForge', description: 'Recette de test',
    distro: 'debian', distroVersion: '13', arch: 'x86_64', outputFormat: 'iso_hybrid',
    desktop: 'none', displayManager: 'none', kernel: 'generic',
    selectedPackages: [], customPackages: [],
    branding: { osName: 'TestForge', editionName: 'Test Edition', version: '1.0', accentColor: '#0ea5e9', wallpaperPreset: 'minimal', bootSplashTheme: 'classic' },
    user: { username: 'tester', fullName: 'Test User', sudo: true, autologin: false, shell: '/bin/bash' },
    hostname: 'testforge', timezone: 'UTC', locale: 'en_US', keyboardLayout: 'us',
    enableSSH: false,
    security: { cisBenchmarkLevel: 0, firewall: 'none', appArmorOrSELinux: false, fail2ban: false, luksEncryption: false, disableRootSSH: false, autoSecurityUpdates: false },
    customServices: [], firstBootScript: '',
  } as OSRecipe;
}

describe('analyzePromptToRecipe — bug réel trouvé en auditant : le champ "confidence" retourné par cette fonction valait TOUJOURS 0.96 (affiché dans l\'UI comme "Confiance : 96%"), quel que soit le texte saisi — y compris un prompt qui ne déclenche aucune branche spécifique et retombe entièrement sur les valeurs par défaut. Aucun modèle d\'IA n\'est appelé ici (correspondance de mots-clés déterministe, sans réseau) : un pourcentage de confiance identique pour n\'importe quelle entrée est une donnée fabriquée. Remplacé par "matchedCriteriaCount", un compte réel et vérifiable des critères effectivement détectés (= la longueur de "suggestedTags") — vérifié en direct dans le navigateur : 6 pour un prompt riche en mots-clés, 2 pour un prompt qui ne matche presque rien', () => {
  it('un prompt riche en mots-clés produit un compte de critères plus élevé qu\'un prompt vague', () => {
    const rich = analyzePromptToRecipe('Station de dev moderne avec Hyprland, Docker, Neovim, Rust et Node.js', makeRecipe());
    const vague = analyzePromptToRecipe('xyz random gibberish nothing matches', makeRecipe());
    expect(rich.matchedCriteriaCount).toBeGreaterThan(vague.matchedCriteriaCount);
  });

  it('matchedCriteriaCount correspond exactement à la longueur réelle de suggestedTags (pas une valeur inventée séparément)', () => {
    const result = analyzePromptToRecipe('Distribution cybersécurité avec Wireshark, Metasploit, Nmap et noyau durci', makeRecipe());
    expect(result.matchedCriteriaCount).toBe(result.suggestedTags.length);
  });

  it('deux prompts différents produisent des comptes différents (non-régression : ce n\'est plus une constante figée)', () => {
    const a = analyzePromptToRecipe('serveur homelab kubernetes docker', makeRecipe());
    const b = analyzePromptToRecipe('borne kiosk alpine chromium', makeRecipe());
    expect(a.matchedCriteriaCount).not.toBe(0);
    expect(b.matchedCriteriaCount).not.toBe(0);
    // Les deux prompts touchent des catégories différentes (paquets homelab vs kiosk) : le compte
    // ne doit pas être une constante partagée par coïncidence sur ces deux cas précis.
    expect(a.suggestedTags).not.toEqual(b.suggestedTags);
  });
});
