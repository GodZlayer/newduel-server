import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data' / 'game'
OUT.mkdir(parents=True, exist_ok=True)

SERVER_MAPS = ROOT.parent / 'ogz-server-master' / 'Maps'
CLIENT_MAPS = ROOT.parent / 'ogz-client-master' / 'Maps'
CLIENT_QUEST_MAPS = ROOT.parent / 'ogz-client-master' / 'Quest' / 'Maps'


def scan_maps(root: Path):
    if not root.exists():
        return {}
    maps = {}
    for d in sorted([p for p in root.iterdir() if p.is_dir()], key=lambda p: p.name.lower()):
        files = []
        for p in sorted(d.rglob('*')):
            if p.is_file():
                files.append({
                    'path': str(p.relative_to(root)).replace('\\', '/'),
                    'size': p.stat().st_size,
                })
        maps[d.name] = {
            'path': str(d).replace('\\', '/'),
            'file_count': len(files),
            'files': files,
        }
    return maps


def convert_maps_manifest():
    server_maps = scan_maps(SERVER_MAPS)
    client_maps = scan_maps(CLIENT_MAPS)
    client_quest_maps = scan_maps(CLIENT_QUEST_MAPS)

    out = {
        'source': {
            'server_maps_dir': str(SERVER_MAPS).replace('\\', '/'),
            'client_maps_dir': str(CLIENT_MAPS).replace('\\', '/'),
            'client_quest_maps_dir': str(CLIENT_QUEST_MAPS).replace('\\', '/'),
        },
        'summary': {
            'server_count': len(server_maps),
            'client_count': len(client_maps),
            'client_quest_count': len(client_quest_maps),
        },
        'server_maps': server_maps,
        'client_maps': client_maps,
        'client_quest_maps': client_quest_maps,
    }

    (OUT / 'maps_manifest.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    convert_maps_manifest()


if __name__ == '__main__':
    main()
