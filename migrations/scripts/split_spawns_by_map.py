import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "game" / "spawns.json"
OUT = ROOT / "data" / "game" / "spawns"
OUT.mkdir(parents=True, exist_ok=True)


def safe_name(name: str) -> str:
    return name.replace("\\", "/").replace("/", "_")


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    entries = data.get("spawns", [])

    grouped = {}
    for entry in entries:
        rel = entry.get("relative", "")
        if not rel:
            continue
        parts = rel.split("/")
        map_name = parts[0] if parts else "unknown"
        source_root = entry.get("source_root", "unknown")
        key = (source_root, map_name)
        grouped.setdefault(key, []).append(entry)

    for (source_root, map_name), items in grouped.items():
        root_tag = safe_name(source_root.split("/")[-1])
        out_dir = OUT / root_tag
        out_dir.mkdir(parents=True, exist_ok=True)
        out = {
            "source_root": source_root,
            "map": map_name,
            "count_files": len(items),
            "files": items,
        }
        (out_dir / f"{safe_name(map_name)}.json").write_text(
            json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
        )


if __name__ == "__main__":
    main()
