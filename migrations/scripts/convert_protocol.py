import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT.parent / 'ogz-server-master'
OUT = ROOT / 'data' / 'game'
OUT.mkdir(parents=True, exist_ok=True)


def convert_protocol():
    path = SRC / 'protocol.xml'
    tree = ET.parse(path)
    root = tree.getroot()

    requests = []
    responses = []

    for req in root.findall('.//{*}REQUEST'):
        entry = dict(req.attrib)
        params = []
        for p in req.findall('.//{*}PARAM'):
            pe = dict(p.attrib)
            pe['name'] = (p.text or '').strip()
            params.append(pe)
        entry['params'] = params
        requests.append(entry)

    for res in root.findall('.//{*}RESPONSE'):
        entry = dict(res.attrib)
        params = []
        for p in res.findall('.//{*}PARAM'):
            pe = dict(p.attrib)
            pe['name'] = (p.text or '').strip()
            params.append(pe)
        entry['params'] = params
        responses.append(entry)

    out = {
        'source': 'protocol.xml',
        'requests': requests,
        'responses': responses,
    }
    (OUT / 'protocol.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    convert_protocol()


if __name__ == '__main__':
    main()
