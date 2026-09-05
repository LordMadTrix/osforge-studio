import React from 'react';
import { OSRecipe, DiskPartitionConfig } from '../types/os';
import { HardDrive, Shield, AlertTriangle, Layers } from 'lucide-react';

interface DiskLayoutCalculatorProps {
  recipe: OSRecipe;
  onChange: (updated: Partial<OSRecipe>) => void;
  lang?: 'fr' | 'en';
}

export const DiskLayoutCalculator: React.FC<DiskLayoutCalculatorProps> = ({
  recipe,
  onChange,
  lang = 'fr',
}) => {
  const isFr = lang === 'fr';

  const pConfig: DiskPartitionConfig = recipe.diskPartitionConfig || {
    targetDiskSizeGB: 64,
    efiSizeMB: 512,
    bootSizeMB: 1024,
    swapSizeMB: 4096,
    customHomePartition: false,
    homeSizeGB: 20,
  };

  const updatePartition = (patch: Partial<DiskPartitionConfig>) => {
    onChange({
      diskPartitionConfig: {
        ...pConfig,
        ...patch,
      },
    });
  };

  const targetDiskMB = (pConfig.targetDiskSizeGB || 64) * 1024;
  const efiMB = pConfig.efiSizeMB || 0;
  const bootMB = pConfig.bootSizeMB || 0;
  const swapMB = pConfig.swapSizeMB || 0;
  const homeMB = pConfig.customHomePartition ? (pConfig.homeSizeGB || 0) * 1024 : 0;

  // Root prend l'espace restant
  const allocatedMB = efiMB + bootMB + swapMB + homeMB;
  const rootMB = Math.max(0, targetDiskMB - allocatedMB);
  const rootGB = (rootMB / 1024).toFixed(1);
  const isOverflow = allocatedMB > targetDiskMB;
  const isCriticalRoot = rootMB < 12 * 1024; // Moins de 12 Go pour la racine

  const isLuks = Boolean(recipe.security.luksEncryption);
  const isBtrfs = recipe.filesystem === 'btrfs';

  // Calcul des pourcentages de la barre visuelle
  const safeTotal = Math.max(targetDiskMB, allocatedMB);
  const pctEfi = (efiMB / safeTotal) * 100;
  const pctBoot = (bootMB / safeTotal) * 100;
  const pctRoot = (rootMB / safeTotal) * 100;
  const pctHome = (homeMB / safeTotal) * 100;
  const pctSwap = (swapMB / safeTotal) * 100;

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.65)',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: '12px',
      padding: '18px',
      marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid #38bdf8',
            borderRadius: '8px',
            padding: '8px',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HardDrive size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc' }}>
              {isFr ? 'Simulateur Visuel de Partitionnement Disque' : 'Visual Disk Layout Calculator'}
            </h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
              {isFr
                ? 'Génère le script bash sécurisé partition-disk.sh prêt à formater'
                : 'Generates safe partition-disk.sh bash script ready to format'}
            </p>
          </div>
        </div>

        {/* Boutons de taille rapide */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{isFr ? 'Disque Cible :' : 'Target Disk :'}</span>
          {[32, 64, 128, 256, 512].map(size => (
            <button
              key={size}
              type="button"
              onClick={() => updatePartition({ targetDiskSizeGB: size })}
              style={{
                background: pConfig.targetDiskSizeGB === size ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                border: pConfig.targetDiskSizeGB === size ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.2)',
                color: pConfig.targetDiskSizeGB === size ? '#38bdf8' : '#94a3b8',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {size}G
            </button>
          ))}
        </div>
      </div>

      {/* Jauge graphique de répartition */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{
          height: '28px',
          width: '100%',
          background: 'rgba(10, 15, 29, 0.8)',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          position: 'relative',
        }}>
          {pctEfi > 0 && (
            <div
              title={`ESP/EFI: ${efiMB} Mo`}
              style={{
                width: `${pctEfi}%`,
                background: 'linear-gradient(90deg, #06b6d4, #0891b2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 700,
                borderRight: '1px solid rgba(0,0,0,0.4)',
                minWidth: '22px',
              }}
            >
              EFI
            </div>
          )}
          {pctBoot > 0 && (
            <div
              title={`/boot: ${bootMB} Mo`}
              style={{
                width: `${pctBoot}%`,
                background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 700,
                borderRight: '1px solid rgba(0,0,0,0.4)',
                minWidth: '26px',
              }}
            >
              Boot
            </div>
          )}
          {!isOverflow && pctRoot > 0 && (
            <div
              title={`/ (Racine): ${rootGB} Go (${isBtrfs ? 'Btrfs' : 'ext4'}${isLuks ? ' + LUKS2' : ''})`}
              style={{
                width: `${pctRoot}%`,
                background: isLuks
                  ? 'linear-gradient(90deg, #059669, #0d9488)'
                  : 'linear-gradient(90deg, #2563eb, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRight: '1px solid rgba(0,0,0,0.4)',
                gap: '4px',
              }}
            >
              {isLuks && <Shield size={11} />}
              / ({rootGB}G)
            </div>
          )}
          {pctHome > 0 && (
            <div
              title={`/home: ${pConfig.homeSizeGB} Go`}
              style={{
                width: `${pctHome}%`,
                background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 700,
                borderRight: '1px solid rgba(0,0,0,0.4)',
                minWidth: '32px',
              }}
            >
              Home
            </div>
          )}
          {pctSwap > 0 && (
            <div
              title={`Swap: ${swapMB} Mo`}
              style={{
                width: `${pctSwap}%`,
                background: 'linear-gradient(90deg, #ec4899, #db2777)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 700,
                minWidth: '28px',
              }}
            >
              Swap
            </div>
          )}
        </div>

        {/* Légende de la jauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#67e8f9' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#06b6d4', display: 'inline-block' }}></span>
            EFI: {efiMB} Mo
          </div>
          {bootMB > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#c4b5fd' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#8b5cf6', display: 'inline-block' }}></span>
              Boot: {bootMB} Mo
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: isLuks ? '#6ee7b7' : '#93c5fd' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: isLuks ? '#059669' : '#2563eb', display: 'inline-block' }}></span>
            / (Racine): {rootGB} Go {isLuks ? '(LUKS2)' : ''}
          </div>
          {homeMB > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fde68a' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f59e0b', display: 'inline-block' }}></span>
              Home: {pConfig.homeSizeGB} Go
            </div>
          )}
          {swapMB > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fbcfe8' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ec4899', display: 'inline-block' }}></span>
              Swap: {swapMB} Mo
            </div>
          )}
        </div>
      </div>

      {/* Alertes éventuelles */}
      {isOverflow && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          color: '#fca5a5'
        }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span>{isFr ? 'Attention : la taille des partitions dépasse la capacité du disque cible !' : 'Warning: Allocated partitions exceed target disk capacity!'}</span>
        </div>
      )}

      {isCriticalRoot && !isOverflow && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          color: '#fcd34d'
        }}>
          <AlertTriangle size={16} color="#f59e0b" />
          <span>{isFr ? 'Attention : la partition racine est inférieure à 12 Go (risque de saturation lors des mises à jour système).' : 'Warning: Root partition is under 12 GB (risk of disk space exhaustion during updates).'}</span>
        </div>
      )}

      {/* Formulaire de réglage fin des tailles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        paddingTop: '6px',
        borderTop: '1px solid rgba(148, 163, 184, 0.15)'
      }}>
        {/* EFI */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
            {isFr ? 'Partition EFI (Mo)' : 'EFI Partition (MB)'}
          </label>
          <select
            value={pConfig.efiSizeMB}
            onChange={(e) => updatePartition({ efiSizeMB: parseInt(e.target.value, 10) })}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              color: '#f8fafc',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '0.8rem',
            }}
          >
            <option value={256}>256 Mo</option>
            <option value={512}>512 Mo (Standard)</option>
            <option value={1024}>1024 Mo (Multi-boot)</option>
          </select>
        </div>

        {/* /boot séparé */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
            {isFr ? 'Partition /boot (Mo)' : '/boot Partition (MB)'}
          </label>
          <select
            value={pConfig.bootSizeMB}
            onChange={(e) => updatePartition({ bootSizeMB: parseInt(e.target.value, 10) })}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              color: '#f8fafc',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '0.8rem',
            }}
          >
            <option value={0}>{isFr ? 'Intégré à / (0 Mo)' : 'Integrated in / (0 MB)'}</option>
            <option value={512}>512 Mo</option>
            <option value={1024}>1024 Mo (Recommandé si LUKS)</option>
            <option value={2048}>2048 Mo</option>
          </select>
        </div>

        {/* Swap */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
            {isFr ? 'Partition Swap (Mo)' : 'Swap Partition (MB)'}
          </label>
          <select
            value={pConfig.swapSizeMB}
            onChange={(e) => updatePartition({ swapSizeMB: parseInt(e.target.value, 10) })}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              color: '#f8fafc',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '0.8rem',
            }}
          >
            <option value={0}>{isFr ? 'Aucun (ZRAM ou fichier)' : 'None (ZRAM or swapfile)'}</option>
            <option value={2048}>2048 Mo (2 Go)</option>
            <option value={4096}>4096 Mo (4 Go)</option>
            <option value={8192}>8192 Mo (8 Go - Veille/Hibernation)</option>
          </select>
        </div>

        {/* /home séparé toggle & taille */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px' }}>
            <span>{isFr ? 'Partition /home Dédiée' : 'Dedicated /home'}</span>
            <input
              type="checkbox"
              checked={pConfig.customHomePartition}
              onChange={(e) => updatePartition({ customHomePartition: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
          </label>
          <input
            type="number"
            disabled={!pConfig.customHomePartition}
            value={pConfig.homeSizeGB ?? 20}
            min={5}
            max={pConfig.targetDiskSizeGB - 15}
            onChange={(e) => updatePartition({ homeSizeGB: parseInt(e.target.value, 10) || 10 })}
            placeholder="Taille en Go"
            style={{
              width: '100%',
              background: pConfig.customHomePartition ? 'rgba(15, 23, 42, 0.8)' : 'rgba(15, 23, 42, 0.3)',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              color: pConfig.customHomePartition ? '#f8fafc' : '#64748b',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '0.8rem',
            }}
          />
        </div>
      </div>

      {/* Note d'information Btrfs subvolumes si sélectionné */}
      {isBtrfs && (
        <div style={{
          marginTop: '12px',
          background: 'rgba(37, 99, 235, 0.1)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          color: '#93c5fd'
        }}>
          <Layers size={15} color="#38bdf8" />
          <span>
            {isFr
              ? 'Format Btrfs actif : la partition racine génèrera automatiquement les sous-volumes @, @home, @snapshots, @var_log et @var_cache avec compression ZSTD.'
              : 'Btrfs active: Root partition will automatically create @, @home, @snapshots, @var_log and @var_cache subvolumes with ZSTD compression.'}
          </span>
        </div>
      )}
    </div>
  );
};
