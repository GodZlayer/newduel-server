import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT.parent / 'ogz-server-master'
OUT = ROOT / 'data' / 'game'
OUT.mkdir(parents=True, exist_ok=True)


def to_int(value):
    try:
        if isinstance(value, str) and value.strip().isdigit():
            return int(value)
        return int(value)
    except Exception:
        return value


def convert_cserror():
    path = SRC / 'cserror.xml'
    tree = ET.parse(path)
    root = tree.getroot()
    entries = []
    for node in root.findall('.//{*}STR'):
        entry = dict(node.attrib)
        if 'id' in entry:
            entry['id'] = to_int(entry['id'])
        entry['text'] = (node.text or '').strip()
        entries.append(entry)
    out = {
        'source': 'cserror.xml',
        'count': len(entries),
        'errors': entries,
    }
    (OUT / 'cserror.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    convert_cserror()


if __name__ == '__main__':
    main()
