import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
channelrule_path = ROOT / "data" / "game" / "channelrule.json"
channel_path = ROOT / "data" / "game" / "channel.json"

maps_root = ROOT.parent / "ogz-client-master" / "Maps"

rule_doc = json.loads(channelrule_path.read_text(encoding="utf-8"))
channel_doc = json.loads(channel_path.read_text(encoding="utf-8"))

dirs = [p.name for p in maps_root.iterdir() if p.is_dir()]
dirs.sort(key=lambda s: s.lower())

if not dirs:
    raise SystemExit("No unpacked map directories found in ogz-client-master/Maps")

rules = rule_doc.get("rules", [])
rule_names = {r.get("name") for r in rules}
rule_ids = [r.get("id", 0) for r in rules if isinstance(r.get("id", 0), int)]
next_id = (max(rule_ids) + 1) if rule_ids else 1

rule_name = "free_all_maps"
if rule_name in rule_names:
    # Replace existing rule maps if already present
    for r in rules:
        if r.get("name") == rule_name:
            r["maps"] = [{"name": d} for d in dirs]
            r["id"] = r.get("id", next_id)
            break
else:
    rules.append(
        {
            "id": next_id,
            "name": rule_name,
            "gametypes": [{"id": i} for i in range(0, 12)],
            "maps": [{"name": d} for d in dirs],
        }
    )

channels = channel_doc.get("channels", [])
channel_names = {c.get("name") for c in channels}
channel_name = "Free All Maps"
if channel_name not in channel_names:
    channels.append(
        {
            "name": channel_name,
            "maxplayers": 200,
            "rule": rule_name,
        }
    )

rule_doc["rules"] = rules
channel_doc["channels"] = channels

channelrule_path.write_text(json.dumps(rule_doc, ensure_ascii=False, indent=2), encoding="utf-8")
channel_path.write_text(json.dumps(channel_doc, ensure_ascii=False, indent=2), encoding="utf-8")
