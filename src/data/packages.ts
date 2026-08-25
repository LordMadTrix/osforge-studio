import { SoftwarePackage } from '../types/os';

export const SOFTWARE_PACKAGES: SoftwarePackage[] = [
  // --- DEVELOPPEMENT ---
  {
    id: 'docker',
    name: 'Docker Engine & Compose',
    category: 'development',
    description: 'Conteneurisation d’applications avec moteur Docker et orchestrateur Docker Compose.',
    sizeMB: 280,
    icon: 'Container',
    tags: ['Conteneurs', 'DevOps', 'Cloud'],
    pkgNames: {
      debian: 'docker.io docker-compose',
      ubuntu: 'docker.io docker-compose',
      arch: 'docker docker-compose',
      alpine: 'docker docker-cli-compose',
      fedora: 'moby-engine docker-compose',
    },
  },
  {
    id: 'podman',
    name: 'Podman (Rootless Containers)',
    category: 'development',
    description: 'Moteur de conteneurs OCI sans démon et sans droits root, compatible avec les commandes Docker.',
    sizeMB: 180,
    icon: 'Box',
    tags: ['Rootless', 'Sécurité', 'RedHat'],
    pkgNames: {
      debian: 'podman podman-compose',
      ubuntu: 'podman podman-compose',
      arch: 'podman podman-compose',
      alpine: 'podman',
      fedora: 'podman podman-compose',
    },
  },
  {
    id: 'git',
    name: 'Git & LazyGit',
    category: 'development',
    description: 'Gestionnaire de versions distribué avec interface TUI LazyGit pour terminal.',
    sizeMB: 65,
    icon: 'GitBranch',
    tags: ['VCS', 'Terminal', 'Indispensable'],
    pkgNames: {
      debian: 'git git-lfs',
      ubuntu: 'git git-lfs',
      arch: 'git git-lfs lazygit',
      alpine: 'git git-lfs lazygit',
      fedora: 'git git-lfs lazygit',
    },
  },
  {
    id: 'neovim',
    name: 'Neovim (Éditeur Modal Moderne)',
    category: 'development',
    description: 'Éditeur de code extensible et ultra-rapide avec support Lua, LSP intégré et plugins riches.',
    sizeMB: 45,
    icon: 'FileCode',
    tags: ['IDE', 'Terminal', 'Lua'],
    pkgNames: {
      debian: 'neovim ripgrep fd-find',
      ubuntu: 'neovim ripgrep fd-find',
      arch: 'neovim ripgrep fd',
      alpine: 'neovim ripgrep fd',
      fedora: 'neovim ripgrep fd-find',
    },
  },
  {
    id: 'vscodium',
    name: 'VS Codium / VS Code',
    category: 'development',
    description: 'Binaire 100% open source de Visual Studio Code sans télémétrie Microsoft.',
    sizeMB: 290,
    icon: 'Code',
    tags: ['GUI', 'Éditeur', 'Populaire'],
    // Bug réel MAJEUR trouvé en auditant, même piège HTTP-200 que K3s/Ollama/OpenTofu/K8s CLI
    // Tools/Zig ci-dessus, mais LES 5 FAMILLES étaient fictives ici (pas seulement Debian/Ubuntu) :
    // "codium" confirmé ABSENT (contenu réel "No such package") de Debian trixie, Ubuntu noble ET
    // Fedora — ce projet ne package jamais VSCodium lui-même, seul un dépôt tiers signé le fournit
    // (repo.vscodium.dev/gitlab.io, documenté par vscodium.com/install.html), jamais ajouté nulle
    // part avant ce correctif. "vscodium-bin" confirmé ABSENT des dépôts officiels Arch (API JSON,
    // count:0 — AUR uniquement). "code" confirmé ABSENT d'Alpine (404) ; le vrai paquet Alpine
    // ("vscodium") existe UNIQUEMENT dans le dépôt "testing" (instable, jamais activé par ce
    // générateur). Corrigé en ajoutant les vrais dépôts APT/RPM officiels signés pour Debian/Ubuntu/
    // Fedora pendant la compilation (vscodiumSetupCmd dans scriptGenerators.ts), avec avertissement
    // honnête pour Arch/Alpine (aucun canal officiel fiable sans AUR ni dépôt instable) — pkgNames
    // vidé ici car aucune des 5 clés précédentes ne correspondait à un paquet réellement installable.
    pkgNames: {},
  },
  {
    id: 'python_stack',
    name: 'Python 3, Pip & Virtualenv',
    category: 'development',
    description: 'Environnement complet Python 3 avec gestionnaire de paquets Pip, UV et environnements virtuels.',
    sizeMB: 140,
    icon: 'Terminal',
    tags: ['Python', 'Scripting', 'Data'],
    // Bug réel trouvé en auditant : la description promet "UV" mais AUCUNE des 5 familles ne
    // l'installait — absent de pkgNames partout. Confirmé RÉEL sur Arch/Alpine/Fedora (API JSON,
    // contenu de page réel) — ajouté ici. Confirmé ABSENT (contenu réel "No such package") de
    // Debian trixie ET Ubuntu noble — installé à la place via le vrai installeur officiel
    // (astral.sh/uv/install.sh) pendant la compilation (uvSetupCmd dans scriptGenerators.ts).
    pkgNames: {
      debian: 'python3 python3-pip python3-venv python3-full',
      ubuntu: 'python3 python3-pip python3-venv',
      arch: 'python python-pip python-virtualenv uv',
      alpine: 'python3 py3-pip py3-virtualenv uv',
      fedora: 'python3 python3-pip python3-virtualenv uv',
    },
  },
  {
    id: 'nodejs_stack',
    name: 'Node.js & Bun Runtime',
    category: 'development',
    description: 'Moteur JavaScript/TypeScript serveur avec gestionnaires de paquets npm et pnpm.',
    sizeMB: 190,
    icon: 'Cpu',
    tags: ['JavaScript', 'Web', 'Backend'],
    pkgNames: {
      debian: 'nodejs npm',
      ubuntu: 'nodejs npm',
      arch: 'nodejs npm bun',
      alpine: 'nodejs npm',
      fedora: 'nodejs npm',
    },
  },
  {
    id: 'rust_toolchain',
    name: 'Rust & Cargo Toolchain',
    category: 'development',
    description: 'Compilateur Rustc et gestionnaire de projets Cargo pour le développement système moderne.',
    sizeMB: 380,
    icon: 'Wrench',
    tags: ['Système', 'Performance', 'Sécurité'],
    pkgNames: {
      debian: 'rustc cargo build-essential',
      ubuntu: 'rustc cargo build-essential',
      arch: 'rust base-devel',
      alpine: 'rust cargo build-base',
      fedora: 'rust cargo @development-tools',
    },
  },

  // --- CYBERSECURITE & PENTEST ---
  {
    id: 'wireshark',
    name: 'Wireshark & Tshark',
    category: 'security',
    description: 'Analyseur de paquets et de protocoles réseau le plus utilisé au monde avec interface graphique et CLI.',
    sizeMB: 160,
    icon: 'Radio',
    tags: ['Réseau', 'Sniffing', 'Forensics'],
    pkgNames: {
      debian: 'wireshark tshark tcpdump',
      ubuntu: 'wireshark tshark tcpdump',
      arch: 'wireshark-qt tcpdump',
      alpine: 'wireshark tcpdump',
      fedora: 'wireshark wireshark-cli tcpdump',
    },
  },
  {
    id: 'nmap',
    name: 'Nmap & Zenmap',
    category: 'security',
    description: 'Scanner de ports, découverte d’hôtes et audit de vulnérabilités réseau par scripting NSE.',
    sizeMB: 55,
    icon: 'Search',
    tags: ['Scan', 'Reconnaissance', 'Réseau'],
    pkgNames: {
      debian: 'nmap ndiff zenmap',
      ubuntu: 'nmap ndiff',
      arch: 'nmap',
      alpine: 'nmap',
      fedora: 'nmap',
    },
  },
  {
    id: 'metasploit',
    name: 'Metasploit Framework',
    category: 'security',
    description: 'Plateforme de test d’intrusion la plus réputée pour tester la résilience des systèmes informatiques.',
    sizeMB: 620,
    icon: 'ShieldAlert',
    tags: ['Exploitation', 'Pentest', 'Audit'],
    // Bug réel MAJEUR trouvé en auditant : "metasploit-framework" (Debian/Ubuntu) et "metasploit"
    // (Alpine, Fedora) sont TOUS FICTIFS (contenu réel "No such package" sur Debian/Ubuntu ; aucun
    // paquet apk officiel sur Alpine ; aucune preuve de paquet officiel sur Fedora, seul le dépôt
    // tiers Rapid7 le fournit). Seul Arch a un vrai paquet natif (API JSON, count:1, inchangé).
    // Corrigé en installant Metasploit via le vrai installeur officiel Rapid7 (msfinstall, inspecté
    // en direct — gère apt/yum/zypper nativement) pendant la compilation (metasploitSetupCmd dans
    // scriptGenerators.ts). pkgNames vidé pour Debian/Ubuntu/Alpine/Fedora (aucune des 4 clés
    // précédentes n'était installable) ; Alpine reste honnêtement hors périmètre (aucun canal
    // officiel fiable).
    pkgNames: {
      arch: 'metasploit',
    },
  },
  {
    id: 'aircrack',
    name: 'Aircrack-ng Suite',
    category: 'security',
    description: 'Ensemble complet d’outils d’audit de sécurité et d’évaluation des réseaux sans fil WiFi 802.11.',
    sizeMB: 40,
    icon: 'Wifi',
    tags: ['WiFi', 'Wireless', 'Audit'],
    pkgNames: {
      debian: 'aircrack-ng iw wireless-tools',
      ubuntu: 'aircrack-ng iw wireless-tools',
      arch: 'aircrack-ng iw wireless_tools',
      alpine: 'aircrack-ng iw wireless-tools',
      fedora: 'aircrack-ng iw wireless-tools',
    },
  },
  {
    id: 'john_hashcat',
    name: 'John the Ripper & Hashcat',
    category: 'security',
    description: 'Outils d’évaluation de la robustesse des mots de passe avec accélération CPU et GPU OpenCL/CUDA.',
    sizeMB: 210,
    icon: 'Key',
    tags: ['Crypto', 'Mots de passe', 'GPU'],
    pkgNames: {
      debian: 'john hashcat',
      ubuntu: 'john hashcat',
      arch: 'john hashcat',
      alpine: 'john hashcat',
      fedora: 'john hashcat',
    },
  },

  // --- GAMING & STREAMING ---
  {
    id: 'steam',
    name: 'Steam & Proton Gaming Engine',
    category: 'gaming',
    description: 'Client de jeux Steam avec couche de compatibilité Proton / Wine pour exécuter les jeux Windows nativement.',
    sizeMB: 450,
    icon: 'Gamepad2',
    tags: ['Jeux', 'Proton', 'Valve'],
    pkgNames: {
      debian: 'steam-installer steam-devices',
      ubuntu: 'steam steam-devices',
      arch: 'steam steam-native-runtime',
      alpine: 'steam',
      fedora: 'steam',
    },
  },
  {
    id: 'lutris_heroic',
    name: 'Lutris & Heroic Games Launcher',
    category: 'gaming',
    description: 'Gestionnaires de jeux ouverts pour Epic Games, GOG, émulateurs et jeux rétro.',
    sizeMB: 220,
    icon: 'Flame',
    tags: ['GOG', 'Epic', 'Émulation'],
    // Bug réel trouvé en auditant : "heroic-games-launcher" (Debian) et "heroic-games-launcher-bin"
    // (Arch) sont TOUS DEUX fictifs (contenu réel "No such package" sur Debian trixie ; AUR
    // uniquement sur Arch, API JSON count:0). Heroic ne publie AUCUN paquet natif dans les dépôts
    // officiels d'aucune distro — retiré ici et installé à la place via les vrais artefacts GitHub
    // Releases officiels (.deb/.rpm/AppImage, heroicSetupCmd dans scriptGenerators.ts). Lutris seul
    // reste dans pkgNames (confirmé réel sur les 5 familles, inchangé).
    pkgNames: {
      debian: 'lutris',
      ubuntu: 'lutris',
      arch: 'lutris',
      alpine: 'lutris',
      fedora: 'lutris',
    },
  },
  {
    id: 'obs_studio',
    name: 'OBS Studio & PipeWire Capture',
    category: 'multimedia',
    description: 'Logiciel de capture vidéo, enregistrement d’écran et diffusion de flux en direct (Twitch/YouTube).',
    sizeMB: 310,
    icon: 'Video',
    tags: ['Streaming', 'Vidéo', 'Capture'],
    pkgNames: {
      debian: 'obs-studio obs-plugins',
      ubuntu: 'obs-studio',
      arch: 'obs-studio',
      alpine: 'obs-studio',
      fedora: 'obs-studio',
    },
  },
  {
    id: 'vlc_media',
    name: 'VLC Media Player & Codecs',
    category: 'multimedia',
    description: 'Lecteur multimédia universel lisant tous les formats audio et vidéo sans codecs tiers.',
    sizeMB: 120,
    icon: 'PlayCircle',
    tags: ['Lecteur', 'Audio', 'Vidéo'],
    pkgNames: {
      debian: 'vlc ffmpeg gstreamer1.0-plugins-good',
      ubuntu: 'vlc ffmpeg ubuntu-restricted-extras',
      arch: 'vlc ffmpeg',
      alpine: 'vlc ffmpeg',
      fedora: 'vlc ffmpeg',
    },
  },
  {
    id: 'gimp_inkscape',
    name: 'GIMP & Inkscape',
    category: 'multimedia',
    description: 'Suite de création graphique comprenant retouche photo matricielle et dessin vectoriel SVG.',
    sizeMB: 340,
    icon: 'Palette',
    tags: ['Graphisme', 'Photo', 'Design'],
    pkgNames: {
      debian: 'gimp inkscape',
      ubuntu: 'gimp inkscape',
      arch: 'gimp inkscape',
      alpine: 'gimp inkscape',
      fedora: 'gimp inkscape',
    },
  },

  // --- HOMELAB & CLOUD ---
  {
    id: 'k3s',
    name: 'K3s Lightweight Kubernetes',
    category: 'homelab',
    description: 'Distribution Kubernetes certifiée ultra-légère par Rancher conçue pour homelabs et Edge computing.',
    sizeMB: 150,
    icon: 'Server',
    tags: ['Kubernetes', 'K3s', 'Microservices'],
    // Bug réel MAJEUR trouvé en auditant : "k3s-bin" (Arch) confirmé ABSENT des dépôts officiels
    // (archlinux.org/packages/search/json/?name=k3s-bin : "count": 0 — n'existe que dans l'AUR,
    // jamais installable via "pacman -S" dans ce générateur) ; "k3s" (Fedora, dont héritent
    // Rocky/openSUSE via PKG_NAME_FALLBACK) confirmé ABSENT (src.fedoraproject.org/rpms/k3s :
    // 404). Seul Alpine avait un vrai paquet natif. Remplacés par les VRAIS prérequis (curl pour
    // l'installeur officiel get.k3s.io, iptables et wireguard-tools réellement requis par k3s à
    // l'exécution) — tous confirmés réels sur Arch (archlinux.org) et Fedora (src.fedoraproject.org)
    // — combinés à un vrai déclenchement de get.k3s.io au premier démarrage (k3sSetupCmd dans
    // scriptGenerators.ts), l'installeur officiel documenté comme auto-détectant systemd ET OpenRC.
    pkgNames: {
      debian: 'curl iptables wireguard',
      ubuntu: 'curl iptables wireguard',
      arch: 'curl iptables wireguard-tools',
      alpine: 'k3s',
      fedora: 'curl iptables wireguard-tools',
    },
  },
  {
    id: 'wireguard',
    name: 'WireGuard VPN & Tailscale',
    category: 'homelab',
    description: 'Protocole VPN moderne rapide et cryptographiquement sécurisé au niveau du noyau Linux.',
    sizeMB: 40,
    icon: 'ShieldCheck',
    tags: ['VPN', 'Mesh', 'Réseau sécurisé'],
    // Bug réel trouvé dans le même audit que K3s ci-dessus : le nom affiché ("WireGuard VPN &
    // Tailscale") et les tags ("Mesh") promettent Tailscale, mais "pkgNames" n'installait jamais
    // rien lié à Tailscale — contrairement à K3s, "tailscale" est confirmé un VRAI paquet natif
    // sur les 4 familles (packages.debian.org/bookworm/tailscale, archlinux.org/packages/search/
    // json, src.fedoraproject.org/rpms/tailscale, pkgs.alpinelinux.org — tous 200), donc un simple
    // ajout suffit (contrairement à K3s qui nécessitait un vrai installeur au premier démarrage).
    // "tailscale up" (authentification interactive via URL) reste hors de portée d'un script non
    // interactif — le service "tailscaled" est activé (tailscaleServiceCmd) pour que la commande
    // soit immédiatement utilisable au premier login, sans prétendre automatiser l'authentification.
    pkgNames: {
      debian: 'wireguard wireguard-tools iptables tailscale',
      ubuntu: 'wireguard wireguard-tools tailscale',
      arch: 'wireguard-tools tailscale',
      alpine: 'wireguard-tools tailscale',
      fedora: 'wireguard-tools tailscale',
    },
  },
  {
    id: 'cockpit',
    name: 'Cockpit Web Admin Console',
    category: 'homelab',
    description: 'Interface web moderne d’administration de serveurs Linux (disques, réseaux, conteneurs, logs, métriques).',
    sizeMB: 85,
    icon: 'LayoutDashboard',
    tags: ['WebUI', 'Monitoring', 'Gestion'],
    pkgNames: {
      debian: 'cockpit cockpit-podman cockpit-machines',
      ubuntu: 'cockpit cockpit-podman cockpit-machines',
      arch: 'cockpit cockpit-podman',
      alpine: 'cockpit',
      fedora: 'cockpit cockpit-podman cockpit-machines',
    },
  },
  {
    id: 'nginx_caddy',
    name: 'Caddy 2 & Nginx Web Server',
    category: 'homelab',
    description: 'Serveurs Web et Reverse Proxy avec génération automatique de certificats HTTPS Let’s Encrypt.',
    sizeMB: 60,
    icon: 'Globe',
    tags: ['Web Server', 'Proxy', 'HTTPS'],
    pkgNames: {
      debian: 'caddy nginx',
      ubuntu: 'caddy nginx',
      arch: 'caddy nginx',
      alpine: 'caddy nginx',
      fedora: 'caddy nginx',
    },
  },

  // --- PRODUCTIVITE ---
  {
    id: 'firefox',
    name: 'Firefox / Firefox ESR',
    category: 'productivity',
    description: 'Navigateur web libre axé sur la vie privée et la sécurité avec blocage de traceurs.',
    sizeMB: 180,
    icon: 'Compass',
    tags: ['Web', 'Navigateur', 'Vie privée'],
    pkgNames: {
      debian: 'firefox-esr',
      ubuntu: 'firefox',
      arch: 'firefox',
      alpine: 'firefox-esr',
      fedora: 'firefox',
    },
  },
  {
    id: 'chromium',
    name: 'Chromium',
    category: 'productivity',
    description: 'Base open source de Google Chrome, sans les services propriétaires Google, avec support complet WebExtensions.',
    sizeMB: 210,
    icon: 'Compass',
    tags: ['Web', 'Navigateur', 'Open Source'],
    // Pas d'entrée "ubuntu" : le paquet apt "chromium-browser" d'Ubuntu n'est qu'un stub de
    // transition vers snap (vérifié en live, même limite que Firefox), et il n'existe pas de
    // dépôt APT officiel équivalent à celui de Mozilla pour Chromium. Omettre l'entrée fait
    // sauter proprement ce paquet pour Ubuntu (boucle d'installation tolérante) plutôt que de
    // livrer un binaire non fonctionnel en prétendant avoir réussi.
    pkgNames: {
      debian: 'chromium',
      arch: 'chromium',
      alpine: 'chromium',
      fedora: 'chromium',
    },
  },
  {
    id: 'libreoffice',
    name: 'LibreOffice Suite',
    category: 'productivity',
    description: 'Suite bureautique complète (Writer, Calc, Impress, Draw) compatible avec les formats Microsoft Office.',
    sizeMB: 480,
    icon: 'FileText',
    tags: ['Bureautique', 'Office', 'Docs'],
    pkgNames: {
      debian: 'libreoffice libreoffice-l10n-fr',
      ubuntu: 'libreoffice libreoffice-l10n-fr',
      arch: 'libreoffice-fresh libreoffice-fresh-fr',
      alpine: 'libreoffice',
      fedora: 'libreoffice libreoffice-langpack-fr',
    },
  },

  // --- SYSTEM UTILITIES ---
  {
    id: 'htop_btop',
    name: 'Btop & Htop Monitoring',
    category: 'system',
    description: 'Moniteurs système en console modernes et esthétiques affichant CPU, GPU, RAM, disques et processus.',
    sizeMB: 25,
    icon: 'Activity',
    tags: ['Monitoring', 'TUI', 'Performance'],
    pkgNames: {
      debian: 'btop htop iotop ncdu',
      ubuntu: 'btop htop iotop ncdu',
      arch: 'btop htop iotop ncdu',
      alpine: 'btop htop iotop ncdu',
      fedora: 'btop htop iotop ncdu',
    },
  },
  {
    id: 'zsh_starship',
    name: 'ZSH Shell & Starship Prompt',
    category: 'system',
    description: 'Interpréteur de commandes interactif ZSH avec prompt ultra-rapide Starship et auto-complétions.',
    sizeMB: 45,
    icon: 'TerminalSquare',
    tags: ['Shell', 'Productivité', 'Thème'],
    // Bug réel trouvé en auditant : la description promet explicitement "Starship" mais Debian et
    // Ubuntu n'installaient jamais que "zsh fzf curl" (Starship absent). Confirmé RÉEL sur les DEUX
    // suites exactes ciblées par ce générateur (DEBOOTSTRAP_TARGETS, pas les suites génériques) :
    // Debian "trixie" (packages.debian.org/trixie/starship, 1.22.1-5) et Ubuntu "resolute"
    // (packages.ubuntu.com/resolute/starship, 1.22.1-9ubuntu1) — corrigé en l'ajoutant aux deux.
    pkgNames: {
      debian: 'zsh fzf curl starship',
      ubuntu: 'zsh fzf curl starship',
      arch: 'zsh starship fzf',
      alpine: 'zsh starship fzf',
      fedora: 'zsh starship fzf',
    },
  },
  {
    id: 'fastfetch',
    name: 'Fastfetch / Neofetch System Info',
    category: 'system',
    description: 'Afficheur d’informations système en C ultra-rapide avec logo ASCII de la distribution.',
    sizeMB: 15,
    icon: 'Info',
    tags: ['Sysinfo', 'ASCII', 'Custom'],
    pkgNames: {
      debian: 'neofetch pciutils usbutils',
      ubuntu: 'neofetch pciutils usbutils',
      arch: 'fastfetch',
      alpine: 'neofetch pciutils usbutils',
      fedora: 'fastfetch',
    },
  },
  {
    id: 'gui_package_manager',
    name: 'Gestionnaire de Logiciels Graphique',
    category: 'system',
    description: 'Application graphique pour installer, mettre à jour et désinstaller des logiciels après le premier démarrage, sans passer par le terminal.',
    sizeMB: 60,
    icon: 'Store',
    tags: ['GUI', 'Post-Install', 'Indispensable'],
    pkgNames: {
      debian: 'synaptic',
      ubuntu: 'synaptic',
      arch: 'gnome-software',
      fedora: 'gnome-software',
    },
  },

  // --- INTELLIGENCE ARTIFICIELLE & LLM ---
  {
    id: 'ollama_ai',
    name: 'Ollama Local AI & LLM Runner',
    category: 'ai',
    description: 'Exécutez des modèles de langage (LLM) locaux comme Llama 3, Mistral, DeepSeek et Qwen directement sur votre machine sans dépendre du cloud.',
    sizeMB: 350,
    icon: 'Sparkles',
    tags: ['IA', 'LLM', 'Local', 'GPU', 'Inférence'],
    // Bug réel MAJEUR trouvé en auditant, même classe que K3s ci-dessus : Debian/Ubuntu
    // n'installaient que "curl ca-certificates" (de simples prérequis) sans jamais installer
    // Ollama lui-même — vérifié par CONTENU de page (pas juste le code HTTP, qui renvoie 200 même
    // sur la page d'erreur "No such package" de packages.debian.org/packages.ubuntu.com, même
    // piège déjà documenté ailleurs dans ce projet pour Deepin) : "ollama" confirmé ABSENT des
    // dépôts Debian bookworm/trixie ET Ubuntu noble. Corrigé en déclenchant le vrai installeur
    // officiel (ollama.com/install.sh, qui crée et active lui-même son propre service systemd
    // "ollama.service") au premier démarrage via ollamaSetupCmd(). Second bug trouvé dans le même
    // audit : "void: 'ollama'" confirmé ABSENT (raw.githubusercontent.com/void-linux/
    // void-packages srcpkgs/ollama/template : 404) — retiré ici (bascule sur PKG_NAME_FALLBACK
    // void→alpine, qui redonne la même chaîne "ollama" : la boucle d'installation par paquet
    // tolère déjà cet échec individuel, comportement déjà établi et accepté pour ce mécanisme de
    // repli ailleurs dans ce fichier). Le vrai correctif honnête est l'avertissement explicite
    // ajouté dans ollamaSetupCmd() pour la famille Void, pas la présence/absence de cette clé.
    // Arch/Alpine/Fedora/openSUSE conservent leurs vrais paquets natifs déjà fonctionnels,
    // confirmés réels via des sources fiables (API JSON Arch, contenu de page Alpine, listing
    // direct du dépôt OSS officiel openSUSE).
    pkgNames: {
      debian: 'curl ca-certificates',
      ubuntu: 'curl ca-certificates',
      arch: 'ollama',
      alpine: 'ollama',
      fedora: 'ollama',
      opensuse: 'ollama',
    },
  },
  {
    id: 'python_ai_data',
    name: 'Python Data Science & PyTorch',
    category: 'ai',
    description: 'Stack complète pour le Machine Learning et la Data Science avec NumPy, SciPy, Pandas, Matplotlib et Jupyter.',
    sizeMB: 480,
    icon: 'Brain',
    tags: ['Data', 'PyTorch', 'Jupyter', 'ML', 'Python'],
    pkgNames: {
      debian: 'python3-numpy python3-scipy python3-pandas python3-matplotlib python3-jupyter-core',
      ubuntu: 'python3-numpy python3-scipy python3-pandas python3-matplotlib',
      arch: 'python-numpy python-scipy python-pandas python-matplotlib jupyterlab',
      alpine: 'py3-numpy py3-scipy py3-pandas py3-matplotlib',
      fedora: 'python3-numpy python3-scipy python3-pandas python3-matplotlib',
      opensuse: 'python3-numpy python3-scipy python3-pandas python3-matplotlib',
      void: 'python3-numpy python3-scipy python3-pandas python3-matplotlib',
    },
  },

  // --- AUTOMATISATION & CLOUD IAC ---
  {
    id: 'ansible',
    name: 'Ansible Automation Engine',
    category: 'development',
    description: 'Outil d’automatisation informatique, de gestion de configuration et de déploiement de serveurs sans agent.',
    sizeMB: 120,
    icon: 'Wrench',
    tags: ['DevOps', 'Automation', 'IaC', 'SSH'],
    pkgNames: {
      debian: 'ansible ansible-core',
      ubuntu: 'ansible',
      arch: 'ansible ansible-core',
      alpine: 'ansible',
      fedora: 'ansible ansible-core',
      opensuse: 'ansible',
      void: 'ansible',
    },
  },
  {
    id: 'opentofu_terraform',
    name: 'OpenTofu & Terraform (IaC)',
    category: 'development',
    description: 'Moteur d’infrastructure-as-code déclaratif et open-source pour gérer et provisionner des clusters cloud.',
    sizeMB: 75,
    icon: 'Layers',
    tags: ['IaC', 'Cloud', 'Infrastructure', 'Terraform'],
    // Bug réel MAJEUR trouvé en auditant, même piège que K3s/Ollama ci-dessus (code HTTP 200 sur
    // la page d'erreur "No such package" de packages.debian.org/packages.ubuntu.com) : "opentofu"
    // confirmé ABSENT des dépôts Debian bookworm/trixie ET Ubuntu noble par CONTENU réel de page,
    // pas juste le code HTTP. Retiré des deux (l'installation échouait déjà silencieusement via la
    // boucle tolérante, "Info: opentofu omis ou non disponible") et remplacé par le vrai installeur
    // officiel (get.opentofu.org/install-opentofu.sh --install-method deb) déclenché PENDANT la
    // compilation (opentofuSetupCmd dans scriptGenerators.ts — OpenTofu est un simple CLI sans
    // démon, contrairement à K3s/Ollama, donc installable directement dans le chroot). Confirmé
    // RÉEL sur les 5 autres familles (Arch via l'API JSON officielle, Alpine/openSUSE via listing
    // direct des dépôts, Fedora via packages.fedoraproject.org, Void via le dépôt source réel) —
    // inchangées.
    pkgNames: {
      arch: 'opentofu',
      alpine: 'opentofu',
      fedora: 'opentofu',
      opensuse: 'opentofu',
      void: 'opentofu',
    },
  },
  {
    id: 'k8s_cli_tools',
    name: 'Kubernetes CLI Tools (Kubectl & Helm)',
    category: 'homelab',
    description: 'Ensemble d’outils en ligne de commande indispensables pour piloter vos clusters Kubernetes et installer des charts Helm.',
    sizeMB: 95,
    icon: 'Server',
    tags: ['Kubernetes', 'Helm', 'CLI', 'Cloud', 'K8s'],
    // Bug réel MAJEUR trouvé en auditant, même piège HTTP-200 que K3s/Ollama/OpenTofu ci-dessus :
    // "kubectl"/"helm" sont ABSENTS des dépôts Debian bookworm/trixie et Ubuntu noble (contenu réel
    // confirmé "Package not available in this suite" / "No such package", pas juste code HTTP 200).
    // "kubernetes-client" (utilisé pour openSUSE) est également fictif sous ce nom stable : openSUSE
    // ne publie QUE des paquets versionnés ("kubernetes1.35-client-common", etc., confirmés via
    // manpages.opensuse.org) qui se périment à chaque rotation de Tumbleweed — les figer dans ce
    // catalogue statique aurait introduit un NOUVEAU bug à retardement. "helm" en revanche est un vrai
    // paquet openSUSE stable (confirmé via une annonce de sécurité openSUSE 2026, "helm-4.1.1-3.1").
    // Corrigé en retirant les entrées fictives (Debian/Ubuntu entièrement, "kubernetes-client" pour
    // openSUSE) et en installant kubectl "à la source" via k8sCliSetupCmd (scriptGenerators.ts) : le
    // binaire officiel dl.k8s.io pour Debian/Ubuntu/openSUSE, et le script officiel get-helm-4 pour
    // Debian/Ubuntu (openSUSE garde son vrai paquet natif "helm"). Arch/Alpine/Fedora/Void confirmés
    // réels et inchangés.
    pkgNames: {
      arch: 'kubectl helm k9s',
      alpine: 'kubectl helm',
      fedora: 'kubernetes-client helm',
      opensuse: 'helm',
      void: 'kubectl helm',
    },
  },

  // --- STUDIO AUDIO & MAO ---
  {
    id: 'ardour_daw',
    name: 'Ardour Digital Audio Workstation',
    category: 'audio',
    description: 'Station de travail audio numérique (DAW) complète pour l’enregistrement studio, l’édition et le mixage multipiste professionnel.',
    sizeMB: 380,
    icon: 'Radio',
    tags: ['MAO', 'Studio', 'Audio', 'Mixage', 'PipeWire'],
    pkgNames: {
      debian: 'ardour qjackctl pavucontrol',
      ubuntu: 'ardour qjackctl pavucontrol',
      arch: 'ardour qjackctl pavucontrol',
      alpine: 'ardour pavucontrol',
      fedora: 'ardour6 qjackctl pavucontrol',
      opensuse: 'ardour qjackctl pavucontrol',
      void: 'ardour qjackctl pavucontrol',
    },
  },
  {
    id: 'audacity',
    name: 'Audacity Audio Editor',
    category: 'audio',
    description: 'Éditeur et enregistreur audio multipiste polyvalent avec filtres, réduction de bruit et analyse spectrale.',
    sizeMB: 90,
    icon: 'Volume2',
    tags: ['Audio', 'Podcast', 'Enregistrement', 'Effets'],
    pkgNames: {
      debian: 'audacity',
      ubuntu: 'audacity',
      arch: 'audacity',
      alpine: 'audacity',
      fedora: 'audacity',
      opensuse: 'audacity',
      void: 'audacity',
    },
  },

  // --- SÉCURITÉ & VIE PRIVÉE ---
  {
    id: 'keepassxc',
    name: 'KeePassXC Password Vault',
    category: 'security',
    description: 'Gestionnaire de mots de passe hors-ligne chiffré AES-256 avec intégration navigateurs et générateur de codes 2FA/TOTP.',
    sizeMB: 65,
    icon: 'Lock',
    tags: ['Mots de passe', 'Chiffrement', 'Sécurité', '2FA'],
    pkgNames: {
      debian: 'keepassxc',
      ubuntu: 'keepassxc',
      arch: 'keepassxc',
      alpine: 'keepassxc',
      fedora: 'keepassxc',
      opensuse: 'keepassxc',
      void: 'keepassxc',
    },
  },
  {
    id: 'tor_privoxy',
    name: 'Tor Anonymity Network & Privoxy',
    category: 'security',
    description: 'Réseau d’anonymisation en oignon pour protéger votre vie privée et contourner la censure réseau.',
    sizeMB: 50,
    icon: 'EyeOff',
    tags: ['Vie privée', 'Tor', 'Anonymat', 'Proxy'],
    pkgNames: {
      debian: 'tor privoxy nyx',
      ubuntu: 'tor privoxy nyx',
      arch: 'tor privoxy nyx',
      alpine: 'tor privoxy',
      fedora: 'tor privoxy nyx',
      opensuse: 'tor privoxy nyx',
      void: 'tor privoxy nyx',
    },
  },

  // --- BUREAUTIQUE & COMMUNICATION ---
  {
    id: 'thunderbird',
    name: 'Mozilla Thunderbird Email & Agenda',
    category: 'productivity',
    description: 'Client de messagerie électronique, carnet d’adresses et calendrier complet avec prise en charge du chiffrement OpenPGP.',
    sizeMB: 190,
    icon: 'Mail',
    tags: ['Email', 'OpenPGP', 'Calendrier', 'Mozilla'],
    pkgNames: {
      debian: 'thunderbird thunderbird-l10n-fr',
      ubuntu: 'thunderbird thunderbird-locale-fr',
      arch: 'thunderbird thunderbird-i18n-fr',
      alpine: 'thunderbird',
      fedora: 'thunderbird',
      opensuse: 'MozillaThunderbird',
      void: 'thunderbird',
    },
  },

  // --- LECTURE MULTIMÉDIA & STREAMING ---
  {
    id: 'mpv_player',
    name: 'MPV Player (Accélération GPU & YT-DLP)',
    category: 'multimedia',
    description: 'Lecteur vidéo ultra-réactif avec décodage matériel GPU et téléchargement de flux via yt-dlp intégré.',
    sizeMB: 85,
    icon: 'Film',
    tags: ['Lecteur', 'Vidéo', 'GPU', 'Minimal', 'Streaming'],
    pkgNames: {
      debian: 'mpv yt-dlp',
      ubuntu: 'mpv yt-dlp',
      arch: 'mpv yt-dlp',
      alpine: 'mpv yt-dlp',
      fedora: 'mpv yt-dlp',
      opensuse: 'mpv yt-dlp',
      void: 'mpv yt-dlp',
    },
  },

  // --- TERMINAL MODERNE & SYSADMIN ---
  {
    id: 'tmux_zellij',
    name: 'Tmux & Zellij Terminal Multiplexers',
    category: 'system',
    description: 'Multiplexeurs de terminal modernes pour scinder vos écrans, persister vos sessions SSH et travailler en multitâche.',
    sizeMB: 35,
    icon: 'Terminal',
    tags: ['Terminal', 'Multiplexeur', 'Rust', 'CLI', 'SSH'],
    pkgNames: {
      debian: 'tmux zellij',
      ubuntu: 'tmux',
      arch: 'tmux zellij',
      alpine: 'tmux zellij',
      fedora: 'tmux zellij',
      opensuse: 'tmux zellij',
      void: 'tmux zellij',
    },
  },
  {
    id: 'cli_modern_tools',
    name: 'Modern CLI Tools (Bat, Eza, Dust, Duf)',
    category: 'system',
    description: 'Utilitaires modernes réécrits en Rust pour le terminal : bat (cat coloré), eza (ls moderne), dust (du graphique), duf (df lisible).',
    sizeMB: 40,
    icon: 'Zap',
    tags: ['Rust', 'CLI', 'Productivité', 'Terminal', 'Outils'],
    // Bug réel trouvé en auditant : le nom ("Bat, Eza, Dust, Duf") et la description promettent
    // explicitement "eza" et "dust", mais Debian/Ubuntu n'installaient ni l'un ni l'autre — vérifié
    // RÉELS sur les deux suites exactes ciblées par ce générateur : "eza" (Debian trixie 0.21.0-1,
    // Ubuntu resolute 0.23.4-1ubuntu1) et "du-dust" (Debian trixie 1.2.0-2, Ubuntu resolute
    // 1.2.4-1ubuntu1) — ajoutés ici. "duf" reste absent d'Alpine (confirmé réel UNIQUEMENT dans le
    // dépôt "testing", jamais activé par ce générateur — même principe déjà établi pour VSCodium),
    // omission correcte et inchangée.
    pkgNames: {
      debian: 'bat eza du-dust ripgrep fd-find duf tldr',
      ubuntu: 'bat eza du-dust ripgrep fd-find duf tldr',
      arch: 'bat eza du-dust ripgrep fd tealdeer duf',
      alpine: 'bat ripgrep fd dust',
      fedora: 'bat eza dust ripgrep fd-find tealdeer duf',
      opensuse: 'bat eza dust ripgrep fd',
      void: 'bat eza dust ripgrep fd duf',
    },
    appType: 'cli',
    systemImpact: 'low',
  },

  // --- COMPILATEURS & OUTILS DE BUILD ---
  {
    id: 'golang_toolchain',
    name: 'Go Language & Toolchain',
    category: 'development',
    description: 'Compilateur Go officiel et outils de développement pour concevoir des applications cloud et microservices concurrents.',
    sizeMB: 220,
    icon: 'Terminal',
    tags: ['Go', 'Cloud', 'Microservices', 'Backend'],
    pkgNames: {
      debian: 'golang-go',
      ubuntu: 'golang-go',
      arch: 'go',
      alpine: 'go',
      fedora: 'golang',
      opensuse: 'go',
      void: 'go',
    },
    appType: 'cli',
    systemImpact: 'medium',
  },
  {
    id: 'cpp_modern_stack',
    name: 'C/C++ Build Stack (Clang, GCC, CMake, Ninja)',
    category: 'development',
    description: 'Chaîne de compilation complète C/C++ avec compilateurs GCC/Clang, générateurs CMake, Ninja et Meson.',
    sizeMB: 420,
    icon: 'Cpu',
    tags: ['C++', 'Clang', 'GCC', 'CMake', 'Système'],
    pkgNames: {
      debian: 'build-essential cmake ninja-build clang llvm meson',
      ubuntu: 'build-essential cmake ninja-build clang llvm meson',
      arch: 'base-devel cmake ninja clang llvm meson',
      alpine: 'build-base cmake ninja clang llvm meson',
      fedora: 'gcc-c++ cmake ninja-build clang llvm meson',
      opensuse: 'gcc-c++ cmake ninja clang llvm meson',
      void: 'base-devel cmake ninja clang llvm meson',
    },
    appType: 'cli',
    systemImpact: 'heavy',
  },
  {
    id: 'zig_compiler',
    name: 'Zig Toolchain & Compiler',
    category: 'development',
    description: 'Langage de programmation système moderne axé sur la simplicité, la sécurité mémoire sans ramasse-miettes et le cross-compiling.',
    sizeMB: 95,
    icon: 'Zap',
    tags: ['Zig', 'Système', 'Performance', 'Compilation'],
    // Bug réel MAJEUR trouvé en auditant, même piège HTTP-200 que K3s/Ollama/OpenTofu/K8s CLI Tools
    // ci-dessus : "zig" est confirmé ABSENT de Debian bookworm/trixie ET Ubuntu noble (contenu réel
    // des pages "No such package"/"Package not available in this suite", pas juste le code HTTP).
    // Corrigé en installant la vraie archive officielle depuis ziglang.org/download/ pendant la
    // compilation (zigSetupCmd dans scriptGenerators.ts). Arch/Alpine/Fedora/openSUSE/Void confirmés
    // réels et inchangés (API JSON Arch, contenu de page Alpine/Fedora, dépôt source Void, wiki
    // officiel openSUSE "zypper in zig").
    pkgNames: {
      arch: 'zig',
      alpine: 'zig',
      fedora: 'zig',
      opensuse: 'zig',
      void: 'zig',
    },
    appType: 'cli',
    systemImpact: 'low',
  },

  // --- MODÉLISATION 3D & GRAPHIQUE ---
  {
    id: 'blender_3d',
    name: 'Blender 3D Modeling & Animation',
    category: 'multimedia',
    description: 'Suite de création 3D open source complète pour la modélisation, l’animation, le rendu photoréaliste et les effets visuels.',
    sizeMB: 580,
    icon: 'Box',
    tags: ['3D', 'Animation', 'Rendu', 'VFX', 'GPU'],
    pkgNames: {
      debian: 'blender',
      ubuntu: 'blender',
      arch: 'blender',
      alpine: 'blender',
      fedora: 'blender',
      opensuse: 'blender',
      void: 'blender',
    },
    appType: 'gui',
    systemImpact: 'heavy',
  },

  // --- SAUVEGARDE & SYNCHRONISATION ---
  {
    id: 'restic_rclone',
    name: 'Restic & Rclone Backup Suite',
    category: 'homelab',
    description: 'Sauvegarde chiffrée, dédupliquée et synchronisation automatique vers plus de 40 fournisseurs cloud (S3, GDrive, Nextcloud).',
    sizeMB: 65,
    icon: 'ShieldCheck',
    tags: ['Backup', 'Cloud', 'Chiffrement', 'Sync'],
    pkgNames: {
      debian: 'restic rclone borgbackup',
      ubuntu: 'restic rclone borgbackup',
      arch: 'restic rclone borg',
      alpine: 'restic rclone borgbackup',
      fedora: 'restic rclone borgbackup',
      opensuse: 'restic rclone borgbackup',
      void: 'restic rclone borgbackup',
    },
    appType: 'cli',
    systemImpact: 'low',
  },

  // --- ÉMULATION & GAMING ---
  {
    id: 'retroarch_gaming',
    name: 'RetroArch Universal Emulation',
    category: 'gaming',
    description: 'Frontend unifié pour émulateurs de consoles rétro (NES, SNES, Genesis, PS1, N64) avec shaders et synchronisation manettes.',
    sizeMB: 310,
    icon: 'Gamepad2',
    tags: ['Émulation', 'Rétro', 'Jeux', 'Manette'],
    pkgNames: {
      debian: 'retroarch',
      ubuntu: 'retroarch',
      arch: 'retroarch',
      alpine: 'retroarch',
      fedora: 'retroarch',
      opensuse: 'retroarch',
      void: 'retroarch',
    },
    appType: 'gui',
    systemImpact: 'medium',
  },
  {
    id: 'gamepad_drivers',
    name: 'Gamepad & Controller Drivers',
    category: 'gaming',
    description: 'Pilotes et utilitaires de calibrage pour manettes Xbox, PlayStation, Nintendo Switch et manettes USB génériques.',
    sizeMB: 30,
    icon: 'Gamepad2',
    tags: ['Manette', 'Driver', 'Gaming', 'USB'],
    // Bug réel MAJEUR trouvé en auditant, même piège HTTP-200 que K3s/Ollama/OpenTofu/K8s CLI Tools
    // ci-dessus : PLUSIEURS noms de paquets fictifs sur 5 familles sur 7 (seuls Debian/Ubuntu étaient
    // entièrement corrects). Confirmé via contenu réel des pages/API JSON, pas juste le code HTTP :
    // "jstest-gtk" et "xboxdrv" sont ABSENTS des dépôts officiels Arch (archlinux.org/packages/
    // search/json : "count": 0 pour les deux — AUR uniquement, or ce générateur n'installe jamais de
    // paquet AUR, même principe que k3s-bin documenté plus haut). "joystick" n'existe PAS sous ce nom
    // sur Fedora NI openSUSE (packages.fedoraproject.org/pkgs/joystick/joystick/ : 404 ; le vrai
    // paquet fournissant jstest/jscal sur ces deux familles s'appelle "linuxconsoletools", confirmé
    // réel sur les deux : packages.fedoraproject.org/pkgs/linuxconsoletools + software.opensuse.org/
    // package/linuxconsoletools). "jstest-gtk" est également ABSENT des dépôts OFFICIELS openSUSE
    // (disponible seulement via le home-repo personnel d'un tiers "home:wkazubski", jamais dans la
    // distribution officielle — retiré ici plutôt que promis à tort). "joyutils" est ABSENT d'Alpine
    // (pkgs.alpinelinux.org : 404 direct + recherche vide ; le vrai paquet Alpine est également
    // "linuxconsoletools", confirmé réel dans le dépôt community) ET de Void (aucun répertoire
    // srcpkgs/joyutils réel, aucun équivalent "linuxconsoletools" trouvé non plus sur Void — retiré
    // sans repli inventé, bascule honnête sur PKG_NAME_FALLBACK void→alpine déjà établi ailleurs dans
    // ce fichier). Debian/Ubuntu confirmés entièrement corrects (joystick/jstest-gtk/xboxdrv tous
    // réels), inchangés.
    pkgNames: {
      debian: 'joystick jstest-gtk xboxdrv',
      ubuntu: 'joystick jstest-gtk xboxdrv',
      arch: 'joyutils',
      alpine: 'linuxconsoletools',
      fedora: 'linuxconsoletools jstest-gtk',
      opensuse: 'linuxconsoletools',
    },
    appType: 'daemon',
    systemImpact: 'low',
  },

  // --- RÉDACTION & PUBLICATION ---
  {
    id: 'typst_pandoc',
    name: 'Typst & Pandoc Document Publishing',
    category: 'productivity',
    description: 'Système moderne de composition de documents Typst (alternative ultra-rapide à LaTeX) et convertisseur universel Pandoc.',
    sizeMB: 85,
    icon: 'FileText',
    tags: ['Typst', 'Pandoc', 'LaTeX', 'Markdown', 'PDF'],
    pkgNames: {
      debian: 'pandoc typst',
      ubuntu: 'pandoc',
      arch: 'pandoc-cli typst',
      alpine: 'pandoc typst',
      fedora: 'pandoc typst',
      opensuse: 'pandoc typst',
      void: 'pandoc typst',
    },
    appType: 'cli',
    systemImpact: 'low',
  },

  // --- OBSERVABILITÉ & MÉTRIQUES ---
  {
    id: 'prometheus_node_exporter',
    name: 'Prometheus Node Exporter',
    category: 'homelab',
    description: 'Agent léger de collecte de métriques système matérielles et OS (CPU, RAM, Disque, Réseau) pour Prometheus et Grafana.',
    sizeMB: 25,
    icon: 'Activity',
    tags: ['Prometheus', 'Monitoring', 'Métriques', 'Grafana'],
    pkgNames: {
      debian: 'prometheus-node-exporter',
      ubuntu: 'prometheus-node-exporter',
      arch: 'prometheus-node-exporter',
      alpine: 'prometheus-node-exporter',
      fedora: 'golang-github-prometheus-node_exporter',
      opensuse: 'prometheus-node_exporter',
      void: 'prometheus-node-exporter',
    },
    appType: 'daemon',
    systemImpact: 'low',
  },
];
