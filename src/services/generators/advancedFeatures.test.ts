import { describe, it, expect } from 'vitest';
import { generateBuildScript } from './index';
import { resolvePackageList } from './packages';
import { generateShareableUrl, extractRecipeFromUrl } from '../recipeSharing';
import { calculateResourceEstimate } from '../resourceEstimator';
import { OSRecipe } from '../../types/os';

const baseMockRecipe: OSRecipe = {
  id: 'test-recipe',
  name: 'ForgeOS Test',
  description: 'Test recipe',
  distro: 'debian',
  distroVersion: '13 (Trixie)',
  arch: 'x86_64',
  outputFormat: 'iso_hybrid',
  desktop: 'xfce',
  displayManager: 'lightdm',
  kernel: 'generic',
  selectedPackages: [],
  customPackages: [],
  branding: {
    osName: 'ForgeOS',
    editionName: 'Test Edition',
    version: '1.0',
    accentColor: '#38bdf8',
    wallpaperPreset: 'minimal',
    bootSplashTheme: 'spinner',
  },
  user: {
    username: 'testuser',
    fullName: 'Test User',
    password: 'secretpassword',
    sudo: true,
    autologin: true,
    shell: '/bin/bash',
  },
  hostname: 'test-host',
  timezone: 'Europe/Paris',
  locale: 'fr_FR',
  keyboardLayout: 'fr',
  enableSSH: true,
  security: {
    cisBenchmarkLevel: 0,
    firewall: 'none',
    appArmorOrSELinux: false,
    fail2ban: false,
    luksEncryption: false,
    disableRootSSH: false,
    autoSecurityUpdates: false,
  },
  customServices: [],
  firstBootScript: '',
};

describe('Nouvelles fonctionnalités système & Partage Web (Zéro Cosmétique)', () => {
  describe('1. Partage de Recette par URL (recipeSharing)', () => {
    it('encode une recette en URL et la décode fidèlement sans altération', () => {
      const url = generateShareableUrl(baseMockRecipe, 'https://lordmadtrix.github.io/osforge-studio/');
      expect(url).toContain('#recipe=');

      const decoded = extractRecipeFromUrl(url);
      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe('ForgeOS Test');
      expect(decoded?.distro).toBe('debian');
      expect(decoded?.hostname).toBe('test-host');
      expect(decoded?.user?.username).toBe('testuser');
    });

    it('gère les caractères accentués UTF-8 dans le partage d’URL', () => {
      const recipeWithUtf8: OSRecipe = {
        ...baseMockRecipe,
        description: 'Édition spéciale française avec caractères accentués & symboles : àéèîôû €',
      };
      const url = generateShareableUrl(recipeWithUtf8);
      const decoded = extractRecipeFromUrl(url);
      expect(decoded?.description).toBe('Édition spéciale française avec caractères accentués & symboles : àéèîôû €');
    });
  });

  describe('2. Calculateur d’Empreinte RAM & Disque (resourceEstimator)', () => {
    it('calcule une empreinte cohérente pour un système de base', () => {
      const estimate = calculateResourceEstimate(baseMockRecipe);
      expect(estimate.estimatedIsoMB).toBeGreaterThan(500);
      expect(estimate.estimatedInstalledDiskGB).toBeGreaterThan(1.5);
      expect(estimate.minRamMB).toBeGreaterThan(500);
      expect(estimate.recommendedRamMB).toBeGreaterThanOrEqual(2048);
    });

    it('augmente les prérequis RAM et taille lors de l’activation de la stack IA Locale', () => {
      const standardEstimate = calculateResourceEstimate(baseMockRecipe);
      const aiEstimate = calculateResourceEstimate({
        ...baseMockRecipe,
        enableLocalAiStack: true,
        localAiModel: 'llama3.2:1b',
      });

      expect(aiEstimate.estimatedIsoMB).toBeGreaterThan(standardEstimate.estimatedIsoMB);
      expect(aiEstimate.estimatedInstalledDiskGB).toBeGreaterThan(standardEstimate.estimatedInstalledDiskGB);
      expect(aiEstimate.recommendedRamMB).toBeGreaterThanOrEqual(8192);
    });
  });

  describe('3. Stack IA Locale & Ollama (debian.ts)', () => {
    it('génère le service systemd ollama et pré-télécharge le modèle choisi', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        enableLocalAiStack: true,
        localAiModel: 'qwen2.5:0.5b',
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('ollama-setup.service');
      expect(script).toContain('ollama.com/install.sh');
      expect(script).toContain('ollama pull \'qwen2.5:0.5b\'');
    });

    it('génère le conteneur Open-WebUI si activé', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        enableLocalAiStack: true,
        enableOpenWebUi: true,
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('open-webui.service');
      expect(script).toContain('ghcr.io/open-webui/open-webui:main');
      expect(script).toContain('3000:8080');
    });
  });

  describe('4. Profil Homelab Docker Stacks (debian.ts)', () => {
    it('génère docker-compose.yml et le service systemd homelab-compose', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        enableHomelabStack: true,
        homelabServices: ['adguard', 'jellyfin', 'nginx_proxy_manager'],
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('/opt/homelab/docker-compose.yml');
      expect(script).toContain('adguard/adguardhome:latest');
      expect(script).toContain('jellyfin/jellyfin:latest');
      expect(script).toContain('jc21/nginx-proxy-manager:latest');
      expect(script).toContain('homelab-compose.service');
      expect(script).toContain('docker compose up -d');
    });
  });

  describe('5. Mode Kiosk & Affichage Dynamique', () => {
    it('génère le script cage / browser kiosk avec l’URL cible et autologin', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        enableKioskMode: true,
        kioskUrl: 'https://mon-dashboard.lan/stats',
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('cage --');
      expect(script).toContain('https://mon-dashboard.lan/stats');
      expect(script).toContain('--autologin testuser');
    });
  });

  describe('6. Injection Automatique de Dotfiles Git', () => {
    it('clone le dépôt dotfiles et exécute install.sh avec les droits utilisateur', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        dotfilesGitUrl: 'https://github.com/testuser/dotfiles.git',
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('git clone --depth 1 \'https://github.com/testuser/dotfiles.git\'');
      expect(script).toContain('/home/\'testuser\'/.dotfiles/install.sh');
      expect(script).toContain('su - testuser');
    });
  });

  describe('7. Système de Fichiers Btrfs & Subvolumes (@, @home, @snapshots, @var_log)', () => {
    it('parted, formate et monte les sous-volumes Btrfs avec compression zstd:3', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        distro: 'arch',
        outputFormat: 'qcow2',
        filesystem: 'btrfs',
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('parted -s "${RAW_IMG}" mkpart primary btrfs 1MiB 100%');
      expect(script).toContain('mkfs.btrfs -f -L rootfs');
      expect(script).toContain('btrfs subvolume create "${MNT_DIR}/@"');
      expect(script).toContain('btrfs subvolume create "${MNT_DIR}/@home"');
      expect(script).toContain('btrfs subvolume create "${MNT_DIR}/@snapshots"');
      expect(script).toContain('btrfs subvolume create "${MNT_DIR}/@var_log"');
      expect(script).toContain('mount -o subvol=@,compress=zstd:3');
      expect(script).toContain('subvol=@,compress=zstd:3,defaults');
      expect(script).toContain('rootflags=subvol=@');
    });
  });

  describe('8. Mode OS Immuable (RootFS Read-Only + OverlayFS en RAM)', () => {
    it('génère le hook initramfs 01_overlay_root et la bannière de sécurité', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        enableImmutableRootfs: true,
        enableSelectivePersistence: true,
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('/etc/initramfs-tools/scripts/init-bottom/01_overlay_root');
      expect(script).toContain('mount -t tmpfs -o "size=75%,mode=0755" tmpfs /run/overlay');
      expect(script).toContain('mount -t overlay overlay -o lowerdir=${rootmnt},upperdir=/run/overlay/upper,workdir=/run/overlay/work ${rootmnt}');
      expect(script).toContain('/etc/profile.d/01-immutable-banner.sh');
      expect(script).toContain('mkdir -p /home/testuser/Persistent');
    });
  });

  describe('9. Dépôts Officiels Tiers Modernes (APT Keyrings /etc/apt/keyrings/)', () => {
    it('configure les clés GPG et les sources deb822 pour VSCodium, Docker CE et WineHQ', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        thirdPartyRepos: ['vscodium', 'docker_ce', 'winehq'],
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('/etc/apt/keyrings/vscodium-archive-keyring.gpg');
      expect(script).toContain('/etc/apt/sources.list.d/vscodium.sources');
      expect(script).toContain('/etc/apt/keyrings/docker.gpg');
      expect(script).toContain('/etc/apt/sources.list.d/docker.sources');
      expect(script).toContain('dpkg --add-architecture i386');
      expect(script).toContain('/etc/apt/keyrings/winehq-archive.key');
      expect(script).toContain('/etc/apt/sources.list.d/winehq.sources');
    });
  });

  describe('10. Profil Passerelle Réseau & Sécurité Domestique OOB (AdGuard Home + VPN + Cockpit)', () => {
    it('installe AdGuard Home, active WireGuard et configure le routage IP', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        enableNetworkSecurityGateway: true,
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('/etc/sysctl.d/99-gateway.conf');
      expect(script).toContain('net.ipv4.ip_forward = 1');
      expect(script).toContain('AdGuardHome_linux_amd64.tar.gz');
      expect(script).toContain('/opt/AdGuardHome/AdGuardHome -s install');
      expect(script).toContain('systemctl enable cockpit.socket');
      expect(script).toContain('systemctl enable fail2ban');
    });
  });

  describe('11. Snapshots Btrfs Automatiques & Restauration Système (Snapper + GRUB)', () => {
    it('génère la configuration Snapper et active les timers systemd', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        enableBtrfsSnapshots: true,
        filesystem: 'btrfs',
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('/etc/snapper/configs/root');
      expect(script).toContain('TIMELINE_CREATE="yes"');
      expect(script).toContain('systemctl enable snapper-timeline.timer');
      expect(script).toContain('systemctl enable snapper-cleanup.timer');
    });
  });

  describe('12. Audio Pro & MAO Faible Latence (PipeWire RT, PAM limits, sysctl)', () => {
    it('configure PipeWire Quantum 64/128, les priorités PAM temps réel et le groupe audio', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        enableProAudio: true,
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('/etc/security/limits.d/99-realtime-audio.conf');
      expect(script).toContain('@audio   -  rtprio     95');
      expect(script).toContain('@audio   -  memlock    unlimited');
      expect(script).toContain('/etc/sysctl.d/99-pro-audio.conf');
      expect(script).toContain('fs.inotify.max_user_watches = 524288');
      expect(script).toContain('/etc/pipewire/pipewire.conf.d/10-pro-audio.conf');
      expect(script).toContain('default.clock.quantum       = 128');
      expect(script).toContain('default.clock.min-quantum   = 64');
    });
  });

  describe('13. Cyber-Défense Collaborative CrowdSec & Bouncer Pare-feu', () => {
    it('déploie le dépôt et service CrowdSec sur Debian', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        security: {
          ...baseMockRecipe.security,
          enableCrowdSec: true,
        },
      };
      const script = generateBuildScript(recipe);
      expect(script).toContain('packagecloud.io/install/repositories/crowdsec/crowdsec/script.deb.sh');
      expect(script).toContain('crowdsec');
      expect(script).toContain('systemctl enable crowdsec');
      expect(script).toContain('cscli collections install crowdsecurity/linux');
      expect(script).toContain('cscli collections install crowdsecurity/sshd');
    });
  });

  describe('14. Paquets système réels pour Audio Pro et Snapshots Btrfs (resolvePackageList)', () => {
    it('injecte les paquets audio pro et btrfs appropriés', () => {
      const recipe: OSRecipe = {
        ...baseMockRecipe,
        enableProAudio: true,
        enableBtrfsSnapshots: true,
      };
      const pkgs = resolvePackageList(recipe);
      expect(pkgs).toContain('pipewire-jack');
      expect(pkgs).toContain('wireplumber');
      expect(pkgs).toContain('pavucontrol');
      expect(pkgs).toContain('qjackctl');
      expect(pkgs).toContain('btrfs-progs');
      expect(pkgs).toContain('snapper');
    });
  });
});


