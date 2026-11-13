# Place VO phrases on the film's timeline -> ../vo.wav (and a phrase list for the film).
import json, subprocess
SEG = [  # file, src_in, src_out, place_at (s), on-screen cue
    ("p1", 0, None, 0.20), ("p2", 0, None, 4.00), ("p3", 0, None, 8.20), ("p4", 0, None, 13.00),
    ("p5", 0, 1.10, 17.40), ("p5", 1.10, None, 20.26), ("p6", 0, 1.30, 22.00), ("p6", 1.30, None, 23.38),
    ("p7", 0, None, 26.75),
]
ins, chains = [], []
for i, (f, a, b, at) in enumerate(SEG):
    ins += ["-i", f + ".mp3"]
    trim = f"atrim={a}" + (f":{b}" if b else "")
    fade = "afade=t=in:d=0.01," + ("areverse,afade=t=in:d=0.04,areverse," if b else "")
    chains.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,{trim},asetpts=PTS-STARTPTS,{fade}adelay={int(at*1000)}:all=1[s{i}]")
graph = ";".join(chains) + ";" + "".join(f"[s{i}]" for i in range(len(SEG))) + f"amix=inputs={len(SEG)}:normalize=0,apad=whole_dur=30,atrim=0:30,highpass=f=90,acompressor=threshold=-18dB:ratio=3:attack=5:release=80[out]"
subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", graph, "-map", "[out]", "-c:a", "pcm_s24le", "../vo.wav"], check=True)
print("-> audio/vo.wav")
