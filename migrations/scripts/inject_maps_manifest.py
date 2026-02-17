import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
manifest_path = ROOT / "data" / "game" / "maps_manifest.json"
main_js_path = ROOT / "data" / "modules" / "main.js"

manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
manifest_json = json.dumps(manifest, ensure_ascii=False, indent=2)

text = main_js_path.read_text(encoding="utf-8")

block = "// MAPS_MANIFEST_START\nvar MAPS_MANIFEST = " + manifest_json + ";\n// MAPS_MANIFEST_END\n"

if "// MAPS_MANIFEST_START" in text and "// MAPS_MANIFEST_END" in text:
    text = re.sub(r"// MAPS_MANIFEST_START[\s\S]*?// MAPS_MANIFEST_END\n", block, text)
else:
    marker = "var ZITEM_SERVER_DATA = data;\n"
    if marker in text:
        text = text.replace(marker, marker + "\n" + block + "\n")
    else:
        raise SystemExit("ZITEM marker not found")

text = text.replace(
    "mapsCount = 1;",
    "mapsCount = (MAPS_MANIFEST && MAPS_MANIFEST.summary && MAPS_MANIFEST.summary.server_count) || 0;",
)

if "function getMapsManifest()" not in text:
    m = re.search(r"function getItemData\(id\)\s*\{[\s\S]*?\}\n", text)
    if not m:
        raise SystemExit("getItemData block not found")
    insert = "function getMapsManifest() {\n    return MAPS_MANIFEST || null;\n}\n\n"
    text = text[: m.end()] + insert + text[m.end() :]

if "var rpcGetMapsManifest" not in text:
    m = re.search(r"var rpcListCharacters\b", text)
    if not m:
        raise SystemExit("rpcListCharacters anchor not found")
    insert = (
        "var rpcGetMapsManifest = function (ctx, logger, nk, payload) {\n"
        "    return JSON.stringify({ manifest: getMapsManifest() });\n"
        "};\n\n"
    )
    text = text[: m.start()] + insert + text[m.start() :]

if "exports.rpcGetMapsManifest" not in text:
    text = text.replace(
        "exports.rpcGetAdminStats = rpcGetAdminStats;\n",
        "exports.rpcGetAdminStats = rpcGetAdminStats;\n    exports.rpcGetMapsManifest = rpcGetMapsManifest;\n",
    )

if "var rpcGetMapsManifest = MainBundle.rpcGetMapsManifest;" not in text:
    text = text.replace(
        "var rpcGetAdminStats = MainBundle.rpcGetAdminStats;\n",
        "var rpcGetAdminStats = MainBundle.rpcGetAdminStats;\nvar rpcGetMapsManifest = MainBundle.rpcGetMapsManifest;\n",
    )

if "registerRpc('get_maps_manifest'" not in text:
    text = text.replace(
        "initializer.registerRpc('get_admin_stats', rpcGetAdminStats);\n",
        "initializer.registerRpc('get_admin_stats', rpcGetAdminStats);\n    initializer.registerRpc('get_maps_manifest', rpcGetMapsManifest);\n",
    )

main_js_path.write_text(text, encoding="utf-8")
