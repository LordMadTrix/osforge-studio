@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title OSForge Studio - Compilation 100% Automatique
cls

:: =============================================================================
:: OSForge Studio - Mode "1-Clic" 100% automatique
:: Detecte WSL2, installe les dependances si besoin, compile l'ISO puis lance
:: un test QEMU Live RAM automatiquement - aucune interaction requise.
:: =============================================================================

set LOG_FILE=auto-build.log
echo [%DATE% %TIME%] Debut de la compilation automatique > "%LOG_FILE%"

echo ===============================================================================
echo   OSFORGE STUDIO - COMPILATION 100%% AUTOMATIQUE (1-CLIC)
echo   Toutes les etapes s'enchainent sans intervention. Logs : %LOG_FILE%
echo ===============================================================================
echo.

:: ---------------------------------------------------------------------------
:: [1/5] Verification directe de WSL2 et de la distribution
:: ---------------------------------------------------------------------------
echo [1/5] Verification de l'environnement Linux WSL2...
wsl -u root -- echo WSL_OK >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] WSL2 et distribution Linux operationnels.
    goto WSL_READY
)

:: Si le test direct echoue, diagnostic et installation automatique
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
wsl -u root -- echo WSL_OK >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Impossible de joindre l'environnement WSL2. Consultez %LOG_FILE%.
    pause
    exit /b 1
)

:WSL_READY
echo.

:: ---------------------------------------------------------------------------
:: [2/5] Verification du script de compilation build.sh
:: ---------------------------------------------------------------------------
echo [2/5] Verification des fichiers du projet...
if not exist "build.sh" (
    echo [ERREUR] Le fichier build.sh est absent de ce repertoire.
    echo Exportez ou generez votre recette depuis l'interface OSForge Studio d'abord.
    pause
    exit /b 1
)
echo [OK] Script build.sh detecte.
echo.

:: ---------------------------------------------------------------------------
:: [3/5] Installation des dependances de compilation (execute en root, sans mot de passe)
:: ---------------------------------------------------------------------------
echo [3/5] Verification et installation des dependances dans WSL2...
echo       (debootstrap, xorriso, mtools, grub-pc-bin, squashfs-tools...)
wsl -u root -- bash -c "export DEBIAN_FRONTEND=noninteractive; apt-get update -y && apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync" >>"%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Echec de l'installation des dependances. Voir %LOG_FILE%.
    pause
    exit /b 1
)
echo [OK] Dependances de compilation pretes.
echo.

:: ---------------------------------------------------------------------------
:: [4/5] Compilation de l'ISO (conversion CRLF vers LF + execution live avec affichage)
:: ---------------------------------------------------------------------------
echo [4/5] Compilation de l'ISO en cours (affichage en direct ci-dessous)...
echo ===============================================================================
echo [%DATE% %TIME%] Lancement de build.sh en root >> "%LOG_FILE%"

:: sed supprime les retours chariot Windows CRLF eventuels pouvant bloquer bash
wsl -u root -- bash -c "sed -i 's/\r$//' build.sh 2>/dev/null || true; chmod +x build.sh && ./build.sh 2>&1 | tee -a auto-build.log"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERREUR] La compilation a echoue. Consultez %LOG_FILE% pour le detail.
    pause
    exit /b 1
)
echo ===============================================================================
echo [OK] Compilation terminee avec succes.
echo.

:: ---------------------------------------------------------------------------
:: [5/5] Preparation et lancement du test Live QEMU
:: ---------------------------------------------------------------------------
echo [5/5] Preparation du test Live automatique (QEMU)...
set QEMU_CMD=
set ACCEL_ARGS=-accel tcg

where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% EQU 0 set QEMU_CMD=qemu-system-x86_64
if "%QEMU_CMD%"=="" if exist "C:\Program Files\qemu\qemu-system-x86_64.exe" set "QEMU_CMD=C:\Program Files\qemu\qemu-system-x86_64.exe"

if "%QEMU_CMD%"=="" (
    where winget >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [INFO] QEMU absent. Installation automatique via winget...
        winget install SoftwareFreedomConservancy.QEMU --accept-package-agreements --accept-source-agreements >>"%LOG_FILE%" 2>&1
        if exist "C:\Program Files\qemu\qemu-system-x86_64.exe" set "QEMU_CMD=C:\Program Files\qemu\qemu-system-x86_64.exe"
    )
)

set ISO_PATH=
for %%f in (dist\*.iso) do set ISO_PATH=%%f

if "%ISO_PATH%"=="" (
    echo [ATTENTION] Aucune image ISO trouvee dans dist\ pour le test.
    pause
    exit /b 0
)

if "%QEMU_CMD%"=="" (
    echo [INFO] QEMU n'a pas pu etre installe automatiquement.
    echo L'image ISO a ete compilee avec succes : %ISO_PATH%
    echo Vous pouvez la tester manuellement avec VirtualBox ou en boot USB.
    pause
    exit /b 0
)

:: Detection de l'acceleration materielle Windows Hypervisor Platform (WHPX)
"%QEMU_CMD%" -accel help 2>nul | findstr /i "whpx" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set ACCEL_ARGS=-accel whpx -accel tcg
    echo [OK] Acceleration materielle WHPX activee pour un boot ultra-rapide.
) else (
    echo [INFO] Acceleration WHPX non disponible, demarrage en emulation TCG standard.
)

echo.
echo ===============================================================================
echo   [SUCCES] Compilation terminee !
echo   Image ISO : %ISO_PATH%
echo   Demarrage du test Live QEMU (fermez la fenetre QEMU quand vous avez fini)
echo ===============================================================================
"%QEMU_CMD%" %ACCEL_ARGS% -cdrom "%ISO_PATH%" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d

pause
exit /b 0
