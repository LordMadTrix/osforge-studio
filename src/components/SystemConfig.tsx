import React from 'react';
import { OSRecipe, NetworkConfig as NetworkConfigType } from '../types/os';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { User, Key, Globe, TerminalSquare, Wifi, Network, Zap, Shield } from 'lucide-react';

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

  const updateNet = (updated: Partial<NetworkConfigType>) => {
    onChange({ network: { ...recipe.network, ...updated } });
  };

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
                ? 'Active OpenSSH server et injecte votre clé publique dans ~/.ssh/authorized_keys ou l’importe depuis GitHub.'
                : 'Enables OpenSSH daemon and injects public key into ~/.ssh/authorized_keys or imports from GitHub.'}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                {lang === 'fr' ? 'Ou import automatique depuis un compte GitHub :' : 'Or import keys directly from GitHub account:'}
              </label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="ex: torvalds (récupère https://github.com/torvalds.keys)"
                value={recipe.user.sshImportGithubUser || ''}
                onChange={(e) => onChange({
                  user: { ...recipe.user, sshImportGithubUser: e.target.value }
                })}
                style={{ fontSize: '0.78rem' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Headless Network, Wi-Fi & VPN Pre-configuration */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Network size={16} color="var(--emerald)" />
          {lang === 'fr' ? 'Pré-configuration Réseau, Wi-Fi & VPN Headless OOB' : 'Headless Network, Wi-Fi & VPN Pre-configuration'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Configure automatiquement le Wi-Fi, l’adresse IP et les tunnels VPN WireGuard / Tailscale sans écran ni clavier.'
              : 'Pre-configures Wi-Fi credentials, IP settings and WireGuard / Tailscale VPNs for headless out-of-the-box networking.'}
          />
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Wi-Fi Headless Toggle & Credentials */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wifi size={16} color="var(--cyan)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                    {lang === 'fr' ? 'Activer Wi-Fi Headless au Premier Démarrage' : 'Enable Headless Wi-Fi on First Boot'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {lang === 'fr' ? 'Génère la connexion NetworkManager / wpa_supplicant' : 'Generates NetworkManager / wpa_supplicant connection profile'}
                  </div>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={recipe.network?.enableWifi || false}
                  onChange={(e) => updateNet({ enableWifi: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {recipe.network?.enableWifi && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {lang === 'fr' ? 'Nom du Réseau Wi-Fi (SSID) :' : 'Wi-Fi Network SSID:'}
                  </label>
                  <input
                    type="text"
                    className="input-text font-mono"
                    style={{ fontSize: '0.78rem' }}
                    value={recipe.network?.wifiSsid || ''}
                    onChange={(e) => updateNet({ wifiSsid: e.target.value })}
                    placeholder="MonReseauWifi"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {lang === 'fr' ? 'Clé de sécurité (WPA2/WPA3-PSK) :' : 'Security Passphrase (WPA2/WPA3):'}
                  </label>
                  <input
                    type="password"
                    className="input-text font-mono"
                    style={{ fontSize: '0.78rem' }}
                    value={recipe.network?.wifiPassword || ''}
                    onChange={(e) => updateNet({ wifiPassword: e.target.value })}
                    placeholder="••••••••••••"
                  />
                </div>
              </div>
            )}
          </div>

          {/* WireGuard VPN Toggle & Config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color="var(--violet)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                    {lang === 'fr' ? 'Activer Tunnel VPN WireGuard (wg0)' : 'Enable WireGuard VPN Tunnel (wg0)'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {lang === 'fr' ? 'Génère /etc/wireguard/wg0.conf et active le service systemd' : 'Generates /etc/wireguard/wg0.conf and enables systemd service'}
                  </div>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={recipe.network?.enableWireguard || false}
                  onChange={(e) => updateNet({ enableWireguard: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {recipe.network?.enableWireguard && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {lang === 'fr' ? 'Adresse IP Client :' : 'Client IP Address:'}
                  </label>
                  <input
                    type="text"
                    className="input-text font-mono"
                    style={{ fontSize: '0.78rem' }}
                    value={recipe.network?.wireguardAddress || ''}
                    onChange={(e) => updateNet({ wireguardAddress: e.target.value })}
                    placeholder="10.10.0.2/24"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {lang === 'fr' ? 'Serveur Distant (Endpoint) :' : 'Server Endpoint:'}
                  </label>
                  <input
                    type="text"
                    className="input-text font-mono"
                    style={{ fontSize: '0.78rem' }}
                    value={recipe.network?.wireguardEndpoint || ''}
                    onChange={(e) => updateNet({ wireguardEndpoint: e.target.value })}
                    placeholder="vpn.example.com:51820"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tailscale VPN Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Network size={16} color="#3b82f6" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                    {lang === 'fr' ? 'Activer VPN Mesh Tailscale OOB' : 'Enable Tailscale Mesh VPN OOB'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {lang === 'fr' ? 'Active le démon tailscaled et connecte le nœud au réseau privé' : 'Enables tailscaled daemon and auto-joins network'}
                  </div>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={recipe.network?.enableTailscale || false}
                  onChange={(e) => updateNet({ enableTailscale: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {recipe.network?.enableTailscale && (
              <div style={{ marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {lang === 'fr' ? 'Clé d’authentification (Auth Key optionnelle) :' : 'Tailscale Auth Key (optional):'}
                </label>
                <input
                  type="password"
                  className="input-text font-mono"
                  style={{ fontSize: '0.78rem' }}
                  value={recipe.network?.tailscaleAuthKey || ''}
                  onChange={(e) => updateNet({ tailscaleAuthKey: e.target.value })}
                  placeholder="tskey-auth-kXXXXX..."
                />
              </div>
            )}
          </div>

          {/* IP Mode (DHCP vs Static) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                {lang === 'fr' ? 'Mode d’adressage IP :' : 'IP Addressing Mode:'}
              </label>
              <select
                className="select-custom"
                value={recipe.network?.ipMode || 'dhcp'}
                onChange={(e) => updateNet({ ipMode: e.target.value as any })}
              >
                <option value="dhcp">DHCP (Automatique standard)</option>
                <option value="static">IP Statique (Serveur / Passerelle)</option>
              </select>
            </div>

            {recipe.network?.ipMode === 'static' && (
              <>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {lang === 'fr' ? 'Adresse IP / Masque CIDR :' : 'Static IP / CIDR Mask:'}
                  </label>
                  <input
                    type="text"
                    className="input-text font-mono"
                    style={{ fontSize: '0.78rem' }}
                    value={recipe.network?.staticIp || ''}
                    onChange={(e) => updateNet({ staticIp: e.target.value })}
                    placeholder="192.168.1.50/24"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {lang === 'fr' ? 'Passerelle par défaut (Gateway) :' : 'Default Gateway:'}
                  </label>
                  <input
                    type="text"
                    className="input-text font-mono"
                    style={{ fontSize: '0.78rem' }}
                    value={recipe.network?.gateway || ''}
                    onChange={(e) => updateNet({ gateway: e.target.value })}
                    placeholder="192.168.1.1"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 5. Advanced System Profiles (Rescue, Gaming, Battery, Community Repos) */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} color="#f59e0b" />
          {lang === 'fr' ? 'Profils Système Avancés & Optimisations' : 'Advanced System Profiles & Optimizations'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Active des optimisations réelles du noyau, des profils d’alimentation ou des dépôts communautaires.'
              : 'Enables kernel optimizations, power profiles, or community package repositories.'}
          />
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Gaming Optimizations */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                {lang === 'fr' ? '🎮 Profil Gaming & Mesa Vulkan' : '🎮 Gaming Profile & Vulkan'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {lang === 'fr' ? 'Gamemode, MangoHud, sysctl vm.max_map_count' : 'Gamemode, MangoHud, sysctl vm.max_map_count'}
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.enableGamingOptimizations ?? false}
                onChange={(e) => onChange({ enableGamingOptimizations: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Laptop Power Saving */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                {lang === 'fr' ? '🔋 Profil Énergie Laptop (TLP)' : '🔋 Laptop Power Saving (TLP)'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {lang === 'fr' ? 'Optimisation de la batterie et gestion thermique' : 'Battery optimization & thermal management'}
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.enablePowerSaving ?? false}
                onChange={(e) => onChange({ enablePowerSaving: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Community Repos */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                {lang === 'fr' ? '📦 Dépôts Communautaires' : '📦 Community Repositories'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {lang === 'fr' ? 'RPM Fusion, Packman, Alpine Community, AUR' : 'RPM Fusion, Packman, Alpine Community, AUR'}
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.enableCommunityRepos ?? false}
                onChange={(e) => onChange({ enableCommunityRepos: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Live Rescue RAM Boot */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                {lang === 'fr' ? '🧰 Mode Live Rescue (RAM toram)' : '🧰 Live Rescue Mode (toram)'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {lang === 'fr' ? 'Entrée GRUB dédiée pour charger 100% en RAM' : 'Dedicated GRUB entry to load 100% into RAM'}
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.enableLiveRescue ?? false}
                onChange={(e) => onChange({ enableLiveRescue: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* 6. Timezone, Locale & Keyboard */}
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
              {keyboardLayouts.map((k) => (
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
              {timezones.map((tz) => (
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

      {/* 7. Kernel Boot Parameters & Flatpak App Store */}
      <div className="glass-panel" style={{ padding: '18px' }}>
        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TerminalSquare size={16} color="var(--purple)" />
          {lang === 'fr' ? 'Ligne de Commande Noyau & Dépôt Flatpak' : 'Kernel Cmdline & Flatpak Store'}
          <InfoTooltip
            text={lang === 'fr'
              ? 'Injecte des paramètres au bootloader (GRUB / cmdline.txt) et pré-active le magasin Flathub.'
              : 'Inject custom kernel boot parameters and enable Flathub app store out of the box.'}
          />
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              {lang === 'fr' ? 'Paramètres Noyau Personnalisés (GRUB / cmdline.txt) :' : 'Custom Kernel Cmdline Arguments:'}
            </label>
            <input
              type="text"
              className="input-text font-mono"
              value={recipe.kernelCmdline || ''}
              onChange={(e) => onChange({ kernelCmdline: e.target.value })}
              placeholder="ex: transparent_hugepage=madvise split_lock_mitigate=0 nomodeset"
              style={{ fontSize: '0.8rem' }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              {lang === 'fr'
                ? 'Ces arguments seront directement passés à la ligne linux de GRUB (ISO/VM) ou à cmdline.txt (Raspberry Pi).'
                : 'Appended directly to GRUB linux entry (ISO/Disk) or Raspberry Pi cmdline.txt.'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#f1f5f9' }}>
                {lang === 'fr' ? 'Activer Flatpak & Dépôt Flathub OOB' : 'Enable Flatpak & Flathub OOB'}
                <InfoTooltip text="Installe l’écosystème Flatpak et ajoute automatiquement le dépôt distant Flathub au premier démarrage." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {lang === 'fr' ? 'Accès à des milliers d’applications sandboxées via Flathub' : 'Access thousands of sandboxed applications via Flathub'}
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.enableFlatpak ?? false}
                onChange={(e) => onChange({ enableFlatpak: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
