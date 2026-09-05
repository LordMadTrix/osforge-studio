# OSForge Studio - Script d'installation locale automatisée sous Windows
# Exécution : irm https://raw.githubusercontent.com/LordMadTrix/osforge-studio/main/scripts/install-windows.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  OSForge Studio PRO - Installation Locale Autonome (Windows)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$installDir = Join-Path $env:LOCALAPPDATA "OSForge-Studio"
Write-Host "[1/4] Préparation du répertoire d'installation : $installDir" -ForegroundColor Yellow

if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

$zipUrl = "https://github.com/LordMadTrix/osforge-studio/archive/refs/heads/gh-pages.zip"
$tempZip = Join-Path $env:TEMP "osforge-studio.zip"

Write-Host "[2/4] Téléchargement du pack d'application officiel..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $tempZip -UseBasicParsing
    Write-Host " [OK] Téléchargement terminé avec succès." -ForegroundColor Green
    
    Write-Host "[3/4] Extraction des fichiers..." -ForegroundColor Yellow
    Expand-Archive -Path $tempZip -DestinationPath $installDir -Force
    Remove-Item $tempZip -Force
} catch {
    Write-Host " [INFO] Utilisation de la version GitHub Pages directe." -ForegroundColor Yellow
}

# Création du script de démarrage local
$launcherPath = Join-Path $installDir "Lancer-OSForge.bat"
$batchContent = @"
@echo off
title OSForge Studio PRO
start msedge --app=https://lordmadtrix.github.io/osforge-studio/ || start chrome --app=https://lordmadtrix.github.io/osforge-studio/ || start https://lordmadtrix.github.io/osforge-studio/
"@
Set-Content -Path $launcherPath -Value $batchContent -Encoding UTF8

# Création du raccourci sur le Bureau Windows
$desktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktopPath "OSForge Studio.lnk"

$wscriptShell = New-Object -ComObject WScript.Shell
$shortcut = $wscriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcherPath
$shortcut.Description = "Constructeur Graphique d'OS Linux & ISO Builder"
$shortcut.Save()

Write-Host "[4/4] Raccourci créé sur votre Bureau : $shortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  [SUCCÈS] Installation terminée !" -ForegroundColor Green
Write-Host "  Vous pouvez maintenant lancer OSForge Studio depuis votre Bureau." -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green

# Lancement immédiat
Start-Process -FilePath $launcherPath
