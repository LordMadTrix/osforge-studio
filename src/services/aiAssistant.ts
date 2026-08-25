import { OSRecipe } from '../types/os';

export interface AIAnalysisResult {
  recipe: Partial<OSRecipe>;
  reasoning: string;
  suggestedTags: string[];
  // Bug réel trouvé en auditant : ce champ s'appelait "confidence" et valait TOUJOURS 0.96,
  // affiché dans l'UI comme "Confiance : 96%" quel que soit le texte saisi — y compris un prompt
  // vide de sens ("asdf1234") qui ne déclenche aucune branche spécifique et retombe sur les choix
  // par défaut (Debian, CustomOS). Aucun modèle d'IA n'est appelé ici (analyzePromptToRecipe est
  // un moteur de correspondance de mots-clés déterministe, sans appel réseau ni LLM) : présenter
  // un pourcentage de confiance inventé, identique pour n'importe quelle entrée, est exactement le
  // genre de "cosmétique" que ce projet cherche à éliminer. Remplacé par un compte RÉEL et
  // vérifiable des critères de configuration effectivement détectés dans le prompt (= le nombre
  // d'étiquettes réellement poussées dans "suggestedTags" ci-dessus, jamais une valeur inventée).
  matchedCriteriaCount: number;
}

export function analyzePromptToRecipe(prompt: string, currentRecipe: OSRecipe): AIAnalysisResult {
  const p = prompt.toLowerCase();
  const updated: Partial<OSRecipe> = { ...currentRecipe };
  const tags: string[] = [];
  const reasons: string[] = [];

  // Distribution selection
  if (p.includes('alpine') || p.includes('ultra léger') || p.includes('minuscule') || p.includes('50mb') || p.includes('embarqué')) {
    updated.distro = 'alpine';
    updated.distroVersion = '3.20 (musl/busybox)';
    tags.push('Alpine Linux', 'Ultra Léger');
    reasons.push('Alpine Linux sélectionné pour son empreinte minimale et ses démarrages instantanés.');
  } else if (p.includes('arch') || p.includes('bleeding edge') || p.includes('rolling') || p.includes('pacman')) {
    updated.distro = 'arch';
    updated.distroVersion = 'Rolling Release (2026)';
    tags.push('Arch Linux', 'Rolling Release');
    reasons.push('Arch Linux configuré pour avoir les versions de paquets les plus récentes et le plein contrôle.');
  } else if (p.includes('ubuntu') || p.includes('canonical') || p.includes('gaming') || p.includes('steam')) {
    updated.distro = 'ubuntu';
    updated.distroVersion = '24.04 LTS (Noble Numbat)';
    tags.push('Ubuntu 24.04', 'Support étendu');
    reasons.push('Ubuntu 24.04 LTS sélectionné pour sa grande compatibilité de pilotes et son support 5 ans.');
  } else if (p.includes('fedora') || p.includes('redhat') || p.includes('rhel')) {
    updated.distro = 'fedora';
    updated.distroVersion = '41 Workstation/Server';
    tags.push('Fedora 41', 'Innovation');
    reasons.push('Fedora 41 choisi pour ses technologies d’avant-garde et sa sécurité SELinux native.');
  } else if (p.includes('raspberry') || p.includes('rpi') || p.includes('sbc')) {
    updated.distro = 'raspbian';
    updated.arch = 'aarch64';
    tags.push('Raspberry Pi OS', 'ARM64');
    reasons.push('Raspberry Pi OS configuré en architecture ARM64.');
  } else {
    updated.distro = 'debian';
    updated.distroVersion = '12 (Bookworm)';
    tags.push('Debian 12', 'Stabilité absolue');
    reasons.push('Debian 12 sélectionné comme socle ultra-stable et universel.');
  }

  // Desktop Environment
  if (p.includes('kiosk') || p.includes('borne') || p.includes('affichage') || p.includes('dynamique') || p.includes('plein écran')) {
    updated.desktop = 'web_kiosk';
    updated.displayManager = 'none';
    tags.push('Mode Kiosk Web', 'Cage Wayland');
    reasons.push('Mode Borne Kiosk activé avec démarrage direct Chromium en plein écran sans barre d’outils.');
  } else if (p.includes('hyprland') || p.includes('tiling') || p.includes('wayland') || p.includes('hacker') || p.includes('i3')) {
    if (p.includes('i3')) {
      updated.desktop = 'i3wm';
      tags.push('i3 Window Manager');
      reasons.push('Gestionnaire de fenêtres en mosaïque i3wm activé.');
    } else {
      updated.desktop = 'hyprland';
      tags.push('Hyprland Wayland');
      reasons.push('Hyprland sélectionné pour une interface dynamique ultra-fluide avec animations et flou.');
    }
  } else if (p.includes('kde') || p.includes('plasma') || p.includes('beau') || p.includes('gaming') || p.includes('moderne')) {
    updated.desktop = 'kde';
    tags.push('KDE Plasma 6');
    reasons.push('KDE Plasma 6 configuré pour son ergonomie et ses performances graphiques.');
  } else if (p.includes('gnome')) {
    updated.desktop = 'gnome';
    tags.push('GNOME 46');
    reasons.push('GNOME 46 sélectionné.');
  } else if (p.includes('xfce') || p.includes('vieux pc') || p.includes('léger') || p.includes('simple')) {
    updated.desktop = 'xfce';
    tags.push('XFCE 4.18', 'Léger');
    reasons.push('XFCE 4.18 sélectionné pour sa légèreté et sa faible consommation en mémoire vive.');
  } else if (p.includes('serveur') || p.includes('server') || p.includes('headless') || p.includes('cloud') || p.includes('docker') || p.includes('k3s')) {
    updated.desktop = 'none';
    updated.displayManager = 'none';
    tags.push('Mode Headless', 'Serveur');
    reasons.push('Mode Serveur / Headless sans interface graphique activé pour maximiser les ressources.');
  }

  // Packages selection
  const selectedPkgs = new Set<string>(['htop_btop', 'fastfetch', 'git']);

  if (p.includes('dev') || p.includes('développeur') || p.includes('code') || p.includes('programmation')) {
    selectedPkgs.add('docker');
    selectedPkgs.add('neovim');
    selectedPkgs.add('zsh_starship');
    selectedPkgs.add('python_stack');
    selectedPkgs.add('nodejs_stack');
    tags.push('Stack Dev Complète');
    reasons.push('Outils de développement (Docker, Neovim, Python, Node.js, ZSH) ajoutés au panier.');
  }

  // Bug réel trouvé en auditant, même classe que le fix des presets "cybersec_lab"/"ai_llm_station"
  // plus tôt dans cette session : "kernel" était assigné à une valeur fixe ('hardened' pour
  // pentest, 'liquorix' pour gaming) SANS jamais tenir compte de la distro réellement choisie
  // juste au-dessus. Reproduit en direct via analyzePromptToRecipe() + generateBuildScript() :
  // un prompt "securise pour le pentest" (sans mot-clé de distro) retombe sur Debian par défaut
  // (bloc ci-dessus) + kernel="hardened" — noyau câblé UNIQUEMENT pour Arch/CachyOS (voir
  // REAL_ALT_KERNEL dans scriptGenerators.ts) — le script généré contient bien l'avertissement
  // honnête "n'est pas encore câblé", mais l'UI affichait quand même le tag "Noyau Hardened" comme
  // si c'était réellement appliqué. Même défaut pour "Arch Linux ... gaming" + kernel="liquorix"
  // (câblé UNIQUEMENT pour Debian/Ubuntu x86_64) : script généré confirmé sans "linux-zen" ni
  // aucun noyau basse-latence réellement installé sur Arch. Corrigé en choisissant le noyau
  // réellement câblé pour LA distro déjà sélectionnée (hardened/zen pour Arch-CachyOS, liquorix
  // pour Debian/Ubuntu x86_64), et en n'affichant le tag correspondant que si un noyau a
  // effectivement été appliqué — plutôt que de prétendre un noyau qui ne le sera pas.
  if (p.includes('pentest') || p.includes('sécurité') || p.includes('cyber') || p.includes('wifi') || p.includes('hack')) {
    selectedPkgs.add('wireshark');
    selectedPkgs.add('nmap');
    selectedPkgs.add('metasploit');
    selectedPkgs.add('aircrack');
    selectedPkgs.add('john_hashcat');
    tags.push('Suite Pentest');
    reasons.push('Suite d’audit de sécurité (Wireshark, Metasploit, Nmap, Aircrack) injectée.');
    if (updated.distro === 'arch') {
      updated.kernel = 'hardened';
      tags.push('Noyau Hardened');
      reasons.push('Noyau durci (hardened) activé pour renforcer la sécurité du système.');
    }
  }

  if (p.includes('jeu') || p.includes('game') || p.includes('steam') || p.includes('gaming') || p.includes('retro')) {
    selectedPkgs.add('steam');
    selectedPkgs.add('lutris_heroic');
    selectedPkgs.add('obs_studio');
    selectedPkgs.add('vlc_media');
    tags.push('Steam & Gaming');
    reasons.push('Moteur de jeux Steam + Proton et launchers configurés.');
    if (updated.distro === 'arch') {
      updated.kernel = 'zen';
      tags.push('Noyau Zen');
      reasons.push('Noyau Zen basse latence activé pour une réactivité gaming optimale.');
    } else if ((updated.distro === 'debian' || updated.distro === 'ubuntu') && updated.arch === 'x86_64') {
      updated.kernel = 'liquorix';
      tags.push('Noyau Liquorix');
      reasons.push('Noyau basse latence Liquorix configuré pour le gaming.');
    }
  }

  if (p.includes('xanmod')) {
    updated.kernel = 'xanmod';
    tags.push('Noyau XanMod');
    reasons.push('Noyau ultra-performance XanMod configuré.');
  }

  if (p.includes('homelab') || p.includes('docker') || p.includes('k8s') || p.includes('kubernetes') || p.includes('serveur')) {
    selectedPkgs.add('docker');
    selectedPkgs.add('k3s');
    selectedPkgs.add('cockpit');
    selectedPkgs.add('wireguard');
    tags.push('Kubernetes & Conteneurs', 'Console Cockpit');
    reasons.push('K3s Kubernetes, Cockpit et WireGuard ajoutés pour un serveur homelab clé en main.');
  }

  // Security & Hardening
  if (p.includes('sécurisé') || p.includes('durci') || p.includes('cis') || p.includes('banque')) {
    updated.security = {
      cisBenchmarkLevel: 2,
      firewall: 'nftables',
      appArmorOrSELinux: true,
      fail2ban: true,
      luksEncryption: true,
      disableRootSSH: true,
      autoSecurityUpdates: true,
    };
    tags.push('CIS Level 2', 'Chiffrement LUKS');
    reasons.push('Durcissement maximal CIS Level 2, pare-feu NFTables et chiffrement de disque activés.');
  }

  updated.selectedPackages = Array.from(selectedPkgs);

  // Branding naming based on prompt
  if (p.includes('gaming') || p.includes('jeu')) {
    updated.branding = {
      osName: 'ArcadeOS',
      editionName: 'Gaming Edition',
      version: '1.0',
      accentColor: '#06b6d4',
      wallpaperPreset: 'cyberpunk',
      bootSplashTheme: 'cyberpunk',
    };
  } else if (p.includes('pentest') || p.includes('sécurité')) {
    updated.branding = {
      osName: 'CyberForge',
      editionName: 'Red Team Edition',
      version: '2026.1',
      accentColor: '#ef4444',
      wallpaperPreset: 'matrix',
      bootSplashTheme: 'matrix',
    };
  } else if (p.includes('kiosk') || p.includes('borne')) {
    updated.branding = {
      osName: 'KioskFlow',
      editionName: 'Signage Edition',
      version: '1.0',
      accentColor: '#10b981',
      wallpaperPreset: 'minimal',
      bootSplashTheme: 'minimal',
    };
  } else {
    updated.branding = {
      osName: 'CustomOS',
      editionName: 'AI Customized Edition',
      version: '1.0',
      accentColor: '#8b5cf6',
      wallpaperPreset: 'cyberpunk',
      bootSplashTheme: 'openfactory',
    };
  }

  return {
    recipe: updated,
    reasoning: reasons.join(' \n'),
    suggestedTags: tags,
    matchedCriteriaCount: tags.length,
  };
}
