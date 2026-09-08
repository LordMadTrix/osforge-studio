import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Play, Pause, RotateCcw, FastForward, Terminal, Sparkles 
} from 'lucide-react';
import { OSRecipe } from '../types/os';

interface BuildSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: OSRecipe;
  lang: 'fr' | 'en';
}

interface SimulationStep {
  titleFr: string;
  titleEn: string;
  command: string;
  outputLines: string[];
  explanationFr: string;
  explanationEn: string;
}

export const BuildSimulatorModal: React.FC<BuildSimulatorModalProps> = ({
  isOpen,
  onClose,
  recipe,
  lang,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setTerminalLogs([]);
    onClose();
  };

  const steps = useMemo<SimulationStep[]>(() => [
    {
      titleFr: '1. Vérification de l’hôte & Dépendances',
      titleEn: '1. Host Environment Check',
      command: 'command -v debootstrap xorriso mksquashfs && df -h /',
      outputLines: [
        '[OK] Outils de build détectés : debootstrap, xorriso, mksquashfs, parted.',
        `[OK] Espace disque suffisant : 42 Go disponibles sur la partition de travail.`,
        `[INFO] Recette active : ${recipe.branding.osName} (${recipe.distro} ${recipe.distroVersion} ${recipe.arch}).`
      ],
      explanationFr: 'Vérifie que les outils de packaging Linux et l’espace disque temporaire sont suffisants pour compiler l’image.',
      explanationEn: 'Validates host dependencies and free disk space before initiating the build process.',
    },
    {
      titleFr: '2. Bootstrap du Système Socle',
      titleEn: '2. RootFS Base Bootstrap',
      command: `debootstrap --arch=${recipe.arch} ${recipe.distroSuite} ./chroot http://deb.debian.org/debian`,
      outputLines: [
        `I: Retrieving InRelease ...`,
        `I: Checking component main on http://deb.debian.org/debian ...`,
        `I: Validating Packages ...`,
        `I: Resolving core dependencies ...`,
        `I: Unpacking base system packages into ./chroot ...`,
        `I: Base system installed successfully.`
      ],
      explanationFr: 'Télécharge et déploie le système d’exploitation vierge minimal officiel sans modification.',
      explanationEn: 'Downloads and unpacks the pristine official minimal distribution rootfs.',
    },
    {
      titleFr: '3. Montage des Pseudofs & Chroot',
      titleEn: '3. Pseudofs Mount & Chroot Jail',
      command: 'mount -t proc proc ./chroot/proc && mount -t sysfs sys ./chroot/sys && mount --bind /dev ./chroot/dev',
      outputLines: [
        '[OK] /proc monté avec succès.',
        '[OK] /sys monté avec succès.',
        '[OK] /dev bind-monté dans l’environnement isolé.',
        '[OK] Entrée dans l’environnement chroot de configuration.'
      ],
      explanationFr: 'Connecte les interfaces noyau virtuelles pour que les scripts d’installation puissent s’exécuter isolément.',
      explanationEn: 'Mounts virtual kernel filesystems so packages configure cleanly inside the jail.',
    },
    {
      titleFr: '4. Noyau Linux & Pilotes Matériels',
      titleEn: '4. Kernel & Hardware Drivers',
      command: `apt-get install -y linux-image-${recipe.kernel === 'generic' ? 'amd64' : recipe.kernel} initramfs-tools`,
      outputLines: [
        `Selecting previously unselected package linux-image-amd64 ...`,
        `Unpacking Linux Kernel ${recipe.kernel} ...`,
        `Setting up linux-image ...`,
        `update-initramfs: Generating /boot/initrd.img-${recipe.kernel} ...`,
        `[OK] Kernel et ramdisk initial compilés.`
      ],
      explanationFr: 'Installe le noyau Linux sélectionné et génère l’initramfs amorçable.',
      explanationEn: 'Installs the selected kernel and generates the bootable initial ramdisk.',
    },
    {
      titleFr: '5. Bureau & Logiciels Sélectionnés',
      titleEn: '5. Desktop & Software Packages',
      command: `apt-get install -y ${recipe.desktop !== 'none' ? recipe.desktop : 'minimal'} ${recipe.selectedPackages.slice(0, 4).join(' ')}`,
      outputLines: [
        `[INFO] Installation de l'environnement de bureau : ${recipe.desktop.toUpperCase()}`,
        `[INFO] Installation de ${recipe.selectedPackages.length} paquets sélectionnés : ${recipe.selectedPackages.join(', ')}`,
        `Unpacking packages ... [################################] 100%`,
        `Setting up system services ... [OK]`
      ],
      explanationFr: 'Installe l’interface graphique, le gestionnaire de session et tous vos utilitaires choisis.',
      explanationEn: 'Installs graphical desktop, session greeter, and your curated package inventory.',
    },
    {
      titleFr: '6. Durcissement de Sécurité & Profils',
      titleEn: '6. Security Hardening & CIS',
      command: `sysctl -p /etc/sysctl.d/99-cis-security.conf && ufw default deny incoming`,
      outputLines: [
        `[OK] CIS Benchmark Niveau ${recipe.security.cisBenchmarkLevel} appliqué.`,
        `[OK] Pare-feu ${recipe.security.firewall.toUpperCase()} configuré.`,
        `[OK] Restriction SSH Root : ${recipe.security.disableRootSSH ? 'DÉSACTIVÉ' : 'AUTORISÉ'}.`,
        `[OK] Création de l'utilisateur : ${recipe.user.username} (sudo: ${recipe.user.sudo ? 'OUI' : 'NON'}).`
      ],
      explanationFr: 'Applique le pare-feu, les règles de restriction noyau, la création utilisateur et sudo.',
      explanationEn: 'Applies firewall, kernel sysctl restrictions, user accounts, and sudo permissions.',
    },
    {
      titleFr: '7. Compression SquashFS Haute Densité',
      titleEn: '7. SquashFS High-Density Compression',
      command: 'mksquashfs ./chroot ./image/live/filesystem.squashfs -comp xz -b 1048576 -processors $(nproc)',
      outputLines: [
        `Parallel mksquashfs: Using 16 processors ...`,
        `Creating 4.0 filesystem on ./image/live/filesystem.squashfs ...`,
        `[===================================================] 100%`,
        `Filesystem size : 1180.40 Mo (taux de compression : 34.2%)`
      ],
      explanationFr: 'Compresse l’ensemble du système de fichiers en un bloc ultra-dense prêt pour démarrage en RAM.',
      explanationEn: 'Compresses rootfs into a high-density squashfs block ready for RAM execution.',
    },
    {
      titleFr: '8. Assemblage ISO Hybride UEFI + BIOS',
      titleEn: '8. UEFI + BIOS Hybrid ISO Packaging',
      command: `xorriso -as mkisofs -r -V "${recipe.branding.osName}" -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin -o ${recipe.branding.osName}.iso ./image`,
      outputLines: [
        `xorriso 1.5.4 : RockRidge filesystem image builder`,
        `Writing: ISO:9660 volume label '${recipe.branding.osName}'`,
        `ISO image produced : ${recipe.branding.osName}-1.0-x86_64.iso (1.3 Go)`,
        `[SUCCÈS] Image ISO Hybride prête à être flashée sur clé USB ou testée en VM !`
      ],
      explanationFr: 'Produit l’ISO finale compatible clé USB Rufus/Ventoy, machine virtuelle et gravure DVD.',
      explanationEn: 'Generates the final hybrid ISO bootable via USB, Ventoy, and hypervisors.',
    },
  ], [recipe]);

  useEffect(() => {
    if (!isOpen || !isPlaying || currentStepIndex >= steps.length) return;

    const step = steps[currentStepIndex];
    const timer = setTimeout(() => {
      setTerminalLogs(prev => [
        ...prev,
        `$ ${step.command}`,
        ...step.outputLines,
        ''
      ]);
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      if (nextIndex >= steps.length) {
        setIsPlaying(false);
      }
    }, 1800 / speed);

    return () => clearTimeout(timer);
  }, [isOpen, isPlaying, currentStepIndex, speed, steps]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  if (!isOpen) return null;

  const currentStep = steps[Math.min(currentStepIndex, steps.length - 1)];

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, #0b1120 0%, #060913 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}>
              <Terminal size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {lang === 'fr' ? 'Simulateur de Déroulement de Build (Dry-Run)' : 'Build Execution Simulator (Dry-Run)'}
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}>
                  Étape {Math.min(currentStepIndex + 1, steps.length)} / {steps.length}
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0 }}>
                {lang === 'fr' ? 'Visualisez chronologiquement chaque commande système exécutée lors de la compilation' : 'Chronologically inspect every system command executed during the build'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="btn-icon" style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Barre de Progression & Contrôles */}
        <div style={{
          padding: '12px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          {/* Progression */}
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
              {lang === 'fr' ? currentStep.titleFr : currentStep.titleEn}
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(currentStepIndex / steps.length) * 100}%`,
                background: 'linear-gradient(90deg, #38bdf8 0%, #10b981 100%)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Boutons de contrôle */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="btn btn-secondary"
              style={{ fontSize: '0.74rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'Pause' : 'Lecture'}</span>
            </button>

            <button
              onClick={() => {
                setCurrentStepIndex(0);
                setTerminalLogs([]);
                setIsPlaying(true);
              }}
              className="btn btn-secondary"
              style={{ fontSize: '0.74rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Recommencer"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1))}
              className="btn btn-secondary"
              style={{ fontSize: '0.74rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <FastForward size={13} />
              <span>{speed}x</span>
            </button>
          </div>
        </div>

        {/* Terminal Screen */}
        <div style={{
          padding: '16px 20px',
          background: '#040711',
          flex: 1,
          overflowY: 'auto',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '0.76rem',
          color: '#38bdf8',
          lineHeight: '1.45',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '280px',
        }}>
          {terminalLogs.map((line, idx) => (
            <div key={idx} style={{
              color: line.startsWith('$') ? '#f8fafc' : line.includes('[OK]') || line.includes('[SUCCÈS]') ? '#34d399' : line.includes('[INFO]') ? '#93c5fd' : '#94a3b8',
              fontWeight: line.startsWith('$') ? 700 : 400,
            }}>
              {line}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Explication Pédagogique */}
        <div style={{
          padding: '12px 20px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.75rem',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Sparkles size={15} color="#38bdf8" />
          <span>
            <strong>{lang === 'fr' ? 'Explication Système' : 'System Note'} :</strong>{' '}
            {lang === 'fr' ? currentStep.explanationFr : currentStep.explanationEn}
          </span>
        </div>
      </div>
    </div>
  );
};
