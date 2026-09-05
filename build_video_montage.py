import os
import subprocess
import json

BASE_DIR = r"D:\osbuilder"
ASSETS_DIR = os.path.join(BASE_DIR, "tutorial_assets")
AUDIO_DIR = os.path.join(ASSETS_DIR, "audio")
OVERLAYS_DIR = os.path.join(ASSETS_DIR, "overlays")
TEMP_DIR = os.path.join(ASSETS_DIR, "temp_render_all")
OUTPUT_VIDEO = os.path.join(ASSETS_DIR, "OSForge_Studio_Tutoriel_Complet.mp4")

os.makedirs(TEMP_DIR, exist_ok=True)

CHAPTERS = [
    {
        "id": 1,
        "audio": "01_intro_accroche.mp3",
        "overlay": "overlay_chapter_1.png",
        "shots": [
            {
                "image": r"D:\osbuilder\tutorial_assets\miniature_youtube.jpg",
                "duration": 7.0,
                "zoom_expr": "min(zoom+0.0007,1.08)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\public\showcase\mados-rog-edition.jpg",
                "duration": 10.0,
                "zoom_expr": "min(zoom+0.0006,1.07)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_hardware_probe_1788630825064.png",
                "duration": None, # Fill remainder (~8.82s)
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            }
        ]
    },
    {
        "id": 2,
        "audio": "02_interface_modes.mp3",
        "overlay": "overlay_chapter_2.png",
        "shots": [
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\osforge_initial_1788629641673.png",
                "duration": 9.0,
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_mode_active_1788629680602.png",
                "duration": 10.0,
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_presets_catalog_1788630662781.png",
                "duration": None, # Fill remainder (~9.39s)
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            }
        ]
    },
    {
        "id": 3,
        "audio": "03_configuration_recette.mp3",
        "overlay": "overlay_chapter_3.png",
        "shots": [
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_system_kernels_1788630633351.png",
                "duration": 7.0,
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_desktop_selector_1788630129596.png",
                "duration": 7.0,
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_simulator_view_1788630770799.png",
                "duration": 7.0,
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_software_gaming_1788630161669.png",
                "duration": 7.0,
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_security_full_1788630553127.png",
                "duration": None, # Fill remainder (~7.18s)
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            }
        ]
    },
    {
        "id": 4,
        "audio": "04_export_et_compilation.mp3",
        "overlay": "overlay_chapter_4.png",
        "shots": [
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_customization_1788630232850.png",
                "duration": 9.0,
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_build_center_1788630305102.png",
                "duration": 9.0,
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_code_inspector_1788630718614.png",
                "duration": None, # Fill remainder (~9.77s)
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            }
        ]
    },
    {
        "id": 5,
        "audio": "05_test_live_qemu.mp3",
        "overlay": "overlay_chapter_5.png",
        "shots": [
            {
                "image": r"D:\osbuilder\public\showcase\mados-rog-edition.jpg",
                "duration": 11.5,
                "zoom_expr": "min(zoom+0.0006,1.07)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\public\showcase\madtweak-optimizer.jpg",
                "duration": None, # Fill remainder (~11.25s)
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            }
        ]
    },
    {
        "id": 6,
        "audio": "06_flash_usb_et_outro.mp3",
        "overlay": "overlay_chapter_6.png",
        "shots": [
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\expert_build_modal_1788630877133.png",
                "duration": 8.5,
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\tutorial_assets\screenshots\osforge_studio_final_1788629979009.png",
                "duration": 8.5,
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            },
            {
                "image": r"D:\osbuilder\public\showcase\welcome-patreon-banner.jpg",
                "duration": None, # Fill remainder (~8.94s)
                "zoom_expr": "min(zoom+0.0005,1.06)",
                "x_expr": "iw/2-(iw/zoom/2)",
                "y_expr": "ih/2-(ih/zoom/2)"
            }
        ]
    }
]

def get_audio_duration(audio_path):
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return float(res.stdout.strip())

def render_shot(shot_idx, image_path, overlay_path, duration, zoom_expr, x_expr, y_expr, out_mp4):
    num_frames = int(round(duration * 30))
    print(f"  -> Rendu shot {shot_idx}: {duration:.2f}s ({num_frames} frames)...")
    
    vf = (
        f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,"
        f"zoompan=z='{zoom_expr}':d={num_frames}:x='{x_expr}':y='{y_expr}':s=1920x1080:fps=30[vbg];"
        f"[vbg][1:v]overlay=0:0:format=auto,format=yuv420p[vout]"
    )
    
    cmd = [
        "ffmpeg", "-y",
        "-i", image_path,
        "-i", overlay_path,
        "-filter_complex", vf,
        "-map", "[vout]",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        out_mp4
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def main():
    chapter_files = []
    
    for ch in CHAPTERS:
        ch_id = ch["id"]
        audio_file = os.path.join(AUDIO_DIR, ch["audio"])
        overlay_file = os.path.join(OVERLAYS_DIR, ch["overlay"])
        
        total_audio_duration = get_audio_duration(audio_file)
        print(f"\n==========================================")
        print(f"CHAPITRE {ch_id} (Audio: {total_audio_duration:.2f}s - {len(ch['shots'])} plans)")
        print(f"==========================================")
        
        explicit_duration = sum(s["duration"] for s in ch["shots"] if s["duration"] is not None)
        remainder = total_audio_duration - explicit_duration
        if remainder <= 0:
            remainder = 3.0
            
        shot_files = []
        for s_idx, shot in enumerate(ch["shots"]):
            s_dur = shot["duration"] if shot["duration"] is not None else remainder
            shot_mp4 = os.path.join(TEMP_DIR, f"ch{ch_id}_shot{s_idx}.mp4")
            render_shot(
                f"ch{ch_id}_{s_idx}",
                shot["image"],
                overlay_file,
                s_dur,
                shot["zoom_expr"],
                shot["x_expr"],
                shot["y_expr"],
                shot_mp4
            )
            shot_files.append(shot_mp4)
            
        concat_txt = os.path.join(TEMP_DIR, f"concat_ch{ch_id}.txt")
        with open(concat_txt, "w", encoding="utf-8") as f:
            for s_file in shot_files:
                f.write(f"file '{s_file}'\n")
                
        ch_video_no_audio = os.path.join(TEMP_DIR, f"ch{ch_id}_video.mp4")
        cmd_concat = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_txt,
            "-c", "copy",
            ch_video_no_audio
        ]
        subprocess.run(cmd_concat, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        ch_final = os.path.join(TEMP_DIR, f"chapter_{ch_id}_muxed.mp4")
        cmd_mux = [
            "ffmpeg", "-y",
            "-i", ch_video_no_audio,
            "-i", audio_file,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ar", "48000",
            "-ac", "2",
            "-shortest",
            ch_final
        ]
        subprocess.run(cmd_mux, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Chapitre {ch_id} généré avec succès -> {ch_final}")
        chapter_files.append(ch_final)
        
    print("\n==========================================")
    print("ASSEMBLAGE FINAL DU MASTER VIDÉO COMPLET...")
    print("==========================================")
    
    master_concat_txt = os.path.join(TEMP_DIR, "master_concat.txt")
    with open(master_concat_txt, "w", encoding="utf-8") as f:
        for ch_f in chapter_files:
            f.write(f"file '{ch_f}'\n")
            
    cmd_master = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", master_concat_txt,
        "-c", "copy",
        OUTPUT_VIDEO
    ]
    subprocess.run(cmd_master, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    size_mb = os.path.getsize(OUTPUT_VIDEO) / (1024 * 1024)
    print(f"\n Master vidéo généré : {OUTPUT_VIDEO} ({size_mb:.2f} Mo)")

if __name__ == "__main__":
    main()
