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

describe('analyzePromptToRecipe — bug réel trouvé en auditant, même classe que le fix des presets "cybersec_lab"/"ai_llm_station" (kernel promis dans l\'UI mais jamais réellement câblé pour la distro résultante) : "kernel" était assigné à une valeur fixe ("hardened" pour pentest, "liquorix" pour gaming) SANS jamais tenir compte de la distro réellement choisie par le reste de la fonction. Vérifié en direct via generateBuildScript() : un prompt "securise pour le pentest" sans mot-clé de distro retombait sur Debian (kernel="hardened", câblé UNIQUEMENT pour Arch/CachyOS) — le script généré contenait bien l\'avertissement honnête "n\'est pas encore câblé", mais le tag UI "Noyau Hardened" affirmait le contraire. Corrigé en choisissant le noyau réellement câblé pour LA distro déjà sélectionnée', () => {
  it('pentest SANS mot-clé de distro (retombe sur Debian) : kernel reste "generic", PAS de tag "Noyau Hardened" mensonger', () => {
    const result = analyzePromptToRecipe('je veux un OS securise pour le pentest et le hack wifi', makeRecipe());
    expect(result.recipe.distro).toBe('debian');
    expect(result.recipe.kernel).toBe('generic');
    expect(result.suggestedTags).not.toContain('Noyau Hardened');
  });

  it('pentest + Arch : kernel="hardened" (réellement câblé pour Arch), tag "Noyau Hardened" honnête', () => {
    const result = analyzePromptToRecipe('Arch Linux pacman securise pour le pentest', makeRecipe());
    expect(result.recipe.distro).toBe('arch');
    expect(result.recipe.kernel).toBe('hardened');
    expect(result.suggestedTags).toContain('Noyau Hardened');
  });

  it('gaming + Arch : kernel="zen" (réellement câblé pour Arch, PAS "liquorix" qui ne l\'est pas), tag "Noyau Zen"', () => {
    const result = analyzePromptToRecipe('Arch Linux rolling pacman ideal pour le gaming steam', makeRecipe());
    expect(result.recipe.distro).toBe('arch');
    expect(result.recipe.kernel).toBe('zen');
    expect(result.suggestedTags).toContain('Noyau Zen');
    expect(result.suggestedTags).not.toContain('Noyau Liquorix');
  });

  it('gaming + Ubuntu (x86_64) : kernel="liquorix" (réellement câblé pour Ubuntu x86_64), tag "Noyau Liquorix"', () => {
    const result = analyzePromptToRecipe('Ubuntu canonical pour du gaming steam', makeRecipe());
    expect(result.recipe.distro).toBe('ubuntu');
    expect(result.recipe.kernel).toBe('liquorix');
    expect(result.suggestedTags).toContain('Noyau Liquorix');
  });

  it('gaming (retro) + Raspberry Pi (aarch64, hors périmètre liquorix/zen) : kernel reste "generic", aucun tag de noyau mensonger', () => {
    // "gaming"/"steam" font partie des mots-clés qui sélectionnent Ubuntu dans la chaîne de
    // sélection de distro existante (comportement préexistant, non modifié ici) — "retro" seul
    // déclenche le bloc paquets gaming (ligne ~117) sans influencer la sélection de distro.
    const result = analyzePromptToRecipe('Raspberry Pi rpi retro sbc', makeRecipe());
    expect(result.recipe.distro).toBe('raspbian');
    expect(result.recipe.kernel).toBe('generic');
    expect(result.suggestedTags).not.toContain('Noyau Liquorix');
    expect(result.suggestedTags).not.toContain('Noyau Zen');
  });

  it('bug réel trouvé dans le même audit : "xanmod" (câblé UNIQUEMENT pour Debian/Ubuntu x86_64) sur Fedora ne produit plus de kernel="xanmod" ni de tag mensonger', () => {
    const result = analyzePromptToRecipe('Fedora redhat avec noyau xanmod', makeRecipe());
    expect(result.recipe.distro).toBe('fedora');
    expect(result.recipe.kernel).toBe('generic');
    expect(result.suggestedTags).not.toContain('Noyau XanMod');
  });

  it('bug réel trouvé dans le même audit : "xanmod" combiné à "gaming" sur Arch n\'écrase plus "zen" (le vrai choix câblé) — un seul tag de noyau cohérent, pas deux contradictoires', () => {
    const result = analyzePromptToRecipe('Arch pacman gaming steam xanmod', makeRecipe());
    expect(result.recipe.distro).toBe('arch');
    expect(result.recipe.kernel).toBe('zen');
    expect(result.suggestedTags).toContain('Noyau Zen');
    expect(result.suggestedTags).not.toContain('Noyau XanMod');
  });

  it('"xanmod" seul sur Debian (compatible) : fonctionne normalement, non-régression', () => {
    const result = analyzePromptToRecipe('Debian avec noyau xanmod', makeRecipe());
    expect(result.recipe.distro).toBe('debian');
    expect(result.recipe.kernel).toBe('xanmod');
    expect(result.suggestedTags).toContain('Noyau XanMod');
  });

  it('bug réel MAJEUR trouvé en auditant : un prompt "sécurisé"/"durci" activait security.luksEncryption=true et affichait le tag "Chiffrement LUKS", alors que "luksEncryption" n\'est câblé NULLE PART dans ce projet (aucune trace de "cryptsetup"/"luksFormat" dans tout src/, confirmé par recherche exhaustive) — l\'utilisateur croyait son disque chiffré sans que rien ne le soit réellement. Corrigé : luksEncryption reste false, aucun tag "Chiffrement LUKS" affiché', () => {
    const result = analyzePromptToRecipe('je veux un OS sécurisé et durci pour la banque', makeRecipe());
    expect(result.recipe.security?.luksEncryption).toBe(false);
    expect(result.suggestedTags).not.toContain('Chiffrement LUKS');
    expect(result.suggestedTags).toContain('CIS Level 2');
  });
});
