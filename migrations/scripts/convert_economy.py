import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]  # nakama-server
SRC = ROOT.parent / 'ogz-server-master'
SRC_FULL = ROOT.parent / 'ogz-source-master' / 'src' / 'GunzNakama' / 'XML'
OUT = ROOT / 'data' / 'game'
OUT.mkdir(parents=True, exist_ok=True)

ZITEM_NUMERIC_KEYS = {
    "id", "totalpoint", "res_level", "weight", "bt_price", "delay", "damage",
    "range", "ctrl_ability", "magazine", "reloadtime", "gadget_id", "hp", "ap",
    "maxwt", "sf", "fr", "cr", "pr", "lr", "image_id", "bullet_image_id",
    "magazine_image_id",
}
ZITEM_FLOAT_KEYS = {"delay", "range"}

FORMULA_INT_KEYS = {"lower", "upper"}

DROPTABLE_FLOAT_KEYS = {"rate"}

SHOP_INT_KEYS = {"itemid"}

ALLOW_SPECIAL_DROP_IDS = {"hp1", "ap1", "mag1", "hp2", "mag2", "ap2", "hp3", "ap3", "mag3"}


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


def normalize_item_attrs(attrs):
    out = {}
    for k, v in attrs.items():
        if k in ZITEM_NUMERIC_KEYS:
            if k in ZITEM_FLOAT_KEYS:
                out[k] = to_float(v)
            else:
                out[k] = to_int(v)
        else:
            out[k] = v
    return out


def normalize_shop_attrs(attrs):
    out = {}
    for k, v in attrs.items():
        out[k] = to_int(v) if k in SHOP_INT_KEYS else v
    return out


def normalize_formula_lm(attrs):
    out = {}
    for k, v in attrs.items():
        out[k] = to_int(v) if k in FORMULA_INT_KEYS else v
    return out


def normalize_droptable_item(attrs):
    out = {}
    for k, v in attrs.items():
        if k in DROPTABLE_FLOAT_KEYS:
            out[k] = to_float(v)
        else:
            out[k] = v
    return out


def is_numeric_string(s):
    return isinstance(s, str) and s.isdigit()


def convert_zitem():
    # Prefer the fuller zitem.xml from source if available
    candidate = SRC_FULL / 'zitem.xml'
    path = candidate if candidate.exists() else (SRC / 'zitem.xml')
    tree = ET.parse(path)
    root = tree.getroot()
    items = []
    for item in root.findall('.//{*}ITEM'):
        items.append(normalize_item_attrs(dict(item.attrib)))
    out = {
        'source': str(path),
        'count': len(items),
        'items': items,
    }
    (OUT / 'zitem.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    return len(items)


def convert_shop():
    candidate = SRC_FULL / 'shop.xml'
    path = candidate if candidate.exists() else (SRC / 'shop.xml')
    tree = ET.parse(path)
    root = tree.getroot()
    sell = []
    for node in root.findall('.//{*}SELL'):
        sell.append(normalize_shop_attrs(dict(node.attrib)))
    out = {
        'source': 'shop.xml',
        'count': len(sell),
        'sell': sell,
    }
    (OUT / 'shop.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    return len(sell)


def convert_formula():
    candidate = SRC_FULL / 'formula.xml'
    path = candidate if candidate.exists() else (SRC / 'formula.xml')
    tree = ET.parse(path)
    root = tree.getroot()
    tables = []
    for table in root.findall('.//{*}FORMULA_TABLE'):
        entry = dict(table.attrib)
        lms = []
        for lm in table.findall('.//{*}LM'):
            d = normalize_formula_lm(dict(lm.attrib))
            d['value'] = to_float((lm.text or '').strip())
            lms.append(d)
        entry['rows'] = lms
        tables.append(entry)
    out = {
        'source': 'formula.xml',
        'count': len(tables),
        'tables': tables,
    }
    (OUT / 'formula.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    return len(tables)


def convert_droptable():
    candidate = SRC_FULL / 'droptable.xml'
    path = candidate if candidate.exists() else (SRC / 'droptable.xml')
    tree = ET.parse(path)
    root = tree.getroot()
    dropsets = []
    for ds in root.findall('.//{*}DROPSET'):
        ds_entry = dict(ds.attrib)
        itemsets = []
        for itemset in ds.findall('.//{*}ITEMSET'):
            is_entry = dict(itemset.attrib)
            items = []
            for item in itemset.findall('.//{*}ITEM'):
                items.append(normalize_droptable_item(dict(item.attrib)))
            is_entry['items'] = items
            itemsets.append(is_entry)
        ds_entry['itemsets'] = itemsets
        dropsets.append(ds_entry)
    out = {
        'source': 'droptable.xml',
        'count': len(dropsets),
        'dropsets': dropsets,
    }
    (OUT / 'droptable.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    return len(dropsets)


def validate(zitem_data, zquestitem_data, worlditem_data, npc_data, shop_data, droptable_data):
    zitem_ids = {i.get("id") for i in zitem_data["items"]}
    zquest_ids = {i.get("id") for i in zquestitem_data.get("items", [])}
    world_ids = {i.get("id") for i in worlditem_data.get("items", [])}
    npc_weapon_ids = set()
    for n in npc_data.get("npcs", []):
        atk = n.get("attack")
        if atk and "weaponitem_id" in atk:
            npc_weapon_ids.add(atk["weaponitem_id"])
    shop_missing = []
    for s in shop_data["sell"]:
        itemid = s.get("itemid")
        if itemid not in zitem_ids:
            shop_missing.append(itemid)

    droptable_missing = []
    for ds in droptable_data["dropsets"]:
        for iset in ds.get("itemsets", []):
            for it in iset.get("items", []):
                item_id = it.get("id")
                if item_id in ALLOW_SPECIAL_DROP_IDS:
                    continue
                if is_numeric_string(item_id):
                    item_id = int(item_id)
                if item_id not in zitem_ids and item_id not in zquest_ids and item_id not in world_ids and item_id not in npc_weapon_ids and item_id not in ALLOW_SPECIAL_DROP_IDS:
                    droptable_missing.append(item_id)

    return {
        "shop_missing_itemids": sorted({str(x) for x in shop_missing}),
        "droptable_missing_itemids": sorted({str(x) for x in droptable_missing}),
    }


def main():
    counts = {}
    counts['zitem'] = convert_zitem()
    counts['shop'] = convert_shop()
    counts['formula'] = convert_formula()
    counts['droptable'] = convert_droptable()
    report = {
        'outputs': {
            'zitem': str(OUT / 'zitem.json'),
            'shop': str(OUT / 'shop.json'),
            'formula': str(OUT / 'formula.json'),
            'droptable': str(OUT / 'droptable.json'),
        },
        'counts': counts,
    }
    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

    zitem_data = json.loads((OUT / 'zitem.json').read_text(encoding='utf-8'))
    zquestitem_data = json.loads((OUT / 'zquestitem.json').read_text(encoding='utf-8'))
    worlditem_data = json.loads((OUT / 'worlditem.json').read_text(encoding='utf-8'))
    npc_data = json.loads((OUT / 'npc.json').read_text(encoding='utf-8'))
    shop_data = json.loads((OUT / 'shop.json').read_text(encoding='utf-8'))
    droptable_data = json.loads((OUT / 'droptable.json').read_text(encoding='utf-8'))
    validation = validate(zitem_data, zquestitem_data, worlditem_data, npc_data, shop_data, droptable_data)
    (OUT / 'validation.json').write_text(json.dumps(validation, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
