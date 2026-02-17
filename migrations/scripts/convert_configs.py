import json
from pathlib import Path
import xml.etree.ElementTree as ET
import re

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT.parent / 'ogz-server-master'
OUT = ROOT / 'data' / 'game'
OUT.mkdir(parents=True, exist_ok=True)


INT_KEYS_INI = {
    'SERVER': {'MAXUSER', 'SERVERID', 'USETICKET'},
    'LOCALE': {'DBAgentPort'},
    'FILTER': {'USE', 'ACCEPT_INVALID_IP'},
    'ENVIRONMENT': {'USE_EVENT', 'USE_FILECRC'},
}


def to_int(value):
    try:
        if isinstance(value, str) and value.strip().isdigit():
            return int(value)
        return int(value)
    except Exception:
        return value


def parse_server_xml():
    path = SRC / 'server.xml'
    raw = path.read_text(encoding='utf-8')
    # simple XML-like lines without root; parse manually
    data = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line or not line.startswith('<'):
            continue
        if line.startswith('<?'):
            continue
        if line.startswith('<!--'):
            continue
        if '</' in line:
            key = line.split('>', 1)[0][1:]
            val = line.split('>', 1)[1].rsplit('<', 1)[0]
            data[key] = val
    # normalize known numeric fields
    for k in ['is_master_server']:
        if k in data:
            data[k] = to_int(data[k])
    out = {
        'source': 'server.xml',
        'data': data,
    }
    (OUT / 'server.xml.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def parse_ini(path):
    text = path.read_text(encoding='utf-8')
    data = {}
    current = None
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith(';'):
            continue
        if line.startswith('[') and line.endswith(']'):
            current = line[1:-1]
            data[current] = {}
            continue
        if '=' in line:
            k, v = line.split('=', 1)
            k = k.strip()
            v = v.strip().strip('"')
            if current is None:
                data.setdefault('GLOBAL', {})[k] = v
            else:
                data[current][k] = v
    # normalize ints
    for section, keys in INT_KEYS_INI.items():
        if section in data:
            for k in keys:
                if k in data[section]:
                    data[section][k] = to_int(data[section][k])
    return data


def parse_server_ini():
    path = SRC / 'server.ini'
    out = {
        'source': 'server.ini',
        'data': parse_ini(path),
    }
    (OUT / 'server.ini.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def parse_channel_xml():
    path = SRC / 'channel.xml'
    tree = ET.parse(path)
    root = tree.getroot()
    defaults = {}
    dname = root.find('.//{*}DEFAULTCHANNELNAME')
    if dname is not None:
        defaults['default_channel_name'] = dict(dname.attrib)
    drule = root.find('.//{*}DEFAULTRULENAME')
    if drule is not None:
        defaults['default_rule_name'] = dict(drule.attrib)
    channels = []
    for ch in root.findall('.//{*}CHANNEL'):
        entry = dict(ch.attrib)
        if 'maxplayers' in entry:
            entry['maxplayers'] = to_int(entry['maxplayers'])
        channels.append(entry)
    out = {
        'source': 'channel.xml',
        'defaults': defaults,
        'channels': channels,
    }
    (OUT / 'channel.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def parse_channelrule_xml():
    path = SRC / 'channelrule.xml'
    raw = path.read_text(encoding='utf-8')
    # Remove XML comments to avoid invalid nested comments in source
    raw = re.sub(r'<!--.*?-->', '', raw, flags=re.DOTALL)
    root = ET.fromstring(raw)
    rules = []
    for rule in root.findall('.//{*}CHANNELRULE'):
        entry = dict(rule.attrib)
        if 'id' in entry:
            entry['id'] = to_int(entry['id'])
        gametypes = []
        for gt in rule.findall('.//{*}GAMETYPE'):
            g = dict(gt.attrib)
            if 'id' in g:
                g['id'] = to_int(g['id'])
            gametypes.append(g)
        maps = []
        for m in rule.findall('.//{*}MAP'):
            maps.append(dict(m.attrib))
        entry['gametypes'] = gametypes
        entry['maps'] = maps
        rules.append(entry)
    out = {
        'source': 'channelrule.xml',
        'rules': rules,
    }
    (OUT / 'channelrule.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    parse_server_xml()
    parse_server_ini()
    parse_channel_xml()
    parse_channelrule_xml()


if __name__ == '__main__':
    main()
