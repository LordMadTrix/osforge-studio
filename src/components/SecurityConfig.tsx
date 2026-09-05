import React, { useState } from 'react';
import { OSRecipe, SecurityConfig as SecurityConfigType } from '../types/os';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { Lock, FileCheck, Flame, Shield, ShieldCheck, ShieldAlert, KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SecurityConfigProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

export const SecurityConfig: React.FC<SecurityConfigProps> = ({ recipe, onChange, lang, onOpenTips }) => {
  const [showLuksPass, setShowLuksPass] = useState(false);

  const updateSec = (updated: Partial<SecurityConfigType>) => {
    onChange({ security: { ...recipe.security, ...updated } });
  };

  // Calcul dynamique et déterministe du score de sécurité (0 à 100)
  const calculateScore = () => {
    let score = 0;
    const sec = recipe.security;

    // Profil CIS Benchmark
    if (sec.cisBenchmarkLevel === 1) score += 25;
    else if (sec.cisBenchmarkLevel === 2) score += 40;
    else score += 5; // standard base

    // Pare-feu
    if (sec.firewall !== 'none') {
      score += 15;
      if ((sec.allowedPorts && sec.allowedPorts.length > 0) || sec.customAllowedPorts) {
        score += 5;
      }
    }

    // Toggles de durcissement
    if (sec.disableRootSSH) score += 10;
    if (sec.fail2ban) score += 10;
    if (sec.enableCrowdSec) score += 10;
    if (sec.appArmorOrSELinux) score += 10;
    if (sec.luksEncryption) score += 10;
    if (sec.autoSecurityUpdates) score += 5;
    if (sec.enableZram ?? recipe.enableZram) score += 5;

    // Clé SSH configurée
    if (recipe.user.sshPublicKey || recipe.user.sshImportGithubUser) score += 5;

    return Math.min(100, score);
  };

  const securityScore = calculateScore();

  const getScoreMeta = (score: number) => {
    if (score >= 85) return { color: '#10b981', label: lang === 'fr' ? 'Forteresse Maximale' : 'Fortress Max', icon: ShieldCheck, desc: lang === 'fr' ? 'Conforme aux standards CIS et durcissement strict.' : 'Meets strict CIS & enterprise hardening standards.' };
    if (score >= 60) return { color: '#06b6d4', label: lang === 'fr' ? 'Sécurité Renforcée' : 'Hardened Profile', icon: ShieldCheck, desc: lang === 'fr' ? 'Bon niveau d’isolation et de protection contre les attaques.' : 'Solid isolation and automated defense.' };
    if (score >= 35) return { color: '#f59e0b', label: lang === 'fr' ? 'Sécurité Standard' : 'Standard Baseline', icon: Shield, desc: lang === 'fr' ? 'Protection basique adaptée au développement local.' : 'Basic protection for local testing/dev.' };
    return { color: '#ef4444', label: lang === 'fr' ? 'Faible / Non Durci' : 'Low / Relaxed', icon: ShieldAlert, desc: lang === 'fr' ? 'Ports ouverts et restrictions minimales.' : 'Open ports and minimal restrictions.' };
  };

  const scoreMeta = getScoreMeta(securityScore);

  const cisLevels: { level: 0 | 1 | 2; title: string; desc: string; badge: string; tooltipFr: string; tooltipEn: string }[] = [
    {
      level: 0,
      title: 'Standard / Non Durci (Dev & Gaming)',
      desc: 'Aucune restriction spécifique. Idéal pour le confort de développement local ou jeux vidéo.',
      badge: 'Standard',
      tooltipFr: 'Permissions par défaut sans restrictions sévères pour un usage bureautique/développement.',
      tooltipEn: 'Default permissions without harsh restrictions for development or desktop usage.',
    },
    {
      level: 1,
      title: 'CIS Benchmark Level 1 (Serveur & Entreprise)',
      desc: 'Durcissement des permissions, désactivation des protocoles vulnérables, logs d’audit renforcés.',
      badge: 'Recommandé',
      tooltipFr: 'Protection standard de l’industrie respectant les guides de sécurité CIS sans impacter les applications.',
      tooltipEn: 'Industry standard security baseline adhering to CIS guidelines without breaking services.',
    },
    {
      level: 2,
      title: 'CIS Benchmark Level 2 (Défense & Finance)',
      desc: 'Isolation mémoire stricte, chiffrement obligatoire, interdiction d’exécution dans /tmp, audit maximal.',
      badge: 'Sécurité Maximale',
      tooltipFr: 'Règles militaires et financières strictes : noexec sur /tmp, auditd temps réel et contrôle d’accès renforcé.',
      tooltipEn: 'High-security profile for defense/banking: /tmp noexec, mandatory auditing and restricted system calls.',
    },
  ];

  const popularPorts = [
    { port: 22, name: 'SSH (22)', desc: 'Administration à distance' },
    { port: 80, name: 'HTTP (80)', desc: 'Serveur Web non sécurisé' },
    { port: 443, name: 'HTTPS (443)', desc: 'Serveur Web TLS sécurisé' },
    { port: 6443, name: 'K3s (6443)', desc: 'API Kubernetes' },
    { port: 9090, name: 'Cockpit (9090)', desc: 'Console d’administration Web' },
    { port: 53, name: 'DNS (53)', desc: 'Serveur de noms / Pi-hole' },
    { port: 51820, name: 'WireGuard (51820)', desc: 'VPN chiffré UDP' },
  ];

  const togglePort = (port: number) => {
    const current = recipe.security.allowedPorts || [22];
    const next = current.includes(port) ? current.filter(p => p !== port) : [...current, port];
    updateSec({ allowedPorts: next });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="security" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 0. Security Score & Posture Banner */}
      <div className="glass-panel" style={{ padding: '18px', border: `1px solid ${scoreMeta.color}40`, background: `linear-gradient(135deg, ${scoreMeta.color}0a, rgba(10, 15, 28, 0.6))` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <scoreMeta.icon size={22} color={scoreMeta.color} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {lang === 'fr' ? 'Score de Posture de Sécurité :' : 'Security Posture Score:'}
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: scoreMeta.color }}>
                  {securityScore}/100
                </span>
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {scoreMeta.desc}
              </p>
            </div>
          </div>
          <span className="badge" style={{ background: `${scoreMeta.color}20`, color: scoreMeta.color, border: `1px solid ${scoreMeta.color}60`, fontWeight: 700, fontSize: '0.74rem' }}>
            {scoreMeta.label}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden', marginBottom: '14px' }}>
          <div style={{ width: `${securityScore}%`, height: '100%', background: scoreMeta.color, transition: 'width 0.3s ease' }} />
        </div>

        {/* Checklist rapide */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.74rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: recipe.security.firewall !== 'none' ? 'var(--emerald)' : 'var(--text-muted)' }}>
            {recipe.security.firewall !== 'none' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} color="#f59e0b" />}
            {recipe.security.firewall !== 'none' ? `Pare-feu (${recipe.security.firewall.toUpperCase()})` : 'Aucun Pare-feu'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: recipe.security.cisBenchmarkLevel > 0 ? 'var(--emerald)' : 'var(--text-muted)' }}>
            {recipe.security.cisBenchmarkLevel > 0 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} color="#f59e0b" />}
            {recipe.security.cisBenchmarkLevel > 0 ? `CIS Level ${recipe.security.cisBenchmarkLevel}` : 'CIS Standard'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: recipe.security.disableRootSSH ? 'var(--emerald)' : 'var(--text-muted)' }}>
            {recipe.security.disableRootSSH ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} color="#f59e0b" />}
            {recipe.security.disableRootSSH ? 'Root SSH Bloqué' : 'Root SSH Autorisé'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: recipe.security.luksEncryption ? 'var(--emerald)' : 'var(--text-muted)' }}>
            {recipe.security.luksEncryption ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} color="#f59e0b" />}
            {recipe.security.luksEncryption ? 'Chiffrement LUKS2' : 'Disque Non Chiffré'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: recipe.security.enableCrowdSec ? 'var(--emerald)' : 'var(--text-muted)' }}>
            {recipe.security.enableCrowdSec ? <CheckCircle2 size={13} /> : <span style={{ width: '13px', height: '13px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'inline-block' }} />}
            {recipe.security.enableCrowdSec ? 'CrowdSec Actif' : 'Sans CrowdSec'}
          </div>
        </div>
      </div>

      {/* 1. CIS Benchmark Profiles */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={16} color="var(--emerald)" />
            {lang === 'fr' ? 'Profils de Conformité CIS Benchmark' : 'CIS Benchmark Compliance Profiles'}
            <InfoTooltip
              text={lang === 'fr'
                ? 'Le Center for Internet Security définit les standards de durcissement reconnus mondialement.'
                : 'Center for Internet Security establishes globally recognized OS hardening benchmarks.'}
            />
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {lang === 'fr'
              ? 'Appliquez automatiquement les recommandations CIS pour durcir les permissions et le réseau.'
              : 'Automatically apply CIS recommendations to harden system permissions and networking.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {cisLevels.map(cis => {
            const isSelected = recipe.security.cisBenchmarkLevel === cis.level;
            return (
              <div
                key={cis.level}
                onClick={() => updateSec({ cisBenchmarkLevel: cis.level })}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(132, 160, 92, 0.1)' : 'rgba(10, 15, 28, 0.4)',
                  border: `1px solid ${isSelected ? 'var(--emerald)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: isSelected ? '#a3bc7d' : 'var(--text-main)' }}>
                    {cis.title}
                  </span>
                  <span className="badge badge-emerald" style={{ fontSize: '0.64rem' }}>
                    {cis.badge}
                  </span>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                  {cis.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Firewall & Network Defense */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={16} color="#ef4444" />
          {lang === 'fr' ? 'Pare-feu & Filtrage Réseau' : 'Firewall & Network Filtering'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Bloque par défaut tout le trafic entrant et autorise uniquement les ports nécessaires (SSH, HTTP, etc.).'
              : 'Blocks incoming traffic by default, whitelisting necessary ports only.'}
          />
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          {[
            { id: 'ufw', name: 'UFW', desc: 'Règles simples et éprouvées (Debian/Ubuntu/Arch/Alpine)' },
            { id: 'firewalld', name: 'Firewalld', desc: 'Démon dynamique par zones (Fedora/RHEL/openSUSE)' },
            { id: 'nftables', name: 'NFTables Moderne', desc: 'Filtrage de paquets haute performance niveau noyau' },
            { id: 'none', name: 'Aucun Pare-feu', desc: 'Tous les ports ouverts (développement local)' },
          ].map(fw => {
            const isSelected = recipe.security.firewall === fw.id;
            return (
              <div
                key={fw.id}
                onClick={() => updateSec({ firewall: fw.id as any })}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(10, 15, 28, 0.4)',
                  border: `1px solid ${isSelected ? '#ef4444' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.84rem', color: isSelected ? '#f87171' : 'var(--text-main)' }}>
                  {fw.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {fw.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Granular Ports Selection */}
        {recipe.security.firewall !== 'none' && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '12px' }}>
            <h4 style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              {lang === 'fr' ? 'Ports Réseau Autorisés (Whitelist Inbound) :' : 'Allowed Network Ports (Inbound Whitelist):'}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginBottom: '12px' }}>
              {popularPorts.map(p => {
                const allowed = (recipe.security.allowedPorts || [22]).includes(p.port);
                return (
                  <label
                    key={p.port}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: allowed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${allowed ? 'var(--emerald)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allowed}
                      onChange={() => togglePort(p.port)}
                      style={{ accentColor: 'var(--emerald)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.78rem', color: allowed ? 'var(--emerald)' : 'var(--text-main)' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                        {p.desc}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                {lang === 'fr' ? 'Ports additionnels personnalisés (séparés par des virgules ou espaces) :' : 'Additional custom ports (comma/space separated):'}
              </label>
              <input
                type="text"
                className="input-text font-mono"
                style={{ fontSize: '0.78rem' }}
                value={recipe.security.customAllowedPorts || ''}
                onChange={(e) => updateSec({ customAllowedPorts: e.target.value })}
                placeholder="ex: 8080 3000 8443 27017"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Security Hardening Toggles */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={16} color="var(--cyan)" />
          {lang === 'fr' ? 'Options de Durcissement Avancées' : 'Advanced Hardening Options'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px' }}>
          {/* AppArmor / SELinux */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                AppArmor / SELinux (LSM)
                <InfoTooltip text="Modules de sécurité du noyau limitant les privilèges des processus même root." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Contrôle d'accès obligatoire des processus
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.security.appArmorOrSELinux}
                onChange={(e) => updateSec({ appArmorOrSELinux: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* LUKS Disk Encryption */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: `1px solid ${recipe.security.luksEncryption ? 'var(--emerald)' : 'var(--border-subtle)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                  Chiffrement Intégral LUKS2
                  <InfoTooltip text="Chiffre les partitions système et données avec AES-XTS (cryptsetup LUKS2) pour empêcher l'extraction de données hors ligne." />
                </div>
                <div style={{ fontSize: '0.72rem', color: recipe.security.luksEncryption ? 'var(--emerald)' : 'var(--text-muted)' }}>
                  {recipe.security.luksEncryption ? '✓ Actif pour les images disques (QCOW2/RAW/VMDK)' : 'Protection contre le vol physique et l’inspection d’image'}
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={recipe.security.luksEncryption}
                  onChange={(e) => updateSec({ luksEncryption: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {recipe.security.luksEncryption && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  <KeyRound size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {lang === 'fr' ? 'Passphrase de déverrouillage LUKS :' : 'LUKS Unlock Passphrase:'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showLuksPass ? 'text' : 'password'}
                    className="input-text font-mono"
                    style={{ fontSize: '0.78rem', paddingRight: '32px' }}
                    value={recipe.security.luksPassword || ''}
                    onChange={(e) => updateSec({ luksPassword: e.target.value })}
                    placeholder="Passphrase sécurisée..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowLuksPass(!showLuksPass)}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showLuksPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fail2Ban */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                Protection Fail2ban
                <InfoTooltip text="Analyse les logs d’authentification et bannit temporairement les adresses IP suspectes." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Bannissement automatique des attaques force brute
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.security.fail2ban}
                onChange={(e) => updateSec({ fail2ban: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* CrowdSec Collaborative Defense */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: recipe.security.enableCrowdSec ? 'rgba(56, 189, 248, 0.12)' : 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: recipe.security.enableCrowdSec ? '1px solid #38bdf8' : '1px solid var(--border-subtle)', transition: 'all 0.15s ease' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: recipe.security.enableCrowdSec ? '#38bdf8' : '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🛡️</span>
                <span>{lang === 'fr' ? 'Cyber-Défense Active CrowdSec' : 'CrowdSec Collaborative Defense'}</span>
                <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>Consensus IP</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {lang === 'fr'
                  ? 'Analyse comportementale en temps réel et bouncer de pare-feu alimenté par le consensus mondial de menaces'
                  : 'Real-time behavioral analysis and firewall bouncer powered by global threat intelligence'}
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.security.enableCrowdSec ?? false}
                onChange={(e) => updateSec({ enableCrowdSec: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Disable Root SSH */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                Désactiver SSH Root
                <InfoTooltip text="Oblige à se connecter avec un utilisateur standard avant d’utiliser sudo." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                PermitRootLogin no dans sshd_config
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.security.disableRootSSH}
                onChange={(e) => updateSec({ disableRootSSH: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Auto Security Updates */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                Mises à jour de sécurité auto
                <InfoTooltip text="Installe automatiquement les correctifs de vulnérabilités CVE sans intervention." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Installation sans redémarrage des correctifs CVE
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.security.autoSecurityUpdates}
                onChange={(e) => updateSec({ autoSecurityUpdates: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* zRAM Compressed Swap */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                Swap zRAM Compressé (ZSTD)
                <InfoTooltip text="Alloue un périphérique de swap compressé directement en mémoire vive pour éviter les ralentissements disque et les OOM (Out Of Memory)." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Compression en RAM haute performance (zram-generator)
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.security.enableZram ?? recipe.enableZram ?? false}
                onChange={(e) => {
                  updateSec({ enableZram: e.target.checked });
                  onChange({ enableZram: e.target.checked });
                }}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
