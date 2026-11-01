# Música original (sintetizada aquí, sin derechos de terceros). Uso: music2.py <segundos> <salida.wav> <preset>
import sys, numpy as np, soundfile as sf
SR = 44100
dur, out, preset = float(sys.argv[1]), sys.argv[2], sys.argv[3]
PRESETS = {  # bpm, acordes (MIDI), semilla, palmas, bajo
    "alegre":  (112, [[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [57, 60, 65, 69]], 3, True, True),
    "tension": (100, [[57, 60, 64, 69], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67]], 5, False, True),
    "tierno":  (96,  [[60, 65, 69, 72], [60, 64, 69, 72], [58, 62, 65, 70], [60, 64, 67, 72]], 9, False, False),
    "ritmo":   (118, [[59, 62, 67, 71], [57, 62, 66, 69], [59, 64, 67, 71], [60, 64, 67, 72]], 11, True, True),
}
bpm, chords, seed, claps, bass = PRESETS[preset]
beat = 60 / bpm; bar = 4 * beat
rng = np.random.default_rng(seed)
N = int(SR * (dur + 2)); L = np.zeros(N); R = np.zeros(N)

def ks(freq, length, decay=0.996, bright=0.5):
    n = int(SR * length); p = int(SR / freq)
    buf = rng.uniform(-1, 1, p) * bright + rng.uniform(-1, 1, p) * (1 - bright) * 0.3
    o = np.empty(n)
    for i in range(n):
        o[i] = buf[i % p]; buf[i % p] = decay * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return o

def note(m): return 440 * 2 ** ((m - 69) / 12)
def put(sig, t, gl=1.0, gr=1.0):
    a = int(t * SR); b = min(N, a + len(sig))
    if a < N: L[a:b] += sig[: b - a] * gl; R[a:b] += sig[: b - a] * gr

pattern = [0, 2, 1, 3, 2, 1, 3, 2]
plucks = {}; t = 0.0; k = 0
while t < dur:
    ch = chords[k % 4]
    for i, idx in enumerate(pattern):
        st = t + i * beat / 2
        if st >= dur: break
        m = ch[idx]
        if m not in plucks: plucks[m] = ks(note(m), 1.6, 0.9965, 0.7)
        pan = 0.35 + 0.3 * (idx / 3); g = 0.55 if i % 2 else 0.75
        put(plucks[m] * g, st, 1 - pan, pan)
    tt = np.arange(int(bar * SR)) / SR
    env = np.minimum(1, tt / 0.4) * np.minimum(1, (bar - tt) / 0.5)
    pad = sum(np.sin(2 * np.pi * note(m - 12) * tt) + 0.3 * np.sin(2 * np.pi * note(m) * 1.003 * tt) for m in ch[:3]) * env * 0.06
    put(pad, t)
    for j in range(8):
        st = t + j * beat / 2
        if j in (0, 4):
            kt = np.arange(int(0.25 * SR)) / SR
            put(np.sin(2 * np.pi * (50 + 60 * np.exp(-kt * 30)) * kt) * np.exp(-kt * 14) * 0.4, st)
        if bass and j in (0, 3, 4, 6):
            bt = np.arange(int(beat * .9 * SR)) / SR
            put(np.sin(2 * np.pi * note(ch[0] - 24) * bt) * np.exp(-bt * 3) * np.minimum(1, bt / .01) * 0.22, st)
        if claps and j in (2, 6):
            n = rng.normal(0, 1, int(0.12 * SR)); n = np.diff(n, prepend=0)
            put(n * np.exp(-np.arange(len(n)) / SR * 28) * 0.07, st)
        sh = rng.normal(0, 1, int(0.05 * SR)) * np.exp(-np.arange(int(0.05 * SR)) / SR * 90) * (0.05 if j % 2 else 0.03)
        put(sh, st, 0.8, 1.0)
    t += bar; k += 1

mix = np.stack([L, R], 1)[: int(dur * SR)]
fade = int(1.2 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]; mix[: int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
sf.write(out, mix * 0.9, SR); print("music", preset, dur)
