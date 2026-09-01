# 🚀 OSForge Studio — Custom Linux Distro & ISO Graphical Builder

[![Patreon](https://img.shields.io/badge/Patreon-Support-red?style=for-the-badge&logo=patreon)](https://www.patreon.com/c/LordMad)

**OSForge Studio** est un environnement complet et graphique pour concevoir, personnaliser, simuler et compiler des distributions Linux sur mesure (Debian, Ubuntu, Linux Mint, Arch Linux, CachyOS, Alpine, Kali Linux, Fedora, Rocky Linux, openSUSE Tumbleweed, Void Linux, Raspberry Pi OS, NixOS).

---

## ⚡ DÉMARRAGE RAPIDE (LANCEURS 1-CLIC)

### 🪟 Sous Windows
Double-cliquez simplement sur **`launch.bat`** à la racine du projet :
```cmd
launch.bat
```
Il ouvre un menu interactif pour :
1. **Démarrer OSForge Studio** (lance le serveur Vite et ouvre automatiquement votre navigateur).
2. **Compiler le projet web** (`npm run build`).
3. **Vérifier le code** (`npm run lint`).
4. **Installer la distribution dans Windows WSL2** (`install-wsl.bat`).
5. **Tester l'ISO en Live avec QEMU** (`run-live-windows.bat`).
6. **Compiler l'ISO Linux via WSL2** (`build.sh`).
7. **Réinstaller les dépendances NPM**.
8. **Tout automatiser en 1-clic** (`auto-build.bat`) : installe WSL2 et les dépendances si besoin, compile l'ISO puis lance un test QEMU — sans aucune interaction.

---

### 🐧 Sous Linux & macOS
Rendez le script exécutable et lancez **`./launch.sh`** :
```bash
chmod +x launch.sh
./launch.sh
```

---

## 🎯 FONCTIONNALITÉS CLÉS

1. **Lanceur Universel & Command Palette (`Ctrl+K` / `⌘K`)** :
   - Recherche instantanée pour naviguer dans les onglets, basculer des paquets logiciels en 1 frappe, changer de bureau ou de distribution, charger des presets et consulter les astuces.
2. **Système de Conseils & Astuces ("Pro Tips")** :
   - Bandeaux contextuels rotatifs et centre complet d'astuces d'ingénierie Linux (tailles, RAM, sécurité CIS Benchmark, WSL2).
3. **Architecte IA (Prompt to Distro)** :
   - Décrivez vos besoins en langage naturel et l'IA configure la recette optimale.
4. **Démarrage réel d'un noyau Linux dans le navigateur** :
   - Un vrai noyau Linux (Buildroot) démarre dans une machine virtuelle x86 émulée en WebAssembly (v86), directement dans l'onglet — pas une simulation à réponses codées en dur.
5. **Multi-Export** :
   - Image ISO Hybride Live, Distribution Windows WSL2, Image Cloud QCOW2, Conteneur Docker RootFS, Carte SD Raspberry Pi.
   - Scripts autonomes, Dockerfile et workflow GitHub Actions (build cloud 100% gratuit).
6. **Automatisation complète de la compilation** :
   - **GitHub** : le workflow généré compile l'ISO, la tague et **publie automatiquement une Release GitHub** à chaque push sur `main` — aucune action manuelle.
   - **Local** : `auto-build.bat` / `auto-build.sh` enchaînent installation des dépendances, compilation et test QEMU en une seule commande, sans menu ni interaction.

---

## 🛠️ SCRIPTS NPM DISPONIBLES

- `npm run dev` : Démarre le serveur de développement local.
- `npm run build` : Compile l'application TypeScript + Vite pour la production.
- `npm run lint` : Analyse le code avec Oxlint.
- `npm run preview` : Prévisualise le build de production localement.
