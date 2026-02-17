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


def to_float(value):
    try:
        return float(value)
    except Exception:
        return value


def normalize_attrs(attrs):
    out = {}
    for k, v in attrs.items():
        if k in {"id", "max_hp", "max_ap", "int", "agility", "view_angle", "dc", "dyingtime"}:
            out[k] = to_int(v)
        else:
            out[k] = v
    return out


def parse_npc():
    candidate = SRC_FULL / 'npc.xml'
    path = candidate if candidate.exists() else (SRC / 'npc.xml')
    tree = ET.parse(path)
    root = tree.getroot()

    ai_value = {}
    ai_node = root.find('.//{*}AI_VALUE')
    if ai_node is not None:
        for child in list(ai_node):
            if child.tag == 'SHAKING':
                ai_value['shaking'] = {k: to_float(v) for k, v in child.attrib.items()}
            else:
                key = child.tag.lower()
                entries = []
                for t in child.findall('.//{*}TIME'):
                    d = dict(t.attrib)
                    d['value'] = to_float((t.text or '').strip())
                    if 'step' in d:
                        d['step'] = to_int(d['step'])
                    entries.append(d)
                ai_value[key] = entries

    npcs = []
    for npc in root.findall('.//{*}NPC'):
        entry = normalize_attrs(dict(npc.attrib))
        coll = npc.find('.//{*}COLLISION')
        if coll is not None:
            entry['collision'] = {k: to_float(v) for k, v in coll.attrib.items()}
        attack = npc.find('.//{*}ATTACK')
        if attack is not None:
            a = dict(attack.attrib)
            if 'range' in a:
                a['range'] = to_float(a['range'])
            if 'weaponitem_id' in a:
                a['weaponitem_id'] = to_int(a['weaponitem_id'])
            entry['attack'] = a
        speed = npc.find('.//{*}SPEED')
        if speed is not None:
            s = dict(speed.attrib)
            if 'default' in s:
                s['default'] = to_float(s['default'])
            entry['speed'] = s
        drop = npc.find('.//{*}DROP')
        if drop is not None:
            entry['drop'] = dict(drop.attrib)
        flags = npc.findall('.//{*}FLAG')
        if flags:
            entry['flags'] = [dict(f.attrib) for f in flags]
        skills = npc.findall('.//{*}SKILL')
        if skills:
            entry['skills'] = [to_int(s.attrib.get('id')) for s in skills if s.attrib.get('id')]
        npcs.append(entry)

    out = {
        'source': 'npc.xml',
        'ai_value': ai_value,
        'count': len(npcs),
        'npcs': npcs,
    }
    (OUT / 'npc.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def parse_npcset():
    candidate = SRC_FULL / 'npcset.xml'
    path = candidate if candidate.exists() else (SRC / 'npcset.xml')
    tree = ET.parse(path)
    root = tree.getroot()

    sets = []
    for npcset in root.findall('.//{*}NPCSET'):
        entry = dict(npcset.attrib)
        if 'id' in entry:
            entry['id'] = to_int(entry['id'])
        if 'basenpc' in entry:
            entry['basenpc'] = to_int(entry['basenpc'])
        addnpcs = []
        for add in npcset.findall('.//{*}ADDNPC'):
            d = dict(add.attrib)
            if 'npc_id' in d:
                d['npc_id'] = to_int(d['npc_id'])
            if 'min_rate' in d:
                d['min_rate'] = to_float(d['min_rate'])
            if 'max_rate' in d:
                d['max_rate'] = to_float(d['max_rate'])
            addnpcs.append(d)
        if addnpcs:
            entry['addnpc'] = addnpcs
        sets.append(entry)

    out = {
        'source': 'npcset.xml',
        'count': len(sets),
        'sets': sets,
    }
    (OUT / 'npcset.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    parse_npc()
    parse_npcset()


if __name__ == '__main__':
    main()
