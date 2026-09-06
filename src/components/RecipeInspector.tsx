import React, { useState, useMemo } from 'react';
import { OSRecipe } from '../types/os';
import {
  generateBuildScript,
  generateDockerfile,
  generateContainerfile,
  generateAnsiblePlaybook,
  generateTerraformTf,
  generateGitHubWorkflow,
  generateCloudInitYaml,
  generateRecipeJson,
  generateWslInstallerBat,
  generateWslConf,
  generateLiveWindowsBat,
  generateUniversalLauncherBat,
  generateUniversalLauncherSh,
  generateIpxeScript,
  generatePxeServerScript,
  generateVentoyJson,
  generateUsbFlashScript,
  generateOfflineCacheBundleScript,
  generatePartitionDiskScript,
  generateTechnicalManualMarkdown,
  generateQemuTestBat,
  generateQemuTestSh,
  generateMangoHudConfig
} from '../services/scriptGenerators';
import { copyShareableLink } from '../services/recipeSharing';
import { ContextTip } from './ContextTip';
import { Copy, Check, FileCode, Download, Share2 } from 'lucide-react';

interface RecipeInspectorProps {
  recipe: OSRecipe;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

interface FileDef {
  title: string;
  lang: string;
  descFr: string;
  descEn: string;
  generate: (recipe: OSRecipe) => string;
}

const FILE_DEFINITIONS: Record<string, FileDef> = {
  'launch.bat': {
    title: 'launch.bat (Lanceur Universel Interactif Windows)',
    lang: 'bat',
    descFr: 'Double-cliquez sous Windows pour accéder au menu 1-clic (WSL2, QEMU Live, Compilation locale).',
    descEn: '1-Click interactive launcher for Windows.',
    generate: generateUniversalLauncherBat,
  },
  'launch.sh': {
    title: 'launch.sh (Lanceur Universel Linux / macOS)',
    lang: 'bash',
    descFr: 'Menu interactif en console pour compiler, tester sous QEMU ou pousser sur GitHub.',
    descEn: 'Interactive terminal launcher for Linux/macOS.',
    generate: generateUniversalLauncherSh,
  },
  'install-wsl.bat': {
    title: 'install-wsl.bat (Installation 1-Click Windows WSL2)',
    lang: 'bat',
    descFr: 'Double-cliquez sous Windows pour importer et lancer instantanément votre OS dans WSL2.',
    descEn: '1-Click Windows installer for WSL2.',
    generate: generateWslInstallerBat,
  },
  'tester-en-vm.bat': {
    title: 'tester-en-vm.bat (Banc d’Essai QEMU Windows WHPX)',
    lang: 'bat',
    descFr: 'Lance instantanément une VM locale sous Windows avec accélération matérielle WHPX et détection automatique.',
    descEn: 'Instant local VM testing on Windows with WHPX hardware acceleration.',
    generate: generateQemuTestBat,
  },
  'tester-en-vm.sh': {
    title: 'tester-en-vm.sh (Banc d’Essai QEMU Linux KVM)',
    lang: 'bash',
    descFr: 'Lance un banc d’essai virtuel QEMU sous Linux avec accélération KVM et redirection SSH.',
    descEn: 'Instant local VM test on Linux with KVM acceleration.',
    generate: generateQemuTestSh,
  },
  'run-live-windows.bat': {
    title: 'run-live-windows.bat (Live Linux sous Windows)',
    lang: 'bat',
    descFr: 'Lance votre système d’exploitation en Live sur Windows sans aucune installation.',
    descEn: 'Run Linux live on Windows without install.',
    generate: generateLiveWindowsBat,
  },
  'MangoHud.conf': {
    title: 'MangoHud.conf (Overlay FPS & Télémétrie Gaming)',
    lang: 'ini',
    descFr: 'Configuration de l’overlay télémétrie MangoHUD (FPS, frametime, températures CPU/GPU, VRAM).',
    descEn: 'MangoHUD telemetry overlay configuration.',
    generate: (r) => generateMangoHudConfig(r.gamingConfig?.mangoHudPreset || 'compact_topbar'),
  },
  'wsl.conf': {
    title: 'wsl.conf (Configuration WSL2 & WSLg)',
    lang: 'ini',
    descFr: 'Active Systemd, l’intégration graphique WSLg et l’utilisateur par défaut sous Windows.',
    descEn: 'WSL2 systemd and graphics configuration.',
    generate: generateWslConf,
  },
  'build.sh': {
    title: 'build.sh (Script Bash Local)',
    lang: 'bash',
    descFr: 'Script bash autonome exécutable sur n’importe quelle machine Linux (Debian, Ubuntu, Arch, WSL2).',
    descEn: 'Autonomous bash build script.',
    generate: generateBuildScript,
  },
  'partition-disk.sh': {
    title: 'partition-disk.sh (Formatage Disque & Montage Fstab)',
    lang: 'bash',
    descFr: 'Script bash de partitionnement GPT, EFI, LUKS2, Btrfs/ext4 et fstab automatique pour disque physique ou VM.',
    descEn: 'Automated GPT, EFI, LUKS2, Btrfs/ext4 disk partitioning script.',
    generate: generatePartitionDiskScript,
  },
  'fiche-technique.md': {
    title: 'fiche-technique.md (Fiche Technique & Dossier d’Architecture)',
    lang: 'markdown',
    descFr: 'Dossier d’architecture complet, commandes d’administration, sécurité et inventaire logiciel.',
    descEn: 'Complete technical architecture manual, administration commands and package inventory.',
    generate: generateTechnicalManualMarkdown,
  },
  'Containerfile': {
    title: 'Containerfile / Dockerfile (Image OCI Autonome)',
    lang: 'dockerfile',
    descFr: 'Image de conteneur OCI prête pour Podman / Docker reprenant votre configuration et vos paquets.',
    descEn: 'Standalone OCI container image for Podman / Docker.',
    generate: generateContainerfile,
  },
  'playbook.yml': {
    title: 'playbook.yml (Manifeste Ansible Playbook)',
    lang: 'yaml',
    descFr: 'Playbook Ansible déclaratif pour provisionner et automatiser la configuration de machines.',
    descEn: 'Declarative Ansible playbook for automated provisioning.',
    generate: generateAnsiblePlaybook,
  },
  'main.tf': {
    title: 'main.tf (Infrastructure as Code Terraform / OpenTofu)',
    lang: 'hcl',
    descFr: 'Manifeste Terraform / OpenTofu pour instancier la VM et injecter cloud-init.',
    descEn: 'Terraform / OpenTofu manifest for VM provisioning.',
    generate: generateTerraformTf,
  },
  'boot.ipxe': {
    title: 'boot.ipxe (Démarrage Réseau Netboot / iPXE)',
    lang: 'bash',
    descFr: 'Script iPXE pour booter l’OS sur le réseau local (TFTP/HTTP) sans clé USB.',
    descEn: 'iPXE script for network booting without USB.',
    generate: generateIpxeScript,
  },
  'setup-pxe.sh': {
    title: 'setup-pxe-server.sh (Serveur PXE Clé-en-main)',
    lang: 'bash',
    descFr: 'Script de déploiement automatique d’un serveur PXE (dnsmasq, nginx, tftp) sur le réseau local.',
    descEn: 'PXE server deployment script.',
    generate: generatePxeServerScript,
  },
  'ventoy.json': {
    title: 'ventoy.json (Clé Multi-Boot Ventoy)',
    lang: 'json',
    descFr: 'Configuration Ventoy pour l’amorçage automatique et l’injection de scripts sur clé USB.',
    descEn: 'Ventoy auto-install and multi-boot configuration.',
    generate: generateVentoyJson,
  },
  'flash-usb.sh': {
    title: 'flash-usb.sh (Gravure USB Sécurisée + Persistance Linux/macOS)',
    lang: 'bash',
    descFr: 'Grave votre ISO sur clé USB et configure automatiquement une partition de persistance pour sauvegarder vos fichiers en session Live.',
    descEn: 'Flashes ISO to USB and configures persistence partition.',
    generate: (r) => generateUsbFlashScript(r, 'bash'),
  },
  'flash-usb.bat': {
    title: 'flash-usb.bat (Assistant de Gravure USB Windows)',
    lang: 'bat',
    descFr: 'Assistant de détection des clés USB et gravure sécurisée sous Windows.',
    descEn: 'Windows USB detection and flashing assistant.',
    generate: (r) => generateUsbFlashScript(r, 'powershell'),
  },
  'bundle-cache.sh': {
    title: 'bundle-cache.sh (Mise en Cache Hors-Ligne & Air-Gapped)',
    lang: 'bash',
    descFr: 'Télécharge et indexe l’ensemble des paquets nécessaires pour compiler votre OS sans accès Internet en salle blanche.',
    descEn: 'Downloads and indexes all packages for offline air-gapped builds.',
    generate: generateOfflineCacheBundleScript,
  },
  'github-actions.yml': {
    title: '.github/workflows/build-iso.yml',
    lang: 'yaml',
    descFr: 'Workflow GitHub Actions pour construire gratuitement votre ISO sur le cloud GitHub et la publier en Release !',
    descEn: 'Free GitHub Actions automated ISO build workflow.',
    generate: generateGitHubWorkflow,
  },
  'Dockerfile': {
    title: 'Dockerfile (Build Conteneurisé de l’ISO)',
    lang: 'dockerfile',
    descFr: 'Compile l’ISO dans un conteneur Docker isolé sans installer d’outils sur votre machine hôte.',
    descEn: 'Isolated Docker build environment.',
    generate: generateDockerfile,
  },
  'cloud-init.yaml': {
    title: 'cloud-init.yaml (Cloud Provisioning)',
    lang: 'yaml',
    descFr: 'Fichier user-data cloud-init standard pour déployer sur AWS, GCP, OpenStack, Proxmox ou Hetzner.',
    descEn: 'Standard cloud-init user-data file.',
    generate: generateCloudInitYaml,
  },
  'recipe.json': {
    title: 'recipe.json (Manifeste OpenFactory)',
    lang: 'json',
    descFr: 'Recette JSON complète du système d’exploitation, réimportable et versionnable dans Git.',
    descEn: 'OpenFactory standard JSON recipe format.',
    generate: generateRecipeJson,
  },
};

export const RecipeInspector: React.FC<RecipeInspectorProps> = ({ recipe, lang, onOpenTips }) => {
  const [activeFile, setActiveFile] = useState<string>('launch.bat');
  const [copied, setCopied] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  const fileKeys = useMemo(() => Object.keys(FILE_DEFINITIONS), []);
  const currentDef = FILE_DEFINITIONS[activeFile] || FILE_DEFINITIONS['launch.bat'];
  const activeContent = useMemo(() => {
    return currentDef.generate(recipe);
  }, [currentDef, recipe]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="build" lang={lang} onOpenAllTips={onOpenTips} />

      {/* Top File Switcher Bar */}
      <div className="glass-panel" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {fileKeys.map(key => (
            <button
              key={key}
              onClick={() => setActiveFile(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: activeFile === key ? '1px solid var(--cyan)' : '1px solid var(--border-subtle)',
                background: activeFile === key ? 'rgba(249, 115, 22, 0.12)' : 'rgba(26, 22, 19, 0.6)',
                color: activeFile === key ? 'var(--cyan)' : 'var(--text-muted)',
                fontWeight: activeFile === key ? 600 : 400,
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <FileCode size={13} />
              <span>{key}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={async () => {
              await copyShareableLink(recipe);
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 2000);
            }}
            className="btn btn-secondary"
            style={{
              padding: '5px 10px',
              fontSize: '0.78rem',
              color: shareCopied ? '#84a05c' : 'var(--cyan)',
              borderColor: shareCopied ? 'rgba(132, 160, 92, 0.4)' : undefined,
            }}
            title={lang === 'fr' ? 'Copier le lien direct de partage de cette recette' : 'Copy shareable recipe link'}
          >
            {shareCopied ? <Check size={13} color="#84a05c" /> : <Share2 size={13} />}
            <span>{shareCopied ? (lang === 'fr' ? 'Lien Copié !' : 'Link Copied!') : (lang === 'fr' ? 'Partager URL' : 'Share URL')}</span>
          </button>
          <button onClick={copyToClipboard} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
            {copied ? <Check size={13} color="#a3bc7d" /> : <Copy size={13} />}
            <span>{copied ? (lang === 'fr' ? 'Copié !' : 'Copied!') : (lang === 'fr' ? 'Copier' : 'Copy')}</span>
          </button>
          <button onClick={() => import('../services/buildExport').then(m => m.downloadBuildPackage(recipe))} className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
            <Download size={13} />
            <span>{lang === 'fr' ? 'Télécharger Tout (ZIP)' : 'Download All (ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Box */}
      <div className="glass-panel" style={{ padding: '16px', background: '#080d1a', border: '1px solid var(--border-subtle)' }}>
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {currentDef.title}
            </h4>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {lang === 'fr' ? currentDef.descFr : currentDef.descEn}
            </p>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
            {currentDef.lang.toUpperCase()}
          </span>
        </div>

        <pre style={{
          background: '#040711',
          padding: '14px',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
          overflowX: 'auto',
          fontSize: '0.8rem',
          lineHeight: '1.5',
          color: '#fb923c',
          maxHeight: '500px',
        }}>
          <code>{activeContent}</code>
        </pre>
      </div>
    </div>
  );
};
