import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import {
  generateWindowsBatchLauncher,
  generateWindowsPowerShellLauncher,
  generateLinuxBashLauncher,
  generateLinuxDesktopFile,
  generateLinuxInstallScript,
  generateDesktopReadme
} from '../src/services/desktopPackager';

async function packageDesktop() {
  const distDir = path.resolve('dist');
  if (!fs.existsSync(distDir)) {
    console.error('Erreur: Le dossier dist/ n\'existe pas.');
    process.exit(1);
  }

  const toCrlf = (s: string) => s.replace(/\r?\n/g, '\r\n');

  function addDirToZip(zip: JSZip, localDir: string, zipPrefix = '') {
    const files = fs.readdirSync(localDir);
    for (const f of files) {
      if (f.endsWith('.zip') || f.endsWith('.tar.gz') || f.endsWith('.mp4')) continue;
      const fullPath = path.join(localDir, f);
      const zipPath = zipPrefix ? `${zipPrefix}/${f}` : f;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        addDirToZip(zip, fullPath, zipPath);
      } else {
        const content = fs.readFileSync(fullPath);
        zip.file(zipPath, content);
      }
    }
  }

  // 1. Pack Windows Portable
  console.log('📦 Assemblage de OSForge-Studio-Windows-Portable.zip...');
  const winZip = new JSZip();
  addDirToZip(winZip, distDir);
  // Alias de compatibilité /osforge-studio/ pour serveurs Python/HTTP sans réécriture
  addDirToZip(winZip, distDir, 'osforge-studio');
  winZip.file('Lancer-OSForge-Studio.bat', toCrlf(generateWindowsBatchLauncher()));
  winZip.file('Lancer-OSForge-Studio.ps1', toCrlf(generateWindowsPowerShellLauncher()));
  winZip.file('server.ps1', toCrlf(generateWindowsPowerShellLauncher()));
  winZip.file('README.txt', toCrlf(generateDesktopReadme('windows')));

  const winBuffer = await winZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
  fs.writeFileSync(path.join(distDir, 'OSForge-Studio-Windows-Portable.zip'), winBuffer);

  // 2. Pack Linux Portable
  console.log('📦 Assemblage de OSForge-Studio-Linux-Portable.zip...');
  const linZip = new JSZip();
  addDirToZip(linZip, distDir);
  // Alias de compatibilité /osforge-studio/ pour Linux
  addDirToZip(linZip, distDir, 'osforge-studio');
  linZip.file('lancer-osforge-studio.sh', generateLinuxBashLauncher());
  linZip.file('installer-raccourci.sh', generateLinuxInstallScript());
  linZip.file('osforge-studio.desktop', generateLinuxDesktopFile());
  linZip.file('README.md', generateDesktopReadme('linux'));

  const linBuffer = await linZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
  fs.writeFileSync(path.join(distDir, 'OSForge-Studio-Linux-Portable.zip'), linBuffer);

  console.log('✅ Packs Desktop Windows et Linux générés avec succès dans dist/ !');
}

packageDesktop().catch((err) => {
  console.error('Erreur packaging desktop:', err);
  process.exit(1);
});
