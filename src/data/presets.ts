import { DistroPreset } from '../types/os';

export const DISTRO_PRESETS: DistroPreset[] = [
  {
    id: 'devops_hyprland',
    title: 'DevOps & Hacker Station',
    subtitle: 'Arch Linux + Hyprland + Docker + Neovim',
    description: 'Une station de travail ultra-réactive pour les développeurs polyglottes. Tiling Wayland dynamique, moteur de conteneurs et stack complète préinstallée.',
    icon: 'TerminalSquare',
    category: 'Dev',
    // Bug réel trouvé en auditant, même incohérence que "cloud_native_homelab" plus bas dans ce
    // fichier : ce highlight annonçait "Docker & Podman" alors que selectedPackages ci-dessous
    // n'installe que "docker" (pas "podman") — cohérent avec le sous-titre juste au-dessus, qui
    // lui ne mentionne bien QUE Docker. Corrigé pour la même raison et de la même façon : le
    // highlight suit maintenant ce qui est réellement installé.
    highlights: ['Hyprland Wayland Tiling', 'Docker Engine', 'Neovim + LazyGit + Starship', 'Rust & Node.js'],
    estimatedSize: '1.4 Go',
    estimatedRam: '420 Mo',
    recipe: {
      name: 'ForgeOS Developer Edition',
      description: 'Environnement de développement moderne avec Hyprland et pile Docker complète',
      distro: 'arch',
      distroVersion: 'Rolling Release (2026)',
      arch: 'x86_64',
      // Bug réel MAJEUR trouvé en auditant : ce preset utilisait "iso_hybrid" — un format que
      // generateNonDebianBuildScript() refuse explicitement pour Arch/CachyOS/Fedora/Rocky/
      // Alpine/openSUSE/Void (l'ISO live bootable nécessite une intégration bootloader/initramfs
      // propre à chaque famille, non implémentée). Choisir ce preset et cliquer "Générer"
      // produisait donc un script de 727 caractères refusant de continuer, PAS la station de
      // développement annoncée par ses "highlights". Vérifié en direct : générer le VRAI script
      // avec ce preset renvoyait bien le message d'erreur, confirmé en générant la version
      // corrigée en "qcow2" (image disque, réellement bootable — GRUB + noyau réels, déjà vérifié
      // par boot QEMU pour cette même famille Arch cette session) : script complet de 8202
      // caractères produit sans refus.
      outputFormat: 'qcow2',
      desktop: 'hyprland',
      displayManager: 'ly',
      kernel: 'zen',
      selectedPackages: ['docker', 'git', 'neovim', 'zsh_starship', 'rust_toolchain', 'nodejs_stack', 'htop_btop', 'fastfetch'],
      customPackages: ['ripgrep', 'fzf', 'kitty', 'waybar'],
      hostname: 'forge-dev',
      user: {
        username: 'developer',
        fullName: 'Lead Developer',
        password: 'forge',
        sudo: true,
        autologin: true,
        shell: '/bin/zsh',
      },
      branding: {
        osName: 'ForgeOS Dev',
        editionName: 'Hacker / Tiling Edition',
        version: '1.0',
        accentColor: '#a855f7',
        wallpaperPreset: 'cyberpunk',
        bootSplashTheme: 'cyberpunk',
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
    },
  },
  {
    id: 'cybersec_lab',
    title: 'CyberSec & RedTeam Lab',
    // Bug réel trouvé en auditant, même classe que les 2 presets Arch corrigés juste avant : ce
    // preset annonçait "Hardened Kernel" (sous-titre ET highlight) alors que "hardened" n'est
    // câblé QUE pour Arch/CachyOS dans ce générateur (vérifié en direct en générant le script réel
    // de ce preset : message de repli honnête "[INFO] Le noyau \"hardened\" n'est pas encore câblé
    // pour debian (APT) : linux-image-amd64 [...] utilisé à la place"). Le preset est un LABORATOIRE
    // DE SÉCURITÉ — promettre un noyau durci qu'il n'installe pas réellement est particulièrement
    // trompeur ici. Remplacé par "generic" et par les protections RÉELLEMENT câblées et déjà
    // présentes dans ce même preset (cisBenchmarkLevel: 2, appArmorOrSELinux, fail2ban,
    // luksEncryption — voir security ci-dessous, tous vérifiés ailleurs dans ce projet), qui
    // offrent un durcissement de sécurité authentique sans rien inventer.
    subtitle: 'Debian 12 + XFCE + Pentest Suite + Durcissement CIS Niveau 2',
    description: 'Système d’audit de sécurité complet avec suite de sniffing, scan réseau, frameworks d’exploitation et audit sans fil préconfigurés.',
    icon: 'ShieldAlert',
    category: 'Security',
    highlights: ['Wireshark + Tshark', 'Metasploit Framework', 'Aircrack-ng + Nmap', 'CIS Niveau 2 + AppArmor + LUKS'],
    estimatedSize: '1.8 Go',
    estimatedRam: '510 Mo',
    recipe: {
      name: 'CyberForge Pentest Suite',
      description: 'Distribution spécialisée pour audits de sécurité et tests d’intrusion',
      distro: 'debian',
      distroVersion: '12 (Bookworm)',
      arch: 'x86_64',
      outputFormat: 'iso_hybrid',
      desktop: 'xfce',
      displayManager: 'lightdm',
      kernel: 'generic',
      selectedPackages: ['wireshark', 'nmap', 'metasploit', 'aircrack', 'john_hashcat', 'git', 'htop_btop', 'fastfetch'],
      customPackages: ['sqlmap', 'nikto', 'hydra', 'netcat-openbsd'],
      hostname: 'cyber-lab',
      user: {
        username: 'auditor',
        fullName: 'Security Auditor',
        password: 'audit',
        sudo: true,
        autologin: false,
        shell: '/bin/bash',
      },
      branding: {
        osName: 'CyberForge',
        editionName: 'Red Team Edition',
        version: '2026.1',
        accentColor: '#ef4444',
        wallpaperPreset: 'matrix',
        bootSplashTheme: 'matrix',
      },
      security: {
        cisBenchmarkLevel: 2,
        firewall: 'nftables',
        appArmorOrSELinux: true,
        fail2ban: true,
        luksEncryption: true,
        disableRootSSH: true,
        autoSecurityUpdates: true,
      },
    },
  },
  {
    id: 'retro_gaming_box',
    title: 'Steam & Retro Gaming Console',
    subtitle: 'Ubuntu 24.04 + KDE Plasma + Steam + Liquorix Kernel',
    description: 'Transformez n’importe quel PC ou machine de salon en console de jeu moderne. Pilotes graphiques 3D optimisés, Proton et launchers rétro intégrés.',
    icon: 'Gamepad2',
    category: 'Gaming',
    highlights: ['Steam Big Picture', 'Lutris & Heroic GOG/Epic', 'Noyau Liquorix 1000Hz', 'Manettes Xbox/PS5 prêtes'],
    estimatedSize: '2.1 Go',
    estimatedRam: '780 Mo',
    recipe: {
      name: 'ArcadeOS Gaming Console',
      description: 'Distribution gaming de salon avec support Steam et émulateurs',
      distro: 'ubuntu',
      distroVersion: '24.04 LTS (Noble Numbat)',
      arch: 'x86_64',
      outputFormat: 'iso_hybrid',
      desktop: 'kde',
      displayManager: 'sddm',
      kernel: 'liquorix',
      // Bug réel trouvé en auditant : le highlight "Manettes Xbox/PS5 prêtes" ne correspondait à
      // aucun paquet réellement sélectionné — "gamepad_drivers" (joystick/jstest-gtk/xboxdrv,
      // conçu exactement pour cette promesse, vrai nom "ubuntu" confirmé dans packages.ts) était
      // absent. Steam seul ne fournit ni calibrage ni pilote générique pour les manettes hors du
      // support xpad/hid-generic déjà présent dans le noyau — ce paquet reste nécessaire pour la
      // config/calibration promise par "prêtes".
      selectedPackages: ['steam', 'lutris_heroic', 'obs_studio', 'vlc_media', 'gamepad_drivers', 'fastfetch'],
      customPackages: ['gamemode', 'mangohud', 'goverlay'],
      hostname: 'arcade-box',
      user: {
        username: 'gamer',
        fullName: 'Console Gamer',
        password: 'play',
        sudo: true,
        autologin: true,
        shell: '/bin/bash',
      },
      branding: {
        osName: 'ArcadeOS',
        editionName: 'Gaming Edition',
        version: '3.0',
        accentColor: '#06b6d4',
        wallpaperPreset: 'cyberpunk',
        bootSplashTheme: 'classic',
      },
      security: {
        cisBenchmarkLevel: 0,
        firewall: 'none',
        appArmorOrSELinux: false,
        fail2ban: false,
        luksEncryption: false,
        disableRootSSH: true,
        autoSecurityUpdates: true,
      },
    },
  },
  {
    id: 'alpine_minimal_kiosk',
    title: 'Borne Tactile Kiosk Ultra-Légère',
    subtitle: 'Alpine Linux (50 Mo) + Chromium Kiosk + Boot 2s',
    description: 'Une appliance dédiée aux bornes d’accueil, affichage dynamique en magasin ou tableaux de bord industriels. Démarre en 2 secondes directement en plein écran sur votre URL.',
    icon: 'Tv',
    category: 'IoT/Minimal',
    highlights: ['Empreinte minuscule (<180 Mo ISO)', 'Boot sous 2 secondes', 'Plein écran verrouillé', 'Mise à jour automatique'],
    estimatedSize: '160 Mo',
    estimatedRam: '180 Mo',
    recipe: {
      name: 'KioskFlow Display OS',
      description: 'Borne d’affichage dynamique industrielle ultra-légère',
      distro: 'alpine',
      distroVersion: '3.20 (musl/busybox)',
      arch: 'x86_64',
      outputFormat: 'raw_img',
      desktop: 'web_kiosk',
      displayManager: 'none',
      kernel: 'generic',
      kioskUrl: 'https://console.openfactory.tech/',
      selectedPackages: ['htop_btop', 'fastfetch'],
      customPackages: ['chromium', 'cage', 'tzdata'],
      hostname: 'kiosk-01',
      user: {
        username: 'kiosk',
        fullName: 'Kiosk Display User',
        password: 'kiosk',
        sudo: false,
        autologin: true,
        shell: '/bin/sh',
      },
      branding: {
        osName: 'KioskFlow',
        editionName: 'Signage Edition',
        version: '1.0',
        accentColor: '#10b981',
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
    },
  },
  {
    id: 'homelab_k3s_node',
    title: 'Homelab MicroServer (K3s + Cockpit)',
    subtitle: 'Debian 12 + Headless + K3s + Cockpit Web + WireGuard',
    description: 'Le socle parfait pour héberger vos conteneurs Docker, pods Kubernetes et services auto-hébergés avec interface de gestion web Cockpit.',
    icon: 'Server',
    category: 'Server',
    highlights: ['Console Web Cockpit intégrée', 'Cluster K3s prêt à l’emploi', 'Réseau WireGuard VPN', 'Zéro interface graphique (Headless)'],
    estimatedSize: '750 Mo',
    estimatedRam: '310 Mo',
    recipe: {
      name: 'HomelabOS Node',
      description: 'Microserveur cloud personnel avec Kubernetes et console web d’administration',
      distro: 'debian',
      distroVersion: '12 (Bookworm)',
      arch: 'x86_64',
      outputFormat: 'qcow2',
      desktop: 'none',
      displayManager: 'none',
      kernel: 'generic',
      selectedPackages: ['k3s', 'cockpit', 'wireguard', 'docker', 'htop_btop', 'fastfetch'],
      customPackages: ['curl', 'wget', 'sudo', 'rsync', 'lm-sensors'],
      hostname: 'homelab-node-01',
      user: {
        username: 'admin',
        fullName: 'Homelab Administrator',
        password: 'admin',
        sudo: true,
        autologin: false,
        shell: '/bin/bash',
      },
      branding: {
        osName: 'HomelabOS',
        editionName: 'Server Appliance',
        version: '2.0',
        accentColor: '#3b82f6',
        wallpaperPreset: 'minimal',
        bootSplashTheme: 'openfactory',
      },
      security: {
        cisBenchmarkLevel: 1,
        firewall: 'ufw',
        appArmorOrSELinux: true,
        fail2ban: true,
        luksEncryption: false,
        disableRootSSH: true,
        autoSecurityUpdates: true,
      },
    },
  },
  {
    id: 'ai_llm_station',
    title: 'Local AI & LLM Inference Station',
    // Bug réel trouvé en auditant : "XanMod" était annoncé ici (titre ET highlight) alors que
    // XanMod n'a AUCUN paquet officiel pour Arch (vérifié en direct, confirmé par le propre
    // avertissement de repli honnête de ce générateur : "XanMod est officiellement fourni pour la
    // famille Debian/Ubuntu (APT), sans paquet officiel Arch : installation de 'linux' à la
    // place"). La recette réelle installait donc un noyau générique tout en prétendant avoir
    // XanMod. Remplacé par "Zen" (linux-zen, réellement câblé et vérifié pour Arch cette session),
    // qui tient la même promesse de "haute réactivité" sans rien inventer.
    subtitle: 'Arch Linux + Niri + Zen + Ollama + PyTorch & CUDA',
    description: 'Une station de travail optimisée pour l’exécution locale de LLM, vision par ordinateur et inférence IA. Compositeur scrollable Niri ultra-fluide et zRAM activée.',
    icon: 'Sparkles',
    category: 'AI',
    highlights: ['Niri Rust Scrollable Tiling', 'Noyau Zen haute réactivité', 'zRAM swap ZSTD compressé', 'Ollama & Outils IA locaux', 'Dépôt Flathub activé'],
    estimatedSize: '2.4 Go',
    estimatedRam: '650 Mo',
    recipe: {
      name: 'ForgeAI Workstation',
      description: 'Environnement de développement et d’expérimentation IA locale & LLM',
      distro: 'arch',
      distroVersion: 'Rolling Release (2026)',
      arch: 'x86_64',
      // Bug réel MAJEUR trouvé en auditant, même cause racine que le preset "devops_hyprland"
      // ci-dessus : "iso_hybrid" est refusé par generateNonDebianBuildScript() pour Arch (ISO live
      // bootable non implémentée pour cette famille). Vérifié en direct : ce preset produisait un
      // script de 727 caractères refusant de continuer. Corrigé en "qcow2" (vérifié : script
      // complet de 8332 caractères, réellement bootable).
      outputFormat: 'qcow2',
      desktop: 'niri',
      displayManager: 'ly',
      kernel: 'zen',
      kernelCmdline: 'transparent_hugepage=madvise split_lock_mitigate=0',
      enableFlatpak: true,
      enableZram: true,
      selectedPackages: ['docker', 'git', 'neovim', 'zsh_starship', 'htop_btop', 'fastfetch'],
      customPackages: ['ollama', 'python-pytorch', 'alacritty', 'fuzzel', 'waybar'],
      hostname: 'forge-ai-node',
      user: {
        username: 'aiuser',
        fullName: 'AI Researcher',
        password: 'forge',
        sudo: true,
        autologin: true,
        shell: '/bin/zsh',
      },
      branding: {
        osName: 'ForgeAI',
        editionName: 'Inference Edition',
        version: '1.0',
        accentColor: '#6366f1',
        wallpaperPreset: 'cyberpunk',
        bootSplashTheme: 'cyberpunk',
      },
      security: {
        cisBenchmarkLevel: 1,
        firewall: 'nftables',
        appArmorOrSELinux: false,
        fail2ban: false,
        luksEncryption: false,
        disableRootSSH: true,
        autoSecurityUpdates: false,
        enableZram: true,
      },
    },
  },
  {
    id: 'pro_audio_studio',
    title: 'MAO & Studio Audio Pro',
    subtitle: 'Ubuntu 24.04 + Openbox + Temps Réel + PipeWire Low-Latency',
    description: 'Une distribution ultra-légère dédiée à la production musicale et au mixage studio temps-réel. Latence audio minimale, charge RAM inférieure à 150 Mo.',
    icon: 'Radio',
    category: 'Media',
    highlights: ['Openbox minimal (<100 Mo RAM)', 'Noyau Realtime / Low-Latency', 'PipeWire-JACK Pro Audio', 'Ardour & Plugins Audio Flathub'],
    estimatedSize: '1.6 Go',
    estimatedRam: '140 Mo',
    recipe: {
      name: 'StudioForge Audio OS',
      description: 'Station de Production Musicale et Traitement Audio Temps-Réel',
      distro: 'ubuntu',
      distroVersion: '24.04 LTS (Noble Numbat)',
      arch: 'x86_64',
      outputFormat: 'iso_hybrid',
      desktop: 'openbox',
      displayManager: 'lightdm',
      kernel: 'realtime',
      kernelCmdline: 'threadirqs preempt=full isolcpus=0 nohz_full=0',
      enableFlatpak: true,
      enableZram: true,
      selectedPackages: ['vlc_media', 'git', 'htop_btop', 'fastfetch'],
      customPackages: ['ardour', 'jackd2', 'pavucontrol', 'qjackctl'],
      hostname: 'studio-audio',
      user: {
        username: 'producer',
        fullName: 'Music Producer',
        password: 'audio',
        sudo: true,
        autologin: true,
        shell: '/bin/bash',
      },
      branding: {
        osName: 'StudioForge',
        editionName: 'Pro Audio Edition',
        version: '2026.1',
        accentColor: '#ec4899',
        wallpaperPreset: 'minimal',
        bootSplashTheme: 'minimal',
      },
      security: {
        cisBenchmarkLevel: 0,
        firewall: 'none',
        appArmorOrSELinux: false,
        fail2ban: false,
        luksEncryption: false,
        disableRootSSH: true,
        autoSecurityUpdates: false,
        enableZram: true,
      },
    },
  },
  {
    id: 'cloud_native_homelab',
    title: 'Kubernetes & Container Hardened Node',
    subtitle: 'Debian 12 + Headless + K3s + CIS Level 2 + zRAM + nftables',
    description: 'Nœud serveur durci prêt pour la production Kubernetes ou Docker. Durcissement CIS Benchmark Niveau 2, pare-feu nftables et swap zRAM actif.',
    icon: 'ShieldCheck',
    category: 'Server',
    // Bug réel trouvé en auditant : le highlight annonçait "Podman" alors que selectedPackages
    // ci-dessous n'installe que "docker" (pas "podman") — cohérent avec la propre "description"
    // de ce preset juste au-dessus ("prêt pour la production Kubernetes ou Docker"), qui elle
    // mentionne bien Docker. Corrigé pour que le highlight corresponde à ce qui est réellement
    // installé plutôt que d'ajouter un second moteur de conteneurs non demandé.
    highlights: ['Durcissement CIS Benchmark L2', 'zRAM Swap compressé ZSTD', 'Pare-feu strict nftables', 'K3s & Docker intégrés'],
    estimatedSize: '820 Mo',
    estimatedRam: '240 Mo',
    recipe: {
      name: 'HardenedNode OS',
      description: 'Nœud conteneur durci pour infrastructure et cloud souverain',
      distro: 'debian',
      distroVersion: '12 (Bookworm)',
      arch: 'x86_64',
      outputFormat: 'qcow2',
      desktop: 'none',
      displayManager: 'none',
      // Bug réel trouvé en auditant, même classe que "cybersec_lab" : "hardened" n'est câblé QUE
      // pour Arch/CachyOS dans ce générateur (déjà vérifié en direct) — sur Debian, ce choix
      // retombe silencieusement sur le noyau générique avec un simple message dans la console de
      // build, jamais visible dans l'UI. Aucun highlight de CE preset ne promet explicitement un
      // "noyau durci" (ils parlent de CIS/zRAM/nftables, tous réellement câblés) : corrigé pour
      // que le champ recipe corresponde à ce qui est honnêtement délivré, plutôt que de laisser un
      // réglage qui ne fait rien.
      kernel: 'generic',
      enableFlatpak: false,
      enableZram: true,
      selectedPackages: ['k3s', 'wireguard', 'docker', 'htop_btop', 'fastfetch'],
      customPackages: ['curl', 'wget', 'sudo', 'rsync', 'nftables'],
      hostname: 'k8s-node-hardened',
      user: {
        username: 'sysadmin',
        fullName: 'System Administrator',
        password: 'changeme123',
        sudo: true,
        autologin: false,
        shell: '/bin/bash',
      },
      branding: {
        osName: 'HardenedNode',
        editionName: 'Production Cluster',
        version: '1.0',
        accentColor: '#10b981',
        wallpaperPreset: 'minimal',
        bootSplashTheme: 'matrix',
      },
      security: {
        cisBenchmarkLevel: 2,
        firewall: 'nftables',
        appArmorOrSELinux: true,
        fail2ban: true,
        luksEncryption: false,
        disableRootSSH: true,
        autoSecurityUpdates: true,
        enableZram: true,
      },
    },
  },
];
