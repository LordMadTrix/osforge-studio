import { KernelType } from '../types/os';

export interface KernelOption {
  id: KernelType;
  name: string;
  badge: string;
  version: string;
  description: string;
  recommendation: string;
  bootSpeed: 'Très rapide' | 'Standard' | 'Instantané';
  latency: 'Basse' | 'Ultra-Basse' | 'Standard';
  stability: 'Critique / Maximale' | 'Haute' | 'Bleeding Edge';
  isBeta?: boolean;
}

export const KERNEL_OPTIONS: KernelOption[] = [
  {
    id: 'generic',
    name: 'Linux 7.1 Stable (Officiel kernel.org)',
    version: 'v7.1.9 Stable',
    badge: 'Standard & Fiable',
    description: 'Noyau Linux officiel stable fourni par kernel.org. Testé en profondeur pour assurer une compatibilité matérielle universelle.',
    recommendation: 'Recommandé pour la majorité des usages généralistes et postes bureautiques.',
    bootSpeed: 'Standard',
    latency: 'Standard',
    stability: 'Haute',
    isBeta: false,
  },
  {
    id: 'mainline_beta',
    name: 'Linux 7.2 Mainline (Bleeding Edge Beta)',
    version: 'v7.2 Mainline Beta',
    badge: 'Mainline Beta',
    description: 'Dernière version absolue du noyau Linux de Linus Torvalds. Support des GPU AMD RDNA4, Intel Battlemage, WiFi 7 et ordonnanceur EEVDF.',
    recommendation: 'Idéal si vous possédez du matériel sorti très récemment (processeurs et cartes graphiques 2025/2026).',
    bootSpeed: 'Très rapide',
    latency: 'Basse',
    stability: 'Bleeding Edge',
    isBeta: true,
  },
  {
    id: 'cachyos',
    name: 'Linux-CachyOS (BORE Scheduler & Auto-FDO)',
    version: 'v7.1.9-cachyos (BORE v5.4)',
    badge: 'Gaming & Latence Zéro',
    description: 'Noyau ultra-optimisé combinant l’ordonnanceur BORE (Burst-Oriented Response Enhancer), compilations x86-64-v3/v4 et zRAM LZ4 à 1000Hz.',
    recommendation: 'Le choix #1 pour les joueurs d’e-sport et les développeurs cherchant un multitâche d’une fluidité absolue.',
    bootSpeed: 'Instantané',
    latency: 'Ultra-Basse',
    stability: 'Haute',
    isBeta: false,
  },
  {
    id: 'zen',
    name: 'Linux-Zen 7.1 (Tuning Desktop & Réactivité)',
    version: 'v7.1-zen',
    badge: 'Faible Latence Desktop',
    description: 'Résultat d’une collaboration de développeurs du noyau pour offrir le meilleur compromis de réactivité sur un desktop quotidien.',
    recommendation: 'Idéal pour les postes interactifs, le multitâche fluide et la navigation web ultra-réactive.',
    bootSpeed: 'Très rapide',
    latency: 'Basse',
    stability: 'Haute',
    isBeta: false,
  },
  {
    id: 'liquorix',
    name: 'Linux-Liquorix 7.1 (Gaming & Multimédia)',
    version: 'v7.1.1-lqx',
    badge: 'Gaming & Audio Pro',
    description: 'Noyau optimisé pour le streaming, la production audio/vidéo et les jeux vidéo (ordonnanceur PDS, 1000Hz, Zen interactive tuning).',
    recommendation: 'Parfait pour éliminer les micro-saccades (stuttering) dans les jeux Steam et l’enregistrement audio sans latence.',
    bootSpeed: 'Standard',
    latency: 'Ultra-Basse',
    stability: 'Haute',
    isBeta: false,
  },
  {
    id: 'xanmod',
    name: 'Linux-XanMod 6.13 (Faible Latence & E-Sport)',
    version: 'v6.13-xanmod (x64v3/v2)',
    badge: 'Ultra-Performance & Gaming',
    description: 'Noyau Linux haute performance conçu pour maximiser le débit, réduire la latence système et optimiser le multitâche (patchs TT / BORE, préemption complète, tickrate 500Hz/1000Hz, TCP BBRv3).',
    recommendation: 'Recommandé pour les stations de travail audio/vidéo, le gaming haute performance et les serveurs nécessitant une latence minimale.',
    bootSpeed: 'Très rapide',
    latency: 'Ultra-Basse',
    stability: 'Haute',
    isBeta: false,
  },
  {
    id: 'hardened',
    name: 'Linux-Hardened 6.12/7.1 (Sécurité Maximale & KSPP)',
    version: 'v6.12.14-hardened',
    badge: 'Sécurité Militaire KSPP',
    description: 'Patchs de sécurité PaX/grsecurity, désactivation des appels système non sûrs et protection avancée de la mémoire kernel.',
    recommendation: 'Indispensable pour les infrastructures bancaires, serveurs exposés sur Internet et pentest sécurisé.',
    bootSpeed: 'Standard',
    latency: 'Standard',
    stability: 'Critique / Maximale',
    isBeta: false,
  },
  {
    id: 'realtime',
    name: 'Linux-RT (PREEMPT_RT Temps Réel 6.12/7.1)',
    version: 'v6.12.14-rt5',
    badge: 'Temps Réel Déterministe',
    description: 'Noyau à préemption totale garantissant des temps de réponse sous la milliseconde pour les applications industrielles et audio bit-perfect.',
    recommendation: 'Robotique, automates d’usines, traitement audio pro studio et acquisition de données capteurs.',
    bootSpeed: 'Très rapide',
    latency: 'Ultra-Basse',
    stability: 'Critique / Maximale',
    isBeta: false,
  },
  {
    id: 'cloud_micro',
    name: 'Linux MicroVM / Cloud Guest (Taille < 15 Mo)',
    version: 'v7.1-microvm',
    badge: 'MicroVM Cloud',
    description: 'Noyau épuré de tous les pilotes superflus, optimisé pour les hyperviseurs QEMU, KVM, Firecracker et Cloud Hypervisor.',
    recommendation: 'Démarrage d’instances cloud en moins de 100ms et consommation mémoire minime.',
    bootSpeed: 'Instantané',
    latency: 'Basse',
    stability: 'Critique / Maximale',
    isBeta: false,
  },
  {
    id: 'lts',
    name: 'Linux-LTS 6.12 (Long Term Support 2024-2029)',
    version: 'v6.12.14 LTS',
    badge: 'Support 5 Ans LTS',
    description: 'Branche LTS officielle recevant les correctifs de sécurité critiques et backports sans perturbation fonctionnelle.',
    recommendation: 'Serveurs d’entreprises qui doivent tourner plusieurs années en haute disponibilité.',
    bootSpeed: 'Standard',
    latency: 'Standard',
    stability: 'Critique / Maximale',
    isBeta: false,
  },
];
