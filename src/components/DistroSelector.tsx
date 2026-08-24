import React from 'react';
import { OSRecipe, ArchType, OutputFormat } from '../types/os';
import { DISTROS } from '../data/distros';
import { KERNEL_OPTIONS } from '../data/kernels';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { KernelUpdateChecker } from './KernelUpdateChecker';
import { CheckCircle2, Cpu, HardDrive, Zap, Layers, Image as ImageIcon, Rss } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { DISTRO_LOGOS } from '../data/logos';
import { useLiveVersions } from '../hooks/useLiveVersions';

interface DistroSelectorProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
  onOpenScreenshots?: (distroId?: string) => void;
}

export const DistroSelector: React.FC<DistroSelectorProps> = ({ recipe, onChange, lang, onOpenTips, onOpenScreenshots }) => {
  const { distros: liveDistros } = useLiveVersions();
  const formats: { id: OutputFormat; name: string; desc: string; icon: string; tooltipFr: string; tooltipEn: string }[] = [
    {
      id: 'iso_hybrid',
      name: 'Image ISO Hybride Live',
      desc: 'Bootable USB / DVD (BIOS + UEFI 64-bit)',
      icon: '📀',
      tooltipFr: 'Format standard compatible clé USB bootable Rufus/Ventoy et machines virtuelles.',
      tooltipEn: 'Standard hybrid image bootable via Rufus/Ventoy USB and virtual machines.',
    },
    {
      id: 'wsl2_tar',
      name: 'Distribution Windows WSL2 (.tar.gz)',
      desc: 'Import 1-click dans Windows (wsl --import)',
      icon: '🪟',
      tooltipFr: 'S’exécute directement sous Windows sans redémarrage avec support graphique WSLg.',
      tooltipEn: 'Runs directly in Windows without rebooting with full WSLg graphical apps.',
    },
    {
      id: 'qcow2',
      name: 'Image Cloud QCOW2',
      desc: 'Optimisée pour KVM, Proxmox VE, OpenStack',
      icon: '☁️',
      tooltipFr: 'Disque virtuel sparse avec support de snapshots pour hyperviseurs Linux.',
      tooltipEn: 'Sparse virtual disk with snapshot support for Linux KVM/Proxmox hypervisors.',
    },
    {
      id: 'vmdk',
      name: 'Disque Virtuel VMDK / OVA',
      desc: 'Prêt pour VirtualBox, VMware Workstation / ESXi',
      icon: '💻',
      tooltipFr: 'Format universel pour importer directement dans VMware et VirtualBox.',
      tooltipEn: 'Universal virtual disk format for VMware and VirtualBox.',
    },
    {
      id: 'raw_img',
      name: 'Image Disque Brute (RAW)',
      desc: 'Écriture directe dd sur clé USB ou SSD NVMe',
      icon: '💾',
      tooltipFr: 'Octet par octet pour écriture directe bit-exact sur disque physique.',
      tooltipEn: 'Exact raw sector dump for direct flashing onto physical drives with dd.',
    },
    {
      id: 'rpi_sd',
      name: 'Carte SD Raspberry Pi (.img.xz)',
      desc: 'Prêt à flasher avec Raspberry Pi Imager / Balena',
      icon: '🍓',
      tooltipFr: 'Partitionnement MBR/FAT32 boot + ext4 rootfs optimisé carte SD.',
      tooltipEn: 'Optimized SD card layout for Raspberry Pi Imager or Balena Etcher.',
    },
    {
      id: 'docker_rootfs',
      name: 'Conteneur Docker RootFS',
      desc: 'Système racine compressé pour import OCI/Docker',
      icon: '🐳',
      tooltipFr: 'Tarball rootfs pour créer une image de base `docker import rootfs.tar.gz`.',
      tooltipEn: 'Compressed rootfs tarball to build base Docker images via docker import.',
    },
  ];

  const architectures: { id: ArchType; name: string; desc: string; tipFr: string; tipEn: string }[] = [
    {
      id: 'x86_64',
      name: 'x86_64 (AMD64 / Intel 64-bit)',
      desc: 'Standard universel pour PC, ordinateurs portables et serveurs',
      tipFr: 'Architecture 64-bit standard compatible avec 98% des ordinateurs et serveurs.',
      tipEn: 'Standard 64-bit architecture compatible with 98% of PCs and servers.',
    },
    {
      id: 'aarch64',
      name: 'ARM64 (aarch64)',
      desc: 'Raspberry Pi 4/5, Mac Apple Silicon (VM), serveurs Ampere',
      tipFr: 'Idéal pour cartes monocartes ARM, puces Apple Silicon et serveurs cloud ARM.',
      tipEn: 'Ideal for Raspberry Pi, Apple Silicon virtualization, and AWS Graviton.',
    },
    {
      id: 'riscv64',
      name: 'RISC-V 64-bit',
      desc: 'Architecture ouverte de nouvelle génération',
      tipFr: 'Architecture libre de droits en plein essor dans les microcontrôleurs et SBCs.',
      tipEn: 'Open standard royalty-free instruction set architecture.',
    },
    {
      id: 'i686',
      name: 'x86 32-bit (i686 / Legacy)',
      desc: 'Anciens ordinateurs 32-bit ou appliances légères',
      tipFr: 'Pour très vieux processeurs (Pentium/Core Duo) ou économie extrême de mémoire.',
      tipEn: 'For legacy 32-bit processors or low-memory embedded devices.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="distro" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 1. Base Linux Distribution Selector */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HardDrive size={18} color="var(--cyan)" />
              {lang === 'fr' ? 'Distribution Linux Socle & Canal (Stable / Beta / Testing)' : 'Base Linux Distribution & Release Channel'}
              <InfoTooltip
                text={lang === 'fr' 
                  ? 'Le socle détermine le gestionnaire de paquets (APT, Pacman, DNF, APK, XBPS, Nix), la version du noyau et les dépôts de logiciels.'
                  : 'The base defines the package manager (APT, Pacman, DNF, APK, XBPS, Nix) and package repositories.'}
              />
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {lang === 'fr' 
                ? 'Choisissez parmi les dernières versions officielles et canaux de test (Debian 13 Trixie, Ubuntu 25.04 Beta, Fedora 42 Rawhide, CachyOS, Kali).'
                : 'Select from official latest releases and beta/testing channels (Debian 13 Trixie, Ubuntu 25.04 Beta, Fedora 42, CachyOS, Kali).'}
            </p>
          </div>

          {onOpenScreenshots && (
            <button
              onClick={() => onOpenScreenshots()}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '5px 10px', color: 'var(--cyan)' }}
            >
              <ImageIcon size={13} />
              <span>{lang === 'fr' ? '📸 Galerie des Captures & Aperçus' : '📸 Screenshot Gallery'}</span>
            </button>
          )}
        </div>

        <div className="cards-grid">
          {DISTROS.map(distro => {
            const isSelected = recipe.distro === distro.id;
            return (
              <div
                key={distro.id}
                onClick={() => {
                  const newArch = distro.supportedArch.includes(recipe.arch) ? recipe.arch : distro.supportedArch[0];
                  onChange({
                    distro: distro.id,
                    distroVersion: distro.version,
                    arch: newArch,
                    outputFormat: recipe.outputFormat === 'rpi_sd' && (distro.id !== 'raspbian' || newArch !== 'aarch64')
                      ? 'iso_hybrid' : recipe.outputFormat,
                  });
                }}
                className={`select-card ${isSelected ? 'selected' : ''}`}
                style={{ position: 'relative' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '7px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <BrandLogo logo={DISTRO_LOGOS[distro.id]} size={15} />
                    </div>
                    <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {distro.name}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {distro.isBeta && (
                      <span className="badge badge-amber" style={{ fontSize: '0.58rem', padding: '1px 4px', fontWeight: 700 }}>
                        BETA
                      </span>
                    )}
                    <span className="badge badge-cyan" style={{ fontSize: '0.64rem' }}>
                      {distro.badge}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: distro.color, fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {liveDistros[distro.id]?.isLive ? (
                    <>
                      <Rss size={9} />
                      <span>{liveDistros[distro.id].latest}{liveDistros[distro.id].codename ? ` "${liveDistros[distro.id].codename}"` : ''}</span>
                      {liveDistros[distro.id].releaseDate && (
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({liveDistros[distro.id].releaseDate})</span>
                      )}
                    </>
                  ) : (
                    <span>{distro.version}</span>
                  )}
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '10px', minHeight: '38px' }}>
                  {distro.description}
                </p>

                <div style={{
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                }}>
                  <span>Gestionnaire: <strong style={{ color: 'var(--cyan)' }}>{distro.packageManager.toUpperCase()}</strong></span>
                  {onOpenScreenshots ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenScreenshots(distro.id);
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        color: '#fb923c',
                        cursor: 'pointer',
                        fontSize: '0.68rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <ImageIcon size={11} />
                      <span>{lang === 'fr' ? 'Aperçu' : 'Preview'}</span>
                    </button>
                  ) : (
                    <span>Base ISO: <strong style={{ color: '#f1f5f9' }}>~{distro.baseIsoSizeMB} Mo</strong></span>
                  )}
                </div>

                {isSelected && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    <CheckCircle2 size={16} color="var(--cyan)" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Architecture & Target Format */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Architecture */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="var(--cyan)" />
            {lang === 'fr' ? 'Architecture Processeur' : 'Target CPU Architecture'}
            <InfoTooltip
              text={lang === 'fr' 
                ? 'Sélectionnez x86_64 pour PC/Serveurs Intel/AMD, ou ARM64 pour Raspberry Pi et VM Apple Silicon.'
                : 'Select x86_64 for standard PCs/Servers, or ARM64 for Raspberry Pi and Apple Silicon VMs.'}
            />
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {architectures.map(arch => {
              const isSelected = recipe.arch === arch.id;
              return (
                <div
                  key={arch.id}
                  onClick={() => onChange({
                    arch: arch.id,
                    outputFormat: recipe.outputFormat === 'rpi_sd' && (recipe.distro !== 'raspbian' || arch.id !== 'aarch64')
                      ? 'iso_hybrid' : recipe.outputFormat,
                  })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(249, 115, 22, 0.1)' : 'rgba(10, 15, 28, 0.4)',
                    border: `1px solid ${isSelected ? 'var(--cyan)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                        {arch.name}
                      </span>
                      <InfoTooltip text={lang === 'fr' ? arch.tipFr : arch.tipEn} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {arch.desc}
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 size={15} color="var(--cyan)" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Output Format */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="var(--emerald)" />
            {lang === 'fr' ? 'Format de Sortie / Image' : 'Target Output Format'}
            <InfoTooltip
              text={lang === 'fr'
                ? 'Choisissez ISO Hybride pour clé USB bootable, WSL2 pour lancer sous Windows, ou QCOW2/VMDK pour machines virtuelles.'
                : 'Choose Hybrid ISO for bootable USB, WSL2 for Windows execution, or QCOW2/VMDK for hypervisors.'}
            />
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {formats.map(fmt => {
              const isSelected = recipe.outputFormat === fmt.id;
              // rpi_sd n'est réellement implémenté (bootstrap ARM64 + partitionnement FAT32/ext4,
              // vérifié en live sur GitHub Actions) que pour Raspberry Pi OS en ARM64. Choisi hors
              // de ce cas, le script généré retombe silencieusement sur une ISO — mieux vaut le
              // désactiver ici plutôt que de laisser l'utilisateur le découvrir dans le script.
              const isRpiSdUnavailable = fmt.id === 'rpi_sd' && (recipe.distro !== 'raspbian' || recipe.arch !== 'aarch64');
              return (
                <div
                  key={fmt.id}
                  onClick={() => { if (!isRpiSdUnavailable) onChange({ outputFormat: fmt.id }); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(132, 160, 92, 0.1)' : 'rgba(10, 15, 28, 0.4)',
                    border: `1px solid ${isSelected ? 'var(--emerald)' : 'var(--border-subtle)'}`,
                    cursor: isRpiSdUnavailable ? 'not-allowed' : 'pointer',
                    opacity: isRpiSdUnavailable ? 0.45 : 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{fmt.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.84rem', color: isSelected ? '#ffffff' : 'var(--text-main)' }}>
                        {fmt.name}
                      </span>
                      <InfoTooltip text={lang === 'fr' ? fmt.tooltipFr : fmt.tooltipEn} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {isRpiSdUnavailable
                        ? (lang === 'fr' ? 'Nécessite Raspberry Pi OS + architecture ARM64' : 'Requires Raspberry Pi OS + ARM64 architecture')
                        : fmt.desc}
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 size={15} color="var(--emerald)" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Kernel Selection */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="#f59e0b" />
            {lang === 'fr' ? 'Optimisation du Noyau Linux (Kernels 6.13, 6.14 Beta, CachyOS BORE)' : 'Linux Kernel Tuning (6.13, 6.14 Beta, CachyOS BORE)'}
            <InfoTooltip
              text={lang === 'fr'
                ? 'Le noyau CachyOS/Zen/Liquorix optimise l’ordonnanceur pour les jeux et le desktop, le noyau Hardened renforce l’isolation mémoire.'
                : 'CachyOS/Zen/Liquorix prioritizes gaming & desktop responsiveness; Hardened kernel maximizes memory isolation.'}
            />
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {lang === 'fr'
              ? 'Adaptez le noyau selon vos besoins : faible latence pour le bureau/gaming, sécurité durcie, temps réel déterministe ou stabilité long terme.'
              : 'Tune the kernel for low latency desktop, e-sport gaming, high-security hardening, or long term stability.'}
          </p>
        </div>

        <KernelUpdateChecker lang={lang} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {KERNEL_OPTIONS.map(k => {
            const isSelected = recipe.kernel === k.id;
            return (
              <div
                key={k.id}
                onClick={() => onChange({ kernel: k.id })}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'rgba(10, 15, 28, 0.4)',
                  border: `1px solid ${isSelected ? '#f59e0b' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: isSelected ? '#fbbf24' : 'var(--text-main)' }}>
                    {k.name}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {k.isBeta && (
                      <span className="badge badge-amber" style={{ fontSize: '0.56rem', padding: '1px 3px', fontWeight: 700 }}>
                        BETA
                      </span>
                    )}
                    <span className="badge badge-amber" style={{ fontSize: '0.62rem' }}>
                      {k.badge}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  {k.version}
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.35', marginBottom: '8px' }}>
                  {k.description}
                </p>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Latence : <strong style={{ color: 'var(--text-main)' }}>{k.latency}</strong></span>
                  <span>Stabilité : <strong style={{ color: 'var(--text-main)' }}>{k.stability}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
