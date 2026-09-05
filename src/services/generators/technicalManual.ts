import { OSRecipe } from '../../types/os';
import { DISTROS } from '../../data/distros';
import { DESKTOPS } from '../../data/desktopEnvironments';
import { KERNEL_OPTIONS } from '../../data/kernels';
import { SOFTWARE_PACKAGES } from '../../data/packages';

/**
 * Génère une fiche technique détaillée et soignée au format Markdown (OS Technical Specs Sheet)
 * prête à être consultée, imprimée ou incluse dans l'image système.
 */
export function generateTechnicalManualMarkdown(recipe: OSRecipe): string {
  const distroInfo = DISTROS.find(d => d.id === recipe.distro);
  const desktopInfo = DESKTOPS.find(d => d.id === recipe.desktop);
  const kernelInfo = KERNEL_OPTIONS.find(k => k.id === recipe.kernel);

  const selectedPkgObjects = recipe.selectedPackages
    .map(id => SOFTWARE_PACKAGES.find(p => p.id === id))
    .filter(Boolean);

  const allowedPortsStr = recipe.security.allowedPorts && recipe.security.allowedPorts.length > 0
    ? recipe.security.allowedPorts.join(', ')
    : '22 (SSH)';

  const isArchLike = ['arch', 'cachyos', 'endeavouros'].includes(recipe.distro);
  const isFedoraLike = ['fedora', 'rocky', 'almalinux'].includes(recipe.distro);

  let updateCmd = 'apt-get update && apt-get upgrade';
  if (isArchLike) updateCmd = 'pacman -Syu';
  else if (isFedoraLike) updateCmd = 'dnf upgrade';
  else if (recipe.distro === 'opensuse') updateCmd = 'zypper dup';
  else if (recipe.distro === 'alpine') updateCmd = 'apk update && apk upgrade';
  else if (recipe.distro === 'void') updateCmd = 'xbps-install -Su';

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `# 📄 FICHE TECHNIQUE DU SYSTÈME — ${recipe.branding.osName.toUpperCase()}
> **Édition** : ${recipe.branding.editionName} (v${recipe.branding.version})  
> **Date de génération** : ${dateStr}  
> **Générateur** : OSForge Studio (Build Engine v1.0)

---

## 1. Spécifications Générales du Système

| Paramètre | Valeur Configurée |
| :--- | :--- |
| **Nom de l'OS** | **${recipe.branding.osName}** (${recipe.branding.editionName}) |
| **Distribution Socle** | ${distroInfo?.name || recipe.distro} (${recipe.distroVersion || distroInfo?.version}) |
| **Gestionnaire de Paquets** | \`${distroInfo?.packageManager.toUpperCase() || 'APT'}\` |
| **Architecture Matérielle** | \`${recipe.arch}\` |
| **Format d'Image Cible** | \`${recipe.outputFormat}\` |
| **Noyau Linux (Kernel)** | ${kernelInfo?.name || recipe.kernel} (\`${kernelInfo?.version || 'Stable'}\`) |
| **Catégorie de Noyau** | ${kernelInfo?.badge || 'Standard'} |
| **Environnement Graphique** | ${desktopInfo?.name || recipe.desktop} |
| **Gestionnaire de Connexion** | \`${recipe.displayManager}\` |
| **Protocole d'Affichage** | ${desktopInfo?.wayland ? 'Wayland (Natif)' : 'X11 (Classique)'} |
| **Système de Fichiers** | \`${recipe.filesystem || 'ext4'}\`${recipe.security.luksEncryption ? ' + Chiffrement LUKS2 (Argon2id)' : ''} |
| **Nom d'Hôte (Hostname)** | \`${recipe.hostname}\` |
| **Fuseau Horaire / Locale** | \`${recipe.timezone}\` / \`${recipe.locale}\` |
| **Disposition Clavier** | \`${recipe.keyboardLayout}\` |

---

## 2. Comptes Utilisateurs & Sécurité d'Accès

- **Utilisateur Principal** : \`${recipe.user.username}\`
- **Nom Complet** : ${recipe.user.fullName}
- **Droits Administrateur (sudo)** : ${recipe.user.sudo ? '✅ Oui (accès root via sudo)' : '❌ Non'}
- **Connexion Automatique (Autologin)** : ${recipe.user.autologin ? '✅ Activé' : '❌ Désactivé'}
- **Shell par Défaut** : \`${recipe.user.shell || '/bin/bash'}\`
- **Serveur SSH** : ${recipe.enableSSH ? '✅ Actif au démarrage (port 22)' : '❌ Désactivé'}
- **Connexion SSH Root** : ${recipe.security.disableRootSSH ? '🔒 Bloquée (disableRootSSH=true)' : '⚠️ Autorisée'}
${recipe.user.sshPublicKey ? `- **Clé Publique SSH** : Configurée dans \`~/.ssh/authorized_keys\` (mode 0600)` : ''}

---

## 3. Topologie Réseau & Cyber-Défense

| Composant | État & Configuration |
| :--- | :--- |
| **Pare-feu Actif** | \`${recipe.security.firewall.toUpperCase()}\` |
| **Ports Ouverts Autorisés** | \`${allowedPortsStr}\` |
| **Cyber-Défense CrowdSec** | ${recipe.security.enableCrowdSec ? '🛡️ **Actif** (Protection collaborative temps réel & bouncer pare-feu)' : 'Désactivé'} |
| **Protection Anti-Bruteforce** | ${recipe.security.fail2ban ? '✅ Fail2Ban activé' : 'Non activé'} |
| **Durcissement CIS Benchmark** | Niveau ${recipe.security.cisBenchmarkLevel} (Sysctl 99-cis, limites core dumps, protocoles vulnérables) |
| **Mises à Jour de Sécurité** | ${recipe.security.autoSecurityUpdates ? '✅ Automatiques (Unattended Upgrades)' : 'Manuelles'} |
${recipe.network?.enableWireguard ? `| **VPN WireGuard Headless** | ✅ Profil \`/etc/wireguard/wg0.conf\` configuré |\n` : ''}${recipe.network?.enableTailscale ? `| **VPN Mesh Tailscale** | ✅ Service \`tailscaled\` activé au premier boot |\n` : ''}

---

## 4. Modules Spécialisés & Optimisations Système

${recipe.enableLocalAiStack ? `### 🧠 Appliance IA Locale (Ollama + Open WebUI)
- **Moteur LLM** : Ollama (\`ollama.service\` sur le port \`11434\`)
- **Modèle Pré-chargé** : \`${recipe.localAiModel || 'deepseek-r1:1.5b'}\` (téléchargement automatique au premier boot connecté)
- **Interface Web de Chat** : ${recipe.enableOpenWebUi ? '✅ Open WebUI actif sur le port `8080` (accessible via navigateur)' : 'Mode CLI uniquement'}
` : ''}
${recipe.enableBtrfsSnapshots ? `### ⏪ Système de Snapshots Btrfs & Restauration GRUB
- **Gestionnaire de Snapshots** : Snapper (\`snapper-timeline.timer\` et \`snapper-cleanup.timer\`)
- **Intégration Menu GRUB** : Démon \`grub-btrfsd\` générant les sous-menus de restauration instantanée au démarrage.
- **Hooks de Mise à Jour** : Déclenchement automatique de snapshots avant et après chaque transaction logicielle (\`apt\`, \`pacman\` ou \`dnf\`).
` : ''}
${recipe.enableProAudio ? `### 🎛️ Audio Professionnel & MAO Faible Latence
- **Serveur Sonore** : PipeWire Pro Audio (\`/etc/pipewire/pipewire.conf.d/99-proaudio.conf\`)
- **Quantum de Latence** : 64 / 128 échantillons (latence ultra-basse < 4 ms à 48 kHz)
- **Limites Temps Réel PAM** : \`rtprio 95\`, \`memlock unlimited\` dans \`/etc/security/limits.d/99-realtime-audio.conf\`
- **Paramètre Noyau** : Argument \`threadirqs\` dans GRUB pour prioriser les interruptions matérielles audio.
` : ''}
${recipe.enableGamingOptimizations ? `### 🎮 Optimisations Gaming & E-Sport
- **Sysctl Anti-Lag** : \`vm.max_map_count=2147483642\`, \`net.ipv4.tcp_congestion_control=bbr\`
- **Utilitaires Pré-installés** : \`gamemode\`, \`mangohud\`, pilotes graphiques Vulkan natifs.
` : ''}
${recipe.enablePowerSaving ? `### 🔋 Économie d'Énergie & PC Portables
- **Démon d'Optimisation** : \`tlp\` et \`powertop\` configurés pour une autonomie maximale sur batterie.
` : ''}

---

## 5. Catalogue des Logiciels Inclus

${selectedPkgObjects.length > 0 ? selectedPkgObjects.map(p => `- **${p?.name}** (\`${p?.id}\`) : ${p?.description}`).join('\n') : '*Aucun paquet additionnel sélectionné.*'}
${recipe.customPackages && recipe.customPackages.length > 0 ? `\n**Paquets personnalisés additionnels :** \`${recipe.customPackages.join(', ')}\`` : ''}

---

## 6. Raccourcis Clavier Principaux

${recipe.desktop === 'hyprland' ? `| Raccourci | Action Hyprland |
| :--- | :--- |
| \`Super + Q\` | Ouvrir le terminal Kitty / Alacritty |
| \`Super + C\` | Fermer la fenêtre active |
| \`Super + E\` | Gestionnaire de fichiers |
| \`Super + Space\` | Lanceur d'applications Wofi / Rofi |
| \`Super + F\` | Basculer en mode Plein Écran |
| \`Super + 1-9\` | Changer d'espace de travail |
` : recipe.desktop === 'sway' || recipe.desktop === 'i3wm' ? `| Raccourci | Action Tiling WM |
| :--- | :--- |
| \`Super + Enter\` | Ouvrir le terminal |
| \`Super + Shift + Q\` | Fermer la fenêtre active |
| \`Super + D\` | Lanceur d'applications dmenu / wofi |
| \`Super + 1-9\` | Basculer d'espace de travail |
` : `| Raccourci | Action Bureau |
| :--- | :--- |
| \`Super\` | Ouvrir le menu des applications |
| \`Ctrl + Alt + T\` | Ouvrir le terminal |
| \`Super + E\` | Ouvrir le gestionnaire de fichiers |
| \`Super + L\` | Verrouiller la session |
`}

---

## 7. Commandes Utiles & Aliases Intégrés

- **Mise à jour système** : \`${updateCmd}\` (ou via l'alias \`sysupdate\`)
- \`sysupdate\` : Met à jour tous les paquets du système selon la distribution.
- \`fastfetch\` : Affiche la fiche technique graphique et le logo de votre OS.
- \`ports\` : Liste tous les ports TCP/UDP en écoute avec les processus associés.
- \`myip\` : Affiche l'adresse IP locale et l'adresse IP publique.
- \`memtop\` : Affiche les 10 processus les plus gourmands en mémoire RAM.
- \`cputop\` : Affiche les 10 processus les plus gourmands en processeur.

---

## 8. Procédure d'Installation & Flashage

1. **Sur Windows (Clé USB)** :
   - Utilisez **Rufus** (sélectionnez le mode *DD* ou *ISO*) ou **Balena Etcher**.
   - Vous pouvez également déposer l'image ISO directement sur une clé USB équipée de **Ventoy**.
2. **Sur Linux / macOS (Ligne de commande)** :
   \`\`\`bash
   # Remplacez /dev/sdX par le périphérique de votre clé USB
   sudo dd if=${recipe.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.iso of=/dev/sdX bs=4M status=progress conv=fdatasync
   \`\`\`
3. **Démarrage** :
   - Insérez la clé, redémarrez votre PC et accédez au menu de démarrage BIOS/UEFI (\`F12\`, \`F11\` ou \`F8\`).
   - Sélectionnez votre clé USB en mode **UEFI**.
`;
}
