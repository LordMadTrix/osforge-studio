import React, { useState } from 'react';
import {
  X,
  Gamepad2,
  Sliders,
  Zap,
  Volume2,
  Cpu,
  Flame,
  CheckCircle2,
  Check,
  Eye,
  Settings2
} from 'lucide-react';
import { OSRecipe, MangoHudPreset } from '../types/os';
import { generateMangoHudConfig } from '../services/scriptGenerators';

interface GamingTuningModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: OSRecipe;
  onChange: (updatedRecipe: OSRecipe) => void;
  lang: 'fr' | 'en';
}

export const GamingTuningModal: React.FC<GamingTuningModalProps> = ({
  isOpen,
  onClose,
  recipe,
  onChange,
  lang,
}) => {
  const gaming = recipe.gamingConfig || {
    enableMangoHud: true,
    mangoHudPreset: 'compact_topbar',
    enableProtonGE: true,
    enableCoreCtrlProfiles: true,
    pipewireQuantumLatency: 128,
    cpuGovernor: 'performance',
  };

  const [enableMangoHud, setEnableMangoHud] = useState<boolean>(gaming.enableMangoHud ?? true);
  const [mangoHudPreset, setMangoHudPreset] = useState<MangoHudPreset>(gaming.mangoHudPreset || 'compact_topbar');
  const [enableProtonGE, setEnableProtonGE] = useState<boolean>(gaming.enableProtonGE ?? true);
  const [enableCoreCtrlProfiles, setEnableCoreCtrlProfiles] = useState<boolean>(gaming.enableCoreCtrlProfiles ?? true);
  const [pipewireQuantum, setPipewireQuantum] = useState<64 | 128 | 256 | 512>(gaming.pipewireQuantumLatency || 128);
  const [cpuGovernor, setCpuGovernor] = useState<'performance' | 'schedutil' | 'ondemand' | 'powersave'>(gaming.cpuGovernor || 'performance');
  const [showRawConfig, setShowRawConfig] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const updatedRecipe: OSRecipe = {
      ...recipe,
      enableGamingOptimizations: true,
      gamingConfig: {
        enableMangoHud,
        mangoHudPreset,
        enableProtonGE,
        enableCoreCtrlProfiles,
        pipewireQuantumLatency: pipewireQuantum,
        cpuGovernor,
      },
    };
    onChange(updatedRecipe);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  const getLatencyMs = (q: number) => {
    return ((q / 48000) * 1000).toFixed(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 border border-purple-500/40 rounded-xl text-purple-400">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {lang === 'fr' ? 'Studio d’Optimisation Gaming & Audio' : 'Gaming & Low-Latency Audio Studio'}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    MadOS Tuner
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'fr'
                    ? 'Télémétrie MangoHUD, compatibilité Proton-GE, overclocking GPU et audio temps réel < 2ms'
                    : 'MangoHUD telemetry, Proton-GE compatibility, GPU overclocking and real-time audio < 2ms'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto custom-scrollbar">
          {/* Section 1: MangoHUD Overlay & Preview */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>{lang === 'fr' ? 'Overlay Télémétrie MangoHUD' : 'MangoHUD Performance Overlay'}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableMangoHud}
                  onChange={(e) => setEnableMangoHud(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {enableMangoHud && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {[
                    { id: 'compact_topbar', label: 'Compact TopBar', desc: 'Discret en haut au centre' },
                    { id: 'full_hud', label: 'Full Pro HUD', desc: 'Graphe frametime & horloges' },
                    { id: 'minimal_fps', label: 'Minimal FPS', desc: 'Compteur FPS épuré' },
                    { id: 'steamos_style', label: 'SteamOS Deck', desc: 'Barre horizontale Deck' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setMangoHudPreset(p.id as MangoHudPreset)}
                      className={`p-3 rounded-lg text-left border transition ${
                        mangoHudPreset === p.id
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-xs text-white">{p.label}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{p.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Simulated Game Preview Screen */}
                <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 aspect-[16/7] flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 opacity-80" />
                  <div className="absolute inset-0 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                  <div className="z-10 text-center text-slate-500 font-mono text-xs flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <span>Aperçu en direct du jeu (Ex: Cyberpunk 2077 / Doom)</span>
                  </div>

                  {/* Dynamic HUD Rendering */}
                  {mangoHudPreset === 'compact_topbar' && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur border border-slate-700/60 rounded px-3 py-1 text-[11px] font-mono text-white flex items-center gap-3 shadow-lg">
                      <span className="text-emerald-400 font-bold">144 FPS</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-cyan-400">GPU: 62°C (94%)</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-blue-400">CPU: 58°C (42%)</span>
                      <span className="text-slate-400">|</span>
                      <span className="text-purple-400">RAM: 7.2G</span>
                    </div>
                  )}

                  {mangoHudPreset === 'full_hud' && (
                    <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur border border-slate-700 rounded-lg p-3 text-[10px] font-mono text-white space-y-1 shadow-2xl min-w-[200px]">
                      <div className="flex justify-between text-cyan-400 font-bold">
                        <span>GPU: 2450 MHz</span>
                        <span>62°C 180W</span>
                      </div>
                      <div className="flex justify-between text-blue-400 font-bold">
                        <span>CPU: 4850 MHz</span>
                        <span>58°C 65W</span>
                      </div>
                      <div className="flex justify-between text-purple-400">
                        <span>VRAM / RAM</span>
                        <span>9.4G / 11.2G</span>
                      </div>
                      <div className="pt-1 border-t border-slate-800 flex justify-between items-baseline">
                        <span className="text-emerald-400 text-sm font-black">165.2 FPS</span>
                        <span className="text-slate-400 text-[9px]">6.05 ms</span>
                      </div>
                      <div className="h-4 bg-slate-900 rounded flex items-end gap-0.5 p-0.5 border border-slate-800">
                        <div className="w-1 h-2 bg-emerald-500"></div>
                        <div className="w-1 h-3 bg-emerald-500"></div>
                        <div className="w-1 h-2 bg-emerald-500"></div>
                        <div className="w-1 h-2 bg-emerald-500"></div>
                        <div className="w-1 h-4 bg-emerald-500"></div>
                        <div className="w-1 h-3 bg-emerald-500"></div>
                        <div className="w-1 h-2 bg-emerald-500"></div>
                      </div>
                    </div>
                  )}

                  {mangoHudPreset === 'minimal_fps' && (
                    <div className="absolute top-2 right-2 bg-black/40 backdrop-blur rounded px-2.5 py-1 text-sm font-mono font-black text-emerald-400 border border-emerald-500/30">
                      144 FPS
                    </div>
                  )}

                  {mangoHudPreset === 'steamos_style' && (
                    <div className="absolute top-2 left-2 bg-slate-950/85 backdrop-blur border border-slate-700 rounded-full px-3 py-1 text-[11px] font-mono text-white flex items-center gap-3 shadow-lg">
                      <span className="text-emerald-400 font-bold">60 FPS</span>
                      <span className="text-cyan-400">GPU 55%</span>
                      <span className="text-blue-400">CPU 38%</span>
                      <span className="text-amber-400">BAT 88%</span>
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRawConfig(!showRawConfig)}
                    className="text-xs text-purple-400 hover:text-purple-300 underline font-mono flex items-center gap-1"
                  >
                    <span>{showRawConfig ? '▲ Masquer le fichier MangoHud.conf généré' : '▼ Inspecter le fichier MangoHud.conf généré'}</span>
                  </button>
                  {showRawConfig && (
                    <pre className="mt-2 p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-purple-300 overflow-x-auto max-h-36">
                      {generateMangoHudConfig(mangoHudPreset)}
                    </pre>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Section 2: PipeWire Audio Latency & CPU Governor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PipeWire Quantum */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'fr' ? 'Audio Faible Latence (PipeWire)' : 'PipeWire Low-Latency'}</span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'fr'
                  ? 'Taille du buffer audio (Quantum) pour éliminer le délai sonore dans les jeux compétitifs.'
                  : 'Audio buffer size (Quantum) to eliminate sound delay in competitive games.'}
              </p>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {([64, 128, 256, 512] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setPipewireQuantum(q)}
                    className={`py-2 px-1 text-center rounded-lg border transition ${
                      pipewireQuantum === q
                        ? 'bg-cyan-600/20 border-cyan-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs">{q}</div>
                    <div className="text-[9px] text-cyan-400 font-mono mt-0.5">{getLatencyMs(q)} ms</div>
                  </button>
                ))}
              </div>
            </div>

            {/* CPU Governor */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'fr' ? 'Gouverneur CPU Fréquence' : 'CPU Frequency Governor'}</span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'fr'
                  ? 'Profil de gestion de fréquence des cœurs processeur sous Linux.'
                  : 'Linux CPU core frequency scaling governor profile.'}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { id: 'performance', label: 'Performance', desc: 'Fréquence Max lockée' },
                  { id: 'schedutil', label: 'Schedutil', desc: 'Adaptatif intelligent' },
                  { id: 'ondemand', label: 'Ondemand', desc: 'Montée rapide en charge' },
                  { id: 'powersave', label: 'Powersave', desc: 'Économie maximale' },
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setCpuGovernor(g.id as any)}
                    className={`p-2 rounded-lg text-left border transition ${
                      cpuGovernor === g.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-white font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-semibold text-white">{g.label}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Proton-GE & CoreCtrl Polkit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proton-GE */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Proton-GE Auto-Installer</div>
                  <div className="text-[10px] text-slate-400">
                    {lang === 'fr' ? 'Installeur automatique GloriousEggroll dans Steam' : 'Auto GloriousEggroll installer for Steam'}
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableProtonGE}
                  onChange={(e) => setEnableProtonGE(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* CoreCtrl Polkit */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">CoreCtrl Polkit Privileges</div>
                  <div className="text-[10px] text-slate-400">
                    {lang === 'fr' ? 'Undervolting/Overclock GPU sans mot de passe root' : 'GPU undervolt/overclock without root password'}
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableCoreCtrlProfiles}
                  onChange={(e) => setEnableCoreCtrlProfiles(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-purple-400" />
            <span>
              {lang === 'fr'
                ? 'Génère les configurations réelles ~/.config/MangoHud et /etc/pipewire'
                : 'Generates actual ~/.config/MangoHud and /etc/pipewire configs'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              {lang === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20 flex items-center gap-2 transition"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{lang === 'fr' ? 'Appliqué !' : 'Applied!'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'fr' ? 'Enregistrer dans la Recette' : 'Save to Recipe'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
