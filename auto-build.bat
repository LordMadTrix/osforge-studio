@echo off
setlocal EnableDelayedExpansion
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
:: [1/5] Verification / installation de WSL2
:: ---------------------------------------------------------------------------
echo [1/5] Verification de WSL2...
wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] WSL2 n'est pas actif. Installation automatique en cours...
    echo [%DATE% %TIME%] Installation de WSL2 >> "%LOG_FILE%"
    wsl --install --no-launch >>"%LOG_FILE%" 2>&1
    echo.
    echo [ATTENTION] WSL2 vient d'etre installe pour la premiere fois.
    echo Windows doit redemarrer pour terminer l'installation.
    echo Relancez simplement auto-build.bat apres le redemarrage : tout reprendra automatiquement.
    pause
    exit /b 0
)
echo [OK] WSL2 est actif.
echo.

:: ---------------------------------------------------------------------------
:: [2/5] Verification / installation d'une distribution WSL par defaut
:: ---------------------------------------------------------------------------
echo [2/5] Verification de la distribution Linux WSL...
wsl -l -q >nul 2>&1
set DISTRO_COUNT=0
for /f %%d in ('wsl -l -q 2^>nul ^| findstr /r /v "^$"') do set /a DISTRO_COUNT+=1
if %DISTRO_COUNT% EQU 0 (
    echo [INFO] Aucune distribution WSL trouvee. Installation automatique d'Ubuntu...
    echo [%DATE% %TIME%] Installation d'Ubuntu dans WSL2 >> "%LOG_FILE%"
    wsl --install -d Ubuntu --no-launch >>"%LOG_FILE%" 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERREUR] Echec de l'installation d'Ubuntu dans WSL2. Voir %LOG_FILE%.
        pause
        exit /b 1
    )
)
echo [OK] Distribution WSL disponible.
echo.

:: ---------------------------------------------------------------------------
:: [3/5] Installation des dependances de compilation (execute en root, sans mot de passe)
:: ---------------------------------------------------------------------------
echo [3/5] Installation des dependances de compilation ISO dans WSL2...
echo       (debootstrap, xorriso, grub, squashfs-tools...)
wsl -u root -- bash -c "apt-get update -y && apt-get install -y debootstrap xorriso mtools grub-pc-bin grub-efi-amd64-bin grub-common squashfs-tools dosfstools rsync" >>"%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Echec de l'installation des dependances. Voir %LOG_FILE%.
    pause
    exit /b 1
)
echo [OK] Dependances installees.
echo.

:: ---------------------------------------------------------------------------
:: [4/5] Compilation de l'ISO (execute en root, aucun mot de passe sudo requis)
:: ---------------------------------------------------------------------------
echo [4/5] Compilation de l'ISO en cours (peut prendre plusieurs minutes)...
echo [%DATE% %TIME%] Lancement de build.sh en root >> "%LOG_FILE%"
wsl -u root -- bash -c "chmod +x build.sh && ./build.sh" >>"%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] La compilation a echoue. Consultez %LOG_FILE% pour le detail.
    pause
    exit /b 1
)
echo [OK] Compilation terminee. Image disponible dans dist\
echo.

:: ---------------------------------------------------------------------------
:: [5/5] Installation automatique de QEMU (si absent) + test Live RAM immediat
:: ---------------------------------------------------------------------------
echo [5/5] Preparation du test Live automatique (QEMU)...
set QEMU_CMD=
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

if "%QEMU_CMD%"=="" (
    echo [ATTENTION] QEMU n'a pas pu etre installe automatiquement.
    echo Compilation terminee avec succes : %ISO_PATH%
    echo Lancez run-live-windows.bat pour tester manuellement.
    pause
    exit /b 0
)

if "%ISO_PATH%"=="" (
    echo [ATTENTION] Aucune image ISO trouvee dans dist\ pour le test.
    pause
    exit /b 0
)

echo [OK] Lancement du test Live RAM automatique de %ISO_PATH%...
echo.
echo ===============================================================================
echo   [SUCCES] Pipeline 100%% automatique termine !
echo   ISO       : %ISO_PATH%
echo   Test QEMU : demarrage en cours (fermez la fenetre QEMU quand vous avez fini)
echo ===============================================================================
"%QEMU_CMD%" -cdrom "%ISO_PATH%" -m 4096 -smp 4 -vga virtio -display sdl -net nic -net user -boot d

pause
exit /b 0
