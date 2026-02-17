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


def convert_strings():
    path = SRC / 'strings.xml'
    tree = ET.parse(path)
    root = tree.getroot()
    entries = []
    for node in root.findall('.//{*}STR'):
        entry = dict(node.attrib)
        if 'id' in entry:
            entry['id'] = entry['id']
        entry['text'] = (node.text or '').strip()
        entries.append(entry)
    out = {
        'source': 'strings.xml',
        'count': len(entries),
        'strings': entries,
    }
    (OUT / 'strings.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def convert_messages():
    path = SRC / 'messages.xml'
    tree = ET.parse(path)
    root = tree.getroot()
    entries = []
    for node in root.findall('.//{*}MSG'):
        entry = dict(node.attrib)
        if 'id' in entry:
            entry['id'] = to_int(entry['id'])
        entry['text'] = (node.text or '').strip()
        entries.append(entry)
    out = {
        'source': 'messages.xml',
        'count': len(entries),
        'messages': entries,
    }
    (OUT / 'messages.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def convert_tips():
    path = SRC / 'tips.xml'
    tree = ET.parse(path)
    root = tree.getroot()
    tips = []
    for t in root.findall('.//{*}TIPS'):
        entry = dict(t.attrib)
        if 'category' in entry:
            entry['category'] = to_int(entry['category'])
        msgs = []
        for m in t.findall('.//{*}MSG'):
            mentry = dict(m.attrib)
            if 'id' in mentry:
                mentry['id'] = to_int(mentry['id'])
            mentry['text'] = (m.text or '').strip()
            msgs.append(mentry)
        entry['messages'] = msgs
        tips.append(entry)
    out = {
        'source': 'tips.xml',
        'count': len(tips),
        'tips': tips,
    }
    (OUT / 'tips.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def convert_shutdown():
    path = SRC / 'shutdown.xml'
    tree = ET.parse(path)
    root = tree.getroot()
    entries = []
    for node in root.findall('.//{*}SHUTDOWNNOTIFY'):
        entry = dict(node.attrib)
        if 'delay' in entry:
            entry['delay'] = to_int(entry['delay'])
        entry['message'] = (node.text or '').strip()
        entries.append(entry)
    out = {
        'source': 'shutdown.xml',
        'count': len(entries),
        'notifies': entries,
    }
    (OUT / 'shutdown.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def convert_notify():
    path = SRC_FULL / 'notify.xml'
    if not path.exists():
        return
    tree = ET.parse(path)
    root = tree.getroot()
    entries = []
    for node in root.findall('.//{*}NOTIFY'):
        entry = dict(node.attrib)
        if 'id' in entry:
            entry['id'] = to_int(entry['id'])
        entry['text'] = (node.text or '').strip()
        entries.append(entry)
    out = {
        'source': str(path),
        'count': len(entries),
        'notifies': entries,
    }
    (OUT / 'notify.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def convert_chatcmds():
    path = SRC_FULL / 'chatcmds.xml'
    if not path.exists():
        return
    tree = ET.parse(path)
    root = tree.getroot()
    cmds = []
    for cmd in root.findall('.//{*}CMD'):
        entry = dict(cmd.attrib)
        if 'id' in entry:
            entry['id'] = to_int(entry['id'])
        aliases = []
        for a in cmd.findall('.//{*}ALIAS'):
            aliases.append(dict(a.attrib))
        entry['aliases'] = aliases
        cmds.append(entry)
    out = {
        'source': str(path),
        'count': len(cmds),
        'commands': cmds,
    }
    (OUT / 'chatcmds.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    convert_strings()
    convert_messages()
    convert_tips()
    convert_shutdown()
    convert_notify()
    convert_chatcmds()


if __name__ == '__main__':
    main()
