import React from 'react';
import { OSRecipe } from '../types/os';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { User, Key, Globe, TerminalSquare } from 'lucide-react';

interface SystemConfigProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

export const SystemConfig: React.FC<SystemConfigProps> = ({ recipe, onChange, lang, onOpenTips }) => {
  const keyboardLayouts = [
    { id: 'fr', name: 'Français (AZERTY standard)' },
    { id: 'us', name: 'Anglais US (QWERTY standard)' },
    { id: 'uk', name: 'Anglais UK (QWERTY)' },
    { id: 'de', name: 'Allemand (QWERTZ)' },
    { id: 'es', name: 'Espagnol' },
    { id: 'it', name: 'Italien' },
    { id: 'ca-fr', name: 'Canadien Français' },
    { id: 'be', name: 'Belge (AZERTY)' },
    { id: 'ch-fr', name: 'Suisse Romand' },
  ];

  const timezones = [
    'Europe/Paris',
    'Europe/Brussels',
    'Europe/Zurich',
    'America/Montreal',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Berlin',
    'Asia/Tokyo',
    'UTC',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Contextual Pro Tip */}
      <ContextTip category="system" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 1. Hostname & System Identity */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TerminalSquare size={16} color="var(--cyan)" />
          {lang === 'fr' ? 'Identité du Système & Nom d’Hôte' : 'System Identity & Hostname'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Le nom d’hôte (hostname) identifiera votre machine sur le réseau local et dans les logs.'
              : 'Hostname identifies this device on local networks and syslog messages.'}
          />
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Nom du système (OS Name) :' : 'OS Display Name:'}
            </label>
            <input
              type="text"
              className="input-text"
              value={recipe.branding.osName}
              onChange={(e) => onChange({
                branding: { ...recipe.branding, osName: e.target.value }
              })}
              placeholder="ex: ForgeOS"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Édition / Version :' : 'Edition / Version:'}
            </label>
            <input
              type="text"
              className="input-text"
              value={recipe.branding.editionName}
              onChange={(e) => onChange({
                branding: { ...recipe.branding, editionName: e.target.value }
              })}
              placeholder="ex: Developer Edition"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Nom d’hôte réseau (Hostname) :' : 'Network Hostname:'}
            </label>
            <input
              type="text"
              className="input-text font-mono"
              value={recipe.hostname}
              onChange={(e) => onChange({ hostname: e.target.value })}
              placeholder="ex: forge-box"
            />
          </div>
        </div>
      </div>

      {/* 2. User Accounts & Credentials */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} color="var(--emerald)" />
          {lang === 'fr' ? 'Compte Utilisateur Principal' : 'Primary User Account'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'L’utilisateur non-root principal configuré avec son mot de passe et son shell par défaut.'
              : 'The primary non-root user account created during installation.'}
          />
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Nom d’utilisateur (Login) :' : 'Username (Login):'}
            </label>
            <input
              type="text"
              className="input-text font-mono"
              value={recipe.user.username}
              onChange={(e) => onChange({
                user: { ...recipe.user, username: e.target.value }
              })}
              placeholder="ex: developer"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Nom complet (Gecos) :' : 'Full Name:'}
            </label>
            <input
              type="text"
              className="input-text"
              value={recipe.user.fullName}
              onChange={(e) => onChange({
                user: { ...recipe.user, fullName: e.target.value }
              })}
              placeholder="ex: Jean Dupont"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Mot de passe par défaut :' : 'Default Password:'}
            </label>
            <input
              type="password"
              className="input-text font-mono"
              value={recipe.user.password || ''}
              onChange={(e) => onChange({
                user: { ...recipe.user, password: e.target.value }
              })}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Shell par défaut :' : 'Default Shell:'}
            </label>
            <select
              className="select-custom font-mono"
              value={recipe.user.shell}
              onChange={(e) => onChange({
                user: { ...recipe.user, shell: e.target.value as any }
              })}
            >
              <option value="/bin/bash">/bin/bash (Standard)</option>
              <option value="/bin/zsh">/bin/zsh (Interactif / Starship)</option>
              <option value="/bin/fish">/bin/fish (Autocomplétion)</option>
              <option value="/bin/sh">/bin/sh (Minimaliste)</option>
            </select>
          </div>
        </div>

        {/* User Toggles */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.user.sudo}
                onChange={(e) => onChange({
                  user: { ...recipe.user, sudo: e.target.checked }
                })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span style={{ fontSize: '0.84rem', fontWeight: 500, color: '#f1f5f9' }}>
              {lang === 'fr' ? 'Privilèges Administrateur (Sudo NOPASSWD)' : 'Administrator Privileges (Sudo)'}
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.user.autologin}
                onChange={(e) => onChange({
                  user: { ...recipe.user, autologin: e.target.checked }
                })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span style={{ fontSize: '0.84rem', fontWeight: 500, color: '#f1f5f9' }}>
              {lang === 'fr' ? 'Connexion Automatique au démarrage' : 'Automatic Login on Boot'}
            </span>
          </label>
        </div>
      </div>

      {/* 3. SSH & Remote Access */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={16} color="var(--violet)" />
            {lang === 'fr' ? 'Accès SSH & Clés Publiques' : 'SSH Access & Public Keys'}
            <InfoTooltip
              text={lang === 'fr'
                ? 'Active OpenSSH server et injecte votre clé publique dans ~/.ssh/authorized_keys.'
                : 'Enables OpenSSH daemon and injects public key into ~/.ssh/authorized_keys.'}
            />
          </h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.enableSSH}
                onChange={(e) => onChange({ enableSSH: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span style={{ fontSize: '0.78rem', color: 'var(--cyan)', fontWeight: 600 }}>
              {recipe.enableSSH ? 'SSH Activé' : 'SSH Désactivé'}
            </span>
          </label>
        </div>

        {recipe.enableSSH && (
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Clé SSH Publique autorisée (authorized_keys) :' : 'Authorized SSH Public Key:'}
            </label>
            <textarea
              className="textarea-custom font-mono"
              rows={2}
              placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@machine"
              value={recipe.user.sshPublicKey || ''}
              onChange={(e) => onChange({
                user: { ...recipe.user, sshPublicKey: e.target.value }
              })}
              style={{ fontSize: '0.78rem' }}
            />
          </div>
        )}
      </div>

      {/* 4. Timezone, Locale & Keyboard */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={16} color="#f59e0b" />
          {lang === 'fr' ? 'Localisation & Disposition Clavier' : 'Localization & Keyboard'}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Disposition du Clavier (Keymap) :' : 'Keyboard Layout:'}
            </label>
            <select
              className="select-custom"
              value={recipe.keyboardLayout}
              onChange={(e) => onChange({ keyboardLayout: e.target.value })}
            >
              {keyboardLayouts.map(k => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Fuseau Horaire (Timezone) :' : 'Timezone:'}
            </label>
            <select
              className="select-custom"
              value={recipe.timezone}
              onChange={(e) => onChange({ timezone: e.target.value })}
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Langue du Système (Locale) :' : 'System Locale:'}
            </label>
            <select
              className="select-custom"
              value={recipe.locale}
              onChange={(e) => onChange({ locale: e.target.value })}
            >
              <option value="fr_FR">Français (fr_FR.UTF-8)</option>
              <option value="en_US">English US (en_US.UTF-8)</option>
              <option value="en_GB">English UK (en_GB.UTF-8)</option>
              <option value="de_DE">Deutsch (de_DE.UTF-8)</option>
              <option value="es_ES">Español (es_ES.UTF-8)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
