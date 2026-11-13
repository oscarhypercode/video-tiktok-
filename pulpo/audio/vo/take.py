# One continuous VO take with ElevenLabs (key injected by the proxy) + character alignment.
import json, sys, base64, urllib.request
voice, model, out, textfile = sys.argv[1:5]
settings = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {}
text = open(textfile).read().strip()
body = {"text": text, "model_id": model, "language_code": "es", "voice_settings": settings}
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
    data=json.dumps(body).encode(), headers={"xi-api-key": "proxy-injected", "Content-Type": "application/json"})
d = json.load(urllib.request.urlopen(req))
open(out + ".mp3", "wb").write(base64.b64decode(d["audio_base64"]))
json.dump(d["alignment"], open(out + ".json", "w"), ensure_ascii=False)
print(out, model, round(d["alignment"]["character_end_times_seconds"][-1], 2), "s")
