import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"D:\osbuilder"
ASSETS_DIR = os.path.join(BASE_DIR, "tutorial_assets")
TEMP_SHORTS = os.path.join(ASSETS_DIR, "temp_shorts")
OUTPUT_SHORTS = os.path.join(ASSETS_DIR, "OSForge_Studio_Shorts_1080x1920.mp4")

os.makedirs(TEMP_SHORTS, exist_ok=True)

SHOTS = [
    {
        "image": r"D:\osbuilder\tutorial_assets\miniature_youtube.jpg",
        "duration": 6.5,
        "title": "CRÉE TON LINUX SUR MESURE",
        "sub": "100% Gratuit dans ton navigateur web"
    },
    {
        "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_mode_active_1788629680602.png",
        "duration": 4.5,
        "title": "13 DISTRIBUTIONS AU CHOIX",
        "sub": "Ubuntu • Arch • Debian • Fedora • Alpine"
    },
    {
        "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_desktop_selector_1788630129596.png",
        "duration": 5.0,
        "title": "BUREAU & APERÇU HAUTE DÉFINITION",
        "sub": "KDE Plasma • Hyprland • GNOME • COSMIC"
    },
    {
        "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_software_gaming_1788630161669.png",
        "duration": 5.0,
        "title": "STACK GAMING & OUTILS DEV",
        "sub": "Steam • Proton • MangoHUD • Fastfetch"
    },
    {
        "image": r"D:\osbuilder\public\showcase\mados-rog-edition.jpg",
        "duration": 5.5,
        "title": "BOOT LIVE QEMU EN 30 SECONDES",
        "sub": "Accélération WHPX en RAM sans risque"
    },
    {
        "image": r"D:\osbuilder\public\showcase\osforge-studio.jpg",
        "duration": 4.556, # Remainder to reach 31.056s
        "title": "TESTE-LE GRATUITEMENT DÈS MAINTENANT",
        "sub": "Lien direct dans la description / bio"
    }
]

def generate_vertical_overlay(idx, title, sub):
    img = Image.new('RGBA', (1080, 1920), (10, 14, 23, 255))
    draw = ImageDraw.Draw(img)

    # Subtle neon background gradients
    for y in range(480):
        alpha = int(80 * (1.0 - y / 480))
        draw.line([(0, y), (1080, y)], fill=(88, 28, 135, alpha))
        
    for y in range(1440, 1920):
        prog = (y - 1440) / 480
        alpha = int(90 * prog)
        draw.line([(0, y), (1080, y)], fill=(15, 76, 129, alpha))

    font_badge = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 26)
    font_main_title = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 44)
    font_step_title = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 38)
    font_step_sub = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 28)
    font_brand = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 32)
    font_pill = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 24)

    # Top Header
    draw.rounded_rectangle([260, 70, 820, 130], radius=30, fill=(168, 85, 247, 240))
    draw.text((310, 82), "🔥 OSFORGE STUDIO", font=font_badge, fill=(255, 255, 255, 255))

    draw.text((100, 160), "COMMENT CRÉER TON OS LINUX", font=font_main_title, fill=(255, 255, 255, 255))
    draw.text((210, 225), "EN MOINS DE 10 MINUTES !", font=font_main_title, fill=(56, 189, 248, 255))

    # Center cut-out area border (y: 360 to 1180 -> 1000x620)
    # The video frame will be placed from y=400 to y=1160 (16:9 is 1080x608)
    cx0, cy0, cx1, cy1 = 30, 480, 1050, 1280
    draw.rounded_rectangle([cx0-6, cy0-6, cx1+6, cy1+6], radius=24, outline=(168, 85, 247, 180), width=4)

    # Dynamic Step Card below screen
    draw.rounded_rectangle([40, 1320, 1040, 1490], radius=24, fill=(15, 23, 42, 240), outline=(56, 189, 248, 200), width=2)
    draw.text((70, 1345), title, font=font_step_title, fill=(255, 255, 255, 255))
    draw.text((70, 1410), sub, font=font_step_sub, fill=(148, 163, 184, 255))

    # Floating Features Pills
    pills = [
        ("⚡ 1-Clic Sans Commande", 60, 1530),
        ("🎮 Stack Gaming Steam", 540, 1530),
        ("🚀 Boot Live QEMU RAM", 60, 1610),
        ("🛡️ Chiffrement LUKS2", 540, 1610),
    ]
    for text, px, py in pills:
        draw.rounded_rectangle([px, py, px+460, py+60], radius=16, fill=(30, 41, 59, 220), outline=(71, 85, 105, 160), width=1)
        draw.text((px+35, py+15), text, font=font_pill, fill=(226, 232, 240, 255))

    # Bottom CTA Box
    draw.rounded_rectangle([40, 1720, 1040, 1840], radius=25, fill=(16, 185, 129, 230))
    draw.text((120, 1740), "🌐 lordmadtrix.github.io/osforge-studio", font=font_brand, fill=(255, 255, 255, 255))
    draw.text((280, 1790), "👆 Teste-le gratuitement en bio !", font=font_pill, fill=(255, 255, 255, 255))

    # Transparent hole for the screen video (y: 490 to 1270)
    # We create transparent mask
    overlay_path = os.path.join(TEMP_SHORTS, f"overlay_short_{idx}.png")
    
    # Save overlay image
    img.save(overlay_path)
    return overlay_path

def main():
    print("Création de la vidéo YouTube Shorts 1080x1920...")
    shot_files = []
    
    for idx, s in enumerate(SHOTS):
        overlay_p = generate_vertical_overlay(idx, s["title"], s["sub"])
        dur = s["duration"]
        num_frames = int(round(dur * 30))
        out_shot = os.path.join(TEMP_SHORTS, f"short_shot_{idx}.mp4")
        
        # We scale the 16:9 image to 1000x562 and overlay it at (40, 560) on top of the vertical canvas
        filter_str = (
            f"[0:v]scale=1000:562:force_original_aspect_ratio=increase,crop=1000:562,"
            f"zoompan=z='min(zoom+0.0006,1.06)':d={num_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1000x562:fps=30[vscreen];"
            f"[1:v][vscreen]overlay=40:560:format=auto,format=yuv420p[vout]"
        )
        
        cmd = [
            "ffmpeg", "-y",
            "-i", s["image"],
            "-i", overlay_p,
            "-filter_complex", filter_str,
            "-map", "[vout]",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "19",
            "-pix_fmt", "yuv420p",
            out_shot
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        shot_files.append(out_shot)
        print(f"  -> Plan vertical {idx+1}/{len(SHOTS)} terminé ({dur:.1f}s)")
        
    # Concat all shots
    concat_list = os.path.join(TEMP_SHORTS, "shorts_concat.txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        for sf in shot_files:
            f.write(f"file '{sf}'\n")
            
    video_no_audio = os.path.join(TEMP_SHORTS, "shorts_video_no_audio.mp4")
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        video_no_audio
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    # Mix with Shorts Voice and Synthwave BGM
    voice_audio = os.path.join(ASSETS_DIR, "shorts_voice.mp3")
    bgm_audio = os.path.join(ASSETS_DIR, "synthwave_chill_bgm.wav")
    
    mix_filter = "[1:a]volume=1.1[vox];[2:a]volume=0.15[bgm];[vox][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]"
    
    cmd_final = [
        "ffmpeg", "-y",
        "-i", video_no_audio,
        "-i", voice_audio,
        "-i", bgm_audio,
        "-filter_complex", mix_filter,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-ac", "2",
        "-shortest",
        OUTPUT_SHORTS
    ]
    subprocess.run(cmd_final, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    size_mb = os.path.getsize(OUTPUT_SHORTS) / (1024 * 1024)
    print(f"\n Vidéo YouTube Shorts générée : {OUTPUT_SHORTS} ({size_mb:.2f} Mo)")

if __name__ == "__main__":
    main()
