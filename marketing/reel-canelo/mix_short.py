# Mezcla v2: la voz del usuario + música original con ducking + efectos.
import json, subprocess, sys, numpy as np, soundfile as sf
D = "/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad/reel2"
SR = 44100
tm = json.load(open(f"{D}/" + (sys.argv[1] if len(sys.argv) > 1 else "timing2.json"))); total = tm["total"]; N = int(total * SR)
voice = np.zeros(N)
for v in tm["vo"]:
    a, sr = sf.read(v["file"]); a = a if a.ndim == 1 else a.mean(1)
    o = int(v["at"] * SR); e = min(N, o + len(a)); voice[o:e] += a[: e - o]
voice /= np.max(np.abs(voice)) + 1e-9
subprocess.run(["python3", "-I", f"{D}/music.py", str(total), f"{D}/music.wav"], check=True)
m, _ = sf.read(f"{D}/music.wav"); m = m[:N] if len(m) >= N else np.pad(m, ((0, N - len(m)), (0, 0)))
env = np.convolve(np.abs(voice), np.ones(int(.25 * SR)) / int(.25 * SR), mode="same")
duck = 1 - .65 * np.clip(env / (env.max() * .15), 0, 1)
mus = m * (0.15 * duck)[:, None]
sfx = np.zeros(N); tt = lambda d: np.arange(int(d * SR)) / SR
def add(sig, t, g=1.0):
    o = int(t * SR); e = min(N, o + len(sig)); sfx[o:e] += sig[: e - o] * g
ding = (np.sin(2*np.pi*1318*tt(.5)) + .6*np.sin(2*np.pi*1976*tt(.5))) * np.exp(-tt(.5)*9) * .3
thud = (np.sin(2*np.pi*(70+120*np.exp(-tt(.35)*25))*tt(.35)) * np.exp(-tt(.35)*10) + np.random.default_rng(1).normal(0,.25,len(tt(.35)))*np.exp(-tt(.35)*40)) * .5
rew = np.sin(2*np.pi*np.cumsum(np.linspace(1800,300,len(tt(.45))))/SR) * np.exp(-tt(.45)*2) * .1
pop = np.sin(2*np.pi*np.cumsum(np.linspace(500,1100,len(tt(.12))))/SR) * np.exp(-tt(.12)*25) * .25
st, ty = tm["starts"], tm["types"]
for s, t in zip(st, ty):
    if t == "hook": add(ding, s + .05); add(thud, s + 1.2)
    if t == "street": add(rew, s)
    if t == "scam": add(thud, s + .45, .7)
    if t == "alert": add(ding, s + .15)
    if t == "logo": add(pop, s + .05); add(pop, s + .7, .8)
mix = np.stack([voice*.92 + mus[:,0] + sfx, voice*.92 + mus[:,1] + sfx], 1); mix /= np.max(np.abs(mix)) / .95
sf.write(f"{D}/" + (sys.argv[2] if len(sys.argv) > 2 else "audio2.wav"), mix, SR); print("audio2", total)
