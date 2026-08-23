import React from 'react';
import { OSRecipe, SecurityConfig as SecurityConfigType } from '../types/os';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { Lock, FileCheck, Flame } from 'lucide-react';

interface SecurityConfigProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

export const SecurityConfig: React.FC<SecurityConfigProps> = ({ recipe, onChange, lang, onOpenTips }) => {
  const updateSec = (updated: Partial<SecurityConfigType>) => {
    onChange({ security: { ...recipe.security, ...updated } });
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="security" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 1. CIS Benchmark Profiles */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(10, 15, 28, 0.4)',
                  border: `1px solid ${isSelected ? 'var(--emerald)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: isSelected ? '#34d399' : '#f8fafc' }}>
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
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={16} color="#ef4444" />
          {lang === 'fr' ? 'Pare-feu & Filtrage Réseau' : 'Firewall & Network Filtering'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'UFW bloque par défaut tout le trafic entrant et autorise uniquement les ports nécessaires (SSH, HTTP).'
              : 'UFW blocks incoming traffic by default, whitelisting necessary ports only.'}
          />
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
          {[
            { id: 'ufw', name: 'UFW (Uncomplicated Firewall)', desc: 'Règles simples et éprouvées avec ports stricts' },
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
                <div style={{ fontWeight: 600, fontSize: '0.84rem', color: isSelected ? '#f87171' : '#f8fafc' }}>
                  {fw.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {fw.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Security Hardening Toggles */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                Chiffrement complet LUKS
                <InfoTooltip text="Chiffre les partitions système et données avec AES-XTS pour empêcher le vol de données." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Chiffrement AES-XTS du disque et du swap
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
        </div>
      </div>
    </div>
  );
};
