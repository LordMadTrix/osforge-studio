import React, { useState } from 'react';
import { 
  X, HardDrive, Check, Copy, Download, AlertTriangle 
} from 'lucide-react';
import { OSRecipe } from '../types/os';
import { generateUsbFlashBash } from '../services/generators/usbFlash';
import { triggerFileDownload } from '../utils/downloadHelper';

interface UsbFlasherModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: OSRecipe;
  lang: 'fr' | 'en';
}

export const UsbFlasherModal: React.FC<UsbFlasherModalProps> = ({
  isOpen,
  onClose,
  recipe,
  lang,
}) => {
  const [targetDevice, setTargetDevice] = useState('/dev/sdb');
  const [enablePersistence, setEnablePersistence] = useState(true);
  const [persistenceSizeGb, setPersistenceSizeGb] = useState<number>(4);
  const [platform, setPlatform] = useState<'linux' | 'windows'>('linux');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isSystemDiskRisk = targetDevice === '/dev/sda' || targetDevice === '/dev/nvme0n1' || targetDevice === '\\\\.\\PhysicalDrive0';

  const generateCustomFlashScript = () => {
    if (platform === 'linux') {
      return generateUsbFlashBash({
        ...recipe,
        enableUsbPersistence: enablePersistence,
      });
    }

    return `# ==============================================================================
# OSForge Studio - Gravure Clé USB Sécurisée Windows (PowerShell)
# Système cible : ${recipe.branding.osName || recipe.name}
# ==============================================================================

#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   OSForge Studio - Gravure USB Sécurisée & Persistance Live           " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Lister uniquement les disques USB amovibles (Protection anti-écrasement système)
Write-Host "[1/3] Détection des périphériques USB connectés..." -ForegroundColor White
$UsbDisks = Get-Disk | Where-Object { $_.BusType -eq 'USB' }

if (-not $UsbDisks) {
    Write-Host "[ERREUR] Aucune clé USB détectée. Veuillez brancher votre clé USB et réexécuter ce script." -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Clés USB détectées :" -ForegroundColor Green
$UsbDisks | Format-Table Number, FriendlyName, Size, OperationalStatus

$TargetNumber = Read-Host "Entrez le numéro du disque USB cible (ex: 1, 2)"
$TargetDisk = $UsbDisks | Where-Object { $_.Number -eq [int]$TargetNumber }

if (-not $TargetDisk) {
    Write-Host "[ERREUR] Numéro de disque USB invalide." -ForegroundColor Red
    exit 1
}

Write-Host "ATTENTION : TOUTES LES DONNÉES SUR LE DISQUE $($TargetDisk.FriendlyName) SERONT EFFACÉES !" -ForegroundColor Yellow
$Confirm = Read-Host "Êtes-vous ABSOLUMENT certain de vouloir continuer ? (OUI/NON)"

if ($Confirm -ne "OUI") {
    Write-Host "Opération annulée par sécurité." -ForegroundColor Yellow
    exit 0
}

Write-Host "[2/3] Préparation de la clé USB avec Rufus CLI ou flash direct..." -ForegroundColor Cyan
# Recommandation Rufus CLI 1-clic pour gravure haute vitesse avec persistance
$IsoPath = Get-ChildItem -Filter "*.iso" | Select-Object -First 1 -ExpandProperty FullName
Write-Host "ISO sélectionnée : $IsoPath" -ForegroundColor Green

Write-Host "Pour une compatibilité UEFI + BIOS optimale sous Windows, nous recommandons :" -ForegroundColor White
Write-Host "Rufus (mode DD ou ISO avec persistance) ou Ventoy (glisser-déposer)." -ForegroundColor Yellow
`;
  };

  const currentScript = generateCustomFlashScript();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = platform === 'linux' ? 'sh' : 'ps1';
    const blob = new Blob([currentScript], { type: 'text/plain;charset=utf-8' });
    triggerFileDownload(blob, `flash-usb.${ext}`);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.85)',
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
          maxWidth: '860px',
          maxHeight: '90vh',
          background: 'linear-gradient(180deg, #0b1120 0%, #060913 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 40px rgba(56, 189, 248, 0.1)',
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
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}>
              <HardDrive size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {lang === 'fr' ? 'Gravure Clé USB & Persistance Live' : 'USB Flasher & Live Persistence'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0 }}>
                {lang === 'fr' ? 'Flashez votre image sur clé USB avec protection anti-écrasement et sauvegarde des données' : 'Flash your image to USB with drive protection and persistent data saving'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Options de gravure */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}>
            {/* Périphérique cible */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px' }}>
              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9', display: 'block', marginBottom: '6px' }}>
                Périphérique Cible (Ex: Clé USB)
              </label>
              <input
                type="text"
                value={targetDevice}
                onChange={e => setTargetDevice(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '0.8rem',
                  padding: '6px 10px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: isSystemDiskRisk ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: isSystemDiskRisk ? '#f87171' : '#f8fafc',
                }}
              />
              {isSystemDiskRisk && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '0.68rem', marginTop: '4px' }}>
                  <AlertTriangle size={12} />
                  <span>ATTENTION : Ne sélectionnez jamais votre disque système principal !</span>
                </div>
              )}
            </div>

            {/* Toggle Persistance */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9', cursor: 'pointer', marginBottom: '6px' }}>
                <input
                  type="checkbox"
                  checked={enablePersistence}
                  onChange={e => setEnablePersistence(e.target.checked)}
                />
                <span>Partition de Persistance Live</span>
              </label>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>
                Conserve vos fichiers, installations et configurations entre les redémarrages.
              </p>
            </div>

            {/* Taille Persistance */}
            {enablePersistence && (
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '12px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9', display: 'block', marginBottom: '6px' }}>
                  Taille de la Persistance : {persistenceSizeGb} Go
                </label>
                <input
                  type="range"
                  min="1"
                  max="32"
                  value={persistenceSizeGb}
                  onChange={e => setPersistenceSizeGb(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: '#0ea5e9' }}
                />
              </div>
            )}
          </div>

          {/* Switch Plateforme */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setPlatform('linux')}
              className={`btn ${platform === 'linux' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.76rem', padding: '5px 12px' }}
            >
              Linux / macOS (Bash)
            </button>
            <button
              onClick={() => setPlatform('windows')}
              className={`btn ${platform === 'windows' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.76rem', padding: '5px 12px' }}
            >
              Windows (PowerShell)
            </button>
          </div>

          {/* Prévisualisation du script */}
          <div style={{ position: 'relative' }}>
            <pre style={{
              margin: 0,
              padding: '14px',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontFamily: 'monospace',
              fontSize: '0.74rem',
              color: '#38bdf8',
              maxHeight: '260px',
              overflowY: 'auto',
            }}>
              {currentScript}
            </pre>

            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
              <button
                onClick={handleCopy}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '4px 8px' }}
              >
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="btn btn-primary"
                style={{ fontSize: '0.72rem', padding: '4px 8px' }}
              >
                <Download size={12} />
                <span>Télécharger</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 14px' }}>
            {lang === 'fr' ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
