import { describe, it, expect } from 'vitest';
import {
  generateWindowsBatchLauncher,
  generateWindowsPowerShellLauncher,
  generateLinuxBashLauncher,
  generateLinuxDesktopFile,
  generateLinuxInstallScript,
  generateDesktopReadme
} from './desktopPackager';

describe('desktopPackager — Générateur de Packs Desktop Autonomes (Windows & Linux)', () => {
  describe('Lanceur Batch Windows (Lancer-OSForge-Studio.bat)', () => {
    it('génère un script batch avec support UTF-8 et séquences ANSI VT100', () => {
      const bat = generateWindowsBatchLauncher();
      expect(bat).toContain('chcp 65001 >nul');
      expect(bat).toContain('reg add HKCU\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f');
      expect(bat).toContain('PORT=5173');
    });

    it('inclut la détection Python et le fallback mini-serveur HTTP PowerShell natif', () => {
      const bat = generateWindowsBatchLauncher();
      expect(bat).toContain('where python >nul 2>&1');
      expect(bat).toContain('python -m http.server %PORT%');
      expect(bat).toContain('System.Net.HttpListener');
      expect(bat).toContain('http://localhost:5173/');
      expect(bat).toContain('ContentType');
    });

    it('ouvre automatiquement le navigateur par défaut ou en mode standalone app', () => {
      const bat = generateWindowsBatchLauncher();
      expect(bat).toContain('msedge --app=http://localhost:%PORT%/');
      expect(bat).toContain('chrome --app=http://localhost:%PORT%/');
      expect(bat).toContain('start http://localhost:%PORT%/');
    });

    it('délègue à server.ps1 si présent pour une exécution propre sans bogues cmd', () => {
      const bat = generateWindowsBatchLauncher();
      expect(bat).toContain('if exist "%APP_DIR%server.ps1"');
      expect(bat).toContain('powershell -NoProfile -ExecutionPolicy Bypass -File "%APP_DIR%server.ps1"');
    });
  });

  describe('Lanceur PowerShell Windows (server.ps1 & Lancer-OSForge-Studio.ps1)', () => {
    it('génère un script PowerShell avec gestion d\'erreurs, encodage UTF-8 et gestionnaire HTTP', () => {
      const ps1 = generateWindowsPowerShellLauncher();
      expect(ps1).toContain("[Console]::OutputEncoding = [System.Text.Encoding]::UTF8");
      expect(ps1).toContain('$port = 5173');
      expect(ps1).toContain('System.Net.HttpListener');
      expect(ps1).toContain('http://localhost:$port/');
      expect(ps1).toContain('Start-Process');
      expect(ps1).toContain('msedge');
      expect(ps1).toContain('chrome');
    });

    it('gère les types MIME essentiels et la fermeture propre des ressources', () => {
      const ps1 = generateWindowsPowerShellLauncher();
      expect(ps1).toContain('text/html; charset=utf-8');
      expect(ps1).toContain('application/javascript; charset=utf-8');
      expect(ps1).toContain('image/svg+xml');
      expect(ps1).toContain('$listener.Stop()');
      expect(ps1).toContain('$listener.Close()');
    });
  });

  describe('Lanceur Bash Linux (lancer-osforge-studio.sh)', () => {
    it('génère un script bash exécutable avec détection multi-moteurs', () => {
      const sh = generateLinuxBashLauncher();
      expect(sh).toContain('#!/usr/bin/env bash');
      expect(sh).toContain('PORT=5173');
      expect(sh).toContain('python3 -m http.server ${PORT}');
      expect(sh).toContain('php -S localhost:${PORT}');
      expect(sh).toContain('busybox httpd');
    });

    it('gère le signal de fermeture pour arrêter le serveur d\'arrière-plan', () => {
      const sh = generateLinuxBashLauncher();
      expect(sh).toContain('trap "kill ${SERVER_PID} 2>/dev/null || true');
      expect(sh).toContain('xdg-open "${URL}"');
    });
  });

  describe('Fichier Desktop Freedesktop (osforge-studio.desktop)', () => {
    it('génère une entrée de bureau Linux standard et conforme', () => {
      const desktop = generateLinuxDesktopFile();
      expect(desktop).toContain('[Desktop Entry]');
      expect(desktop).toContain('Type=Application');
      expect(desktop).toContain('Name=OSForge Studio');
      expect(desktop).toContain('Categories=Development;System;Utility;');
      expect(desktop).toContain('Terminal=true');
      expect(desktop).toContain('StartupNotify=true');
    });
  });

  describe('Script d\'installation Linux (installer-raccourci.sh)', () => {
    it('génère un script qui installe l\'icône et le lanceur d\'applications', () => {
      const installer = generateLinuxInstallScript();
      expect(installer).toContain('.local/share/icons/hicolor/scalable/apps');
      expect(installer).toContain('.local/share/applications');
      expect(installer).toContain('osforge-studio.desktop');
      expect(installer).toContain('chmod +x');
    });
  });

  describe('Guides d\'accompagnement README', () => {
    it('fournit des instructions claires pour Windows et Linux', () => {
      const readmeWin = generateDesktopReadme('windows');
      expect(readmeWin).toContain('Lancer-OSForge-Studio.bat');
      expect(readmeWin).toContain('1 DOUBLE-CLIC');

      const readmeLin = generateDesktopReadme('linux');
      expect(readmeLin).toContain('lancer-osforge-studio.sh');
      expect(readmeLin).toContain('installer-raccourci.sh');
    });
  });
});
