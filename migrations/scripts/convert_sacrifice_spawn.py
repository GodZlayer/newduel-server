import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "game"
OUT.mkdir(parents=True, exist_ok=True)

SRC_SERVER = ROOT.parent / "ogz-server-master"
SRC_CLIENT = ROOT.parent / "ogz-client-master"


def to_int(value):
    try:
        if isinstance(value, str) and value.strip().isdigit():
            return int(value)
        return int(value)
    except Exception:
        return value


def convert_sacrifice_table():
    path = SRC_SERVER / "SacrificeTable.xml"
    tree = ET.parse(path)
    root = tree.getroot()

    items = []
    for node in root.findall(".//{*}ITEM"):
        entry = dict(node.attrib)
        for k in ["ql", "default_item_id", "special_item_id1", "special_item_id2", "sdc", "ScenarioID"]:
            if k in entry:
                entry[k] = to_int(entry[k])
        if "map" in entry:
            entry["map"] = (entry["map"] or "").strip()
        if "significant_npc" in entry:
            entry["significant_npc"] = (entry["significant_npc"] or "").strip()
        items.append(entry)

    out = {
        "source": "SacrificeTable.xml",
        "count": len(items),
        "items": items,
    }
    (OUT / "sacrifice_table.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")


def load_xml_sanitized(path: Path) -> ET.Element | None:
    try:
        raw = path.read_text(encoding="utf-8")
    except Exception:
        raw = path.read_text(encoding="utf-8", errors="replace")
    raw = raw.replace("\ufeff", "").replace("\x00", "")
    first_lt = raw.find("<")
    if first_lt > 0:
        raw = raw[first_lt:]
    raw = re.sub(r"&(?!(amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9A-Fa-f]+;))", "&amp;", raw)
    try:
        return ET.fromstring(raw)
    except Exception:
        return None


def parse_position(text: str):
    parts = [p for p in (text or "").strip().split() if p]
    if len(parts) >= 3:
        try:
            return [float(parts[0]), float(parts[1]), float(parts[2])]
        except Exception:
            return parts[:3]
    return None


def parse_spawn_nodes(nodes, gametype_id=None):
    spawns = []
    for node in nodes:
        entry = dict(node.attrib)
        if gametype_id:
            entry["gametype"] = gametype_id
        for k in ["id", "team"]:
            if k in entry:
                entry[k] = to_int(entry[k])
        pos = node.find(".//{*}POSITION")
        if pos is not None and pos.text:
            coords = parse_position(pos.text)
            if coords is not None:
                entry["pos"] = coords
        spawns.append(entry)
    return spawns


def parse_spawn_file(path: Path):
    root = load_xml_sanitized(path)
    if root is None:
        return None
    spawns = []
    gametypes = root.findall(".//{*}GAMETYPE")
    if gametypes:
        for gt in gametypes:
            gid = gt.attrib.get("id")
            spawns.extend(parse_spawn_nodes(gt.findall(".//{*}SPAWN"), gametype_id=gid))
    else:
        spawns.extend(parse_spawn_nodes(root.findall(".//{*}SPAWN")))
    return {
        "file": str(path),
        "count": len(spawns),
        "spawns": spawns,
    }


def convert_spawns():
    locations = [
        SRC_SERVER / "Maps",
        SRC_CLIENT / "Maps",
        SRC_CLIENT / "Quest" / "Maps",
    ]

    entries = []
    for base in locations:
        if not base.exists():
            continue
        for spawn_path in base.rglob("spawn.xml"):
            parsed = parse_spawn_file(spawn_path)
            if parsed is None:
                continue
            rel = str(spawn_path.relative_to(base)).replace("\\", "/")
            parsed["source_root"] = str(base).replace("\\", "/")
            parsed["relative"] = rel
            entries.append(parsed)

    out = {
        "source_roots": [str(p).replace("\\", "/") for p in locations],
        "count": len(entries),
        "spawns": entries,
    }
    (OUT / "spawns.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    convert_sacrifice_table()
    convert_spawns()


if __name__ == "__main__":
    main()
