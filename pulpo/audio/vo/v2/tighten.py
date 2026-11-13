# Squeeze every pause in the take to <= KEEP s, speed up by TEMPO, write ../../vo.wav + words.json.
import json, re, subprocess
SRC, KEEP, TEMPO, LEAD = "v3.mp3", 0.11, 1.08, 0.04
log = subprocess.run(["ffmpeg", "-i", SRC, "-af", "silencedetect=n=-38dB:d=0.1", "-f", "null", "-"], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
dur = float(re.search(r"Duration: (\d+):(\d+):([0-9.]+)", log).groups()[2])
sil = list(zip(st, en))
# keep-segments of the source; leading silence trimmed to LEAD
segs, cur = [], 0.0
for a, b in sil:
    if a <= 0.01:  # leading silence
        cur = max(0, b - LEAD); continue
    if b >= dur - 0.05:  # trailing
        segs.append((cur, a + 0.15)); cur = None; break
    cut = (b - a) - KEEP
    segs.append((cur, a + KEEP / 2)); cur = b - KEEP / 2
if cur is not None: segs.append((cur, dur))
def remap(t):
    acc = 0.0
    for a, b in segs:
        if t < a: return acc / TEMPO
        if t <= b: return (acc + t - a) / TEMPO
        acc += b - a
    return acc / TEMPO
fil = "".join(f"[0:a]atrim={a:.3f}:{b:.3f},asetpts=PTS-STARTPTS[s{i}];" for i, (a, b) in enumerate(segs))
fil += "".join(f"[s{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1,atempo={TEMPO},aresample=48000,aformat=channel_layouts=stereo,highpass=f=90,acompressor=threshold=-20dB:ratio=3:attack=5:release=80[out]"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-filter_complex", fil, "-map", "[out]", "-c:a", "pcm_s24le", "../../vo.wav"], check=True)
# words with remapped times (alignment includes the [excited] tag: skip bracketed text)
al = json.load(open("v3.json"))
ch, cs, ce = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
words, w, ws, we, skip = [], "", None, None, False
for c, a, b in zip(ch, cs, ce):
    if c == "[": skip = True
    if skip:
        if c == "]": skip = False
        continue
    if c.isspace():
        if w: words.append([w, round(remap(ws), 3), round(remap(we), 3)]); w = ""
        continue
    if not w: ws = a
    w += c; we = b
if w: words.append([w, round(remap(ws), 3), round(remap(we), 3)])
json.dump(words, open("words.json", "w"), ensure_ascii=False)
total = sum(b - a for a, b in segs) / TEMPO
print(f"{len(segs)} segments, vo {total:.2f}s, last word ends {words[-1][2]:.2f}s")
for i, x in enumerate(words): print(i, *x)
