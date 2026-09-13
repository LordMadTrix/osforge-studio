import React, { useState } from 'react';
import { OSRecipe, MangoHudPreset } from '../types/os';
import { Gamepad2, Sliders, Volume2, Cpu, Tv } from 'lucide-react';
import { ContextTip } from './ContextTip';
import { InfoTooltip } from './InfoTooltip';
import { GamingTuningModal } from './GamingTuningModal';

interface GamingConfigViewProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang: 'fr' | 'en';
  onOpenTips?: () => void;
}

export const GamingConfigView: React.FC<GamingConfigViewProps> = ({
  recipe,
  onChange,
  lang,
  onOpenTips,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const gaming = recipe.gamingConfig || {
    enableMangoHud: true,
    mangoHudPreset: 'compact_topbar',
    enableProtonGE: true,
    enableCoreCtrlProfiles: true,
    pipewireQuantumLatency: 128,
    cpuGovernor: 'performance',
  };

  const updateGaming = (updated: Partial<NonNullable<OSRecipe['gamingConfig']>>) => {
    onChange({
      enableGamingOptimizations: true,
      gamingConfig: {
        ...gaming,
        ...updated,
      },
    });
  };

  const getLatencyMs = (q: number) => {
    return ((q / 48000) * 1000).toFixed(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Contextual Tip */}
      <ContextTip category="system" lang={lang} onOpenAllTips={onOpenTips} />

      {/* 1. Moteur Principal Gaming & Profils Noyau */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gamepad2 size={20} color="#c084fc" />
              {lang === 'fr' ? 'Optimisations Gaming & Moteur Temps Réel' : 'Gaming Optimizations & Real-Time Engine'}
              <InfoTooltip
                text={lang === 'fr'
                  ? 'Injecte Feral GameMode, les tweaks de mémoire virtuelle sysctl (vm.max_map_count=2147483642), l’algorithme réseau TCP BBR+, et configure l’audio PipeWire pour éliminer toute latence.'
                  : 'Injects Feral GameMode, sysctl memory tweaks, TCP BBR+, and tunes PipeWire audio for ultra-low latency.'}
              />
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {lang === 'fr'
                ? 'Activez la suite d’optimisation bas niveau pour jeux vidéo compétitifs, émulation et stations de jeu ROG.'
                : 'Enable low-level kernel optimizations for competitive gaming, emulation, and ROG gaming rigs.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={recipe.enableGamingOptimizations ?? false}
                onChange={(e) => onChange({ enableGamingOptimizations: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: recipe.enableGamingOptimizations ? '#c084fc' : 'var(--text-muted)' }}>
              {recipe.enableGamingOptimizations
                ? (lang === 'fr' ? 'Suite Gaming Activée' : 'Gaming Suite Enabled')
                : (lang === 'fr' ? 'Désactivée' : 'Disabled')}
            </span>
          </div>
        </div>

        {/* Détail des Réglages Gaming */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', opacity: recipe.enableGamingOptimizations ? 1 : 0.6, pointerEvents: recipe.enableGamingOptimizations ? 'auto' : 'none', transition: 'opacity 0.2s ease' }}>
          
          {/* Gouverneur CPU */}
          <div style={{ padding: '14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Cpu size={16} color="#38bdf8" />
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {lang === 'fr' ? 'Régulateur de Fréquence CPU (Governor) :' : 'CPU Scaling Governor:'}
              </label>
            </div>
            <select
              className="input-select font-mono"
              value={gaming.cpuGovernor || 'performance'}
              onChange={(e) => updateGaming({ cpuGovernor: e.target.value as any })}
            >
              <option value="performance">⚡ performance (Fréquence maximale constante, zéro micro-stutter)</option>
              <option value="schedutil">📈 schedutil (Adaptatif noyau Linux moderne)</option>
              <option value="ondemand">🔄 ondemand (Montée en fréquence à la charge)</option>
              <option value="powersave">🌱 powersave (Économie d’énergie)</option>
            </select>
          </div>

          {/* Latence Audio PipeWire */}
          <div style={{ padding: '14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Volume2 size={16} color="#34d399" />
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {lang === 'fr' 
                  ? `Latence Audio PipeWire (${getLatencyMs(gaming.pipewireQuantumLatency || 128)} ms) :` 
                  : `PipeWire Audio Latency (${getLatencyMs(gaming.pipewireQuantumLatency || 128)} ms):`}
              </label>
            </div>
            <select
              className="input-select font-mono"
              value={gaming.pipewireQuantumLatency || 128}
              onChange={(e) => updateGaming({ pipewireQuantumLatency: Number(e.target.value) as any })}
            >
              <option value={64}>🚀 64 samples — ~1.3 ms (Ultra esport / MAO)</option>
              <option value={128}>⚡ 128 samples — ~2.7 ms (Recommandé - Équilibré & réactif)</option>
              <option value={256}>🎯 256 samples — ~5.3 ms (Standard)</option>
              <option value={512}>🛡️ 512 samples — ~10.7 ms (Conservateur)</option>
            </select>
          </div>

          {/* MangoHUD Overlay */}
          <div style={{ padding: '14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} color="#f59e0b" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {lang === 'fr' ? 'In-Game Overlay MangoHUD :' : 'MangoHUD Telemetry Overlay:'}
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={gaming.enableMangoHud ?? true}
                  onChange={(e) => updateGaming({ enableMangoHud: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <select
              className="input-select"
              disabled={!gaming.enableMangoHud}
              value={gaming.mangoHudPreset || 'compact_topbar'}
              onChange={(e) => updateGaming({ mangoHudPreset: e.target.value as MangoHudPreset })}
            >
              <option value="minimal_fps">Minimal FPS (Compteur épuré)</option>
              <option value="compact_topbar">Compact Top Bar (FPS, CPU/GPU % & Température)</option>
              <option value="full_benchmark">Full Benchmark (Frametime graph, VRAM, RAM, CPU)</option>
            </select>
          </div>

          {/* Valve Proton-GE & CoreCtrl */}
          <div style={{ padding: '14px', background: 'rgba(10, 15, 28, 0.4)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={gaming.enableProtonGE ?? true}
                onChange={(e) => updateGaming({ enableProtonGE: e.target.checked })}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 500 }}>
                🍷 {lang === 'fr' ? 'Installateur Valve Proton-GE (Compatibilité Jeux Windows)' : 'Valve Proton-GE Runner'}
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={gaming.enableCoreCtrlProfiles ?? true}
                onChange={(e) => updateGaming({ enableCoreCtrlProfiles: e.target.checked })}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 500 }}>
                🎛️ {lang === 'fr' ? 'Profils CoreCtrl (Courbes de ventilation & Overclocking GPU)' : 'CoreCtrl GPU Profiles & Fan Curves'}
              </span>
            </label>
          </div>
        </div>

        {/* Bouton Modal de Réglage Avancé */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '6px 14px', color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.4)' }}
          >
            <Sliders size={14} />
            <span>{lang === 'fr' ? 'Ouvrir l’Atelier de Réglage Avancé (Presets & Fichiers de Conf)' : 'Open Advanced Tuning Workshop'}</span>
          </button>
        </div>
      </div>

      {/* 2. Mode Console Steam Machine (TV / Salon) */}
      <div className="glass-panel" style={{
        padding: '20px',
        border: recipe.enableSteamConsoleMode ? '1px solid #107c41' : '1px solid var(--border-subtle)',
        background: recipe.enableSteamConsoleMode ? 'rgba(16, 124, 65, 0.1)' : undefined,
        transition: 'all 0.2s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tv size={18} color="#4ade80" />
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: recipe.enableSteamConsoleMode ? '#4ade80' : 'var(--text-main)', margin: 0 }}>
                {lang === 'fr' ? 'Mode Console Steam Machine (TV & Salon)' : 'Steam Machine Console Mode (TV / Living Room)'}
              </h3>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>SteamOS 3</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '720px' }}>
              {lang === 'fr'
                ? 'Configure la machine pour démarrer directement en session TV Steam GamepadUI sous le compositeur Gamescope HDR/VRR. Inclut les règles UDEV pour manettes Xbox, PlayStation 4/5 DualSense, Nintendo Switch Pro et 8BitDo.'
                : 'Boots straight into Steam GamepadUI big picture TV session with Gamescope HDR/VRR compositor and gamepad udev rules.'}
            </p>
          </div>

          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={recipe.enableSteamConsoleMode ?? false}
              onChange={(e) => {
                const checked = e.target.checked;
                const updated: Partial<OSRecipe> = { enableSteamConsoleMode: checked };
                if (checked) {
                  updated.enableGamingOptimizations = true;
                }
                onChange(updated);
              }}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Modale de Réglage Gaming Fine */}
      <GamingTuningModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        recipe={recipe}
        onChange={(updatedRecipe) => onChange(updatedRecipe)}
        lang={lang}
      />
    </div>
  );
};
