import { OSRecipe } from '../types/os';
import {
  generateBuildScript,
  generateDockerfile,
  generateGitHubWorkflow,
  generateCloudInitYaml,
  generateRecipeJson,
  generateWslInstallerBat,
  generateWslConf,
  generateLiveWindowsBat,
  generateUniversalLauncherBat,
  generateUniversalLauncherSh,
  generateAutoBuildBat,
  generateAutoBuildSh,
  generateIpxeScript,
  generatePxeServerScript,
  generateVentoyJson,
  generateQemuTestBat,
  generateQemuTestSh
} from './scriptGenerators';
import JSZip from 'jszip';
import { triggerFileDownload } from '../utils/downloadHelper';

export async function createDownloadableZip(recipe: OSRecipe): Promise<Blob> {
  const zip = new JSZip();

  const launchBat = generateUniversalLauncherBat(recipe);
  const launchSh = generateUniversalLauncherSh(recipe);
  const buildSh = generateBuildScript(recipe);
  const dockerfile = generateDockerfile(recipe);
  const ghWorkflow = generateGitHubWorkflow(recipe);
  const cloudInit = generateCloudInitYaml(recipe);
  const recipeJson = generateRecipeJson(recipe);
  const wslInstallBat = generateWslInstallerBat(recipe);
  const wslConf = generateWslConf(recipe);
  const liveWindowsBat = generateLiveWindowsBat(recipe);
  const autoBuildBat = generateAutoBuildBat(recipe);
  const autoBuildSh = generateAutoBuildSh(recipe);
  const testVmBat = generateQemuTestBat(recipe);
  const testVmSh = generateQemuTestSh(recipe);
  const ipxeScript = generateIpxeScript(recipe);
  const pxeServerScript = generatePxeServerScript(recipe);
  const ventoyJson = generateVentoyJson(recipe);

  // Readme instructions
  const repoSlug = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-os`;
  const readme = `# 🚀 ${recipe.branding.osName} (${recipe.branding.editionName}) — Pack de Compilation ISO

Généré par **OSForge Studio** (compatible OpenFactory).

[![Build & Release ISO](https://github.com/VOTRE-PSEUDO-GITHUB/${repoSlug}/actions/workflows/build-iso.yml/badge.svg)](https://github.com/VOTRE-PSEUDO-GITHUB/${repoSlug}/actions/workflows/build-iso.yml)

> ⚠️ Remplacez \`VOTRE-PSEUDO-GITHUB\` ci-dessus par votre pseudo une fois le dépôt \`${repoSlug}\` créé sur GitHub (voir section GitHub Actions plus bas), pour que ce badge affiche le statut réel de votre build.

---

## ⚡ LANCEMENT RAPIDE EN 1 DOUBLE-CLIC
- **Tester immédiatement en VM (Windows)** : Double-cliquez sur \`tester-en-vm.bat\` (accélération matérielle WHPX automatique, 4/8 Go RAM).
- **Tester immédiatement en VM (Linux / macOS)** : Exécutez \`./tester-en-vm.sh\` (accélération KVM).
- **Sous Windows** : Double-cliquez sur \`launch.bat\` pour ouvrir le menu interactif (WSL2, QEMU Live, Compilation locale), ou directement \`auto-build.bat\` pour une compilation 100% automatique sans interaction.
- **Sous Linux / macOS** : Exécutez \`./launch.sh\`, ou directement \`./auto-build.sh\` pour une compilation 100% automatique.
- **Sur GitHub** : poussez ce dossier dans un dépôt — le workflow \`.github/workflows/build-iso.yml\` compile et **publie automatiquement une Release GitHub avec l'ISO** à chaque push sur \`main\`, sans aucune action manuelle.
- **Sur Clé Multi-Boot Ventoy** : Copiez \`ventoy.json\` dans le dossier \`ventoy/\` de votre clé pour l'amorçage automatique.
- **Sur le Réseau (Netboot / PXE)** : Exécutez \`./setup-pxe-server.sh\` pour installer un serveur PXE clé-en-main.

---

## 📁 FICHIERS INCLUS DANS CE PACK
- \`tester-en-vm.bat\` / \`tester-en-vm.sh\` : **Banc d'essai QEMU 1-clic** avec détection WHPX/KVM.
- \`launch.bat\` / \`launch.sh\` : **Lanceurs universels interactifs** (Windows / Linux & macOS).
- \`auto-build.bat\` / \`auto-build.sh\` : **Pipeline 100% automatique** — installe les dépendances, compile l'ISO et lance un test QEMU, sans aucune interaction.
- \`install-wsl.bat\` : **Installation directe dans Windows WSL2** (Importe et lance votre OS).
- \`wsl.conf\` : Fichier de configuration WSL2 avec support Systemd et intégration graphique WSLg.
- \`run-live-windows.bat\` : **Lanceur Live Linux sous Windows** (Démarrage direct sans installation).
- \`build.sh\` : Script de compilation autonome pour Linux / WSL2.
- \`Dockerfile\` : Environnement de compilation conteneurisé.
- \`.github/workflows/build-iso.yml\` : Workflow **100% automatique** — build + tag + Release GitHub publiée à chaque push, gratuit.
- \`boot.ipxe\` & \`setup-pxe-server.sh\` : **Déploiement Réseau iPXE / Netboot** sans clé USB.
- \`ventoy.json\` : Configuration d'amorçage automatique pour clés USB Ventoy.
- \`cloud-init.yaml\` : Manifeste de déploiement cloud.
- \`recipe.json\` : Recette de configuration complète.
`;

  zip.file('tester-en-vm.bat', testVmBat);
  zip.file('tester-en-vm.sh', testVmSh);
  zip.file('launch.bat', launchBat);
  zip.file('launch.sh', launchSh);
  zip.file('auto-build.bat', autoBuildBat);
  zip.file('auto-build.sh', autoBuildSh);
  zip.file('install-wsl.bat', wslInstallBat);
  zip.file('wsl.conf', wslConf);
  zip.file('run-live-windows.bat', liveWindowsBat);
  zip.file('build.sh', buildSh);
  zip.file('Dockerfile', dockerfile);
  zip.file('boot.ipxe', ipxeScript);
  zip.file('setup-pxe-server.sh', pxeServerScript);
  zip.file('ventoy.json', ventoyJson);
  zip.file('cloud-init.yaml', cloudInit);
  zip.file('recipe.json', recipeJson);
  zip.file('README.md', readme);

  // GitHub actions folder
  const githubFolder = zip.folder('.github')?.folder('workflows');
  if (githubFolder) {
    githubFolder.file('build-iso.yml', ghWorkflow);
  }

  return await zip.generateAsync({ type: 'blob' });
}

export async function downloadBuildPackage(recipe: OSRecipe) {
  const blob = await createDownloadableZip(recipe);
  const fileName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-build-kit.zip`;
  triggerFileDownload(blob, fileName);
}
