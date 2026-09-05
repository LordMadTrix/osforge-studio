import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

OVERLAYS_DATA = [
    {
        "badge": "CHAPITRE 1 / 6",
        "title": "Accroche & Démonstration Live",
        "sub": "Créez votre propre OS Linux sur mesure en moins de 10 minutes • 100% Gratuit dans le navigateur",
        "color": (168, 85, 247) # Purple
    },
    {
        "badge": "CHAPITRE 2 / 6",
        "title": "Assistant Débutant vs Studio Expert",
        "sub": "Parcours guidé pas à pas ou contrôle intégral : noyau, LUKS, pare-feu & optimisations",
        "color": (59, 130, 246) # Blue
    },
    {
        "badge": "CHAPITRE 3 / 6",
        "title": "Choix de la Recette, Bureau & Gaming",
        "sub": "Base Ubuntu 24.04 LTS • KDE Plasma & Hyprland • Stack Gaming Steam/Proton • Design",
        "color": (16, 185, 129) # Emerald
    },
    {
        "badge": "CHAPITRE 4 / 6",
        "title": "Export & Compilation en 1 Clic",
        "sub": "Scripts bash audités • Double-clic auto-build.bat sous Windows (WSL2) • Zéro commande manuelle",
        "color": (245, 158, 11) # Amber
    },
    {
        "badge": "CHAPITRE 5 / 6",
        "title": "Test Live QEMU avec Accélération WHPX",
        "sub": "Démarrage instantané en mémoire vive (RAM) • Bureau complet avec Fastfetch & logiciels",
        "color": (239, 68, 68) # Red / Crimson
    },
    {
        "badge": "CHAPITRE 6 / 6",
        "title": "Flash Clé USB, Ventoy & GitHub Actions",
        "sub": "Boot sur clé USB avec Rufus/Ventoy • Compilation gratuite dans le Cloud • Liens en description",
        "color": (14, 165, 233) # Cyan
    }
]

def generate_overlays():
    os.makedirs("D:/osbuilder/tutorial_assets/overlays", exist_ok=True)
    font_badge = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 22)
    font_title = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 36)
    font_sub = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 23)
    font_brand = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 23)

    for idx, data in enumerate(OVERLAYS_DATA, start=1):
        img = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        x0, y0, x1, y1 = 50, 915, 1870, 1045
        
        # Shadow
        draw.rounded_rectangle([x0+4, y0+4, x1+4, y1+4], radius=22, fill=(0, 0, 0, 140))
        # Card Background
        draw.rounded_rectangle([x0, y0, x1, y1], radius=20, fill=(13, 17, 23, 235), outline=(*data["color"], 220), width=2)
        
        # Glowing Badge
        badge_w = 210
        draw.rounded_rectangle([x0 + 25, y0 + 20, x0 + 25 + badge_w, y0 + 64], radius=12, fill=(*data["color"], 240))
        draw.text((x0 + 42, y0 + 28), data["badge"], font=font_badge, fill=(255, 255, 255, 255))
        
        # Title
        draw.text((x0 + 255, y0 + 22), data["title"], font=font_title, fill=(255, 255, 255, 255))
        
        # Subtitle
        draw.text((x0 + 30, y0 + 78), data["sub"], font=font_sub, fill=(203, 213, 225, 255))
        
        # Right badge / brand
        draw.rounded_rectangle([x1 - 400, y0 + 22, x1 - 25, y0 + 66], radius=12, fill=(30, 41, 59, 210), outline=(71, 85, 105, 180), width=1)
        draw.text((x1 - 380, y0 + 30), "lordmadtrix.github.io/osforge-studio", font=font_brand, fill=(56, 189, 248, 255))
        
        out_path = f"D:/osbuilder/tutorial_assets/overlays/overlay_chapter_{idx}.png"
        img.save(out_path)
        print(f"Generated {out_path}")

if __name__ == "__main__":
    generate_overlays()
