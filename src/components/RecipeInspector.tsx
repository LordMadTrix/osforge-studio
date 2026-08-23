import React, { useState } from 'react';
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
  generateUniversalLauncherSh
} from '../services/scriptGenerators';
import { ContextTip } from './ContextTip';
import { Copy, Check, FileCode, Download } from 'lucide-react';

interface RecipeInspectorProps {
  recipe: OSRecipe;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

export const RecipeInspector: React.FC<RecipeInspectorProps> = ({ recipe, lang, onOpenTips }) => {
  const [activeFile, setActiveFile] = useState<string>('launch.bat');
  const [copied, setCopied] = useState<boolean>(false);

  const files: Record<string, { title: string; lang: string; content: string; desc: string }> = {
    'launch.bat': {
      title: 'launch.bat (Lanceur Universel Interactif Windows)',
      lang: 'bat',
      content: generateUniversalLauncherBat(recipe),
      desc: lang === 'fr' ? 'Double-cliquez sous Windows pour accéder au menu 1-clic (WSL2, QEMU Live, Compilation locale).' : '1-Click interactive launcher for Windows.',
    },
    'launch.sh': {
      title: 'launch.sh (Lanceur Universel Linux / macOS)',
      lang: 'bash',
      content: generateUniversalLauncherSh(recipe),
      desc: lang === 'fr' ? 'Menu interactif en console pour compiler, tester sous QEMU ou pousser sur GitHub.' : 'Interactive terminal launcher for Linux/macOS.',
    },
    'install-wsl.bat': {
      title: 'install-wsl.bat (Installation 1-Click Windows WSL2)',
      lang: 'bat',
      content: generateWslInstallerBat(recipe),
      desc: lang === 'fr' ? 'Double-cliquez sous Windows pour importer et lancer instantanément votre OS dans WSL2.' : '1-Click Windows installer for WSL2.',
    },
    'run-live-windows.bat': {
      title: 'run-live-windows.bat (Live Linux sous Windows)',
      lang: 'bat',
      content: generateLiveWindowsBat(recipe),
      desc: lang === 'fr' ? 'Lance votre système d’exploitation en Live sur Windows sans aucune installation.' : 'Run Linux live on Windows without install.',
    },
    'wsl.conf': {
      title: 'wsl.conf (Configuration WSL2 & WSLg)',
      lang: 'ini',
      content: generateWslConf(recipe),
      desc: lang === 'fr' ? 'Active Systemd, l’intégration graphique WSLg et l’utilisateur par défaut sous Windows.' : 'WSL2 systemd and graphics configuration.',
    },
    'build.sh': {
      title: 'build.sh (Script Bash Local)',
      lang: 'bash',
      content: generateBuildScript(recipe),
      desc: lang === 'fr' ? 'Script bash autonome exécutable sur n’importe quelle machine Linux (Debian, Ubuntu, Arch, WSL2).' : 'Autonomous bash build script.',
    },
    'github-actions.yml': {
      title: '.github/workflows/build-iso.yml',
      lang: 'yaml',
      content: generateGitHubWorkflow(recipe),
      desc: lang === 'fr' ? 'Workflow GitHub Actions pour construire gratuitement votre ISO sur le cloud GitHub et la publier en Release !' : 'Free GitHub Actions automated ISO build workflow.',
    },
    'Dockerfile': {
      title: 'Dockerfile (Build Conteneurisé)',
      lang: 'dockerfile',
      content: generateDockerfile(recipe),
      desc: lang === 'fr' ? 'Compile l’ISO dans un conteneur Docker isolé sans installer d’outils sur votre machine hôte.' : 'Isolated Docker build environment.',
    },
    'cloud-init.yaml': {
      title: 'cloud-init.yaml (Cloud Provisioning)',
      lang: 'yaml',
      content: generateCloudInitYaml(recipe),
      desc: lang === 'fr' ? 'Fichier user-data cloud-init standard pour déployer sur AWS, GCP, OpenStack, Proxmox ou Hetzner.' : 'Standard cloud-init user-data file.',
    },
    'recipe.json': {
      title: 'recipe.json (Manifeste OpenFactory)',
      lang: 'json',
      content: generateRecipeJson(recipe),
      desc: lang === 'fr' ? 'Recette JSON complète du système d’exploitation, réimportable et versionnable dans Git.' : 'OpenFactory standard JSON recipe format.',
    },
  };

  const current = files[activeFile] || files['launch.bat'];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(current.content);
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
          {Object.keys(files).map(key => (
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
                background: activeFile === key ? 'rgba(14, 165, 233, 0.12)' : 'rgba(15, 23, 42, 0.6)',
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
          <button onClick={copyToClipboard} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
            {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
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
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
              {current.title}
            </h4>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {current.desc}
            </p>
          </div>
          <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>
            {current.lang.toUpperCase()}
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
          color: '#38bdf8',
          maxHeight: '500px',
        }}>
          <code>{current.content}</code>
        </pre>
      </div>
    </div>
  );
};
