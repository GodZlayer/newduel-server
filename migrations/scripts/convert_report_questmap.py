import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT.parent / 'ogz-server-master' / 'report_questmap.txt'
OUT = ROOT / 'data' / 'game'
OUT.mkdir(parents=True, exist_ok=True)

MAPSET_RE = re.compile(r'<MAPSET>\s*(.*?)\s*\((\d+)\)')
SECTOR_RE = re.compile(r'<SECTOR>\s*(.*?)\s*\((\d+)\)')
LINK_RE = re.compile(r'<LINK>\s*(.*)')
TARGET_RE = re.compile(r'<TARGET>\s*(.*)')


def convert_report_questmap():
    lines = SRC.read_text(encoding='utf-8', errors='replace').splitlines()
    mapsets = []
    current_mapset = None
    current_sector = None
    current_link = None

    for raw in lines:
        line = raw.strip()
        if not line:
            continue

        m = MAPSET_RE.search(line)
        if m:
            current_mapset = {
                'id': int(m.group(2)),
                'name': m.group(1).strip(),
                'sectors': []
            }
            mapsets.append(current_mapset)
            current_sector = None
            current_link = None
            continue

        m = SECTOR_RE.search(line)
        if m and current_mapset is not None:
            current_sector = {
                'id': int(m.group(2)),
                'name': m.group(1).strip(),
                'links': []
            }
            current_mapset['sectors'].append(current_sector)
            current_link = None
            continue

        m = LINK_RE.search(line)
        if m and current_sector is not None:
            link_name = m.group(1).strip()
            current_link = {
                'name': link_name if link_name else None,
                'targets': []
            }
            current_sector['links'].append(current_link)
            continue

        m = TARGET_RE.search(line)
        if m and current_link is not None:
            target = m.group(1).strip()
            if target:
                current_link['targets'].append(target)
            continue

    out = {
        'source': 'ogz-server-master/report_questmap.txt',
        'mapsets': mapsets
    }
    (OUT / 'report_questmap.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    convert_report_questmap()


if __name__ == '__main__':
    main()
