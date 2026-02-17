import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "game" / "client_system"
main_js_path = ROOT / "data" / "modules" / "main.js"

def load_client_system():
    data = {}
    for path in sorted(DATA_DIR.glob("*.json")):
        key = path.stem
        data[key] = json.loads(path.read_text(encoding="utf-8"))
    return data


def main():
    data = load_client_system()
    payload = json.dumps(data, ensure_ascii=False, indent=2)

    text = main_js_path.read_text(encoding="utf-8")

    block = "// CLIENT_SYSTEM_START\nvar CLIENT_SYSTEM_DATA = " + payload + ";\n// CLIENT_SYSTEM_END\n"

    if "// CLIENT_SYSTEM_START" in text and "// CLIENT_SYSTEM_END" in text:
        text = re.sub(r"// CLIENT_SYSTEM_START[\s\S]*?// CLIENT_SYSTEM_END\n", block, text)
    else:
        marker = "// SCENARIO_DATA_END\n"
        if marker in text:
            text = text.replace(marker, marker + block + "\n")
        else:
            raise SystemExit("SCENARIO_DATA_END marker not found")

    # helper
    if "function getClientSystem(" not in text:
        m = re.search(r"function getMapsManifest\(\)\s*\{[\s\S]*?\}\n\n", text)
        if not m:
            raise SystemExit("getMapsManifest block not found")
        insert = (
            "function getClientSystem(key) {\n"
            "    if (!key) return CLIENT_SYSTEM_DATA || null;\n"
            "    return (CLIENT_SYSTEM_DATA && CLIENT_SYSTEM_DATA[key]) || null;\n"
            "}\n\n"
        )
        text = text[: m.end()] + insert + text[m.end() :]

    # rpc
    if "var rpcGetClientSystem" not in text:
        m = re.search(r"var rpcGetMapsManifest\b", text)
        if not m:
            raise SystemExit("rpcGetMapsManifest anchor not found")
        insert = (
            "var rpcGetClientSystem = function (ctx, logger, nk, payload) {\n"
            "    var input = payload ? JSON.parse(payload) : {};\n"
            "    var key = input.key;\n"
            "    return JSON.stringify({ data: getClientSystem(key) });\n"
            "};\n\n"
        )
        text = text[: m.start()] + insert + text[m.start() :]

    if "exports.rpcGetClientSystem" not in text:
        text = text.replace(
            "exports.rpcGetMapsManifest = rpcGetMapsManifest;\n",
            "exports.rpcGetMapsManifest = rpcGetMapsManifest;\n    exports.rpcGetClientSystem = rpcGetClientSystem;\n",
        )

    if "var rpcGetClientSystem = MainBundle.rpcGetClientSystem;" not in text:
        text = text.replace(
            "var rpcGetMapsManifest = MainBundle.rpcGetMapsManifest;\n",
            "var rpcGetMapsManifest = MainBundle.rpcGetMapsManifest;\nvar rpcGetClientSystem = MainBundle.rpcGetClientSystem;\n",
        )

    if "registerRpc('get_client_system'" not in text:
        text = text.replace(
            "initializer.registerRpc('get_maps_manifest', rpcGetMapsManifest);\n",
            "initializer.registerRpc('get_maps_manifest', rpcGetMapsManifest);\n    initializer.registerRpc('get_client_system', rpcGetClientSystem);\n",
        )

    main_js_path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
