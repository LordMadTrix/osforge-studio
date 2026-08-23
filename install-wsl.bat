@echo off
setlocal EnableDelayedExpansion
title Installation ForgeOS - Windows WSL2
cls

echo =====================================================================
echo   Installation de ForgeOS sous Windows WSL2
echo =====================================================================
echo.

wsl --status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] WSL n'est pas active sur ce PC Windows.
    echo Executez 'wsl --install' dans PowerShell en mode Administrateur.
    pause
    exit /b 1
)

set DISTRO_NAME=ForgeOS
set INSTALL_DIR=%USERPROFILE%\WSL\%DISTRO_NAME%
set TAR_FILE=
for %%f in (dist\*-rootfs.tar.gz) do set TAR_FILE=%%f

if "%TAR_FILE%"=="" (
    echo [ERREUR] Aucun fichier dist\*-rootfs.tar.gz trouve.
    echo Recompilez avec le format de sortie "Distribution Windows WSL2 (.tar.gz)" selectionne dans l'app.
    pause
    exit /b 1
)

echo [1/3] Creation du dossier d'installation : %INSTALL_DIR%
mkdir "%INSTALL_DIR%" 2>nul

echo [2/3] Importation dans Windows WSL2...
wsl --import %DISTRO_NAME% "%INSTALL_DIR%" "%TAR_FILE%" --version 2 2>nul

echo [3/3] Configuration du support Systemd et utilisateur par defaut...
wsl -d %DISTRO_NAME% -u root bash -c "echo -e '[boot]\nsystemd=true\n[user]\ndefault=developer' > /etc/wsl.conf" 2>nul

echo.
echo =====================================================================
echo   [SUCCES] ForgeOS est installe avec succes sous Windows !
echo =====================================================================
echo.
echo Pour lancer votre distribution a tout moment dans le terminal Windows :
echo    wsl -d %DISTRO_NAME%
echo.
pause
