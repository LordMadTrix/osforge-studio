#!/usr/bin/env bash
# ==============================================================================
# OSForge Studio — Universal Project Launcher (Linux / macOS)
# ==============================================================================

set -e

show_menu() {
    clear
    echo "==============================================================================="
    echo "  🚀 OSFORGE STUDIO — LANCEUR DU PROJET (Vite + React 19 + Linux Builder)"
    echo "==============================================================================="
    echo ""
    echo "  [1] 🌐 Démarrer OSForge Studio en mode développement (npm run dev)"
    echo "  [2] 🔨 Compiler le projet Web (npm run build)"
    echo "  [3] 🔍 Vérifier le code et linter (npm run lint)"
    echo "  [4] 🐧 Compiler l'image ISO Linux en local (./build.sh)"
    echo "  [5] 🐳 Compiler dans un conteneur Docker étanche"
    echo "  [6] 🖲️ Tester l'image ISO dans QEMU KVM"
    echo "  [7] 📦 Réinstaller les dépendances (npm install)"
    echo "  [0] ❌ Quitter"
    echo ""
    echo "==============================================================================="
    read -rp "Entrez votre choix [1-7, 0] : " choice

    case $choice in
        1)
            echo "Démarrage du serveur Vite..."
            if [ ! -d "node_modules" ]; then
                echo "Installation des dépendances npm..."
                npm install
            fi
            if command -v xdg-open >/dev/null 2>&1; then
                xdg-open "http://localhost:5173/" &
            elif command -v open >/dev/null 2>&1; then
                open "http://localhost:5173/" &
            fi
            npm run dev
            ;;
        2)
            echo "Compilation du projet Web..."
            npm run build
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        3)
            echo "Analyse linter..."
            npm run lint
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        4)
            echo "Compilation de l'ISO Linux (sauvegarde dans build.log)..."
            chmod +x build.sh
            sudo ./build.sh 2>&1 | tee build.log
            echo "Logs enregistrés dans build.log"
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        5)
            echo "Compilation dans Docker..."
            docker build -t osforge-builder .
            docker run --rm --privileged -v "$(pwd)/dist:/osbuilder/dist" osforge-builder
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        6)
            ISO_FILE=$(find dist -name "*.iso" | head -n 1)
            if [ -n "$ISO_FILE" ]; then
                echo "Lancement de QEMU avec $ISO_FILE..."
                qemu-system-x86_64 -cdrom "$ISO_FILE" -m 4G -enable-kvm -vga virtio -smp 4
            else
                echo "Aucun fichier .iso trouvé dans dist/. Compilez d'abord l'image (Choix 4 ou 5)."
            fi
            read -rp "Appuyez sur Entrée pour continuer..."
            show_menu
            ;;
        7)
            echo "Installation des dépendances npm..."
            npm install
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
