# Corta la grabación del usuario en frases (según sus pausas) y las asocia a las líneas del guion con Whisper.
import sys, json, subprocess, difflib, re, numpy as np, soundfile as sf, sherpa_onnx, unicodedata
D = "/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad"
src = sys.argv[1]; out = f"{D}/reel2/uservo"
import os; os.makedirs(out, exist_ok=True)
LINES = json.load(open(f"{D}/reel2/lines.json"))
# 1) limpieza: mono 44.1 kHz, filtro de graves, reducción de ruido suave, voz más presente
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-ac", "1", "-ar", "44100", "-af",
  "highpass=f=80,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-16:TP=-1.5", f"{out}/clean.wav"], check=True)
a, sr = sf.read(f"{out}/clean.wav")
# 2) silencios: energía en ventanas de 20 ms
w = int(sr * .02); n = len(a) // w
e = np.array([np.sqrt(np.mean(a[i*w:(i+1)*w]**2)) for i in range(n)])
thr = max(np.percentile(e, 20) * 3, e.max() * .03)
speech = e > thr
# segmentos de voz separados por pausas >= 0.55 s
segs = []; i = 0
while i < n:
    if speech[i]:
        j = i
        while j < n:
            k = j
            while k < n and not speech[k]: k += 1
            if k - j >= int(.55 / .02) or k >= n: break
            j = k + 1 if k > j else j + 1
        segs.append([i * .02, j * .02]); i = j
    else: i += 1
segs = [s for s in segs if s[1] - s[0] > .35]
# 3) transcribir y asociar a líneas (permite saltarse líneas o partir una línea en dos)
m = f"{D}/tts/sherpa-onnx-whisper-base"
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{m}/base-encoder.int8.onnx", decoder=f"{m}/base-decoder.int8.onnx", tokens=f"{m}/base-tokens.txt", language="es", task="transcribe", num_threads=4)
def norm(x): x = unicodedata.normalize("NFD", x.lower()); return re.sub(r"[^a-z ]", "", "".join(c for c in x if unicodedata.category(c) != "Mn"))
def asr(s0, s1):
    st = rec.create_stream(); st.accept_waveform(sr, a[int(s0*sr):int(s1*sr)].astype(np.float32)); rec.decode_stream(st); return st.result.text.strip()
texts = [asr(s0, s1) for s0, s1 in segs]
sim = lambda x, y: difflib.SequenceMatcher(None, norm(x), norm(y)).ratio()
# programación dinámica: cada línea toma 1..3 segmentos consecutivos o se salta
L, S = len(LINES), len(segs)
best = {}
def solve(li, si):
    if li == L: return (0 if si == S else -5 * (S - si)), []
    if (li, si) in best: return best[(li, si)]
    opts = [(-.4 + solve(li + 1, si)[0], [(li, None)] + solve(li + 1, si)[1])]  # saltar línea
    for k in (1, 2, 3):
        if si + k <= S:
            t = " ".join(texts[si:si+k]); sc = sim(t, LINES[li]); r = solve(li + 1, si + k)
            opts.append((sc + r[0], [(li, (si, si + k))] + r[1]))
    best[(li, si)] = max(opts, key=lambda o: o[0]); return best[(li, si)]
score, plan = solve(0, 0)
res = []
for li, rng in plan:
    if rng is None: res.append({"i": li + 1, "skip": True, "text": LINES[li]}); continue
    s0, s1 = segs[rng[0]][0], segs[rng[1] - 1][1]
    s0 = max(0, s0 - .08); s1 = min(len(a) / sr, s1 + .12)
    clip = a[int(s0*sr):int(s1*sr)]
    f = f"{out}/u{li+1:02d}.wav"; sf.write(f, clip, sr)
    heard = " ".join(texts[rng[0]:rng[1]])
    res.append({"i": li + 1, "file": f, "dur": round(len(clip) / sr, 3), "text": LINES[li], "heard": heard, "match": round(sim(heard, LINES[li]), 2)})
json.dump(res, open(f"{out}/segments.json", "w"), ensure_ascii=False, indent=1)
for r in res: print(r["i"], "SALTADA" if r.get("skip") else f'{r["dur"]}s  {r["match"]}  «{r["heard"]}»')
