import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT.parent / 'ogz-server-master'
SRC_FULL = ROOT.parent / 'ogz-source-master' / 'src' / 'GunzNakama' / 'XML'
OUT = ROOT / 'data' / 'game'
OUT.mkdir(parents=True, exist_ok=True)

ZQUEST_NUMERIC_KEYS = {
    "id", "price", "sell_price", "weight", "bt_price", "res_level",
    "damage", "delay", "range", "magazine", "reloadtime", "maxwt",
}
ZQUEST_FLOAT_KEYS = {"delay", "range"}


def to_int(value):
    try:
        if isinstance(value, str) and value.strip().isdigit():
            return int(value)
        return int(value)
    except Exception:
        return value


def to_float(value):
    try:
        return float(value)
    except Exception:
        return value


def normalize_attrs(attrs):
    out = {}
    for k, v in attrs.items():
        if k in ZQUEST_NUMERIC_KEYS:
            out[k] = to_float(v) if k in ZQUEST_FLOAT_KEYS else to_int(v)
        else:
            out[k] = v
    return out


def main():
    candidate = SRC_FULL / 'zquestitem.xml'
    path = candidate if candidate.exists() else (SRC / 'zquestitem.xml')
    tree = ET.parse(path)
    root = tree.getroot()
    items = []
    for item in root.findall('.//{*}ITEM'):
        items.append(normalize_attrs(dict(item.attrib)))
    out = {
        'source': 'zquestitem.xml',
        'count': len(items),
        'items': items,
    }
    (OUT / 'zquestitem.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
