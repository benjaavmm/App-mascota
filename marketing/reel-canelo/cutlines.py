# Corta la voz del usuario en sus 13 frases buscando el punto más silencioso en cada ventana, y verifica con Whisper small.
import json, sys, numpy as np, soundfile as sf, sherpa_onnx
D = "/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad"
a, sr = sf.read(f"{D}/reel2/uservo/clean.wav")
w = int(sr * .01); e = np.array([np.sqrt(np.mean(a[i*w:(i+1)*w]**2)) for i in range(len(a)//w)])
es = np.convolve(e, np.ones(5)/5, mode="same")
def dip(lo, hi):
    i0, i1 = int(lo*100), int(hi*100); return (i0 + int(np.argmin(es[i0:i1]))) / 100
W = json.loads(sys.argv[1])  # ventanas de corte entre frases
cuts = [W[0][0]] + [dip(lo, hi) for lo, hi in W[1:-1]] + [W[-1][1]]
mod = f"{D}/tts/sherpa-onnx-whisper-small"
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{mod}/small-encoder.int8.onnx", decoder=f"{mod}/small-decoder.int8.onnx", tokens=f"{mod}/small-tokens.txt", language="es", task="transcribe", num_threads=4)
out = []
for k in range(len(cuts) - 1):
    s0, s1 = cuts[k], cuts[k+1]
    clip = a[int(s0*sr):int(s1*sr)]
    # recorta silencio de los bordes manteniendo un margen natural
    ce = np.array([np.sqrt(np.mean(clip[i:i+w]**2)) for i in range(0, len(clip)-w, w)]); thr = max(ce.max()*.06, 1e-4)
    idx = np.where(ce > thr)[0]; b0 = max(0, idx[0]-6)*w; b1 = min(len(clip), (idx[-1]+12)*w); clip = clip[b0:b1]
    f = f"{D}/reel2/uservo/u{k+1:02d}.wav"; sf.write(f, clip, sr)
    st = rec.create_stream(); st.accept_waveform(sr, clip.astype(np.float32)); rec.decode_stream(st)
    out.append({"i": k+1, "file": f, "dur": round(len(clip)/sr, 3), "src": [round(s0 + b0/sr, 2), round(s0 + b1/sr, 2)], "heard": st.result.text.strip()})
    print(f'{k+1:2d} {out[-1]["src"]} {out[-1]["dur"]}s «{out[-1]["heard"]}»')
json.dump(out, open(f"{D}/reel2/uservo/cuts.json", "w"), ensure_ascii=False, indent=1)
