import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "game"
main_js_path = ROOT / "data" / "modules" / "main.js"

KEYS = {
    "channel": "channel.json",
    "channelrule": "channelrule.json",
    "zitem": "zitem.json",
    "shop": "shop.json",
    "formula": "formula.json",
    "droptable": "droptable.json",
    "worlditem": "worlditem.json",
    "npc": "npc.json",
    "npcset": "npcset.json",
    "scenario": "scenario.json",
    "questmap": "questmap.json",
    "spawns": "spawns.json",
    "sacrifice_table": "sacrifice_table.json",
    "strings": "strings.json",
    "strings_locales": "strings_locales.json",
    "messages": "messages.json",
    "tips": "tips.json",
    "notify": "notify.json",
    "protocol": "protocol.json",
    "cserror": "cserror.json",
    "event": "event.json",
    "event_list": "event_list.json",
    "gungame": "gungame.json",
}


def load_data():
    out = {}
    for key, fname in KEYS.items():
        path = DATA / fname
        if path.exists():
            out[key] = json.loads(path.read_text(encoding="utf-8"))
    return out


def main():
    data = load_data()
    payload = json.dumps(data, ensure_ascii=False, indent=2)

    text = main_js_path.read_text(encoding="utf-8")

    block = "// GAME_DATA_START\nvar GAME_DATA = " + payload + ";\n// GAME_DATA_END\n"
    if "// GAME_DATA_START" in text and "// GAME_DATA_END" in text:
        text = re.sub(r"// GAME_DATA_START[\s\S]*?// GAME_DATA_END\n", block, text)
    else:
        marker = "// CLIENT_SYSTEM_END\n"
        if marker in text:
            text = text.replace(marker, marker + block + "\n")
        else:
            raise SystemExit("CLIENT_SYSTEM_END marker not found")

    if "function getGameData(" not in text:
        m = re.search(r"function getClientSystem\([\s\S]*?\}\n\n", text)
        if not m:
            raise SystemExit("getClientSystem block not found")
        insert = (
            "function getGameData(key) {\n"
            "    if (!key) return GAME_DATA || null;\n"
            "    return (GAME_DATA && GAME_DATA[key]) || null;\n"
            "}\n\n"
        )
        text = text[: m.end()] + insert + text[m.end() :]

    rpc_defs = [
        ("get_items", "zitem"),
        ("get_shop", "shop"),
        ("get_formula", "formula"),
        ("get_droptable", "droptable"),
        ("get_worlditem", "worlditem"),
        ("get_npc", "npc"),
        ("get_npcset", "npcset"),
        ("get_scenario", "scenario"),
        ("get_questmap", "questmap"),
        ("get_spawns", "spawns"),
        ("get_sacrifice_table", "sacrifice_table"),
        ("get_strings", "strings"),
        ("get_strings_locales", "strings_locales"),
        ("get_messages", "messages"),
        ("get_tips", "tips"),
        ("get_notify", "notify"),
        ("get_protocol", "protocol"),
        ("get_cserror", "cserror"),
        ("get_event", "event"),
        ("get_event_list", "event_list"),
        ("get_gungame", "gungame"),
        ("get_game_data", None),
    ]

    if "var rpcGetGameData" not in text:
        m = re.search(r"var rpcGetClientSystem\b", text)
        if not m:
            raise SystemExit("rpcGetClientSystem anchor not found")
        insert = (
            "var rpcGetGameData = function (ctx, logger, nk, payload) {\n"
            "    var input = payload ? JSON.parse(payload) : {};\n"
            "    var key = input.key;\n"
            "    return JSON.stringify({ data: getGameData(key) });\n"
            "};\n\n"
        )
        text = text[: m.start()] + insert + text[m.start() :]

    for rpc_name, key in rpc_defs:
        var_name = "rpc" + "".join([p.capitalize() for p in rpc_name.split("_")])
        if key is None:
            body = "    return JSON.stringify({ data: getGameData(null) });\n"
        else:
            body = f"    return JSON.stringify({{ data: getGameData('{key}') }});\n"
        if f"var {var_name} = function" not in text:
            insert = f"var {var_name} = function (ctx, logger, nk, payload) {{\n{body}}};\n\n"
            # insert before rpcGetClientSystem
            m = re.search(r"var rpcGetClientSystem\b", text)
            if not m:
                raise SystemExit("rpcGetClientSystem anchor not found")
            text = text[: m.start()] + insert + text[m.start() :]

    # exports
    if "exports.rpcGetGameData" not in text:
        text = text.replace(
            "exports.rpcGetClientSystem = rpcGetClientSystem;\n",
            "exports.rpcGetClientSystem = rpcGetClientSystem;\n    exports.rpcGetGameData = rpcGetGameData;\n",
        )
    for rpc_name, _ in rpc_defs:
        exp = "exports.rpc" + "".join([p.capitalize() for p in rpc_name.split("_")])
        if exp not in text:
            text = text.replace(
                "exports.rpcGetGameData = rpcGetGameData;\n",
                f"exports.rpcGetGameData = rpcGetGameData;\n    {exp} = {exp.split('.')[-1].replace('exports.','')};\n",
            )

    # bridge vars
    if "var rpcGetGameData = MainBundle.rpcGetGameData;" not in text:
        text = text.replace(
            "var rpcGetClientSystem = MainBundle.rpcGetClientSystem;\n",
            "var rpcGetClientSystem = MainBundle.rpcGetClientSystem;\nvar rpcGetGameData = MainBundle.rpcGetGameData;\n",
        )
    for rpc_name, _ in rpc_defs:
        bridge = "var rpc" + "".join([p.capitalize() for p in rpc_name.split("_")]) + " = MainBundle." + "rpc" + "".join([p.capitalize() for p in rpc_name.split("_")]) + ";\n"
        if bridge not in text:
            text = text.replace(
                "var rpcGetGameData = MainBundle.rpcGetGameData;\n",
                "var rpcGetGameData = MainBundle.rpcGetGameData;\n" + bridge,
            )

    # register RPCs
    if "registerRpc('get_game_data'" not in text:
        text = text.replace(
            "initializer.registerRpc('get_client_system', rpcGetClientSystem);\n",
            "initializer.registerRpc('get_client_system', rpcGetClientSystem);\n    initializer.registerRpc('get_game_data', rpcGetGameData);\n",
        )
    for rpc_name, _ in rpc_defs:
        if f"registerRpc('{rpc_name}'" not in text:
            text = text.replace(
                "initializer.registerRpc('get_game_data', rpcGetGameData);\n",
                f"initializer.registerRpc('get_game_data', rpcGetGameData);\n    initializer.registerRpc('{rpc_name}', rpc{''.join([p.capitalize() for p in rpc_name.split('_')])});\n",
            )

    main_js_path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
