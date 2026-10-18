# Mezcla: voz + música original con "ducking" + efectos (ding, golpe del timbre, rebobinado).
import json, subprocess, numpy as np, soundfile as sf
D = "/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad/reel2"
SR = 44100
tm = json.load(open(f"{D}/timing.json")); vo = json.load(open(f"{D}/vo/vo.json"))
total = tm["total"]; N = int(total * SR)
voice = np.zeros(N)
for x, st in zip(vo, tm["starts"]):
    a, sr = sf.read(f"{D}/vo/{x['file']}"); assert sr == SR
    a = a if a.ndim == 1 else a.mean(1)
    o = int((st + 0.02) * SR); e = min(N, o + len(a)); voice[o:e] += a[: e - o]
voice /= np.max(np.abs(voice)) + 1e-9
subprocess.run(["python3", "-I", f"{D}/music.py", str(total), f"{D}/music.wav"], check=True)
m, _ = sf.read(f"{D}/music.wav"); m = m[:N] if len(m) >= N else np.pad(m, ((0, N - len(m)), (0, 0)))
# envolvente de la voz para bajar la música cuando hay habla
env = np.convolve(np.abs(voice), np.ones(int(0.25 * SR)) / int(0.25 * SR), mode="same")
duck = 1 - 0.6 * np.clip(env / (env.max() * 0.15), 0, 1)
mus_gain = 0.16 * duck
mus = m * mus_gain[:, None]
sfx = np.zeros(N)
def add(sig, t, g=1.0):
    o = int(t * SR); e = min(N, o + len(sig)); sfx[o:e] += sig[: e - o] * g
tt = lambda d: np.arange(int(d * SR)) / SR
ding = (np.sin(2 * np.pi * 1318 * tt(.5)) + .6 * np.sin(2 * np.pi * 1976 * tt(.5))) * np.exp(-tt(.5) * 9) * .35
thud = (np.sin(2 * np.pi * (70 + 120 * np.exp(-tt(.35) * 25)) * tt(.35)) * np.exp(-tt(.35) * 10) + np.random.default_rng(1).normal(0, .25, len(tt(.35))) * np.exp(-tt(.35) * 40)) * .55
rew = np.sin(2 * np.pi * np.cumsum(np.linspace(1800, 300, len(tt(.45)))) / SR) * np.exp(-tt(.45) * 2) * .12
pop = np.sin(2 * np.pi * np.cumsum(np.linspace(500, 1100, len(tt(.12)))) / SR) * np.exp(-tt(.12) * 25) * .3
s = tm["starts"]
add(ding, 0.05); add(thud, 1.05); add(rew, s[1]); add(thud, s[3] + .45, .8); add(ding, s[6] + .15); add(ding, s[7] + .5, .6)
add(pop, s[11] + .05); add(pop, s[11] + .55, .8)
mixL = voice * 0.92 + mus[:, 0] + sfx; mixR = voice * 0.92 + mus[:, 1] + sfx
mix = np.stack([mixL, mixR], 1)
mix /= np.max(np.abs(mix)) / 0.95
sf.write(f"{D}/audio.wav", mix, SR)
print("audio", total)
