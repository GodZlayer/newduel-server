import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data' / 'game'

missing = json.loads((OUT / 'validation.json').read_text(encoding='utf-8'))
items = set(missing.get('droptable_missing_itemids', []))

sources = {
    'zitem.json': set(),
    'zquestitem.json': set(),
    'worlditem.json': set(),
    'npc.json': set(),
    'npcset.json': set(),
    'scenario.json': set(),
    'questmap.json': set(),
    'event.json': set(),
    'event_list.json': set(),
    'gungame.json': set(),
}

for name in sources.keys():
    p = OUT / name
    if not p.exists():
        continue
    data = json.loads(p.read_text(encoding='utf-8'))
    if name == 'npc.json':
        ids = set(str(n.get('id')) for n in data.get('npcs', []))
    elif name == 'npcset.json':
        ids = set(str(s.get('id')) for s in data.get('sets', []))
    elif name == 'scenario.json':
        ids = set(str(s.get('QL')) for s in data.get('scenarios', []))
    elif name == 'questmap.json':
        ids = set(str(m.get('id')) for m in data.get('mapsets', []))
        for m in data.get('mapsets', []):
            ids |= set(str(sec.get('id')) for sec in m.get('sectors', []))
    elif name == 'event.json':
        ids = set(str(e.get('id')) for e in data.get('events', []))
        ids |= set(str(e.get('EventID')) for e in data.get('events', []))
    elif name == 'event_list.json':
        ids = set()
        for loc in data.get('locales', []):
            for ev in loc.get('events', []):
                ids.add(str(ev.get('id')))
                ids.add(str(ev.get('EventID')))
    elif name == 'gungame.json':
        ids = set()
        for s in data.get('sets', []):
            for it in s:
                for k, v in it.items():
                    if k in {'primary', 'secondary', 'custom1', 'custom2', 'melee'}:
                        ids.add(str(v))
    else:
        ids = set(str(i.get('id')) for i in data.get('items', []))
    sources[name] = ids

hits = {k: sorted(list(items & v)) for k, v in sources.items() if items & v}
report = {
    'missing_count': len(items),
    'hits': hits,
}
(OUT / 'validation_crossref.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
