# Mezcla música + efectos según las escenas. Uso: mixw.py <reel> <preset>
import json, subprocess, sys, numpy as np, soundfile as sf
D = "/tmp/claude-0/-home-user-App-mascota/e9ff2a75-450f-526e-bf81-94e9a0483a02/scratchpad/semana1"
SR = 44100; name, preset = sys.argv[1], sys.argv[2]
tm = json.load(open(f"{D}/timing_{name}.json")); total = tm["total"]; N = int(total * SR)
subprocess.run(["python3", "-I", f"{D}/music2.py", str(total), f"{D}/music_{name}.wav", preset], check=True)
m, _ = sf.read(f"{D}/music_{name}.wav"); m = m[:N] if len(m) >= N else np.pad(m, ((0, N - len(m)), (0, 0)))
sfx = np.zeros(N); tt = lambda d: np.arange(int(d * SR)) / SR; rng = np.random.default_rng(2)
def add(sig, t, g=1.0):
    o = int(t * SR); e = min(N, o + len(sig))
    if o < N: sfx[o:e] += sig[: e - o] * g
ding = (np.sin(2*np.pi*1318*tt(.5)) + .6*np.sin(2*np.pi*1976*tt(.5))) * np.exp(-tt(.5)*9) * .3
thud = (np.sin(2*np.pi*(70+120*np.exp(-tt(.35)*25))*tt(.35)) * np.exp(-tt(.35)*10) + rng.normal(0,.25,len(tt(.35)))*np.exp(-tt(.35)*40)) * .5
pop = np.sin(2*np.pi*np.cumsum(np.linspace(500,1100,len(tt(.12))))/SR) * np.exp(-tt(.12)*25) * .25
wn = rng.normal(0, 1, len(tt(.35))); wn = np.convolve(wn, np.ones(30)/30, mode="same")
whoosh = wn * np.sin(np.pi * np.linspace(0, 1, len(wn))) ** 2 * .5
tick = np.sin(2*np.pi*2200*tt(.03)) * np.exp(-tt(.03)*150) * .12
for k, (s, sc) in enumerate(zip(tm["starts"], tm["scenes"])):
    ty = sc["type"]
    if k: add(whoosh, s - .2, .8)
    if ty == "kinetic": add(pop, s + .1, .8)
    if ty == "step": add(pop, s + .12); add(pop, s + .35, .6)
    if ty == "flag":
        for j in range(4): add(tick, s + .4 + j * .1)
        add(pop, s + sc.get("typeEnd", .9)); add(thud, s + sc.get("whyAt", 1.7), .8)
    if ty == "grid":
        for j in range(len(sc["items"])): add(pop, s + sc.get("itemsAt", .5) + j * sc.get("stagger", .2), .55)
    if ty == "phone":
        for c in sc.get("circles", []) + sc.get("boxes", []) + sc.get("mags", []): add(pop, s + c["at"], .7)
    if ty == "logo": add(pop, s + .05); add(pop, s + .45, .8); add(ding, s + 1.5, .9)
mix = np.stack([m[:, 0] * .55 + sfx, m[:, 1] * .55 + sfx], 1); mix /= np.max(np.abs(mix)) / .95
sf.write(f"{D}/audio_{name}.wav", mix, SR); print("audio", name, total)
