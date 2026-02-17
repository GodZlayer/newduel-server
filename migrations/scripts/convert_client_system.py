import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT.parent / "ogz-client-master" / "system"
OUT = ROOT / "data" / "game" / "client_system"
OUT.mkdir(parents=True, exist_ok=True)

FILES = [
    "gametypecfg.xml",
    "skillmaps.xml",
    "zskill.xml",
    "AnimationEvent.xml",
    "system.xml",
    "parts_index.xml",
    "locale.xml",
    "filelist.xml",
]


def strip_control_chars(text: str) -> str:
    return "".join(ch for ch in text if ch in "\t\r\n" or ord(ch) >= 0x20)


def dedupe_tag_attributes(text: str) -> str:
    # Remove duplicate attributes in a single tag (keep first)
    def fix_tag(match):
        tag = match.group(0)
        parts = tag.split()
        if len(parts) <= 2:
            return tag
        seen = set()
        rebuilt = [parts[0]]
        for p in parts[1:]:
            if "=" in p:
                key = p.split("=", 1)[0]
                if key in seen:
                    continue
                seen.add(key)
            rebuilt.append(p)
        return " ".join(rebuilt)

    return re.sub(r"<[^>]+>", fix_tag, text)


def load_xml_sanitized(path: Path, wrap_root: bool = False, dedupe_attrs: bool = False, strip_comments: bool = False) -> ET.Element:
    raw = path.read_text(encoding="utf-8", errors="replace")
    raw = raw.replace("\ufeff", "").replace("\x00", "")
    first_lt = raw.find("<")
    if first_lt > 0:
        raw = raw[first_lt:]
    raw = strip_control_chars(raw)
    if strip_comments:
        raw = re.sub(r"<!--[\s\S]*?-->", "", raw)
    raw = re.sub(r"&(?!(amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9A-Fa-f]+;))", "&amp;", raw)
    if dedupe_attrs:
        raw = dedupe_tag_attributes(raw)
    if wrap_root:
        raw = "<ROOT>" + raw + "</ROOT>"
    return ET.fromstring(raw)


def xml_to_dict(node: ET.Element):
    data = {}
    if node.attrib:
        data["@"] = dict(node.attrib)
    text = (node.text or "").strip()
    if text:
        data["#"] = text
    children = list(node)
    if children:
        grouped = {}
        for child in children:
            key = child.tag.split("}")[-1]
            grouped.setdefault(key, []).append(xml_to_dict(child))
        for k, v in grouped.items():
            data[k] = v if len(v) > 1 else v[0]
    return data


def convert_file(name: str):
    path = SRC / name
    if not path.exists():
        return None
    try:
        if name == "parts_index.xml":
            return convert_parts_index(path)
        wrap = name in ("skillmaps.xml",)
        strip_comments = name in ("gametypecfg.xml",)
        root = load_xml_sanitized(path, wrap_root=wrap, strip_comments=strip_comments)
    except Exception as exc:
        print("failed", name, exc)
        return None
    out = {
        "source": f"system/{name}",
        "root": root.tag.split('}')[-1],
        "data": xml_to_dict(root),
    }
    out_path = OUT / (name.replace(".xml", ".json").lower())
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path


def convert_parts_index(path: Path):
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    entries = []
    for line in lines:
        if "<parts " not in line:
            continue
        file_match = re.search(r'file="([^"]+)"', line)
        if not file_match:
            continue
        file_path = file_match.group(1)
        parts = re.findall(r'part="([^"]+)"', line)
        entries.append({"file": file_path, "parts": parts})
    out = {
        "source": "system/parts_index.xml",
        "count": len(entries),
        "entries": entries,
    }
    out_path = OUT / "parts_index.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path


def main():
    written = []
    for name in FILES:
        out = convert_file(name)
        if out:
            written.append(str(out))
    print("written", len(written))


if __name__ == "__main__":
    main()
