import numpy as np
import wave
import struct

SAMPLE_RATE = 48000
BPM = 90
BEAT_DUR = 60.0 / BPM
TOTAL_DUR = 168.0 # Covers full 166s video

def note_freq(midi_note):
    return 440.0 * (2.0 ** ((midi_note - 69) / 12.0))

def generate_saw_detuned(freq, duration, detune_cents=8):
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    f1 = freq * (2 ** (-detune_cents / 1200))
    f2 = freq
    f3 = freq * (2 ** (detune_cents / 1200))
    
    # 3 detuned band-limited approximations
    w1 = 2 * (t * f1 - np.floor(t * f1 + 0.5))
    w2 = 2 * (t * f2 - np.floor(t * f2 + 0.5))
    w3 = 2 * (t * f3 - np.floor(t * f3 + 0.5))
    return (w1 + w2 + w3) / 3.0

def make_envelope(n_samples, attack=0.1, decay=0.2, sustain=0.7, release=0.3):
    env = np.ones(n_samples)
    att_samples = int(attack * SAMPLE_RATE)
    rel_samples = int(release * SAMPLE_RATE)
    
    if att_samples > 0:
        env[:att_samples] = np.linspace(0, 1, att_samples)
    if rel_samples > 0 and rel_samples < n_samples:
        env[-rel_samples:] = np.linspace(sustain, 0, rel_samples)
    return env

def synthesize_synthwave():
    total_samples = int(TOTAL_DUR * SAMPLE_RATE)
    left_channel = np.zeros(total_samples, dtype=np.float32)
    right_channel = np.zeros(total_samples, dtype=np.float32)

    # 4-chord progression in C minor (C min -> Ab maj -> Eb maj -> Bb / G)
    # MIDI notes
    chord_progression = [
        # Cm9: C2 bass, G3, Bb3, D4, Eb4 pad
        {"bass": 36, "pad": [55, 58, 62, 63], "arp": [60, 63, 67, 70, 72, 70, 67, 63]},
        # Abmaj7: Ab1 bass, C4, Eb4, G4 pad
        {"bass": 32, "pad": [60, 63, 67, 72], "arp": [56, 60, 63, 67, 68, 67, 63, 60]},
        # Ebmaj9: Eb2 bass, G3, Bb3, D4, F4 pad
        {"bass": 39, "pad": [55, 58, 62, 65], "arp": [58, 62, 65, 70, 72, 70, 65, 62]},
        # Bbadd9 / Gm: Bb1 bass, F3, Bb3, D4, F4 pad
        {"bass": 34, "pad": [53, 58, 62, 65], "arp": [58, 62, 65, 69, 70, 69, 65, 62]}
    ]

    chord_duration = BEAT_DUR * 8 # 8 beats per chord = ~5.33 seconds
    chord_samples = int(chord_duration * SAMPLE_RATE)

    current_sample = 0
    chord_idx = 0

    print("Génération des pistes d'instruments synthwave...")
    while current_sample < total_samples:
        chord = chord_progression[chord_idx % len(chord_progression)]
        dur = min(chord_duration, (total_samples - current_sample) / SAMPLE_RATE)
        n_samples = int(dur * SAMPLE_RATE)

        # 1. Warm Analog Pad
        pad_env = make_envelope(n_samples, attack=0.8, decay=0.5, sustain=0.65, release=0.8)
        pad_wave = np.zeros(n_samples, dtype=np.float32)
        for note in chord["pad"]:
            freq = note_freq(note)
            pad_wave += generate_saw_detuned(freq, dur, detune_cents=7) * 0.12

        # Pad with subtle stereo width
        left_channel[current_sample:current_sample+n_samples] += pad_wave * pad_env * 0.85
        right_channel[current_sample:current_sample+n_samples] += pad_wave * pad_env * 0.95

        # 2. Sub Bass Pulse
        bass_freq = note_freq(chord["bass"])
        t_bass = np.linspace(0, dur, n_samples, False)
        # Sine fundamental + slight 2nd harmonic
        bass_wave = (np.sin(2 * np.pi * bass_freq * t_bass) * 0.7 +
                     np.sin(2 * np.pi * bass_freq * 2 * t_bass) * 0.2)
        # Gentle 8th note pulsing volume envelope
        pulse = 0.7 + 0.3 * np.cos(2 * np.pi * (t_bass / (BEAT_DUR / 2)))
        bass_final = bass_wave * pulse * 0.22
        left_channel[current_sample:current_sample+n_samples] += bass_final
        right_channel[current_sample:current_sample+n_samples] += bass_final

        # 3. Arpeggio Synth (16th notes)
        sixteenth_dur = BEAT_DUR / 4.0
        sixteenth_samples = int(sixteenth_dur * SAMPLE_RATE)
        arp_notes = chord["arp"]
        
        num_arp_steps = int(dur / sixteenth_dur)
        for step in range(num_arp_steps):
            note = arp_notes[step % len(arp_notes)]
            step_start = current_sample + step * sixteenth_samples
            step_end = min(step_start + sixteenth_samples, total_samples)
            step_len = step_end - step_start
            if step_len <= 0:
                break
            
            t_arp = np.linspace(0, step_len / SAMPLE_RATE, step_len, False)
            freq = note_freq(note)
            arp_tone = (np.sin(2 * np.pi * freq * t_arp) * 0.7 +
                        np.sin(2 * np.pi * freq * 2 * t_arp) * 0.25)
            # Pluck envelope
            env_pluck = np.exp(-t_arp * 18.0) * 0.10
            
            # Stereo ping-pong
            pan = 0.5 + 0.35 * np.sin(step * 0.8)
            left_channel[step_start:step_end] += arp_tone * env_pluck * (1.0 - pan)
            right_channel[step_start:step_end] += arp_tone * env_pluck * pan

        # 4. Soft Chill Beat (Kick on 1 & 3, Snare/Clap on 2 & 4, Hi-hat on 8ths)
        beat_samples = int(BEAT_DUR * SAMPLE_RATE)
        num_beats = int(dur / BEAT_DUR)
        for b in range(num_beats):
            b_start = current_sample + b * beat_samples
            
            # Kick on beat 0 and 2
            if b % 2 == 0:
                k_dur = 0.18
                k_samples = min(int(k_dur * SAMPLE_RATE), total_samples - b_start)
                if k_samples > 0:
                    t_k = np.linspace(0, k_samples / SAMPLE_RATE, k_samples, False)
                    # Pitch drop from 130Hz to 45Hz
                    k_freq = 45.0 + 85.0 * np.exp(-t_k * 40.0)
                    k_phase = 2 * np.pi * np.cumsum(k_freq) / SAMPLE_RATE
                    kick = np.sin(k_phase) * np.exp(-t_k * 15.0) * 0.20
                    left_channel[b_start:b_start+k_samples] += kick
                    right_channel[b_start:b_start+k_samples] += kick

            # Soft Snare / Rim on beat 1 and 3
            if b % 2 == 1:
                s_dur = 0.15
                s_samples = min(int(s_dur * SAMPLE_RATE), total_samples - b_start)
                if s_samples > 0:
                    t_s = np.linspace(0, s_samples / SAMPLE_RATE, s_samples, False)
                    snare_tone = np.sin(2 * np.pi * 180.0 * t_s) * np.exp(-t_s * 25.0) * 0.10
                    snare_noise = (np.random.rand(s_samples) * 2 - 1) * np.exp(-t_s * 30.0) * 0.08
                    snare = (snare_tone + snare_noise) * 0.7
                    left_channel[b_start:b_start+s_samples] += snare
                    right_channel[b_start:b_start+s_samples] += snare

        current_sample += n_samples
        chord_idx += 1

    # Apply Master Soft Limiter and smooth fade out at the end
    print("Normalisation et fondu de fin...")
    fade_samples = int(4.0 * SAMPLE_RATE)
    left_channel[-fade_samples:] *= np.linspace(1, 0, fade_samples)
    right_channel[-fade_samples:] *= np.linspace(1, 0, fade_samples)

    # Normalize to -1.0 dB
    max_val = max(np.max(np.abs(left_channel)), np.max(np.abs(right_channel)))
    if max_val > 0:
        norm_factor = 0.88 / max_val
        left_channel *= norm_factor
        right_channel *= norm_factor

    # Convert to 16-bit PCM
    left_int16 = (left_channel * 32767).astype(np.int16)
    right_int16 = (right_channel * 32767).astype(np.int16)
    
    interleaved = np.empty((total_samples * 2,), dtype=np.int16)
    interleaved[0::2] = left_int16
    interleaved[1::2] = right_int16

    out_wav = r"D:\osbuilder\tutorial_assets\synthwave_chill_bgm.wav"
    with wave.open(out_wav, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(interleaved.tobytes())

    print(f"Bande sonore Synthwave générée : {out_wav}")

if __name__ == "__main__":
    synthesize_synthwave()
