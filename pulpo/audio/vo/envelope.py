# Mouth envelope for lip sync: <film>/audio/vo.wav -> <film>/vo_env.json (100 values per second).
# Usage: python3 envelope.py <film>
import sys, struct, json, math, subprocess
film = sys.argv[1]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{film}/audio/vo.wav", "-ac", "1", "-ar", "4800", "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = struct.unpack(f"{len(raw)//4}f", raw)
env = [math.sqrt(sum(v * v for v in x[i:i+48]) / 48) for i in range(0, len(x), 48)]
m = sorted(env)[int(len(env) * 0.97)]
env = [round(min(1, v / m) ** 0.7, 3) if v > m * 0.08 else 0 for v in env]
json.dump({"rate": 100, "env": env}, open(f"{film}/vo_env.json", "w"))
print(f"{len(env)} frames -> {film}/vo_env.json")
