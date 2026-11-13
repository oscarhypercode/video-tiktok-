# Real word timings: transcribe <film>/audio/vo.wav with ElevenLabs Scribe -> <film>/words.json
# ([word, start, end] in seconds). The API key is injected by the environment's network proxy.
# Usage: python3 scribe_words.py <film>
import sys, json, subprocess, tempfile, urllib.request, uuid
film = sys.argv[1]
mp3 = tempfile.mktemp(suffix=".mp3")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{film}/audio/vo.wav", "-b:a", "128k", mp3], check=True)
b = uuid.uuid4().hex
body = (f"--{b}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n"
        f"--{b}\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\nspa\r\n"
        f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"vo.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n").encode() \
       + open(mp3, "rb").read() + f"\r\n--{b}--\r\n".encode()
req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body,
    headers={"xi-api-key": "proxy-injected", "Content-Type": f"multipart/form-data; boundary={b}"})
d = json.load(urllib.request.urlopen(req))
words = [[w["text"], round(w["start"], 3), round(w["end"], 3)] for w in d["words"] if w["type"] == "word"]
json.dump(words, open(f"{film}/words.json", "w"), ensure_ascii=False)
print(d["text"]); print(f"{len(words)} words -> {film}/words.json")
for i, w in enumerate(words): print(i, *w)
