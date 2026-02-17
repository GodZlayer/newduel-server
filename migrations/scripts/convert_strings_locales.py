import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SRC_FULL = ROOT.parent / 'ogz-source-master' / 'src' / 'GunzNakama' / 'XML'
OUT = ROOT / 'data' / 'game'
OUT.mkdir(parents=True, exist_ok=True)


def load_xml_sanitized(path: Path) -> ET.Element:
    raw = path.read_text(encoding='utf-8', errors='replace')
    raw = raw.replace('\ufeff', '')
    raw = raw.replace('\x00', '')
    first_lt = raw.find('<')
    if first_lt > 0:
        raw = raw[first_lt:]
    raw = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9A-Fa-f]+;)', '&amp;', raw)
    return ET.fromstring(raw)


def convert_region_strings():
    locales = ['BRZ', 'IND', 'INTERNATIONAL', 'JPN', 'KOR']
    data = {}
    for loc in locales:
        path = SRC_FULL / loc / 'strings.xml'
        if not path.exists():
            continue
        root = load_xml_sanitized(path)
        entries = {}
        for node in root.findall('.//{*}STR'):
            key = node.attrib.get('id')
            text = (node.text or '').strip()
            if key:
                entries[key] = text
        data[loc.lower()] = entries

    out = {
        'source': 'GunzNakama/XML/*/strings.xml',
        'locales': data,
    }
    (OUT / 'strings_locales.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    convert_region_strings()


if __name__ == '__main__':
    main()
