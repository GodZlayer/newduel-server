import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT.parent / 'ogz-server-master'
SRC_FULL = ROOT.parent / 'ogz-source-master' / 'src' / 'GunzNakama' / 'XML'
OUT = ROOT / 'data' / 'game'
OUT.mkdir(parents=True, exist_ok=True)


def to_int(value):
    try:
        if isinstance(value, str) and value.strip().isdigit():
            return int(value)
        return int(value)
    except Exception:
        return value


def parse_worlditem():
    candidate = SRC_FULL / 'worlditem.xml'
    path = candidate if candidate.exists() else (SRC / 'worlditem.xml')
    tree = ET.parse(path)
    root = tree.getroot()

    items = []
    for wi in root.findall('.//{*}WORLDITEM'):
        entry = dict(wi.attrib)
        for child in wi:
            tag = child.tag
            text = (child.text or '').strip()
            if not text:
                continue
            if tag in {'TIME', 'AMOUNT'}:
                entry[tag.lower()] = to_int(text)
            else:
                entry[tag.lower()] = text
        items.append(entry)

    mesh_info = []
    mesh_root = root.find('.//{*}MeshInfo')
    if mesh_root is not None:
        for el in list(mesh_root):
            el_entry = dict(el.attrib)
            el_entry['_tag'] = el.tag
            models = []
            anims = []
            for child in list(el):
                ctag = child.tag
                attrs = dict(child.attrib)
                if ctag.lower().startswith('addbasemodel'):
                    models.append(attrs)
                elif ctag.lower().startswith('addanimation'):
                    anims.append(attrs)
                else:
                    attrs['_tag'] = ctag
                    models.append(attrs)
            if models:
                el_entry['models'] = models
            if anims:
                el_entry['animations'] = anims
            mesh_info.append(el_entry)

    out = {
        'source': 'worlditem.xml',
        'count': len(items),
        'items': items,
        'mesh': mesh_info,
    }
    (OUT / 'worlditem.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    parse_worlditem()


if __name__ == '__main__':
    main()
