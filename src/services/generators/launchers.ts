import { OSRecipe } from '../../types/os';
import {
  shQuote,
  shDoubleQuoteEscape,
  batEscapePercent,
  yamlEscape,
  yamlDq,
} from './helpers';

/**
 * Generates the GitHub Actions workflow (.github/workflows/build-iso.yml)
 * Builds the ISO on GitHub's free runners and uploads the downloadable artifact/release!
 */
export function generateGitHubWorkflow(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-v${recipe.branding.version}`;

  return `name: ${yamlDq(`🚀 Build & Release Custom Linux ISO (${recipe.branding.osName})`)}

# Pipeline 100% automatique : chaque push sur main compile l'ISO,
# la tague et publie une Release GitHub sans aucune action manuelle.
on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

concurrency:
  group: iso-build-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: write

jobs:
  build-iso:
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Récupération du dépôt
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 📦 Cache des paquets APT hôte (accélère les builds suivants)
        uses: actions/cache@v4
        with:
          path: /var/cache/apt/archives
          key: apt-iso-build-\${{ runner.os }}-v1

      - name: 📦 Cache des paquets APT du chroot (contenu de l'ISO, gain le plus important)
        uses: actions/cache@v4
        with:
          path: /var/cache/osforge-chroot-apt
          key: chroot-apt-${recipe.distro}-${recipe.arch}-\${{ hashFiles('build.sh') }}

      - name: 🛠️ Installation des dépendances de compilation ISO
        run: |
          sudo apt-get update
          sudo apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync

      - name: 🏗️ Exécution du script de compilation OSForge
        env:
          APT_CACHE_DIR: /var/cache/osforge-chroot-apt
        run: |
          chmod +x build.sh
          sudo -E ./build.sh

      - name: 🔓 Restauration des permissions (dossiers créés en root par build.sh)
        run: |
          sudo chown -R "$(id -u):$(id -g)" dist
          sudo chown -R "$(id -u):$(id -g)" /var/cache/osforge-chroot-apt 2>/dev/null || true

      - name: 🔍 Calcul des sommes de contrôle SHA-256
        run: |
          cd dist
          sha256sum * > SHA256SUMS.txt
          cat SHA256SUMS.txt

      - name: 📤 Publication en Artéfact GitHub (accès rapide, 14 jours)
        uses: actions/upload-artifact@v4
        with:
          name: ${isoName}-build-artifact
          path: dist/*
          retention-days: 14

      - name: 📏 Vérification de la taille (limite de 2 Go pour une Release GitHub)
        id: sizecheck
        run: |
          ARTIFACT=$(find dist -maxdepth 1 -type f ! -name 'SHA256SUMS.txt' | head -1)
          SIZE=$(stat -c%s "\${ARTIFACT}")
          echo "Fichier généré : \${ARTIFACT} — Taille : $(( SIZE / 1024 / 1024 )) Mo"
          if [ "\${SIZE}" -ge 2147483648 ]; then
            echo "⚠️ Fichier trop volumineux pour une Release GitHub (limite stricte : 2 Go)."
            echo "   Récupérez-le via l'Artéfact ci-dessus (onglet Summary de ce run, 14 jours)."
            echo "over_limit=true" >> "\${GITHUB_OUTPUT}"
          else
            echo "over_limit=false" >> "\${GITHUB_OUTPUT}"
          fi

      - name: 🏷️ Génération automatique du tag de version
        id: autotag
        if: steps.sizecheck.outputs.over_limit == 'false'
        run: |
          TAG="v${recipe.branding.version}-build.\${{ github.run_number }}"
          echo "tag=\${TAG}" >> "\${GITHUB_OUTPUT}"
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag "\${TAG}"
          git push origin "\${TAG}"

      - name: 🚀 Publication automatique de la Release GitHub (sans action manuelle)
        if: steps.sizecheck.outputs.over_limit == 'false'
        uses: softprops/action-gh-release@v2
        with:
          tag_name: \${{ steps.autotag.outputs.tag }}
          name: "${yamlEscape(recipe.branding.osName)} \${{ steps.autotag.outputs.tag }}"
          files: |
            dist/*
          generate_release_notes: true
          make_latest: true
`;
}

/**
 * Generates install-wsl.bat for Windows 10/11
 * Automatically imports the custom Linux OS into Windows Subsystem for Linux (WSL2)
 */
export function generateWslInstallerBat(recipe: OSRecipe): string {
  const distroName = recipe.branding.osName.replace(/[^a-zA-Z0-9]/g, '');

  return `@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
chcp 65001 >nul
reg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1
REM ==============================================================================
REM OSForge Studio — Script d'installation 1-Click pour Windows WSL2
REM Installe votre OS sur-mesure (${batEscapePercent(recipe.branding.osName)}) directement sous Windows
REM ==============================================================================

echo.
echo =====================================================================
echo   🪟 Installation de ${batEscapePercent(recipe.branding.osName)} sous Windows WSL2
echo =====================================================================
echo.

REM 1. Vérification de l'activation de WSL
wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] WSL n'est pas activé sur ce PC Windows.
    echo Exécutez 'wsl --install' dans PowerShell en mode Administrateur.
    pause
    exit /b 1
)

set DISTRO_NAME=${distroName}
set INSTALL_DIR=%USERPROFILE%\\WSL\\%DISTRO_NAME%
set TAR_FILE=

for %%f in (dist\\*rootfs*.tar.gz) do set TAR_FILE=%%f
if "%TAR_FILE%"=="" for %%f in (dist\\*.tar.gz) do set TAR_FILE=%%f
if "%TAR_FILE%"=="" if exist "dist\\filesystem.squashfs" set TAR_FILE=dist\\filesystem.squashfs

if "%TAR_FILE%"=="" (
    echo [ERREUR] Aucun fichier archive rootfs (.tar.gz) trouve dans dist\\
    pause
    exit /b 1
)

echo [1/3] Création du dossier d'installation : %INSTALL_DIR%
mkdir "%INSTALL_DIR%" 2>nul

echo [2/3] Importation de ${batEscapePercent(recipe.branding.osName)} dans Windows WSL2...
wsl --import %DISTRO_NAME% "%INSTALL_DIR%" "%TAR_FILE%" --version 2

if %ERRORLEVEL% NEQ 0 (
    echo [AVERTISSEMENT] Import direct : tentative d'enregistrement standard...
)

echo [3/3] Configuration du support Systemd et utilisateur par défaut (%DISTRO_NAME%)...
wsl -d %DISTRO_NAME% -u root bash -c "printf '[boot]\\nsystemd=true\\n[user]\\ndefault='${shQuote(recipe.user.username)}'\\n' > /etc/wsl.conf"

echo.
echo =====================================================================
echo   [SUCCES] ${batEscapePercent(recipe.branding.osName)} est installe avec succes sous Windows !
echo =====================================================================
echo.
echo Pour lancer votre distribution a tout moment dans le terminal Windows :
echo    wsl -d %DISTRO_NAME%
echo.
echo Lancement immediat de votre OS...
wsl -d %DISTRO_NAME%
pause
`;
}

/**
 * Generates /etc/wsl.conf for native Windows WSL2 integration
 */
export function generateWslConf(recipe: OSRecipe): string {
  return `# ==============================================================================
# OSForge Studio — Configuration WSL2 (/etc/wsl.conf)
# Active Systemd, l'intégration GUI (WSLg) et l'utilisateur par défaut sous Windows
# ==============================================================================

[boot]
systemd=true

[user]
default=${recipe.user.username}

[interop]
enabled=true
appendWindowsPath=true

[network]
hostname=${recipe.hostname}
generateHosts=true
generateResolvConf=true

[automount]
enabled=true
root=/mnt/
options="metadata,uid=1000,gid=1000,umask=22,fmask=11"
`;
}

/**
 * Generates run-live-windows.bat for running the ISO live on Windows via portable QEMU
 */
export function generateLiveWindowsBat(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
reg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1
title ${batEscapePercent(recipe.branding.osName)} - Machine Virtuelle QEMU (Live RAM & Accélération WHPX)
cls

:MENU
cls
echo ===============================================================================
echo   🚀 OSFORGE STUDIO — MACHINE VIRTUELLE DE TEST RAPIDE (QEMU)
echo   Distribution : ${batEscapePercent(recipe.branding.osName)} (${recipe.distro.toUpperCase()})
echo ===============================================================================
echo.

set ISO_PATH=dist\\${isoName}

if not exist "%ISO_PATH%" (
    for %%f in (dist\\*.iso) do set ISO_PATH=%%f
)

if not exist "%ISO_PATH%" (
    echo [ERREUR] Aucun fichier .iso n'a ete trouve dans dist\\
    echo Assurez-vous d'avoir compile votre image ISO au prealable (build.sh ou auto-build.bat).
    echo.
    pause
    exit /b 1
)

echo [OK] Image ISO detectee : %ISO_PATH%

set QEMU_CMD=
set QEMU_IMG_CMD=
set QEMU_MODE=WINDOWS
set ACCEL_ARGS=-accel tcg

where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set QEMU_CMD=qemu-system-x86_64
    set QEMU_IMG_CMD=qemu-img
)

if "%QEMU_CMD%"=="" (
    if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" (
        set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"
        set "QEMU_IMG_CMD=C:\\Program Files\\qemu\\qemu-img.exe"
    )
)

if "%QEMU_CMD%"=="" (
    wsl which qemu-system-x86_64 >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        set QEMU_MODE=WSL
        set QEMU_CMD=wsl qemu-system-x86_64
        set QEMU_IMG_CMD=wsl qemu-img
    )
)

if not "%QEMU_CMD%"=="" (
    echo [OK] Moteur QEMU detecte : %QEMU_MODE%
    if "%QEMU_MODE%"=="WINDOWS" (
        "%QEMU_CMD%" -accel help 2>nul | findstr /i "whpx" >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            set ACCEL_ARGS=-accel whpx -accel tcg
            echo [OK] Acceleration materielle WHPX (Windows Hypervisor Platform) activee !
        )
    )
) else (
    echo [ATTENTION] QEMU n'est pas encore installe sur votre systeme.
)

echo.
echo -------------------------------------------------------------------------------
echo   CHOISISSEZ UNE OPTION :
echo -------------------------------------------------------------------------------
echo   [1] ⚡ Lancer en Live RAM Standard (4 Go RAM, VirtIO, Zéro écriture disque)
echo   [2] 🚀 Lancer en Haute Performance (8 Go RAM, Accélération CPU 4 cœurs)
echo   [3] 💾 Lancer avec un Disque Virtuel Temporaire (20 Go QCOW2)
echo   [4] 📦 Installer automatiquement QEMU (via Winget Windows ou WSL2)
echo   [5] 🧹 Nettoyer / Supprimer les disques virtuels de test temporaires
echo   [0] ❌ Retour au menu principal
echo.
echo ===============================================================================
set /p CHOICE="Votre choix [1-5, 0] : "

if "%CHOICE%"=="1" goto RUN_LIVE_RAM_STD
if "%CHOICE%"=="2" goto RUN_LIVE_RAM_HIGH
if "%CHOICE%"=="3" goto RUN_WITH_DISK
if "%CHOICE%"=="4" goto INSTALL_QEMU
if "%CHOICE%"=="5" goto CLEANUP_VM
if "%CHOICE%"=="0" exit /b 0

echo Choix invalide.
timeout /t 2 >nul
goto MENU

:INSTALL_QEMU
cls
echo ===============================================================================
echo   INSTALLATION AUTOMATIQUE DE QEMU
echo ===============================================================================
echo.
echo [1/2] Tentative d'installation native Windows via Windows Package Manager (winget)...
where winget >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Execution de : winget install SoftwareFreedomConservancy.QEMU ...
    winget install SoftwareFreedomConservancy.QEMU --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCES] QEMU pour Windows a ete installe !
        if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" (
            set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"
            set "QEMU_IMG_CMD=C:\\Program Files\\qemu\\qemu-img.exe"
        )
        pause
        goto MENU
    )
)

echo.
echo [2/2] Tentative d'installation de QEMU dans votre environnement WSL2...
wsl --status >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Installation de qemu-system-x86 et qemu-utils dans WSL2...
    wsl sudo apt-get update -y
    wsl sudo apt-get install -y qemu-system-x86 qemu-utils
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCES] QEMU a ete installe avec succes dans WSL2 !
        set QEMU_MODE=WSL
        set QEMU_CMD=wsl qemu-system-x86_64
        set QEMU_IMG_CMD=wsl qemu-img
        pause
        goto MENU
    )
)

echo [INFO] Si l'installation automatique a echoue, vous pouvez installer QEMU manuellement :
echo https://www.qemu.org/download/#windows
pause
goto MENU

:CHECK_QEMU_EXISTS
if "%QEMU_CMD%"=="" (
    echo [ERREUR] QEMU n'est pas installe. Veuillez choisir l'option [4] d'abord.
    pause
    goto MENU
)
exit /b 0

:RUN_LIVE_RAM_STD
call :CHECK_QEMU_EXISTS
cls
echo ===============================================================================
echo   LANCEMENT DE LA VM EPHEMERE (LIVE RAM 4 GO)
echo ===============================================================================
echo.
echo   Image ISO  : %ISO_PATH%
echo   Memoire    : 4096 Mo (4 Go RAM)
echo   CPU Coeurs : 4 Coeurs Virtuels
echo.
echo [INFO] Fermez simplement la fenetre QEMU quand vous avez termine le test.
echo.

if "%QEMU_MODE%"=="WSL" (
    wsl bash -c 'ISO_FILE=$(wslpath -a "%ISO_PATH%"); KVM_ARG=""; [ -e /dev/kvm ] && [ -w /dev/kvm ] && KVM_ARG="-enable-kvm"; qemu-system-x86_64 $KVM_ARG -cdrom "$ISO_FILE" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d'
) else (
    "%QEMU_CMD%" %ACCEL_ARGS% -cdrom "%CD%\\%ISO_PATH%" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
)

echo.
echo [OK] Session de test Live RAM terminee.
pause
goto MENU

:RUN_LIVE_RAM_HIGH
call :CHECK_QEMU_EXISTS
cls
echo ===============================================================================
echo   LANCEMENT DE LA VM HAUTE PERFORMANCE (LIVE RAM 8 GO)
echo ===============================================================================
echo.
echo   Image ISO  : %ISO_PATH%
echo   Memoire    : 8192 Mo (8 Go RAM)
echo   CPU Coeurs : 6 Coeurs Virtuels
echo.

if "%QEMU_MODE%"=="WSL" (
    wsl bash -c 'ISO_FILE=$(wslpath -a "%ISO_PATH%"); KVM_ARG=""; [ -e /dev/kvm ] && [ -w /dev/kvm ] && KVM_ARG="-enable-kvm"; qemu-system-x86_64 $KVM_ARG -cdrom "$ISO_FILE" -m 8192 -smp 6 -vga virtio -net nic -net user -boot d'
) else (
    "%QEMU_CMD%" %ACCEL_ARGS% -cdrom "%CD%\\%ISO_PATH%" -m 8192 -smp 6 -vga virtio -net nic -net user -boot d
)

echo.
echo [OK] Session haute performance terminee.
pause
goto MENU

:RUN_WITH_DISK
call :CHECK_QEMU_EXISTS
cls
echo ===============================================================================
echo   LANCEMENT DE LA VM AVEC DISQUE VIRTUEL TEMPORAIRE (20 GO)
echo ===============================================================================
echo.
set DISK_NAME=dist\\test-vm-disk.qcow2

echo [1/3] Creation d'un disque virtuel temporaire dynamique de 20 Go (%DISK_NAME%)...
if "%QEMU_MODE%"=="WSL" (
    wsl bash -c 'DISK_FILE=$(wslpath -a "%DISK_NAME%"); qemu-img create -f qcow2 "$DISK_FILE" 20G'
) else (
    if not "%QEMU_IMG_CMD%"=="" (
        "%QEMU_IMG_CMD%" create -f qcow2 "%CD%\\%DISK_NAME%" 20G
    ) else (
        qemu-img create -f qcow2 "%CD%\\%DISK_NAME%" 20G
    )
)

echo [2/3] Demarrage de la VM avec support d'ecriture...
echo.

if "%QEMU_MODE%"=="WSL" (
    wsl bash -c 'ISO_FILE=$(wslpath -a "%ISO_PATH%"); DISK_FILE=$(wslpath -a "%DISK_NAME%"); KVM_ARG=""; [ -e /dev/kvm ] && [ -w /dev/kvm ] && KVM_ARG="-enable-kvm"; qemu-system-x86_64 $KVM_ARG -cdrom "$ISO_FILE" -hda "$DISK_FILE" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d'
) else (
    "%QEMU_CMD%" %ACCEL_ARGS% -cdrom "%CD%\\%ISO_PATH%" -hda "%CD%\\%DISK_NAME%" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
)

echo.
echo [3/3] Fin de la session de test.
echo.
echo Souhaitez-vous supprimer le disque virtuel temporaire %DISK_NAME% ?
set /p DEL_CONFIRM="Supprimer le disque de test pour liberer l'espace [O/n] ? "
if /i not "%DEL_CONFIRM%"=="n" (
    if exist "%DISK_NAME%" (
        del /f /q "%DISK_NAME%"
        echo [NETTOYAGE] Disque virtuel temporaire supprime avec succes !
    )
) else (
    echo [INFO] Disque conserve dans : %DISK_NAME%
)

echo.
pause
goto MENU

:CLEANUP_VM
cls
echo ===============================================================================
echo   NETTOYAGE DES FICHIERS TEMPORAIRES DE LA VM
echo ===============================================================================
echo.
if exist "%CD%\\dist\\test-vm-disk.qcow2" (
    del /f /q "%CD%\\dist\\test-vm-disk.qcow2" 2>nul
    echo [OK] Disque virtuel temporaire supprime.
) else (
    echo [INFO] Aucun disque virtuel temporaire a supprimer.
)
pause
goto MENU
`;
}

/**
 * Generates auto-build.bat — 100% unattended pipeline for Windows (WSL2 + build + QEMU test)
 */
export function generateAutoBuildBat(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
reg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1
title ${batEscapePercent(recipe.branding.osName)} - Compilation 100% Automatique
cls

set LOG_FILE=auto-build.log
echo [%DATE% %TIME%] Debut de la compilation automatique > "%LOG_FILE%"

echo ===============================================================================
echo   🚀 ${batEscapePercent(recipe.branding.osName)} — COMPILATION 100%% AUTOMATIQUE (1-CLIC)
echo   Toutes les etapes s'enchainent sans intervention. Logs : %LOG_FILE%
echo ===============================================================================
echo.

:: [1/5] Verification directe de WSL2
echo [1/5] Verification de l'environnement Linux WSL2...
wsl -u root -- echo WSL_OK >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] WSL2 et distribution Linux operationnels.
    goto WSL_READY
)

wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] WSL2 n'est pas actif. Installation automatique en cours...
    echo [%DATE% %TIME%] Installation de WSL2 >> "%LOG_FILE%"
    wsl --install --no-launch >>"%LOG_FILE%" 2>&1
    echo.
    echo [ATTENTION] WSL2 vient d'etre installe pour la premiere fois.
    echo Windows doit redemarrer pour terminer l'installation.
    echo Relancez simplement auto-build.bat apres le redemarrage.
    pause
    exit /b 0
)

echo [INFO] Installation d'Ubuntu par defaut dans WSL2...
wsl --install -d Ubuntu --no-launch >>"%LOG_FILE%" 2>&1

:WSL_READY
echo.

:: [2/5] Verification du script build.sh
echo [2/5] Verification des fichiers du projet...
if not exist "build.sh" (
    echo [ERREUR] Le fichier build.sh est absent de ce repertoire.
    pause
    exit /b 1
)
echo [OK] Script build.sh detecte.
echo.

:: [3/5] Installation des dependances de compilation
echo [3/5] Installation des dependances de compilation ISO dans WSL2...
wsl -u root -- bash -c "export DEBIAN_FRONTEND=noninteractive; apt-get update -y && apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync" >>"%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Echec de l'installation des dependances. Voir %LOG_FILE%.
    pause
    exit /b 1
)
echo [OK] Dependances installees.
echo.

:: [4/5] Compilation de l'ISO (avec affichage direct et conversion CRLF)
echo [4/5] Compilation de l'ISO en cours (peut prendre plusieurs minutes)...
echo [%DATE% %TIME%] Lancement de build.sh en root >> "%LOG_FILE%"
wsl -u root -- bash -c "sed -i 's/\\\\r$//' build.sh 2>/dev/null || true; chmod +x build.sh && ./build.sh 2>&1 | tee -a auto-build.log"
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] La compilation a echoue. Consultez %LOG_FILE% pour le detail.
    pause
    exit /b 1
)
echo [OK] Compilation terminee. Image disponible dans dist\\
echo.

:: ---------------------------------------------------------------------------
:: [5/5] Installation automatique de QEMU (si absent) + test Live RAM immediat
:: ---------------------------------------------------------------------------
echo [5/5] Preparation du test Live automatique (QEMU)...
set QEMU_CMD=
set ACCEL_ARGS=-accel tcg
where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% EQU 0 set QEMU_CMD=qemu-system-x86_64
if "%QEMU_CMD%"=="" if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"

if "%QEMU_CMD%"=="" (
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [INFO] QEMU absent. Installation automatique via winget...
        winget install SoftwareFreedomConservancy.QEMU --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "C:\\Program Files\\qemu\\qemu-system-x86_64.exe" set "QEMU_CMD=C:\\Program Files\\qemu\\qemu-system-x86_64.exe"
    )
)

set ISO_PATH=dist\\${isoName}
if not exist "%ISO_PATH%" (
    for %%f in (dist\\*.iso) do set ISO_PATH=%%f
)

if "%QEMU_CMD%"=="" (
    echo [ATTENTION] QEMU n'a pas pu etre installe automatiquement.
    echo Compilation terminee avec succes : %ISO_PATH%
    echo Lancez run-live-windows.bat pour tester manuellement.
    pause
    exit /b 0
)

if not exist "%ISO_PATH%" (
    echo [ATTENTION] Aucune image ISO trouvee dans dist\\ pour le test.
    pause
    exit /b 0
)

"%QEMU_CMD%" -accel help 2>nul | findstr /i "whpx" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    set ACCEL_ARGS=-accel whpx -accel tcg
    echo [OK] Acceleration materielle WHPX (Windows Hypervisor Platform) activee !
)

echo [OK] Lancement du test Live RAM automatique de %ISO_PATH%...
echo.
echo ===============================================================================
echo   [SUCCES] Pipeline 100%% automatique termine !
echo   ISO       : %ISO_PATH%
echo   Test QEMU : demarrage en cours (fermez la fenetre QEMU quand vous avez fini)
echo ===============================================================================
"%QEMU_CMD%" !ACCEL_ARGS! -cdrom "%ISO_PATH%" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d

pause
exit /b 0
`;
}

/**
 * Generates auto-build.sh — 100% unattended pipeline for Linux / macOS
 */
export function generateAutoBuildSh(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `#!/usr/bin/env bash
# ==============================================================================
# ${recipe.branding.osName} — Pipeline 100% automatique (Linux / macOS)
# Détecte le gestionnaire de paquets, installe les dépendances, compile l'ISO
# puis lance un test QEMU immédiat — aucune interaction requise.
# ==============================================================================

set -euo pipefail

RED='\\033[0;31m'
GREEN='\\033[0;32m'
CYAN='\\033[0;36m'
YELLOW='\\033[1;33m'
NC='\\033[0m'

LOG_FILE="auto-build.log"
: > "\${LOG_FILE}"

echo -e "\${CYAN}===============================================================================\${NC}"
echo -e "\${CYAN}  ${shDoubleQuoteEscape(recipe.branding.osName)} — COMPILATION 100% AUTOMATIQUE (1-CLIC)\${NC}"
echo -e "\${CYAN}  Toutes les étapes s'enchaînent sans intervention. Logs : \${LOG_FILE}\${NC}"
echo -e "\${CYAN}===============================================================================\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [1/4] Installation automatique des dépendances de compilation (détection du
# gestionnaire de paquets de l'hôte : apt, dnf, pacman, zypper)
# ------------------------------------------------------------------------------
echo -e "\${YELLOW}[1/4] Installation des dépendances de compilation...\${NC}"
DEPS="debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin squashfs-tools dosfstools rsync"

if command -v apt-get &>/dev/null; then
    sudo apt-get update -y >> "\${LOG_FILE}" 2>&1
    sudo apt-get install -y \${DEPS} >> "\${LOG_FILE}" 2>&1
elif command -v dnf &>/dev/null; then
    sudo dnf install -y debootstrap xorriso mtools grub2-tools squashfs-tools dosfstools rsync >> "\${LOG_FILE}" 2>&1
elif command -v pacman &>/dev/null; then
    sudo pacman -Sy --noconfirm debootstrap xorriso mtools grub squashfs-tools dosfstools rsync >> "\${LOG_FILE}" 2>&1
elif command -v zypper &>/dev/null; then
    sudo zypper install -y debootstrap xorriso mtools grub2 squashfs dosfstools rsync >> "\${LOG_FILE}" 2>&1
else
    echo -e "\${RED}[ERREUR] Aucun gestionnaire de paquets supporté détecté (apt/dnf/pacman/zypper).\${NC}"
    exit 1
fi
echo -e "\${GREEN}[OK] Dépendances installées.\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [2/4] Compilation de l'ISO
# ------------------------------------------------------------------------------
echo -e "\${YELLOW}[2/4] Compilation de l'ISO en cours (peut prendre plusieurs minutes)...\${NC}"
sed -i 's/\\\\r$//' build.sh 2>/dev/null || true
chmod +x build.sh
sudo ./build.sh 2>&1 | tee -a "\${LOG_FILE}"
echo -e "\${GREEN}[OK] Compilation terminée. Image disponible dans dist/\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [3/4] Installation automatique de QEMU si absent
# ------------------------------------------------------------------------------
echo -e "\${YELLOW}[3/4] Vérification de QEMU pour le test Live automatique...\${NC}"
if ! command -v qemu-system-x86_64 &>/dev/null; then
    echo "QEMU absent, installation automatique..."
    if command -v apt-get &>/dev/null; then
        sudo apt-get install -y qemu-system-x86 >> "\${LOG_FILE}" 2>&1
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y qemu-system-x86 >> "\${LOG_FILE}" 2>&1
    elif command -v pacman &>/dev/null; then
        sudo pacman -Sy --noconfirm qemu-full >> "\${LOG_FILE}" 2>&1
    elif command -v brew &>/dev/null; then
        brew install qemu >> "\${LOG_FILE}" 2>&1
    fi
fi
echo -e "\${GREEN}[OK] QEMU prêt.\${NC}"
echo ""

# ------------------------------------------------------------------------------
# [4/4] Test Live RAM automatique
# ------------------------------------------------------------------------------
ISO_FILE="dist/${isoName}"
if [ ! -f "\${ISO_FILE}" ]; then
    ISO_FILE=$(ls dist/*.iso 2>/dev/null | head -n1 || true)
fi

ARTIFACT_FILE=$(find dist -maxdepth 1 -type f ! -name '*.log' 2>/dev/null | head -n1 || true)

echo -e "\${GREEN}===============================================================================\${NC}"
echo -e "\${GREEN}  [SUCCÈS] Pipeline 100% automatique terminé !\${NC}"
echo -e "\${GREEN}  Fichier généré : \${ARTIFACT_FILE:-voir le dossier dist/}\${NC}"
echo -e "\${GREEN}===============================================================================\${NC}"

if [ -z "\${ISO_FILE}" ]; then
    echo "Format de sortie \\"${recipe.outputFormat}\\" : pas d'image ISO à tester via QEMU (le test Live RAM automatique n'est disponible que pour le format \\"ISO hybride\\")."
elif command -v qemu-system-x86_64 &>/dev/null; then
    echo "Lancement du test Live RAM (fermez la fenêtre QEMU quand vous avez fini)..."
    KVM_ARG=""
    [ -e /dev/kvm ] && [ -w /dev/kvm ] && KVM_ARG="-enable-kvm"
    qemu-system-x86_64 -cdrom "\${ISO_FILE}" $KVM_ARG -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
else
    echo "QEMU non disponible : lancez run-live-windows.bat ou installez QEMU manuellement pour tester."
fi
`;
}

/**
 * Generates launch.bat — Universal 1-Click Interactive Menu Launcher for Windows
 */
export function generateUniversalLauncherBat(recipe: OSRecipe): string {
  return `@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title OSForge Studio - Lanceur ${batEscapePercent(recipe.branding.osName)}
cls

:MENU
cls
echo ===============================================================================
echo   OSFORGE STUDIO - LANCEUR RAPIDE : ${batEscapePercent(recipe.branding.osName)} (${recipe.distro.toUpperCase()})
echo ===============================================================================
echo.
echo   [1] Installer et lancer dans Windows WSL2 (Recommande)
echo   [2] Tester l'ISO en Live avec QEMU sous Windows
echo   [3] Compiler l'image ISO en local avec WSL2 / Linux
echo   [4] Ouvrir le guide GitHub Actions (Build Cloud gratuit)
echo   [5] Afficher le manifeste de configuration (recipe.json)
echo   [6] Tout Automatiser en 1-Clic (WSL2 + Compilation + Test QEMU, sans interaction)
echo   [0] Quitter
echo.
echo ===============================================================================
set /p CHOICE="Votre choix [1-6, 0] : "

if "%CHOICE%"=="1" goto WSL_INSTALL
if "%CHOICE%"=="2" goto LIVE_QEMU
if "%CHOICE%"=="3" goto BUILD_LOCAL
if "%CHOICE%"=="4" goto GITHUB_ACTIONS
if "%CHOICE%"=="5" goto VIEW_RECIPE
if "%CHOICE%"=="6" goto AUTO_BUILD
if "%CHOICE%"=="0" exit /b 0

echo Choix invalide.
timeout /t 2 >nul
goto MENU

:WSL_INSTALL
cls
echo Demarrage de l'installation WSL2...
if exist install-wsl.bat (
    call install-wsl.bat
) else (
    echo [ERREUR] install-wsl.bat introuvable.
    pause
)
goto MENU

:LIVE_QEMU
cls
echo Demarrage en Live QEMU...
if exist run-live-windows.bat (
    call run-live-windows.bat
) else (
    echo [ERREUR] run-live-windows.bat introuvable.
    pause
)
goto MENU

:BUILD_LOCAL
cls
echo ===============================================================================
echo   Compilation locale via WSL2 / Bash
echo ===============================================================================
echo Lancement de la compilation dans WSL2 en mode root...
wsl -u root -- bash -c "sed -i 's/\\\\r$//' build.sh 2>/dev/null || true; chmod +x build.sh && ./build.sh 2>&1 | tee build.log"
pause
goto MENU

:GITHUB_ACTIONS
cls
echo ===============================================================================
echo   Compilation Cloud via GitHub Actions
echo ===============================================================================
echo 1. Initialisez et poussez sur GitHub :
echo    git init -b main ^&^& git add . ^&^& git commit -m "init OS recipe"
echo    gh repo create ${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-os --public --source=. --push
echo 2. Rendez-vous dans l'onglet 'Actions' : le build se lance automatiquement et
echo    publie une Release avec votre ISO, sans autre action de votre part.
echo.
pause
goto MENU

:VIEW_RECIPE
cls
type recipe.json
echo.
pause
goto MENU

:AUTO_BUILD
cls
if exist auto-build.bat (
    call auto-build.bat
) else (
    echo [ERREUR] auto-build.bat introuvable.
    pause
)
goto MENU
`;
}

/**
 * Generates launch.sh — Universal 1-Click Interactive Menu Launcher for Linux / macOS
 */
export function generateUniversalLauncherSh(recipe: OSRecipe): string {
  const isoName = `${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${recipe.branding.version}-${recipe.arch}.iso`;

  return `#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Universal Interactive Launcher (Linux / macOS)
# ==============================================================================

set -e

show_menu() {
    clear
    echo "==============================================================================="
    echo "  🚀 OSFORGE STUDIO — LANCEUR RAPIDE : ${shDoubleQuoteEscape(recipe.branding.osName)} (${recipe.distro.toUpperCase()})"
    echo "==============================================================================="
    echo ""
    echo "  [1] 🔨 Compiler l'image ISO en local (build.sh)"
    echo "  [2] 🐳 Compiler dans un conteneur Docker isolé"
    echo "  [3] 🖲️ Tester l'ISO compilée avec QEMU KVM"
    echo "  [4] 🌐 Pousser sur GitHub pour build Cloud gratuit"
    echo "  [5] 📖 Afficher la recette JSON (recipe.json)"
    echo "  [6] ⚡ Tout automatiser en 1-clic (dépendances + build + test QEMU)"
    echo "  [0] ❌ Quitter"
    echo ""
    echo "==============================================================================="
    read -rp "Votre choix [1-6, 0] : " choice
    
    case $choice in
        1)
            echo "Lancement de la compilation locale..."
            sed -i 's/\\\\r$//' build.sh 2>/dev/null || true
            chmod +x build.sh
            sudo ./build.sh 2>&1 | tee build.log
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        2)
            echo "Compilation Docker isolée..."
            docker build -t osforge-builder .
            docker run --rm --privileged -v "$(pwd)/dist:/osbuilder/dist" osforge-builder
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        3)
            if [ -f "dist/${isoName}" ]; then
                echo "Lancement de QEMU..."
                KVM_ARG=""
                [ -e /dev/kvm ] && [ -w /dev/kvm ] && KVM_ARG="-enable-kvm"
                qemu-system-x86_64 $KVM_ARG -cdrom "dist/${isoName}" -m 4G -vga virtio -smp 4
            else
                echo "L'image ISO dist/${isoName} n'existe pas encore. Veuillez d'abord compiler l'image (Choix 1 ou 2)."
                read -rp "Appuyez sur Entrée pour continuer..."
            fi
            show_menu
            ;;
        4)
            echo "Poussée sur GitHub..."
            git init -b main && git add . && git commit -m "feat: init ${shDoubleQuoteEscape(recipe.branding.osName)}"
            gh repo create "${recipe.branding.osName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-os" --public --source=. --push
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        5)
            cat recipe.json
            echo ""
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        6)
            chmod +x auto-build.sh
            ./auto-build.sh
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        0)
            echo "Au revoir !"
            exit 0
            ;;
        *)
            echo "Choix invalide."
            sleep 1
            show_menu
            ;;
    esac
}

show_menu
`;
}
