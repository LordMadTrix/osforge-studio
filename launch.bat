@echo off
setlocal EnableDelayedExpansion
title OSForge Studio - Lanceur de Projet
cls

:MENU
cls
echo ===============================================================================
echo   OSFORGE STUDIO - LANCEUR DU PROJET (Vite + React 19 + Linux Builder)
echo ===============================================================================
echo.
echo   [1] Demarrer OSForge Studio (Lance le serveur Web et ouvre le navigateur)
echo   [2] Compiler le Projet Web (npm run build)
echo   [3] Verifier le Code et Linter (npm run lint)
echo   [4] Installer la Distribution dans Windows WSL2 (install-wsl.bat)
echo   [5] Tester une ISO en Live avec QEMU (run-live-windows.bat)
echo   [6] Compiler l'ISO Linux en Local via WSL2 (build.sh)
echo   [7] Reinstaller les dependances NPM (npm install)
echo   [8] Tout Automatiser en 1-Clic (WSL2 + Compilation + Test QEMU, sans interaction)
echo   [0] Quitter
echo.
echo ===============================================================================
set /p CHOICE="Entrez votre choix [1-8, 0] : "

if "%CHOICE%"=="1" goto START_DEV
if "%CHOICE%"=="2" goto BUILD_APP
if "%CHOICE%"=="3" goto LINT_APP
if "%CHOICE%"=="4" goto WSL_INSTALL
if "%CHOICE%"=="5" goto LIVE_QEMU
if "%CHOICE%"=="6" goto BUILD_ISO_WSL
if "%CHOICE%"=="7" goto NPM_INSTALL
if "%CHOICE%"=="8" goto AUTO_BUILD
if "%CHOICE%"=="0" exit /b 0

echo Choix invalide.
ping 127.0.0.1 -n 2 >nul
goto MENU

:START_DEV
cls
echo ===============================================================================
echo   Demarrage d'OSForge Studio en mode Developpement
echo ===============================================================================
echo.
if not exist "node_modules" (
    echo [INFO] Le dossier node_modules est absent. Installation des dependances...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERREUR] Echec de l'installation npm.
        pause
        goto MENU
    )
)
echo Demarrage du serveur Vite sur http://localhost:5173/ ...
echo Ouverture automatique dans votre navigateur par defaut...
start http://localhost:5173/
call npm run dev
pause
goto MENU

:BUILD_APP
cls
echo ===============================================================================
echo   Compilation de l'application Web (TypeScript + Vite)
echo ===============================================================================
echo.
call npm run build
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCES] Compilation reussie ! Les fichiers sont dans dist\
) else (
    echo [ERREUR] Erreur lors de la compilation.
)
echo.
pause
goto MENU

:LINT_APP
cls
echo ===============================================================================
echo   Analyse du Code et Linter (Oxlint)
echo ===============================================================================
echo.
call npm run lint
echo.
pause
goto MENU

:WSL_INSTALL
cls
if exist "install-wsl.bat" (
    call install-wsl.bat
) else (
    echo [ERREUR] install-wsl.bat introuvable.
    pause
)
goto MENU

:LIVE_QEMU
cls
if exist "run-live-windows.bat" (
    call run-live-windows.bat
) else (
    echo [ERREUR] run-live-windows.bat introuvable.
    pause
)
goto MENU

:BUILD_ISO_WSL
cls
echo ===============================================================================
echo   Compilation de l'ISO Linux via WSL2 / Bash
echo   (Les logs seront automatiquement enregistres dans build.log)
echo ===============================================================================
echo.
wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] WSL2 n'est pas active sur votre machine.
    pause
    goto MENU
)
echo Execution de build.sh dans WSL2...
wsl bash -c "chmod +x build.sh && sudo ./build.sh 2>&1 | tee build.log"
echo.
echo [INFO] Les logs complets ont ete sauvegardes dans : build.log
pause
goto MENU

:NPM_INSTALL
cls
echo ===============================================================================
echo   Installation des paquets NPM
echo ===============================================================================
echo.
call npm install
echo.
echo [SUCCES] Operation terminee.
pause
goto MENU

:AUTO_BUILD
cls
if exist "auto-build.bat" (
    call auto-build.bat
) else (
    echo [ERREUR] auto-build.bat introuvable.
    pause
)
goto MENU
