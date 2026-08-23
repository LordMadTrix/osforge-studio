@echo off
setlocal EnableDelayedExpansion
title ForgeOS - Machine Virtuelle QEMU (Test & Nettoyage Automatique)
cls

:MENU
cls
echo ===============================================================================
echo   OSFORGE STUDIO - MACHINE VIRTUELLE DE TEST RAPIDE (QEMU)
echo ===============================================================================
echo.

:: 1. Detection de l'image ISO
set ISO_PATH=
for %%f in (dist\*.iso) do (
    set ISO_PATH=%%f
)

if "%ISO_PATH%"=="" (
    echo [ERREUR] Aucun fichier .iso n'a ete trouve dans dist\
    echo Assurez-vous d'avoir compile votre image ISO au prealable.
    echo.
    pause
    exit /b 1
)

echo [OK] Image ISO detectee : %ISO_PATH%
echo.

:: 2. Detection du binaire QEMU (PATH Windows, Program Files, ou WSL2)
set QEMU_CMD=
set QEMU_IMG_CMD=
set QEMU_MODE=WINDOWS

where qemu-system-x86_64 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set QEMU_CMD=qemu-system-x86_64
    set QEMU_IMG_CMD=qemu-img
)

if "%QEMU_CMD%"=="" (
    if exist "C:\Program Files\qemu\qemu-system-x86_64.exe" (
        set "QEMU_CMD=C:\Program Files\qemu\qemu-system-x86_64.exe"
        set "QEMU_IMG_CMD=C:\Program Files\qemu\qemu-img.exe"
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
) else (
    echo [ATTENTION] QEMU n'est pas encore installe sur votre systeme.
)

echo.
echo -------------------------------------------------------------------------------
echo   CHOISISSEZ UNE OPTION :
echo -------------------------------------------------------------------------------
echo   [1] Lancer la VM Ephemere en Live RAM (Zero fichier modifie sur votre disque)
echo   [2] Lancer la VM avec un Disque Virtuel Temporaire (20 Go QCOW2)
echo   [3] Installer automatiquement QEMU (via Winget Windows ou WSL2)
echo   [4] Nettoyer / Supprimer les disques virtuels de test temporaires
echo   [0] Retour au menu principal
echo.
echo ===============================================================================
set /p CHOICE="Votre choix [1-4, 0] : "

if "%CHOICE%"=="1" goto RUN_LIVE_RAM
if "%CHOICE%"=="2" goto RUN_WITH_DISK
if "%CHOICE%"=="3" goto INSTALL_QEMU
if "%CHOICE%"=="4" goto CLEANUP_VM
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
        echo Rafraichissement de l'environnement...
        if exist "C:\Program Files\qemu\qemu-system-x86_64.exe" (
            set "QEMU_CMD=C:\Program Files\qemu\qemu-system-x86_64.exe"
            set "QEMU_IMG_CMD=C:\Program Files\qemu\qemu-img.exe"
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
    echo [ERREUR] QEMU n'est pas installe. Veuillez choisir l'option [3] d'abord.
    pause
    goto MENU
)
exit /b 0

:RUN_LIVE_RAM
call :CHECK_QEMU_EXISTS
cls
echo ===============================================================================
echo   LANCEMENT DE LA VM EPHEMERE (LIVE RAM)
echo ===============================================================================
echo.
echo   Image ISO : %ISO_PATH%
echo   Memoire   : 4096 Mo (4 Go RAM)
echo   Processeur: 4 Coeurs CPU Virtuels
echo   Affichage : VirtIO GPU Haute Performance
echo.
echo [INFO] Cette VM tourne 100%% en memoire vive. Aucun fichier n'est cree.
echo [INFO] Fermez simplement la fenetre QEMU quand vous avez termine le test.
echo.

if "%QEMU_MODE%"=="WSL" (
    wsl bash -c "ISO_FILE=\$(wslpath -a '%ISO_PATH%'); qemu-system-x86_64 -cdrom \"\$ISO_FILE\" -m 4096 -smp 4 -vga virtio -display sdl -net nic -net user -boot d"
) else (
    "%QEMU_CMD%" -cdrom "%CD%\%ISO_PATH%" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
)

echo.
echo [OK] Session de test Live RAM terminee.
pause
goto MENU

:RUN_WITH_DISK
call :CHECK_QEMU_EXISTS
cls
echo ===============================================================================
echo   LANCEMENT DE LA VM AVEC DISQUE VIRTUEL TEMPORAIRE
echo ===============================================================================
echo.
set DISK_NAME=dist\test-vm-disk.qcow2

echo [1/3] Creation d'un disque virtuel temporaire dynamique de 20 Go (%DISK_NAME%)...
if "%QEMU_MODE%"=="WSL" (
    wsl bash -c "DISK_FILE=\$(wslpath -a '%DISK_NAME%'); qemu-img create -f qcow2 \"\$DISK_FILE\" 20G"
) else (
    if not "%QEMU_IMG_CMD%"=="" (
        "%QEMU_IMG_CMD%" create -f qcow2 "%CD%\%DISK_NAME%" 20G
    ) else (
        qemu-img create -f qcow2 "%CD%\%DISK_NAME%" 20G
    )
)

echo [2/3] Demarrage de la VM avec support d'ecriture...
echo.
echo [INFO] Vous pouvez tester l'installateur de l'OS ou installer des paquets.
echo [INFO] A la fermeture, le disque temporaire vous sera propose a la suppression.
echo.

if "%QEMU_MODE%"=="WSL" (
    wsl bash -c "ISO_FILE=\$(wslpath -a '%ISO_PATH%'); DISK_FILE=\$(wslpath -a '%DISK_NAME%'); qemu-system-x86_64 -cdrom \"\$ISO_FILE\" -hda \"\$DISK_FILE\" -m 4096 -smp 4 -vga virtio -display sdl -net nic -net user -boot d"
) else (
    "%QEMU_CMD%" -cdrom "%CD%\%ISO_PATH%" -hda "%CD%\%DISK_NAME%" -m 4096 -smp 4 -vga virtio -net nic -net user -boot d
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
echo   NETTOYAGE DES MACHINES VIRTUELLES DE TEST
echo ===============================================================================
echo.
set FOUND=0
if exist "dist\test-vm-disk.qcow2" (
    del /f /q "dist\test-vm-disk.qcow2"
    echo [SUPPRIME] dist\test-vm-disk.qcow2
    set FOUND=1
)
if exist "test-vm-disk.qcow2" (
    del /f /q "test-vm-disk.qcow2"
    echo [SUPPRIME] test-vm-disk.qcow2
    set FOUND=1
)
if exist "dist\*.qcow2" (
    del /f /q "dist\*.qcow2"
    echo [SUPPRIME] Fichiers .qcow2 temporaires
    set FOUND=1
)

if "%FOUND%"=="0" (
    echo [INFO] Aucun fichier de VM temporaire a supprimer. Tout est propre !
) else (
    echo [SUCCES] Tous les disques et fichiers temporaires de VM ont ete nettoyes !
)
echo.
pause
goto MENU
