import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT.parent / 'ogz-server-master' / 'ladder_stat.dat'
OUT = ROOT / 'data' / 'game'
OUT.mkdir(parents=True, exist_ok=True)

LEVEL_UNIT = 5
CLANPOINT_UNIT = 20
CONTPOINT_UNIT = 50
MAX_LEVEL = 20
MAX_CLANPOINT = 200
MAX_CONTPOINT = 200
RECORD_SIZE = 8


def read_records(blob: bytes, count: int):
    records = []
    for i in range(count):
        offset = i * RECORD_SIZE
        n_count, n_win = struct.unpack_from('<II', blob, offset)
        rate = (n_win / n_count) if n_count else 0.0
        records.append({
            'count': int(n_count),
            'win_count': int(n_win),
            'rate': rate
        })
    return records


def convert_ladder_stat():
    blob = SRC.read_bytes()
    expected = (MAX_LEVEL + MAX_CLANPOINT + MAX_CONTPOINT) * RECORD_SIZE
    if len(blob) < expected:
        raise RuntimeError(f'ladder_stat.dat too small: {len(blob)} < {expected}')

    offset = 0
    level_blob = blob[offset:offset + MAX_LEVEL * RECORD_SIZE]
    offset += MAX_LEVEL * RECORD_SIZE
    clan_blob = blob[offset:offset + MAX_CLANPOINT * RECORD_SIZE]
    offset += MAX_CLANPOINT * RECORD_SIZE
    cont_blob = blob[offset:offset + MAX_CONTPOINT * RECORD_SIZE]

    out = {
        'source': 'ogz-server-master/ladder_stat.dat',
        'units': {
            'level': LEVEL_UNIT,
            'clan_point': CLANPOINT_UNIT,
            'cont_point': CONTPOINT_UNIT,
        },
        'max': {
            'level': MAX_LEVEL,
            'clan_point': MAX_CLANPOINT,
            'cont_point': MAX_CONTPOINT,
        },
        'level_records': read_records(level_blob, MAX_LEVEL),
        'clan_point_records': read_records(clan_blob, MAX_CLANPOINT),
        'cont_point_records': read_records(cont_blob, MAX_CONTPOINT),
    }

    (OUT / 'ladder_stat.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    convert_ladder_stat()


if __name__ == '__main__':
    main()
