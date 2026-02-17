import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
channelrule_path = ROOT / 'data' / 'game' / 'channelrule.json'
manifest_path = ROOT / 'data' / 'game' / 'maps_manifest.json'

channelrule = json.loads(channelrule_path.read_text(encoding='utf-8'))
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))

server_maps = manifest.get('server_maps', {})
normalized = {k.lower().replace('_', ' ').strip(): k for k in server_maps.keys()}

def normalize(name: str) -> str:
    return name.lower().replace('_', ' ').strip()

report = {
    'source': {
        'channelrule': 'channelrule.json',
        'maps_manifest': 'maps_manifest.json'
    },
    'rules': []
}

for rule in channelrule.get('rules', []):
    allowed = []
    missing = []
    for m in rule.get('maps', []):
        name = m.get('name', '')
        key = normalized.get(normalize(name))
        if key:
            allowed.append(key)
        else:
            missing.append(name)
    report['rules'].append({
        'id': rule.get('id'),
        'name': rule.get('name'),
        'allowed': allowed,
        'missing': missing
    })

out = ROOT / 'data' / 'game' / 'allowed_maps_report.json'
out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print('written', out)
