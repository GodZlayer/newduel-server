import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
manifest_path = ROOT / "data" / "game" / "maps_manifest.json"

data = json.loads(manifest_path.read_text(encoding="utf-8"))
data["ingested_paths"] = {
    "server": "nakama-server/data/maps/server",
    "client": "nakama-server/data/maps/client",
    "client_quest": "nakama-server/data/maps/client_quest",
}

manifest_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
