import { OSRecipe, DesktopEnvironmentId, DistroId, OutputFormat } from '../types/os';

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'success';
export type DiagnosticCategory = 'compatibility' | 'security' | 'performance' | 'architecture';

export interface RecipeDiagnostic {
  id: string;
  title: string;
  message: string;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  field?: string;
  fixLabel?: string;
  autoFix?: (recipe: OSRecipe) => OSRecipe;
}

export interface RecipeDoctorReport {
  diagnostics: RecipeDiagnostic[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  score: number; // 0 to 100
  passed: boolean;
  securityScore: number; // 0 to 100
}

const DEBIAN_LIKE_DISTROS: DistroId[] = [
  'debian', 'ubuntu', 'kali', 'raspbian', 'linuxmint', 'popos', 'parrot', 'dietpi', 'retropie', 'armbian', 'raspap'
];

/**
 * Moteur d'audit statique et de cohérence en temps réel pour une recette OSForge
 */
export function auditRecipe(recipe: OSRecipe): RecipeDoctorReport {
  const diagnostics: RecipeDiagnostic[] = [];
  const isDebianLike = DEBIAN_LIKE_DISTROS.includes(recipe.distro);

  // --------------------------------------------------------------------------
  // 1. Incompatibilité Format ISO vs Familles Non-Debian (Erreur Bloquante)
  // --------------------------------------------------------------------------
  if (recipe.outputFormat === 'iso_hybrid' && !isDebianLike) {
    diagnostics.push({
      id: 'non-debian-iso',
      title: 'Format ISO Live non supporté pour cette distribution',
      message: `La distribution ${recipe.distro.toUpperCase()} ne supporte pas l'ISO live bootable via ce générateur (seuls les formats disque QCOW2, VMDK, RAW ou conteneur RootFS WSL2/Docker sont pleinement fonctionnels).`,
      severity: 'error',
      category: 'compatibility',
      field: 'outputFormat',
      fixLabel: 'Convertir en Image Disque QCOW2 (KVM/QEMU/Proxmox)',
      autoFix: (r) => ({ ...r, outputFormat: 'qcow2' as OutputFormat }),
    });
  }

  // --------------------------------------------------------------------------
  // 2. Cross-Architecture non-Debian (Erreur Bloquante)
  // --------------------------------------------------------------------------
  if (!isDebianLike && recipe.arch !== 'x86_64') {
    diagnostics.push({
      id: 'non-debian-cross-arch',
      title: `Architecture ${recipe.arch} non supportée pour ${recipe.distro}`,
      message: `Le bootstrap cross-architecture pour ${recipe.distro} n'est pas disponible. Seule la famille Debian/Ubuntu gère l'émulation multi-arch qemu-static complète.`,
      severity: 'error',
      category: 'architecture',
      field: 'arch',
      fixLabel: 'Basculer en architecture x86_64',
      autoFix: (r) => ({ ...r, arch: 'x86_64' }),
    });
  }

  // --------------------------------------------------------------------------
  // 3. Rocky / AlmaLinux 9 : Bureaux absents d'EPEL9 (Erreur Bloquante)
  // --------------------------------------------------------------------------
  if ((recipe.distro === 'rocky' || recipe.distro === 'almalinux') && (recipe.desktop === 'lxqt' || recipe.desktop === 'lxde')) {
    diagnostics.push({
      id: 'rocky-missing-desktop',
      title: `Bureau ${recipe.desktop.toUpperCase()} absent des dépôts EPEL9`,
      message: `Le bureau ${recipe.desktop.toUpperCase()} n'est pas disponible dans les dépôts officiels ou EPEL pour Rocky/AlmaLinux 9.`,
      severity: 'error',
      category: 'compatibility',
      field: 'desktop',
      fixLabel: 'Remplacer par XFCE (Stable et présent dans EPEL9)',
      autoFix: (r) => ({ ...r, desktop: 'xfce' as DesktopEnvironmentId }),
    });
  }

  // --------------------------------------------------------------------------
  // 4. Sécurité SSH sans mot de passe ni clé SSH (Erreur Bloquante)
  // --------------------------------------------------------------------------
  if (recipe.enableSSH && !recipe.user.password && !recipe.user.sshPublicKey) {
    diagnostics.push({
      id: 'ssh-no-auth',
      title: 'Service SSH actif sans mot de passe ni clé SSH configurée',
      message: 'Le serveur SSH est activé mais l\'utilisateur n\'a ni mot de passe ni clé publique SSH. Le compte sera verrouillé à distance.',
      severity: 'error',
      category: 'security',
      field: 'enableSSH',
      fixLabel: 'Assigner un mot de passe temporaire "forge" et sécuriser',
      autoFix: (r) => ({
        ...r,
        user: { ...r.user, password: r.user.password || 'forge' },
      }),
    });
  }

  // --------------------------------------------------------------------------
  // 5. Chiffrement LUKS sans phrase de passe (Erreur Bloquante)
  // --------------------------------------------------------------------------
  if (recipe.security?.luksEncryption && !recipe.security?.luksPassword) {
    diagnostics.push({
      id: 'luks-no-passphrase',
      title: 'Chiffrement de disque LUKS actif sans phrase de passe',
      message: 'Le chiffrement LUKS est coché mais aucune phrase de passe n\'a été définie pour sceller le conteneur chiffré.',
      severity: 'error',
      category: 'security',
      field: 'security.luksEncryption',
      fixLabel: 'Générer une phrase de passe sécurisée par défaut',
      autoFix: (r) => ({
        ...r,
        security: { ...r.security, luksPassword: 'ForgeSecureLuks2026!' },
      }),
    });
  }

  // --------------------------------------------------------------------------
  // 6. Alpine Linux + Ollama glibc (Avertissement)
  // --------------------------------------------------------------------------
  if (recipe.distro === 'alpine' && recipe.selectedPackages?.includes('ollama_ai')) {
    diagnostics.push({
      id: 'alpine-ollama-glibc',
      title: 'Incompatibilité Ollama (glibc) sur Alpine Linux (musl)',
      message: 'L\'installeur binaire officiel d\'Ollama nécessite glibc et ne fonctionne pas nativement sur Alpine Linux avec musl libc.',
      severity: 'warning',
      category: 'compatibility',
      field: 'selectedPackages',
      fixLabel: 'Retirer Ollama ou basculer vers Ubuntu / Debian',
      autoFix: (r) => ({
        ...r,
        selectedPackages: r.selectedPackages.filter((p) => p !== 'ollama_ai'),
      }),
    });
  }

  // --------------------------------------------------------------------------
  // 7. Hyprland avec Display Manager incompatible X11 (Avertissement)
  // --------------------------------------------------------------------------
  if (recipe.desktop === 'hyprland' && recipe.displayManager === 'lightdm') {
    diagnostics.push({
      id: 'hyprland-lightdm-mismatch',
      title: 'Incompatibilité fréquente Hyprland avec LightDM',
      message: 'Hyprland est un compositeur Wayland moderne pur. LightDM peut échouer à initialiser la session sans configuration complexe. SDDM ou Ly sont fortement recommandés.',
      severity: 'warning',
      category: 'compatibility',
      field: 'displayManager',
      fixLabel: 'Passer sur SDDM (Recommandé Wayland)',
      autoFix: (r) => ({ ...r, displayManager: 'sddm' }),
    });
  }

  // --------------------------------------------------------------------------
  // 8. Cinnamon avec GDM3 (Avertissement)
  // --------------------------------------------------------------------------
  if (recipe.desktop === 'cinnamon' && recipe.displayManager === 'gdm3') {
    diagnostics.push({
      id: 'cinnamon-gdm3-mismatch',
      title: 'Cinnamon sous GDM3 peut tenter de lancer une session Wayland instable',
      message: 'GDM3 priorise cinnamon-wayland qui est expérimental et peut provoquer un écran noir sous machine virtuelle. LightDM offre une session X11 Cinnamon 100% stable.',
      severity: 'warning',
      category: 'compatibility',
      field: 'displayManager',
      fixLabel: 'Passer sur LightDM (Standard Linux Mint)',
      autoFix: (r) => ({ ...r, displayManager: 'lightdm' }),
    });
  }

  // --------------------------------------------------------------------------
  // 9. Sécurité : SSH actif + Mot de passe par défaut faible (Avertissement)
  // --------------------------------------------------------------------------
  if (recipe.enableSSH && (recipe.user.password === 'forge' || recipe.user.password === 'root' || recipe.user.password === '123456')) {
    diagnostics.push({
      id: 'weak-default-password',
      title: 'Mot de passe utilisateur par défaut faible ("forge")',
      message: 'Le serveur SSH est activé avec un mot de passe trivial. Il est vivement conseillé de désactiver l\'accès root ou d\'exiger une clé SSH.',
      severity: 'warning',
      category: 'security',
      field: 'user.password',
      fixLabel: 'Désactiver le login SSH root et activer le pare-feu UFW',
      autoFix: (r) => ({
        ...r,
        security: {
          ...r.security,
          disableRootSSH: true,
          firewall: r.security?.firewall === 'none' ? 'ufw' : r.security.firewall,
        },
      }),
    });
  }

  // --------------------------------------------------------------------------
  // 10. Sécurité : Absence de Pare-feu (Avertissement)
  // --------------------------------------------------------------------------
  if (!recipe.security?.firewall || recipe.security.firewall === 'none') {
    diagnostics.push({
      id: 'no-firewall',
      title: 'Aucun pare-feu réseau actif (UFW / Firewalld)',
      message: 'La machine ne dispose d\'aucun filtrage de ports entrant. Recommandé : activer UFW pour Debian/Ubuntu ou Firewalld pour Fedora/RHEL.',
      severity: 'warning',
      category: 'security',
      field: 'security.firewall',
      fixLabel: 'Activer le pare-feu UFW',
      autoFix: (r) => ({
        ...r,
        security: { ...r.security, firewall: 'ufw' },
      }),
    });
  }

  // --------------------------------------------------------------------------
  // 11. Optimisation Gaming sans Noyau Faible Latence (Info / Conseil)
  // --------------------------------------------------------------------------
  if (recipe.enableGamingOptimizations && recipe.kernel === 'generic') {
    diagnostics.push({
      id: 'gaming-generic-kernel',
      title: 'Optimisations Gaming actives avec noyau générique',
      message: 'Le profil Gaming est activé mais le noyau est standard. Les noyaux Liquorix ou Zen offrent un ordonnanceur 1000Hz à faible latence idéal pour le jeu.',
      severity: 'info',
      category: 'performance',
      field: 'kernel',
      fixLabel: 'Basculer vers le noyau Liquorix (Gaming 1000Hz)',
      autoFix: (r) => ({ ...r, kernel: 'liquorix' }),
    });
  }

  // --------------------------------------------------------------------------
  // 12. Mode Live Rescue / Forensics (Info / Recommandation)
  // --------------------------------------------------------------------------
  if (recipe.enableLiveRescue && recipe.outputFormat !== 'iso_hybrid') {
    diagnostics.push({
      id: 'live-rescue-non-iso',
      title: 'Option Live Rescue active sur un format d\'image disque',
      message: 'Le mode Live Rescue (chargement 100% RAM toram) est principalement conçu pour les clés USB et supports ISO bootables.',
      severity: 'info',
      category: 'architecture',
      field: 'enableLiveRescue',
    });
  }

  // Calcul du score de sécurité (0 - 100)
  let secScore = 40;
  if (recipe.security?.firewall && recipe.security.firewall !== 'none') secScore += 15;
  if (recipe.security?.appArmorOrSELinux) secScore += 15;
  if (recipe.security?.fail2ban) secScore += 10;
  if (recipe.security?.disableRootSSH) secScore += 10;
  if (recipe.security?.luksEncryption) secScore += 10;
  secScore = Math.min(100, Math.max(0, secScore));

  // Calcul du score global de santé de la recette (0 - 100)
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');
  const infos = diagnostics.filter((d) => d.severity === 'info');

  let overallScore = 100 - (errors.length * 30) - (warnings.length * 10);
  overallScore = Math.min(100, Math.max(0, overallScore));

  return {
    diagnostics,
    errorCount: errors.length,
    warningCount: warnings.length,
    infoCount: infos.length,
    score: overallScore,
    passed: errors.length === 0,
    securityScore: secScore,
  };
}

/**
 * Applique le correctif d'un diagnostic donné à la recette
 */
export function applyRecipeFix(recipe: OSRecipe, diagnosticId: string): OSRecipe {
  const report = auditRecipe(recipe);
  const diag = report.diagnostics.find((d) => d.id === diagnosticId);
  if (diag && diag.autoFix) {
    return diag.autoFix(recipe);
  }
  return recipe;
}
