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


def convert_event():
    path = SRC / 'Event.xml'
    tree = ET.parse(path)
    root = tree.getroot()
    events = []
    for ev in root.findall('.//{*}Event'):
        entry = dict(ev.attrib)
        if 'id' in entry:
            entry['id'] = to_int(entry['id'])
        if 'EventID' in entry:
            entry['EventID'] = to_int(entry['EventID'])
        events.append(entry)
    out = {
        'source': 'Event.xml',
        'count': len(events),
        'events': events,
    }
    (OUT / 'event.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def convert_event_list():
    path = SRC / 'EventList.xml'
    tree = ET.parse(path)
    root = tree.getroot()

    locales = []
    for loc in root.findall('.//{*}Locale'):
        lentry = dict(loc.attrib)
        events = []
        for ev in loc.findall('.//{*}Event'):
            e = dict(ev.attrib)
            for k in ['id', 'EventID', 'event_type', 'elapsed_time', 'percent', 'rate', 'xp_bonus_ratio', 'bp_bonus_ratio']:
                if k in e:
                    e[k] = to_int(e[k])
            server_types = []
            for st in ev.findall('.//{*}ServerType'):
                s = dict(st.attrib)
                for k in ['order', 'type']:
                    if k in s:
                        s[k] = to_int(s[k])
                server_types.append(s)
            if server_types:
                e['server_types'] = server_types
            game_types = []
            for gt in ev.findall('.//{*}GameType'):
                g = dict(gt.attrib)
                for k in ['order', 'type']:
                    if k in g:
                        g[k] = to_int(g[k])
                game_types.append(g)
            if game_types:
                e['game_types'] = game_types
            start = ev.find('.//{*}StartTime')
            if start is not None:
                st = dict(start.attrib)
                for k in ['year', 'month', 'day', 'hour']:
                    if k in st:
                        st[k] = to_int(st[k])
                e['start_time'] = st
            end = ev.find('.//{*}EndTime')
            if end is not None:
                et = dict(end.attrib)
                for k in ['year', 'month', 'day', 'hour']:
                    if k in et:
                        et[k] = to_int(et[k])
                e['end_time'] = et
            events.append(e)
        lentry['events'] = events
        locales.append(lentry)

    out = {
        'source': 'EventList.xml',
        'count': len(locales),
        'locales': locales,
    }
    (OUT / 'event_list.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def convert_gungame():
    candidate = SRC_FULL / 'gungame.xml'
    path = candidate if candidate.exists() else (SRC / 'gungame.xml')
    tree = ET.parse(path)
    root = tree.getroot()

    sets = []
    for s in root.findall('.//{*}SET'):
        items = []
        for iset in s.findall('.//{*}ITEMSET'):
            items.append(dict(iset.attrib))
        sets.append(items)

    options = {}
    opt = root.find('.//{*}OPTIONS')
    if opt is not None:
        options = dict(opt.attrib)
        if 'MinKillsPerLevel' in options:
            options['MinKillsPerLevel'] = to_int(options['MinKillsPerLevel'])

    out = {
        'source': 'gungame.xml',
        'sets': sets,
        'options': options,
    }
    (OUT / 'gungame.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    convert_event()
    convert_event_list()
    convert_gungame()


if __name__ == '__main__':
    main()
