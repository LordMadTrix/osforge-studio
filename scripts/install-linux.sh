#!/usr/bin/env bash
# OSForge Studio - Script d'installation locale automatisée sous Linux
# Exécution : curl -fsSL https://raw.githubusercontent.com/LordMadTrix/osforge-studio/main/scripts/install-linux.sh | bash

set -e

GREEN='\033[1;32m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}  OSForge Studio PRO - Installation Locale Autonome (Linux)${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo ""

INSTALL_DIR="${HOME}/.local/share/osforge-studio"
echo -e "${YELLOW}[1/4] Préparation du répertoire : ${INSTALL_DIR}...${NC}"
mkdir -p "${INSTALL_DIR}"

LAUNCHER="${INSTALL_DIR}/lancer-osforge.sh"
cat <<'EOF' > "${LAUNCHER}"
#!/usr/bin/env bash
URL="https://lordmadtrix.github.io/osforge-studio/"

if command -v google-chrome >/dev/null 2>&1; then
    google-chrome --app="${URL}" &
elif command -v chromium >/dev/null 2>&1; then
    chromium --app="${URL}" &
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${URL}" &
elif command -v firefox >/dev/null 2>&1; then
    firefox "${URL}" &
fi
EOF
chmod +x "${LAUNCHER}"

echo -e "${YELLOW}[2/4] Téléchargement de l'icône officielle...${NC}"
ICON_DIR="${HOME}/.local/share/icons/hicolor/scalable/apps"
mkdir -p "${ICON_DIR}"
curl -sSL "https://raw.githubusercontent.com/LordMadTrix/osforge-studio/main/public/favicon.svg" -o "${ICON_DIR}/osforge-studio.svg" || true

echo -e "${YELLOW}[3/4] Création du lanceur d'applications Desktop...${NC}"
DESKTOP_FILE="${HOME}/.local/share/applications/osforge-studio.desktop"
mkdir -p "${HOME}/.local/share/applications"

cat <<EOF > "${DESKTOP_FILE}"
[Desktop Entry]
Version=1.0
Type=Application
Name=OSForge Studio PRO
GenericName=Linux OS & ISO Builder
Comment=Créez, personnalisez et compilez votre distribution Linux sur-mesure
Exec=${LAUNCHER}
Icon=osforge-studio
Terminal=false
Categories=Development;System;Utility;
Keywords=linux;iso;distro;builder;debian;arch;ubuntu;
StartupNotify=true
EOF
chmod +x "${DESKTOP_FILE}"

if [ -d "${HOME}/Desktop" ]; then
    cp "${DESKTOP_FILE}" "${HOME}/Desktop/"
    chmod +x "${HOME}/Desktop/osforge-studio.desktop"
    echo -e "${GREEN}[OK] Raccourci ajouté sur le Bureau.${NC}"
fi

echo -e "${GREEN}=================================================================${NC}"
echo -e "${GREEN}  [SUCCÈS] Installation terminée !${NC}"
echo -e "  OSForge Studio est maintenant disponible dans votre menu d'applications."
echo -e "${GREEN}=================================================================${NC}"

# Lancement immédiat
"${LAUNCHER}" &
