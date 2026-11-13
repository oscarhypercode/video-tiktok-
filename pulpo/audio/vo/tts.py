# Generate one VO phrase with ElevenLabs (key injected by the network proxy) + char timestamps.
import json, sys, base64, urllib.request
voice, model, name, text = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
prev = sys.argv[5] if len(sys.argv) > 5 else ""
body = {"text": text, "model_id": model, "language_code": "es",
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.8, "style": 0.5, "speed": 1.12}}
if model != "eleven_v3" and prev: body["previous_text"] = prev
if model == "eleven_v3": body["voice_settings"] = {"stability": 0.5}
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
    data=json.dumps(body).encode(), headers={"xi-api-key": "proxy-injected", "Content-Type": "application/json"})
d = json.load(urllib.request.urlopen(req))
open(name + ".mp3", "wb").write(base64.b64decode(d["audio_base64"]))
json.dump(d.get("normalized_alignment") or d.get("alignment"), open(name + ".json", "w"))
a = d.get("alignment"); print(name, model, round(a["character_end_times_seconds"][-1], 2), "s")
