import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Heart, ExternalLink, HardDrive, Layers, Globe } from 'lucide-react';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fr' | 'en';
}

export const PresentationModal: React.FC<PresentationModalProps> = ({ isOpen, onClose, lang }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'simulators' | 'security' | 'gaming' | 'cloud' | 'system'>('all');

  if (!isOpen) return null;

  const milestones = [
    {
      id: 'm1',
      category: 'simulators',
      icon: '🖥️',
      titleFr: 'Simulateur de Bureau en Direct (Live Desktop 16:9)',
      titleEn: 'Live Desktop Environment Preview (16:9)',
      descFr: 'Rendu temps réel du bureau (KDE Plasma, GNOME, XFCE) avec fond d\'écran SVG actif, fenêtres personnalisées, terminal Fastfetch et menu démarrer interactif.',
      descEn: 'Real-time desktop rendering (KDE, GNOME, XFCE) with active SVG wallpaper, styled windows, Fastfetch and start menu.',
      tag: 'Chantier 27',
      color: '#38bdf8',
    },
    {
      id: 'm2',
      category: 'simulators',
      icon: '🎬',
      titleFr: 'Simulateur de Démarrage Plymouth & GRUB 2 HD',
      titleEn: 'Plymouth Boot Splash & GRUB 2 HD Simulator',
      descFr: 'Prévisualisation fidèle des 7 thèmes de boot splash Plymouth et du menu graphique GRUB HD avec compte à rebours interactif et mode séquence complète.',
      descEn: 'Accurate preview of 7 Plymouth themes and GRUB HD graphical bootloader with countdown and full boot sequence.',
      tag: 'Chantier 26',
      color: '#c084fc',
    },
    {
      id: 'm3',
      category: 'security',
      icon: '🛡️',
      titleFr: 'Mode « OS Immuable » (RootFS Read-Only + OverlayFS)',
      titleEn: 'Immutable OS Mode (RootFS Read-Only + OverlayFS)',
      descFr: 'Racine système montée en lecture seule stricte couplée à un tmpfs en RAM via hook initramfs. Toute modification s\'efface au reboot, avec persistance sélective.',
      descEn: 'Root filesystem mounted strictly read-only backed by a RAM tmpfs. Wipes clean on reboot, with selective persistence.',
      tag: 'Chantier 27',
      color: '#10b981',
    },
    {
      id: 'm4',
      category: 'system',
      icon: '📦',
      titleFr: 'Dépôts Officiels Tiers Modernes (APT Keyrings & deb822)',
      titleEn: 'Modern Third-Party Official Repos (deb822 Keyrings)',
      descFr: 'Injection 1-clic sans apt-key obsolète avec trousseaux /etc/apt/keyrings/*.gpg pour VSCodium, Docker CE, WineHQ multilib i386, NodeSource 22, XanMod, Brave, LibreWolf.',
      descEn: '1-click deb822 injection with modern /etc/apt/keyrings/ for VSCodium, Docker CE, WineHQ, NodeSource, XanMod, Brave, LibreWolf.',
      tag: 'Chantier 27',
      color: '#a855f7',
    },
    {
      id: 'm5',
      category: 'security',
      icon: '🖧',
      titleFr: 'Passerelle Réseau & Sécurité Domestique OOB',
      titleEn: 'Network Security & Gateway Profile OOB',
      descFr: 'Déploiement autonome d\'AdGuard Home (port 53 DNS + web 3000), WireGuard VPN server, console Cockpit HTTPS 9090, fail2ban et routage IP.',
      descEn: 'Autonomous AdGuard Home (DNS 53 + web 3000), WireGuard VPN server, Cockpit console, fail2ban and IP forwarding.',
      tag: 'Chantier 27',
      color: '#ef4444',
    },
    {
      id: 'm6',
      category: 'system',
      icon: '💾',
      titleFr: 'Assistant de Gravure USB avec Persistance Réelle',
      titleEn: 'USB Flashing Assistant with Live Persistence',
      descFr: 'Scripts flash-usb.sh et flash-usb.bat avec détection USB automatique, gardes-fous contre l\'écrasement des disques système et partition de persistance Casper (/ union).',
      descEn: 'Safe flash-usb.sh and flash-usb.bat with automatic USB detection, disk safety guards, and Casper live persistence.',
      tag: 'Chantier 27',
      color: '#f59e0b',
    },
    {
      id: 'm7',
      category: 'gaming',
      icon: '🚀',
      titleFr: 'Modèle Officiel « MadOS ROG Edition » & TCP BBR+',
      titleEn: 'Official « MadOS ROG Edition » Preset & TCP BBR+',
      descFr: 'Ubuntu 24.04 LTS, KDE Plasma, noyau XanMod EDGE, stack gaming Proton/Gamescope/MangoHUD et sysctl TCP BBR+ basse latence.',
      descEn: 'Ubuntu 24.04 LTS, KDE Plasma, XanMod EDGE kernel, full gaming stack, and ultra-low latency TCP BBR+ sysctl.',
      tag: 'Chantier 16',
      color: '#f43f5e',
    },
    {
      id: 'm8',
      category: 'gaming',
      icon: '🕹️',
      titleFr: 'Mode « Steam Machine » (Living Room Console Edition)',
      titleEn: '« Steam Machine » Living Room Console Mode',
      descFr: 'Session Gamescope Steam GamepadUI, autostart console de salon et règles UDEV officielles pour manettes (Xbox, DualSense PS5, Switch Pro, 8BitDo).',
      descEn: 'Gamescope Steam GamepadUI session, console autostart, and official UDEV gamepad rules (Xbox, DualSense, Switch Pro, 8BitDo).',
      tag: 'Chantier 18',
      color: '#ec4899',
    },
    {
      id: 'm9',
      category: 'security',
      icon: '🔐',
      titleFr: 'Chiffrement Intégral LUKS2 & CIS Benchmark 1 et 2',
      titleEn: 'LUKS2 Full Disk Encryption & CIS Benchmark 1 & 2',
      descFr: 'Formatage cryptsetup luksFormat LUKS2, crypttab, arguments GRUB rd.luks.name= et durcissement sysctl, core dumps et permissions 027.',
      descEn: 'Full LUKS2 disk encryption, crypttab, GRUB arguments, and CIS Benchmark level 1 & 2 hardening.',
      tag: 'Chantier 1 & 20',
      color: '#10b981',
    },
    {
      id: 'm10',
      category: 'cloud',
      icon: '☁️',
      titleFr: 'Templates Cloud : Proxmox VE, AWS AMI, VirtualBox VDI',
      titleEn: 'Cloud Templates: Proxmox VE, AWS AMI, VirtualBox VDI',
      descFr: 'Génération de templates Proxmox qcow2 avec qemu-guest-agent et deploy-proxmox.sh, images brutes AWS AMI et conversion VDI.',
      descEn: 'Proxmox VE qcow2 templates with deploy-proxmox.sh, AWS AMI upload script, and native VirtualBox VDI conversion.',
      tag: 'Chantier 13',
      color: '#0ea5e9',
    },
    {
      id: 'm11',
      category: 'cloud',
      icon: '🏗️',
      titleFr: 'Infrastructure as Code : Ansible, Terraform, Cloud-Init',
      titleEn: 'Infrastructure as Code: Ansible, Terraform, Cloud-Init',
      descFr: 'Export de playbooks Ansible idempotents, manifestes Terraform / OpenTofu, cloud-init universel, et iPXE netboot.',
      descEn: 'Export of Ansible playbooks, Terraform / OpenTofu manifests, universal cloud-init, and iPXE netboot.',
      tag: 'Chantier 7 & 8',
      color: '#3b82f6',
    },
    {
      id: 'm12',
      category: 'system',
      icon: '🎨',
      titleFr: 'Design System Intégral & 9 Fonds d\'Écran SVG 1080p',
      titleEn: 'Comprehensive Design System & 9 SVG 1080p Wallpapers',
      descFr: 'Fonds d\'écran vectoriels générés en pur code SVG, typographie Fontconfig (Inter, JetBrains Mono, Fira Code), thèmes de terminaux Kitty/Alacritty.',
      descEn: 'Pure SVG wallpapers generated in code, Fontconfig typography, and multi-emulator terminal color themes.',
      tag: 'Chantier 23 & 25',
      color: '#8b5cf6',
    },
  ];

  const filteredMilestones = milestones.filter(m => activeCategory === 'all' || m.category === activeCategory);

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '95vw',
          maxWidth: '1050px',
          maxHeight: '90vh',
          borderRadius: '14px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#090d16',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.7)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🏛️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', margin: 0 }}>
                  OSForge <span style={{ color: 'var(--cyan)' }}>Studio</span> — {lang === 'fr' ? 'Présentation Complète' : 'Project Showcase'}
                </h2>
                <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                  {lang === 'fr' ? '100% Zéro Cosmétique' : '100% Zero Cosmetic'}
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                {lang === 'fr'
                  ? 'Architecture, vision d\'ingénierie et catalogue des 28 chantiers majeurs créés par LordMadTrix'
                  : 'Architecture, engineering vision, and catalog of all 28 major milestones by LordMadTrix'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Key Metrics Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '10px',
          padding: '14px 24px',
          background: 'rgba(10, 15, 28, 0.9)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {[
            { icon: <CheckCircle2 size={16} color="#10b981" />, val: '646 Tests', label: 'Vitest 100% Verts' },
            { icon: <ShieldCheck size={16} color="#84cc16" />, val: '0 Warning', label: 'Oxlint sur 70 fichiers' },
            { icon: <Layers size={16} color="#38bdf8" />, val: '28 Chantiers', label: '100% Réels & Câblés' },
            { icon: <Globe size={16} color="#c084fc" />, val: '13 Distros', label: 'Debian, Arch, Fedora, etc.' },
            { icon: <HardDrive size={16} color="#f59e0b" />, val: '10 Formats', label: 'ISO, QCOW2, AMI, WSL2...' },
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              {stat.icon}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f1f5f9' }}>{stat.val}</div>
                <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Category Filters */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.4)',
          overflowX: 'auto',
        }}>
          {[
            { id: 'all', label: lang === 'fr' ? '🌟 Tous les Chantiers' : '🌟 All Milestones' },
            { id: 'simulators', label: lang === 'fr' ? '🖥️ Simulateurs Temps Réel' : '🖥️ Real-time Simulators' },
            { id: 'security', label: lang === 'fr' ? '🛡️ Sécurité & Immuable' : '🛡️ Security & Immutable' },
            { id: 'gaming', label: lang === 'fr' ? '🎮 Gaming & ROG' : '🎮 Gaming & ROG' },
            { id: 'cloud', label: lang === 'fr' ? '☁️ Cloud, IaC & Virtualisation' : '☁️ Cloud & Virtualization' },
            { id: 'system', label: lang === 'fr' ? '⚙️ Système & Stockage' : '⚙️ System & Storage' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: activeCategory === cat.id ? 700 : 500,
                background: activeCategory === cat.id ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: activeCategory === cat.id ? '#000000' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Milestones Cards Grid */}
        <div style={{
          flex: 1,
          padding: '16px 24px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '12px',
        }}>
          {filteredMilestones.map(m => (
            <div
              key={m.id}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                borderRadius: '10px',
                padding: '14px',
                border: `1px solid ${m.color}33`,
                boxShadow: `0 4px 15px rgba(0, 0, 0, 0.4)`,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.84rem', color: '#f1f5f9' }}>
                    {lang === 'fr' ? m.titleFr : m.titleEn}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: m.color,
                  background: `${m.color}18`,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: `1px solid ${m.color}44`,
                  whiteSpace: 'nowrap',
                }}>
                  {m.tag}
                </span>
              </div>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                {lang === 'fr' ? m.descFr : m.descEn}
              </p>
            </div>
          ))}
        </div>

        {/* Modal Footer with Creator Links */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'rgba(10, 15, 28, 0.95)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {lang === 'fr' ? 'Créé par' : 'Created by'} <strong style={{ color: '#ffffff' }}>LordMadTrix</strong> • Licence MIT
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <a
              href="https://github.com/LordMadTrix/osforge-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '5px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <span>GitHub Dépôt</span>
              <ExternalLink size={12} />
            </a>

            <a
              href="https://www.patreon.com/c/LordMad"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                padding: '5px 12px',
                fontSize: '0.74rem',
                background: '#f96854',
                color: '#ffffff',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                textDecoration: 'none',
              }}
            >
              <Heart size={13} fill="#ffffff" />
              <span>{lang === 'fr' ? 'Soutenir sur Patreon' : 'Support on Patreon'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
