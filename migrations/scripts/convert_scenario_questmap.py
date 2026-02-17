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


def to_bool(value):
    if isinstance(value, str):
        v = value.strip().lower()
        if v in ('true', '1', 'yes'):
            return True
        if v in ('false', '0', 'no'):
            return False
    return value


def parse_scenarios(root, tag_name):
    scenarios = []
    for sc in root.findall(f'.//{{*}}{tag_name}'):
        entry = dict(sc.attrib)
        for k in ['id', 'QL', 'DC', 'XP', 'BP']:
            if k in entry:
                entry[k] = to_int(entry[k])
        sacri_items = []
        for si in sc.findall('.//{*}SACRI_ITEM'):
            item_id = si.attrib.get('itemid')
            if item_id is not None:
                sacri_items.append(to_int(item_id))
        if sacri_items:
            entry['sacri_items'] = sacri_items
        maps = []
        for m in sc.findall('.//{*}MAP'):
            mentry = dict(m.attrib)
            if 'dice' in mentry:
                mentry['dice'] = to_int(mentry['dice'])
            if 'key_sector' in mentry:
                mentry['key_sector'] = to_int(mentry['key_sector'])
            if 'key_npc' in mentry:
                mentry['key_npc'] = to_int(mentry['key_npc'])
            if 'boss' in mentry:
                mentry['boss'] = to_bool(mentry['boss'])
            npcset_array = m.find('.//{*}NPCSET_ARRAY')
            if npcset_array is not None:
                arr = (npcset_array.text or '').strip()
                mentry['npcset_array'] = [a for a in arr.split('/') if a]
            jaco = m.find('.//{*}JACO')
            if jaco is not None:
                jentry = dict(jaco.attrib)
                for k in ['count', 'tick', 'min_npc', 'max_npc']:
                    if k in jentry:
                        jentry[k] = to_int(jentry[k])
                npcs = []
                for npc in jaco.findall('.//{*}NPC'):
                    nentry = dict(npc.attrib)
                    if 'npcid' in nentry:
                        nentry['npcid'] = to_int(nentry['npcid'])
                    if 'rate' in nentry:
                        nentry['rate'] = to_float(nentry['rate'])
                    npcs.append(nentry)
                if npcs:
                    jentry['npcs'] = npcs
                mentry['jaco'] = jentry
            maps.append(mentry)
        entry['maps'] = maps
        scenarios.append(entry)
    return scenarios


def convert_scenario():
    candidate = SRC / 'scenario.xml'
    path = candidate if candidate.exists() else (SRC_FULL / 'scenario.xml')
    tree = ET.parse(path)
    root = tree.getroot()

    standard = parse_scenarios(root, 'STANDARD_SCENARIO')
    special = parse_scenarios(root, 'SPECIAL_SCENARIO')

    out = {
        'source': 'scenario.xml',
        'count_standard': len(standard),
        'count_special': len(special),
        'count_total': len(standard) + len(special),
        'scenarios': standard,
        'special_scenarios': special,
    }
    (OUT / 'scenario.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def convert_questmap():
    candidate = SRC_FULL / 'questmap.xml'
    path = candidate if candidate.exists() else (SRC / 'questmap.xml')
    tree = ET.parse(path)
    root = tree.getroot()

    mapsets = []
    for ms in root.findall('.//{*}MAPSET'):
        entry = dict(ms.attrib)
        if 'id' in entry:
            entry['id'] = to_int(entry['id'])
        sectors = []
        for sec in ms.findall('.//{*}SECTOR'):
            sentry = dict(sec.attrib)
            for k in ['id', 'melee_spawn', 'range_spawn']:
                if k in sentry:
                    sentry[k] = to_int(sentry[k])
            links = []
            for link in sec.findall('.//{*}LINK'):
                lentry = dict(link.attrib)
                targets = []
                for t in link.findall('.//{*}TARGET'):
                    targets.append(dict(t.attrib))
                lentry['targets'] = targets
                links.append(lentry)
            sentry['links'] = links
            sectors.append(sentry)
        entry['sectors'] = sectors
        mapsets.append(entry)

    out = {
        'source': 'questmap.xml',
        'count': len(mapsets),
        'mapsets': mapsets,
    }
    (OUT / 'questmap.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    convert_scenario()
    convert_questmap()


if __name__ == '__main__':
    main()
