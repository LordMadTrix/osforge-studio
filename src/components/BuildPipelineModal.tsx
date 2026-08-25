import React, { useState, useEffect, useRef } from 'react';
import type { OSRecipe } from '../types/os';
import { calculateEstimatedSizeAndRam } from '../services/buildSimulator';
import { downloadBuildPackage } from '../services/buildExport';
import { resolvePackageList, generateBuildScript, generateDockerfile } from '../services/scriptGenerators';
import { X, Download, Terminal, GitBranch, Cloud, HardDrive, Play, Box, Monitor, Sparkles } from 'lucide-react';
import { saveAs } from 'file-saver';

interface BuildPipelineModalProps {
  recipe: OSRecipe;
  isOpen: boolean;
  onClose: () => void;
  onLaunchInApp?: () => void;
  lang: 'fr' | 'en';
}

export const BuildPipelineModal: React.FC<BuildPipelineModalProps> = ({ recipe, isOpen, onClose, onLaunchInApp, lang }) => {
  const [buildMode, setBuildMode] = useState<'choice' | 'github' | 'local'>('choice');
  const [localSubTab, setLocalSubTab] = useState<'bash' | 'docker' | 'wsl' | 'qemu'>('bash');

  // Simulation state for local build
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isDone, setIsDone] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const metrics = calculateEstimatedSizeAndRam(recipe);
  const pkgs = resolvePackageList(recipe);
  const isoFileName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;
  const repoSlug = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-os`;
  const sha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  const stages = [
    { title: 'Validation de la recette', desc: 'Vérification des dépendances et de l’architecture' },
    { title: 'Miroir & Bootstrap Rootfs', desc: `Téléchargement du socle de base ${recipe.distro}` },
    { title: 'Installation des Paquets', desc: `Injection de ${pkgs.length} paquets logiciels sélectionnés` },
    { title: 'Configuration & Utilisateurs', desc: `Création de ${recipe.user.username}, SSH et sécurité CIS` },
    { title: 'Compression SquashFS', desc: 'Compression XZ du système de fichiers live' },
    { title: 'Génération GRUB2 & EFI', desc: 'Intégration du chargeur de démarrage hybride' },
    { title: 'Assemblage ISO Xorriso', desc: 'Création du fichier ISO bootable final' },
  ];

  useEffect(() => {
    if (!isOpen) {
      setBuildMode('choice');
      setIsSimulating(false);
      setCurrentStep(0);
      setProgress(0);
      setIsDone(false);
      setLogs([]);
    }
  }, [isOpen]);

  const handleLaunchInAppDirectly = () => {
    onClose();
    if (onLaunchInApp) {
      onLaunchInApp();
    }
  };

  const startLocalSimulation = () => {
    setIsSimulating(true);
    setIsDone(false);
    setCurrentStep(0);
    setProgress(0);
    setLogs([
      `[OSForge Studio] Initialisation du pipeline de compilation locale...`,
      `[INFO] Recette : ${recipe.branding.osName} (${recipe.branding.editionName})`,
      `[INFO] Base : ${recipe.distro.toUpperCase()} | Arch : ${recipe.arch} | Format : ${recipe.outputFormat}`,
      `[INFO] Paquets à compiler : ${pkgs.length} logiciels`,
      `----------------------------------------------------------------`,
    ]);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);
      setProgress(Math.min(Math.round((step / stages.length) * 100), 100));

      if (step === 1) {
        setLogs(prev => [...prev, `[ETAPE 1/7] ✅ Recette validée sans conflit. Architecture ${recipe.arch} prête.`]);
      } else if (step === 2) {
        setLogs(prev => [
          ...prev,
          `[ETAPE 2/7] 📦 Début du bootstrap ${recipe.distro}...`,
          `[DEBOOTSTRAP] Téléchargement des paquets système indispensables...`,
        ]);
      } else if (step === 3) {
        setLogs(prev => [
          ...prev,
          `[ETAPE 3/7] 📥 Installation des ${pkgs.length} paquets dans le chroot...`,
          `[CHROOT] Paquets : ${pkgs.slice(0, 6).join(', ')}...`,
          `[CHROOT] Bureau graphique configuré : ${recipe.desktop}...`,
        ]);
      } else if (step === 4) {
        setLogs(prev => [
          ...prev,
          `[ETAPE 4/7] ⚙️ Configuration du système :`,
          `[USER] Utilisateur : ${recipe.user.username} (sudo: ${recipe.user.sudo})`,
          `[SEC] Durcissement CIS Level ${recipe.security.cisBenchmarkLevel} & Pare-feu ${recipe.security.firewall}`,
        ]);
      } else if (step === 5) {
        setLogs(prev => [
          ...prev,
          `[ETAPE 5/7] 🗜️ Compression SquashFS (XZ)...`,
          `[SQUASHFS] Système compressé en ${metrics.isoSizeMB} Mo.`,
        ]);
      } else if (step === 6) {
        setLogs(prev => [
          ...prev,
          `[ETAPE 6/7] 🖲️ Génération du bootloader GRUB2 UEFI/BIOS...`,
          `[BOOT] Noyau Linux v6.8-${recipe.kernel} et Initramfs prêts.`,
        ]);
      } else if (step === 7) {
        setLogs(prev => [
          ...prev,
          `[ETAPE 7/7] 📀 Création de l'ISO hybride avec xorriso...`,
          `----------------------------------------------------------------`,
          `🎉 SUCCÈS ! Image ISO construite : dist/${isoFileName}`,
          `🔑 Empreinte SHA256 : ${sha256}`,
        ]);
        setIsDone(true);
        clearInterval(interval);
      }
    }, 750);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);


  const downloadStandaloneBuildSh = () => {
    const content = generateBuildScript(recipe);
    const blob = new Blob([content], { type: 'text/x-sh;charset=utf-8' });
    saveAs(blob, 'build.sh');
  };

  const downloadStandaloneDockerfile = () => {
    const content = generateDockerfile(recipe);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'Dockerfile');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '960px' }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan)',
            }}>
              <Terminal size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {lang === 'fr' ? 'Centre de Compilation & Exportation d’OS' : 'OS Build & Export Hub'}
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {recipe.branding.osName} • {recipe.distro} • {recipe.arch} • ~{metrics.isoSizeMB} Mo
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '5px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Mode Switcher Tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: 'rgba(10, 15, 28, 0.5)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
          }}>
            <button
              onClick={() => setBuildMode('github')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px',
                borderRadius: '6px',
                border: buildMode === 'github' ? '1px solid var(--cyan)' : '1px solid transparent',
                background: buildMode === 'github' ? 'rgba(249, 115, 22, 0.12)' : 'transparent',
                color: buildMode === 'github' ? 'var(--cyan)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Cloud size={16} />
              <span>{lang === 'fr' ? 'Build Cloud (GitHub Actions)' : 'Cloud Build (GitHub Actions)'}</span>
            </button>

            <button
              onClick={() => setBuildMode('local')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px',
                borderRadius: '6px',
                border: buildMode === 'local' ? '1px solid var(--emerald)' : '1px solid transparent',
                background: buildMode === 'local' ? 'rgba(132, 160, 92, 0.12)' : 'transparent',
                color: buildMode === 'local' ? '#a3bc7d' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <HardDrive size={16} />
              <span>{lang === 'fr' ? 'Compilation Locale (Linux / Docker / WSL2)' : 'Local Build (Linux / Docker / WSL2)'}</span>
            </button>
          </div>

          {/* VIEW 1 : CHOICE OVERVIEW */}
          {buildMode === 'choice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* In-app Simulator Banner */}
              <div
                onClick={handleLaunchInAppDirectly}
                style={{
                  background: 'rgba(249, 115, 22, 0.06)',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                  borderRadius: '8px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <Sparkles size={16} color="var(--cyan)" />
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      {lang === 'fr' ? 'Démarrer un vrai Linux dans le navigateur' : 'Boot a real Linux in the browser'}
                    </h4>
                    <span className="badge badge-emerald">{lang === 'fr' ? 'Zéro Installation' : 'Zero Install'}</span>
                  </div>
                  {/* Bug réel trouvé en auditant : ce texte affirmait "Démarrez VOTRE SYSTÈME
                      ({recipe.branding.osName})" — alors que RealBoot.tsx (le composant réellement
                      lancé par ce bouton, via onLaunchInApp -> setActiveTab('sandbox') dans App.tsx)
                      ne reçoit AUCUNE prop "recipe" et démarre TOUJOURS le même noyau Buildroot
                      générique statique, quels que soient la distro/le bureau/les paquets choisis.
                      RealBoot.tsx est lui-même honnête sur ce point ("un vrai noyau Linux
                      (Buildroot) démarre", jamais "votre système") — ce texte-ci contredisait cette
                      honnêteté en nommant précisément le nom de la recette de l'utilisateur. */}
                  <p style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                    {lang === 'fr'
                      ? `Démarrez un vrai noyau Linux (démo générique Buildroot, indépendante de cette recette) dans une machine virtuelle WebAssembly intégrée au navigateur — pour compiler et tester réellement ${recipe.branding.osName}, utilisez le Build Cloud ou Local ci-dessous.`
                      : `Boot a real Linux kernel (a generic Buildroot demo, independent of this recipe) inside a WebAssembly virtual machine right in the browser — to actually build and test ${recipe.branding.osName}, use the Cloud or Local build below.`}
                  </p>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleLaunchInAppDirectly(); }}
                  className="btn btn-primary"
                  style={{ padding: '7px 16px', fontSize: '0.84rem' }}
                >
                  <Play size={14} />
                  <span>{lang === 'fr' ? 'Démarrer dans l’App' : 'Launch in App'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                {/* Option A: GitHub Actions */}
                <div
                  onClick={() => setBuildMode('github')}
                  className="glass-panel"
                  style={{
                    padding: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Cloud size={18} color="var(--cyan)" />
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          Build Cloud GitHub
                        </h4>
                      </div>
                      <span className="badge badge-cyan">100% Gratuit</span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '10px' }}>
                      Construisez votre fichier ISO dans le cloud GitHub sans consommer les ressources de votre machine.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem', color: '#cbd5e1' }}>
                      <div>✓ <strong>Zéro ressource locale requise</strong></div>
                      <div>✓ <strong>Téléchargement direct</strong> dans les Releases GitHub</div>
                    </div>
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.82rem' }}>
                    <Cloud size={14} />
                    <span>Choisir le Build GitHub</span>
                  </button>
                </div>

                {/* Option B: Local Build */}
                <div
                  onClick={() => setBuildMode('local')}
                  className="glass-panel"
                  style={{
                    padding: '18px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <HardDrive size={18} color="var(--emerald)" />
                        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          Build en Local
                        </h4>
                      </div>
                      <span className="badge badge-emerald">Linux / Docker / WSL2</span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '10px' }}>
                      Générez et compilez votre système d’exploitation directement sur votre machine locale.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem', color: '#cbd5e1' }}>
                      <div>✓ <strong>Script Bash autonome</strong> ou conteneur Docker</div>
                      <div>✓ <strong>Test instantané</strong> dans QEMU après compilation</div>
                    </div>
                  </div>

                  <button className="btn btn-emerald" style={{ width: '100%', fontSize: '0.82rem' }}>
                    <HardDrive size={14} />
                    <span>Choisir la Compilation Locale</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2 : GITHUB ACTIONS */}
          {buildMode === 'github' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GitBranch size={16} color="var(--cyan)" />
                      {lang === 'fr' ? 'Guide : Compilation Cloud GitHub Actions' : 'GitHub Actions Cloud Build'}
                    </h4>
                  </div>

                  <button onClick={() => downloadBuildPackage(recipe)} className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                    <Download size={13} />
                    <span>Pack GitHub (ZIP)</span>
                  </button>
                </div>

                <div style={{ padding: '9px 12px', marginBottom: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '6px', fontSize: '0.76rem', color: '#fbbf24' }}>
                  ⚠️ <strong>Prérequis (une seule fois)</strong> : <a href="https://git-scm.com/downloads" target="_blank" rel="noreferrer" style={{ color: '#fbbf24' }}>Git</a> et <a href="https://cli.github.com/" target="_blank" rel="noreferrer" style={{ color: '#fbbf24' }}>GitHub CLI (gh)</a> installés, puis dans un terminal : <code style={{ color: 'var(--text-main)' }}>gh auth login</code> (connexion à votre compte GitHub).
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '10px 12px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--cyan)', marginBottom: '4px' }}>
                      1. Téléchargez et dézippez le pack ci-dessus
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Ouvrez un terminal (clic droit → "Ouvrir dans le terminal") <strong>dans ce dossier dézippé</strong>.
                    </p>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--cyan)', marginBottom: '4px' }}>
                      2. Collez cette commande dans le terminal, puis Entrée
                    </div>
                    <pre style={{ background: '#040711', padding: '8px 10px', borderRadius: '4px', fontSize: '0.78rem', color: '#fb923c', overflowX: 'auto' }}>
                      <code>git init -b main && git add . && git commit -m "init OS recipe" && gh repo create "{repoSlug}" --public --source=. --push</code>
                    </pre>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Ceci crée un nouveau dépôt GitHub nommé <code style={{ color: '#cbd5e1' }}>{repoSlug}</code> à partir de vos fichiers et l'envoie en ligne.
                    </p>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--cyan)', marginBottom: '4px' }}>
                      3. La compilation démarre automatiquement
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Sur la page de votre dépôt GitHub, ouvrez l'onglet <strong>Actions</strong> : le build tourne tout seul (5-15 min).
                      Si aucun run n'apparaît après une minute, cliquez sur le workflow puis <strong>"Run workflow"</strong> pour le lancer manuellement.
                    </p>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'rgba(132, 160, 92, 0.08)', border: '1px solid rgba(132, 160, 92, 0.25)', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#a3bc7d', marginBottom: '4px' }}>
                      4. Récupérez votre ISO
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Une fois le run terminé (coche verte), deux cas selon la taille de <code style={{ color: 'var(--text-main)' }}>{isoFileName}</code> :
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#a3bc7d', fontWeight: 700 }}>✓</span>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                          <strong>Moins de 2 Go</strong> : publiée automatiquement dans la section <strong>"Releases"</strong> de votre
                          dépôt — lien permanent, prêt à partager.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>⚠</span>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
                          <strong>2 Go ou plus</strong> (GitHub limite les Releases à 2 Go) : ouvrez le run terminé → onglet <strong>"Summary"</strong>
                          → section <strong>"Artifacts"</strong> tout en bas de page. Le fichier téléchargé est un <code style={{ color: 'var(--text-main)' }}>.zip</code> à
                          dézipper, disponible <strong>14 jours seulement</strong>. Pour débloquer la Release permanente, allégez la recette
                          (moins de paquets, bureau plus léger type XFCE/i3) pour repasser sous 2 Go.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3 : LOCAL BUILD */}
          {buildMode === 'local' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Local Sub-methods Switcher */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                {[
                  { id: 'bash', label: '1. Script Bash Natif', icon: Terminal },
                  { id: 'docker', label: '2. Docker Isolé', icon: Box },
                  { id: 'wsl', label: '3. Windows WSL2', icon: Monitor },
                  { id: 'qemu', label: '4. Testeur QEMU', icon: Play },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isSel = localSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setLocalSubTab(tab.id as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: isSel ? '1px solid var(--emerald)' : '1px solid var(--border-subtle)',
                        background: isSel ? 'rgba(132, 160, 92, 0.12)' : 'rgba(26, 22, 19, 0.6)',
                        color: isSel ? '#a3bc7d' : 'var(--text-muted)',
                        fontWeight: isSel ? 600 : 400,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Icon size={13} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-method Instructions Panel */}
              <div className="glass-panel" style={{ padding: '14px' }}>
                {localSubTab === 'bash' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                        Exécution sous Ubuntu / Debian (dépôts APT) :
                      </span>
                      <button onClick={downloadStandaloneBuildSh} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                        <Download size={11} /> build.sh
                      </button>
                    </div>
                    <pre style={{ background: '#040711', padding: '10px', borderRadius: '4px', fontSize: '0.78rem', color: '#a3bc7d', overflowX: 'auto' }}>
                      <code>chmod +x build.sh{'\n'}sudo ./build.sh</code>
                    </pre>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                      À lancer dans le dossier où vous avez téléchargé <code style={{ color: '#cbd5e1' }}>build.sh</code>.
                      Nécessite <code style={{ color: '#cbd5e1' }}>sudo</code> et une connexion internet ; l'ISO finale
                      apparaît dans <code style={{ color: '#cbd5e1' }}>dist/</code>. Autre distro (Arch, Fedora...) ? Utilisez plutôt l'onglet Docker ci-contre.
                    </p>
                  </div>
                )}

                {localSubTab === 'docker' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)' }}>
                        Compilation dans un conteneur Docker étanche :
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={downloadStandaloneDockerfile} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                          <Download size={11} /> Dockerfile
                        </button>
                        <button onClick={downloadStandaloneBuildSh} className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                          <Download size={11} /> build.sh
                        </button>
                      </div>
                    </div>
                    <pre style={{ background: '#040711', padding: '10px', borderRadius: '4px', fontSize: '0.78rem', color: '#a3bc7d', overflowX: 'auto' }}>
                      <code>docker build -t osforge-builder .{'\n'}docker run --rm --privileged -v $(pwd)/dist:/osbuilder/dist osforge-builder</code>
                    </pre>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                      Téléchargez <strong>les deux fichiers</strong> (Dockerfile + build.sh) dans un même dossier avant de lancer ces commandes.
                      Nécessite Docker installé et démarré. Fonctionne dans un terminal Linux/macOS/WSL/Git Bash —
                      sous PowerShell remplacez <code style={{ color: '#cbd5e1' }}>$(pwd)</code> par <code style={{ color: '#cbd5e1' }}>${'{'}PWD{'}'}</code>,
                      sous CMD par <code style={{ color: '#cbd5e1' }}>%cd%</code>. L'ISO apparaît ensuite dans <code style={{ color: '#cbd5e1' }}>dist/</code>.
                    </p>
                  </div>
                )}

                {localSubTab === 'wsl' && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                      Depuis Windows WSL2 :
                    </div>
                    <pre style={{ background: '#040711', padding: '10px', borderRadius: '4px', fontSize: '0.78rem', color: '#a3bc7d', overflowX: 'auto' }}>
                      <code>chmod +x build.sh && sudo ./build.sh</code>
                    </pre>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                      Ouvrez le dossier contenant <code style={{ color: '#cbd5e1' }}>build.sh</code> dans l'Explorateur Windows,
                      clic droit → <strong>"Ouvrir dans le Terminal"</strong>, tapez <code style={{ color: '#cbd5e1' }}>wsl</code> pour
                      entrer dans Linux (vous arrivez automatiquement dans le même dossier), puis collez la commande ci-dessus.
                    </p>
                  </div>
                )}

                {localSubTab === 'qemu' && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                      Tester votre ISO avec QEMU (Linux / KVM) :
                    </div>
                    <pre style={{ background: '#040711', padding: '10px', borderRadius: '4px', fontSize: '0.78rem', color: '#a3bc7d', overflowX: 'auto' }}>
                      <code>qemu-system-x86_64 -cdrom dist/{isoFileName} -m 4G -enable-kvm -vga virtio</code>
                    </pre>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                      Cette commande (avec <code style={{ color: '#cbd5e1' }}>-enable-kvm</code>) fonctionne uniquement sous Linux natif.
                      <strong> Sous Windows</strong>, utilisez plutôt <code style={{ color: '#cbd5e1' }}>run-live-windows.bat</code> inclus
                      dans le kit — il détecte et lance QEMU automatiquement, sans KVM.
                    </p>
                  </div>
                )}
              </div>

              {/* Simulation Box */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Simulateur de Déroulement de Build
                  </h4>
                  {!isSimulating && (
                    <button onClick={startLocalSimulation} className="btn btn-emerald" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
                      <Play size={13} />
                      <span>Lancer la Simulation</span>
                    </button>
                  )}
                </div>

                {isSimulating && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.76rem' }}>
                        <span style={{ fontWeight: 600, color: isDone ? 'var(--emerald)' : 'var(--cyan)' }}>
                          {isDone ? '✅ Simulation terminée !' : `${stages[Math.min(currentStep, stages.length - 1)]?.title || 'Compilation...'} (${progress}%)`}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{progress}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          className={!isDone ? 'shimmer-bar' : ''}
                          style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: isDone ? 'var(--emerald)' : 'var(--cyan)',
                            transition: 'width 0.25s ease',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{
                      background: '#040711',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '10px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.76rem',
                      lineHeight: '1.45',
                      color: '#a3bc7d',
                      height: '180px',
                      overflowY: 'auto',
                    }}>
                      {logs.map((l, i) => (
                        <div key={i} style={{ color: l.startsWith('🎉') ? '#a3bc7d' : l.startsWith('[ETAPE') ? '#fbbf24' : '#fb923c' }}>
                          {l}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {buildMode !== 'choice' ? (
            <button onClick={() => setBuildMode('choice')} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
              ← {lang === 'fr' ? 'Changer de mode' : 'Change Mode'}
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => downloadBuildPackage(recipe)} className="btn btn-primary" style={{ padding: '5px 14px', fontSize: '0.8rem' }}>
              <Download size={13} />
              <span>{lang === 'fr' ? 'Télécharger Kit (ZIP)' : 'Download Kit (ZIP)'}</span>
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
              {lang === 'fr' ? 'Fermer' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
