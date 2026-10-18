# Segmentación fina: pausas cortas (>=0.18 s) y transcripción con Whisper small de cada trozo.
import json, numpy as np, soundfile as sf, sherpa_onnx
D = "/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad"
a, sr = sf.read(f"{D}/reel2/uservo/clean.wav")
w = int(sr * .01); n = len(a) // w
e = np.array([np.sqrt(np.mean(a[i*w:(i+1)*w]**2)) for i in range(n)])
eDb = 20 * np.log10(e + 1e-9)
floor = np.percentile(eDb, 10); peak = np.percentile(eDb, 99)
thr = floor + (peak - floor) * .28
sp = eDb > thr
# rellena huecos < 0.18 s y elimina ruidos < 0.12 s
def runs(mask):
    out=[]; i=0
    while i < len(mask):
        j=i
        while j < len(mask) and mask[j]==mask[i]: j+=1
        out.append((mask[i], i, j)); i=j
    return out
m = sp.copy()
for v,i,j in runs(m):
    if not v and (j-i) < 18 and i>0 and j<len(m): m[i:j]=True
for v,i,j in runs(m):
    if v and (j-i) < 12: m[i:j]=False
segs=[(i*.01, j*.01) for v,i,j in runs(m) if v]
gaps=[round(segs[k+1][0]-segs[k][1],2) for k in range(len(segs)-1)]
mod=f"{D}/tts/sherpa-onnx-whisper-small"
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{mod}/small-encoder.int8.onnx", decoder=f"{mod}/small-decoder.int8.onnx", tokens=f"{mod}/small-tokens.txt", language="es", task="transcribe", num_threads=4)
res=[]
for k,(s0,s1) in enumerate(segs):
    st=rec.create_stream(); st.accept_waveform(sr, a[int(max(0,s0-.05)*sr):int((s1+.05)*sr)].astype(np.float32)); rec.decode_stream(st)
    res.append({"k":k,"s0":round(s0,2),"s1":round(s1,2),"gap_after":gaps[k] if k<len(gaps) else None,"text":st.result.text.strip()})
    print(f'{k:2d} {s0:6.2f}-{s1:6.2f} gap {res[-1]["gap_after"]}  «{res[-1]["text"]}»')
json.dump(res,open(f"{D}/reel2/uservo/fine.json","w"),ensure_ascii=False,indent=1)
st=rec.create_stream(); st.accept_waveform(sr,a.astype(np.float32)[:int(sr*29)]); rec.decode_stream(st); print("\nFULL 0-29s:", st.result.text)
st=rec.create_stream(); st.accept_waveform(sr,a.astype(np.float32)[int(sr*27):]); rec.decode_stream(st); print("FULL 27s-end:", st.result.text)
