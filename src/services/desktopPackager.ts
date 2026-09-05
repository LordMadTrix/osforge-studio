import JSZip from 'jszip';
import { triggerFileDownload } from '../utils/downloadHelper';

/**
 * Génère le script batch Windows autonome Lancer-OSForge-Studio.bat
 * Démarre un serveur local HTTP soit via Python soit via PowerShell natif (sans dépendances)
 */
export function generateWindowsBatchLauncher(): string {
  return `@echo off
chcp 65001 >nul
title "OSForge Studio Desktop Launcher - The Ultimate Linux Distro ^& Cloud Image Builder"
color 0b

:: Activation des sequences ANSI dans l'invite de commandes Windows
reg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

echo ===============================================================================
echo       OSFORGE STUDIO BY LORDMADTRIX - MADOS ECOSYSTEM
echo ===============================================================================
echo    The Ultimate Linux Distro ^& Cloud Image Builder (Edition Locale Autonome)
echo ===============================================================================
echo.
echo [1/3] Initialisation de l'environnement local OSForge Studio...

set "PORT=5173"
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

:: Si server.ps1 existe, delegation directe et propre a PowerShell (evite les bogues cmd)
if exist "%APP_DIR%server.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%server.ps1"
    goto end
)

:: Detection du moteur de serveur web local
set "SERVER_TYPE=none"

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "SERVER_TYPE=python"
    goto start_server
)

where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "SERVER_TYPE=py"
    goto start_server
)

set "SERVER_TYPE=powershell"

:start_server
echo [2/3] Demarrage du serveur web local sur le port %PORT% (%SERVER_TYPE%)...

if "%SERVER_TYPE%"=="python" (
    start "OSForge Studio Server" /min python -m http.server %PORT%
    goto open_browser
)

if "%SERVER_TYPE%"=="py" (
    start "OSForge Studio Server" /min py -3 -m http.server %PORT%
    goto open_browser
)

if "%SERVER_TYPE%"=="powershell" (
    start "OSForge Studio Server" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:5173/'); $listener.Start(); while ($listener.IsListening) { $ctx = $listener.GetContext(); $req = $ctx.Request; $res = $ctx.Response; $url = $req.Url.LocalPath.TrimStart('/'); if ([string]::IsNullOrEmpty($url)) { $url = 'index.html' }; $p = Join-Path (Get-Location) $url; if (-not (Test-Path $p) -or (Get-Item $p).PSIsContainer) { $p = Join-Path (Get-Location) 'index.html' }; if (Test-Path $p) { $b = [System.IO.File]::ReadAllBytes($p); $ext = [System.IO.Path]::GetExtension($p).ToLower(); $res.ContentType = switch ($ext) { '.html' {'text/html; charset=utf-8'} '.js' {'application/javascript; charset=utf-8'} '.css' {'text/css; charset=utf-8'} '.svg' {'image/svg+xml'} '.json' {'application/json'} '.png' {'image/png'} '.webp' {'image/webp'} default {'application/octet-stream'} }; $res.ContentLength64 = $b.Length; $res.OutputStream.Write($b, 0, $b.Length); } else { $res.StatusCode = 404 }; $res.OutputStream.Close(); }"
    goto open_browser
)

:open_browser
echo [3/3] Ouverture de l'interface graphique dans votre navigateur...
timeout /t 2 /nobreak >nul

where msedge >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start msedge --app=http://localhost:%PORT%/
    goto ready
)

where chrome >nul 2>&1
if %ERRORLEVEL% equ 0 (
    start chrome --app=http://localhost:%PORT%/
    goto ready
)

start http://localhost:%PORT%/

:ready
echo.
echo ===============================================================================
echo    [SUCCES] OSForge Studio s'execute localement sur http://localhost:%PORT%/
echo   Cette fenetre maintient le serveur actif. Minimisez-la pour continuer.
echo   Pour arreter l'application, fermez simplement cette fenetre.
echo ===============================================================================
echo.
pause

:end
`;
}

/**
 * Génère le script PowerShell autonome server.ps1 (et Lancer-OSForge-Studio.ps1)
 */
export function generateWindowsPowerShellLauncher(): string {
  return `# OSForge Studio Desktop - Serveur Local Autonome
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$port = 5173
$appDir = $PSScriptRoot
if (-not $appDir) { $appDir = (Get-Location).Path }
Set-Location $appDir

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "   OSFORGE STUDIO BY LORDMADTRIX - EDITION LOCALE AUTONOME" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/3] Demarrage du serveur local sur http://localhost:$port..." -ForegroundColor Yellow

Write-Host "-> Moteur : Serveur HTTP natif PowerShell (haute performance, zero dependance)" -ForegroundColor Green

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
} catch {
    $port = 5174
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

Write-Host "[2/3] Ouverture de l'application dans votre navigateur..." -ForegroundColor Yellow
$url = "http://localhost:$port/"
$edge = Get-Command msedge -ErrorAction SilentlyContinue
$chrome = Get-Command chrome -ErrorAction SilentlyContinue

if ($edge) {
    Start-Process msedge -ArgumentList "--app=$url"
} elseif ($chrome) {
    Start-Process chrome -ArgumentList "--app=$url"
} else {
    Start-Process $url
}

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host " [SUCCES] OSForge Studio s'execute localement sur http://localhost:$port/" -ForegroundColor Green
Write-Host " Laissez cette fenetre ouverte pour maintenir l'application active." -ForegroundColor Gray
Write-Host " Pour arreter, appuyez sur [Ctrl + C] ou fermez cette fenetre." -ForegroundColor Gray
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host ""

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $path = $request.Url.LocalPath.TrimStart('/')
            if ($path -match '^osforge-studio/(.*)$') { $path = $matches[1] }
            if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }

            $filePath = Join-Path $appDir $path
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $isAsset = [string]::IsNullOrEmpty($ext) -or ($ext -eq '.html')

            if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                if ($isAsset) {
                    $filePath = Join-Path $appDir "index.html"
                }
            }

            if (Test-Path -LiteralPath $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $response.ContentType = switch ($ext) {
                    ".html"  { "text/html; charset=utf-8" }
                    ".js"    { "application/javascript; charset=utf-8" }
                    ".mjs"   { "application/javascript; charset=utf-8" }
                    ".css"   { "text/css; charset=utf-8" }
                    ".svg"   { "image/svg+xml" }
                    ".json"  { "application/json" }
                    ".png"   { "image/png" }
                    ".webp"  { "image/webp" }
                    ".woff2" { "font/woff2" }
                    ".wasm"  { "application/wasm" }
                    default  { "application/octet-stream" }
                }
                $response.ContentLength64 = $bytes.Length
                $response.AddHeader("Cache-Control", "no-cache")
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $response.StatusCode = 404
            }
            $response.Close()
        } catch {
            # Ignorer les déconnexions client sans interrompre la boucle principale
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
`;
}



/**
 * Génère le script shell Linux autonome lancer-osforge-studio.sh
 */
export function generateLinuxBashLauncher(): string {
  return `#!/usr/bin/env bash
set -e

APP_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "\${APP_DIR}"

PORT=5173

# Couleurs ANSI
CYAN='\\033[1;36m'
GREEN='\\033[1;32m'
YELLOW='\\033[1;33m'
RED='\\033[1;31m'
NC='\\033[0m'

echo -e "\${CYAN}===============================================================================\${NC}"
echo -e "\${CYAN}    ___  ____  _____                     ____  _             _ _       \${NC}"
echo -e "\${CYAN}   / _ \\\\/ ___||  ___|__  _ __ __ _  ___ / ___|| |_ _   _  __| (_) ___  \${NC}"
echo -e "\${CYAN}  | | | \\\\___ \\\\| |_ / _ \\\\| '__/ _\` |/ _ \\\\\\\\___ \\\\| __| | | |/ _\` | |/ _ \\\\ \${NC}"
echo -e "\${CYAN}  | |_| |___) |  _| (_) | | | (_| |  __/ ___) | |_| |_| | (_| | | (_) |\${NC}"
echo -e "\${CYAN}   \\\\___/|____/|_|  \\\\___/|_|  \\\\__, |\\\\___|____/ \\\\__|\\\\__,_|\\\\__,_|_|\\\\___/ \${NC}"
echo -e "\${CYAN}                             |___/             ÉDITION LOCALE LINUX    \${NC}"
echo -e "\${CYAN}===============================================================================\${NC}"
echo ""

echo -e "\${YELLOW}[1/3] Recherche d'un moteur de serveur HTTP local...\${NC}"

SERVER_CMD=""
if command -v python3 >/dev/null 2>&1; then
    SERVER_CMD="python3 -m http.server \${PORT}"
elif command -v python >/dev/null 2>&1; then
    SERVER_CMD="python -m SimpleHTTPServer \${PORT}"
elif command -v php >/dev/null 2>&1; then
    SERVER_CMD="php -S localhost:\${PORT}"
elif command -v busybox >/dev/null 2>&1; then
    SERVER_CMD="busybox httpd -f -p \${PORT}"
fi

if [ -z "\${SERVER_CMD}" ]; then
    echo -e "\${RED}[ERREUR] Aucun interpréteur HTTP trouvé (python3, php ou busybox requis).\${NC}"
    echo -e "Installez Python avec : sudo apt install python3 (ou pacman -S python / dnf install python3)"
    exit 1
fi

echo -e "\${GREEN}[2/3] Démarrage du serveur web : \${SERVER_CMD}...\${NC}"
\${SERVER_CMD} >/dev/null 2>&1 &
SERVER_PID=$!

# Nettoyage automatique du processus en arrière-plan à la sortie
trap "kill \${SERVER_PID} 2>/dev/null || true; echo -e '\\nServeur arrêté.'; exit 0" INT TERM EXIT

sleep 1

URL="http://localhost:\${PORT}"
echo -e "\${YELLOW}[3/3] Ouverture de \${URL} dans le navigateur...\${NC}"

if command -v google-chrome >/dev/null 2>&1; then
    google-chrome --app="\${URL}" >/dev/null 2>&1 &
elif command -v chromium-browser >/dev/null 2>&1; then
    chromium-browser --app="\${URL}" >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
    chromium --app="\${URL}" >/dev/null 2>&1 &
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "\${URL}" >/dev/null 2>&1 &
elif command -v firefox >/dev/null 2>&1; then
    firefox "\${URL}" >/dev/null 2>&1 &
else
    echo -e "\${YELLOW}Ouvrez manuellement votre navigateur sur : \${URL}\${NC}"
fi

echo ""
echo -e "\${GREEN}===============================================================================\${NC}"
echo -e "\${GREEN}  [SUCCÈS] OSForge Studio s'exécute localement sur \${URL}\${NC}"
echo -e "  Appuyez sur Ctrl+C pour arrêter le serveur et quitter."
echo -e "\${GREEN}===============================================================================\${NC}"
echo ""

wait \${SERVER_PID}
`;
}

/**
 * Génère le fichier d'entrée desktop Freedesktop pour Linux
 */
export function generateLinuxDesktopFile(): string {
  return `[Desktop Entry]
Version=1.0
Type=Application
Name=OSForge Studio (by LordMadTrix)
GenericName=The Ultimate Linux Distro & Cloud Image Builder
Comment=The Ultimate Linux Distro & Cloud Image Builder par LordMadTrix • Écosystème MadOS
Exec=bash -c 'cd "$(dirname "%k")" && ./lancer-osforge-studio.sh'
Icon=osforge-studio
Terminal=true
Categories=Development;System;Utility;
Keywords=linux;iso;distro;builder;debian;arch;ubuntu;fedora;cloud;qcow2;lordmadtrix;mados;
StartupNotify=true
`;
}

/**
 * Génère le script d'installation du raccourci de bureau Linux
 */
export function generateLinuxInstallScript(): string {
  return `#!/usr/bin/env bash
set -e

APP_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "\${APP_DIR}"

chmod +x lancer-osforge-studio.sh

# 1. Installation de l'icône de l'application
ICON_DIR="\${HOME}/.local/share/icons/hicolor/scalable/apps"
mkdir -p "\${ICON_DIR}"
if [ -f "favicon.svg" ]; then
    cp "favicon.svg" "\${ICON_DIR}/osforge-studio.svg"
fi

# 2. Installation de l'entrée dans le menu des applications
DESKTOP_DIR="\${HOME}/.local/share/applications"
mkdir -p "\${DESKTOP_DIR}"

cat <<EOF > "\${DESKTOP_DIR}/osforge-studio.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=OSForge Studio PRO
GenericName=Linux OS & ISO Builder
Comment=Créez, personnalisez et compilez votre distribution Linux sur-mesure
Exec=\${APP_DIR}/lancer-osforge-studio.sh
Icon=osforge-studio
Terminal=true
Categories=Development;System;Utility;
Keywords=linux;iso;distro;builder;debian;arch;ubuntu;
StartupNotify=true
EOF

chmod +x "\${DESKTOP_DIR}/osforge-studio.desktop"

# 3. Raccourci sur le Bureau si le dossier existe
if [ -d "\${HOME}/Desktop" ]; then
    cp "\${DESKTOP_DIR}/osforge-studio.desktop" "\${HOME}/Desktop/"
    chmod +x "\${HOME}/Desktop/osforge-studio.desktop"
fi

echo "================================================================="
echo " [OK] OSForge Studio a été ajouté à votre menu d'applications !"
echo "================================================================="
`;
}

/**
 * Génère le fichier README d'accompagnement
 */
export function generateDesktopReadme(platform: 'windows' | 'linux'): string {
  if (platform === 'windows') {
    return `# 🚀 OSForge Studio PRO — Version Portable Windows

Félicitations ! Vous disposez de la version autonome d'**OSForge Studio**.

## ⚡ DÉMARRAGE EN 1 DOUBLE-CLIC
1. Double-cliquez simplement sur \`Lancer-OSForge-Studio.bat\` (ou exécutez \`.\\Lancer-OSForge-Studio.ps1\` dans un terminal PowerShell).
2. Le script initialise automatiquement un serveur web local sécurisé (PowerShell natif ou Python) et ouvre l'application dans votre navigateur.
3. Aucune installation logicielle préalable n'est requise.

## 📦 FICHIERS INCLUS
- \`Lancer-OSForge-Studio.bat\` : Lanceur interactif universel (PowerShell natif / Python).
- \`Lancer-OSForge-Studio.ps1\` : Lanceur natif PowerShell direct pour console ou terminal.
- \`server.ps1\` : Moteur de serveur web local haute performance PowerShell natif.
- \`index.html\` : Point d'entrée de l'application.
- \`assets/\` : Scripts, composants et styles de l'interface.
- \`favicon.svg\` : Icône officielle haute définition.
- \`manifest.webmanifest\` : Support PWA (Progressive Web App).

## 🛡️ HORS-LIGNE & VIE PRIVÉE
Toutes les générations de scripts bash, manifestes cloud-init et configurations s'effectuent à 100% en local dans votre navigateur. Aucune donnée n'est envoyée à des serveurs tiers.
`;
  }

  return `# 🚀 OSForge Studio PRO — Version Portable Linux

Félicitations ! Vous disposez de la version autonome d'**OSForge Studio**.

## ⚡ DÉMARRAGE RAPIDE
1. Ouvrez un terminal dans ce dossier et rendez le lanceur exécutable si nécessaire :
   \`chmod +x lancer-osforge-studio.sh\`
2. Lancez l'application :
   \`./lancer-osforge-studio.sh\`
3. Pour ajouter OSForge Studio à votre menu d'applications système (GNOME, KDE, XFCE) :
   \`chmod +x installer-raccourci.sh && ./installer-raccourci.sh\`

## 📦 FICHIERS INCLUS
- \`lancer-osforge-studio.sh\` : Lanceur bash autonome multi-moteurs (Python 3, PHP, Busybox).
- \`installer-raccourci.sh\` : Installateur d'icône et de lanceur Freedesktop .desktop.
- \`osforge-studio.desktop\` : Raccourci standard pour environnements de bureau Linux.
- \`index.html\` : Application Web complète.
- \`favicon.svg\` : Icône officielle SVG.

## 🛡️ HORS-LIGNE & VIE PRIVÉE
Toutes les recettes et scripts bash sont générés à 100% en local.
`;
}

/**
 * Télécharge le pack Windows Portable au format .zip
 */
export async function downloadWindowsPortableZip(): Promise<void> {
  const zipFilename = 'OSForge-Studio-Windows-Portable.zip';

  // 1. Essai de téléchargement direct du pack complet officiel pré-compilé
  if (typeof window !== 'undefined') {
    try {
      const baseUrl = (import.meta.env.BASE_URL || './').replace(/\/+$/, '');
      const zipUrl = `${baseUrl}/${zipFilename}`;
      const res = await fetch(zipUrl);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 1000) {
          triggerFileDownload(blob, zipFilename);
          return;
        }
      }
    } catch {
      // Fallback vers génération JSZip à la volée
    }
  }

  // 2. Fallback dynamique JSZip
  const zip = new JSZip();
  const toCrlf = (str: string) => str.replace(/\r?\n/g, '\r\n');

  zip.file('Lancer-OSForge-Studio.bat', toCrlf(generateWindowsBatchLauncher()));
  zip.file('Lancer-OSForge-Studio.ps1', toCrlf(generateWindowsPowerShellLauncher()));
  zip.file('server.ps1', toCrlf(generateWindowsPowerShellLauncher()));
  zip.file('README.txt', toCrlf(generateDesktopReadme('windows')));
  zip.file('manifest.webmanifest', JSON.stringify({
    name: 'OSForge Studio PRO',
    short_name: 'OSForge',
    start_url: './index.html',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#0284c7'
  }, null, 2));

  let htmlContent = '<!doctype html><html><head><meta charset="UTF-8"><title>OSForge Studio</title></head><body><div id="root"></div></body></html>';

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const indexRes = await fetch('./index.html');
      if (indexRes.ok) {
        htmlContent = await indexRes.text();
      } else {
        htmlContent = '<!doctype html>\n' + document.documentElement.outerHTML.replace(/\/osforge-studio\//g, './');
      }

      const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'));
      const preloads = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"][href]'));
      const styles = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'));

      const allUrls = [
        ...scripts.map(s => s.src),
        ...preloads.map(p => p.href),
        ...styles.map(st => st.href)
      ].filter(Boolean);

      for (const u of allUrls) {
        if (u.includes('/assets/') || u.includes('assets/')) {
          try {
            const r = await fetch(u);
            if (r.ok) {
              const data = await r.text();
              const fname = u.split('/').pop()?.split('?')[0] || 'bundle.js';
              zip.folder('assets')?.file(fname, data);
              zip.folder('osforge-studio')?.folder('assets')?.file(fname, data);
            }
          } catch {
            // Ignorer échecs individuels
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  zip.file('index.html', htmlContent);
  zip.folder('osforge-studio')?.file('index.html', htmlContent);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  triggerFileDownload(blob, zipFilename);
}

/**
 * Télécharge le pack Linux Portable au format .zip
 */
export async function downloadLinuxPortableZip(): Promise<void> {
  const zipFilename = 'OSForge-Studio-Linux-Portable.zip';

  // 1. Essai de téléchargement direct du pack complet officiel pré-compilé
  if (typeof window !== 'undefined') {
    try {
      const baseUrl = (import.meta.env.BASE_URL || './').replace(/\/+$/, '');
      const zipUrl = `${baseUrl}/${zipFilename}`;
      const res = await fetch(zipUrl);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 1000) {
          triggerFileDownload(blob, zipFilename);
          return;
        }
      }
    } catch {
      // Fallback vers génération JSZip à la volée
    }
  }

  // 2. Fallback dynamique JSZip
  const zip = new JSZip();

  zip.file('lancer-osforge-studio.sh', generateLinuxBashLauncher());
  zip.file('installer-raccourci.sh', generateLinuxInstallScript());
  zip.file('osforge-studio.desktop', generateLinuxDesktopFile());
  zip.file('README.md', generateDesktopReadme('linux'));

  let htmlContent = '<!doctype html><html><head><meta charset="UTF-8"><title>OSForge Studio</title></head><body><div id="root"></div></body></html>';

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const indexRes = await fetch('./index.html');
      if (indexRes.ok) {
        htmlContent = await indexRes.text();
      } else {
        htmlContent = '<!doctype html>\n' + document.documentElement.outerHTML.replace(/\/osforge-studio\//g, './');
      }

      const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'));
      const preloads = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="modulepreload"][href]'));
      const styles = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'));

      const allUrls = [
        ...scripts.map(s => s.src),
        ...preloads.map(p => p.href),
        ...styles.map(st => st.href)
      ].filter(Boolean);

      for (const u of allUrls) {
        if (u.includes('/assets/') || u.includes('assets/')) {
          try {
            const r = await fetch(u);
            if (r.ok) {
              const data = await r.text();
              const fname = u.split('/').pop()?.split('?')[0] || 'bundle.js';
              zip.folder('assets')?.file(fname, data);
              zip.folder('osforge-studio')?.folder('assets')?.file(fname, data);
            }
          } catch {
            // Ignorer
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  zip.file('index.html', htmlContent);
  zip.folder('osforge-studio')?.file('index.html', htmlContent);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  triggerFileDownload(blob, zipFilename);
}
