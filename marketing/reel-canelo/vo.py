import json, sys, glob, sherpa_onnx, soundfile as sf, numpy as np
model = sys.argv[1]; out = sys.argv[2]; speed = float(sys.argv[3])
onnx = glob.glob(f"{model}/*.onnx")[0]
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=onnx, tokens=f"{model}/tokens.txt", data_dir=f"{model}/espeak-ng-data", noise_scale=0.6, noise_scale_w=0.7), num_threads=4)))
LINES = [
 "Anoche me perdí... y casi estafan a mi familia.",
 "Soy Canelo. Cero sentido de orientación.",
 "Me subieron a mil grupos... con su número.",
 "Y les escribió un estafador. Spóiler: no me tenía.",
 "Pero también me subieron a Ayuda Patitas. Sin su teléfono.",
 "Doña Rosa me encontró, y me publicó como encontrado.",
 "Y la aplicación le avisó sola a mi familia.",
 "Hablaron por el chat. Y si se habla de transferencias, la aplicación advierte.",
 "Y hoy... volví a casa.",
 "Ah, y para adoptar hay gatos, conejos, ¡y hasta caballos!",
 "Con acta de la Ley Cholito, y seguimiento con foto.",
 "Entra gratis a ayuda patitas, punto ce ele. Y síguenos.",
 "Mándaselo a quien comparte perritos perdidos. Por si me vuelvo a perder.",
]
info = []
for i, t in enumerate(LINES):
    a = tts.generate(t, sid=0, speed=speed)
    s = np.array(a.samples, dtype=np.float32)
    # recorta silencios de los extremos
    idx = np.where(np.abs(s) > 0.01)[0]
    s = s[max(0, idx[0] - 600): idx[-1] + 1600] if len(idx) else s
    sf.write(f"{out}/vo{i+1:02d}.wav", s, a.sample_rate)
    info.append({"i": i + 1, "text": t, "dur": round(len(s) / a.sample_rate, 3), "sr": a.sample_rate})
json.dump(info, open(f"{out}/vo.json", "w"), ensure_ascii=False, indent=1)
print(sum(x["dur"] for x in info)); [print(x["i"], x["dur"], x["text"]) for x in info]
