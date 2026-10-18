# Música de fondo original (sintetizada aquí, sin derechos de terceros): ukelele pulsado + pad suave + percusión ligera.
import sys, numpy as np, soundfile as sf
SR = 44100
dur = float(sys.argv[1]); out = sys.argv[2]
bpm = 104; beat = 60 / bpm
rng = np.random.default_rng(7)
N = int(SR * (dur + 2))
L = np.zeros(N); R = np.zeros(N)

def ks(freq, length, decay=0.996, bright=0.5):
    n = int(SR * length); p = int(SR / freq)
    buf = rng.uniform(-1, 1, p) * bright + rng.uniform(-1, 1, p) * (1 - bright) * 0.3
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = decay * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out

def note(m): return 440 * 2 ** ((m - 69) / 12)
# I–V–vi–IV en Do mayor, voicings de ukelele
chords = [[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [57, 60, 65, 69]]
pattern = [0, 2, 1, 3, 2, 1, 3, 2]  # arpegio por corcheas
bar = 4 * beat
t = 0.0; k = 0
plucks = {}
while t < dur:
    ch = chords[k % 4]
    for i, idx in enumerate(pattern):
        st = t + i * beat / 2
        if st >= dur: break
        m = ch[idx]
        if m not in plucks: plucks[m] = ks(note(m), 1.6, 0.9965, 0.7)
        s = plucks[m] * (0.55 if i % 2 else 0.75)
        a = int(st * SR); b = min(N, a + len(s))
        pan = 0.35 + 0.3 * (idx / 3)
        L[a:b] += s[: b - a] * (1 - pan); R[a:b] += s[: b - a] * pan
    # pad: acorde sostenido suave
    tt = np.arange(int(bar * SR)) / SR
    env = np.minimum(1, tt / 0.4) * np.minimum(1, (bar - tt) / 0.5)
    pad = sum(np.sin(2 * np.pi * note(m - 12) * tt) + 0.3 * np.sin(2 * np.pi * note(m) * 1.003 * tt) for m in ch[:3]) * env * 0.06
    a = int(t * SR); b = min(N, a + len(pad))
    L[a:b] += pad[: b - a]; R[a:b] += pad[: b - a]
    # percusión: bombo suave en 1 y 3, shaker en corcheas
    for j in range(8):
        st = int((t + j * beat / 2) * SR)
        if st >= N: break
        if j in (0, 4):
            kt = np.arange(int(0.25 * SR)) / SR
            kick = np.sin(2 * np.pi * (50 + 60 * np.exp(-kt * 30)) * kt) * np.exp(-kt * 14) * 0.35
            e = min(N, st + len(kick)); L[st:e] += kick[: e - st]; R[st:e] += kick[: e - st]
        sh = rng.normal(0, 1, int(0.05 * SR)) * np.exp(-np.arange(int(0.05 * SR)) / SR * 90) * (0.05 if j % 2 else 0.03)
        e = min(N, st + len(sh)); L[st:e] += sh[: e - st] * 0.8; R[st:e] += sh[: e - st]
    t += bar; k += 1

mix = np.stack([L, R], 1)[: int(dur * SR)]
fade = int(1.5 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]; mix[: int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
sf.write(out, mix * 0.9, SR)
print("music", dur)
