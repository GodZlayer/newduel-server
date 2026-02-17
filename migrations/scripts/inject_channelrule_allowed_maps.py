import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
channelrule_path = ROOT / "data" / "game" / "channelrule.json"
main_js_path = ROOT / "data" / "modules" / "main.js"

channelrule = json.loads(channelrule_path.read_text(encoding="utf-8"))
channelrule_json = json.dumps(channelrule, ensure_ascii=False, indent=2)

text = main_js_path.read_text(encoding="utf-8")

block = "// CHANNEL_RULES_START\nvar CHANNEL_RULES = " + channelrule_json + ";\n// CHANNEL_RULES_END\n"

if "// CHANNEL_RULES_START" in text and "// CHANNEL_RULES_END" in text:
    text = re.sub(r"// CHANNEL_RULES_START[\s\S]*?// CHANNEL_RULES_END\n", block, text)
else:
    insert_after = "// MAPS_MANIFEST_END\n"
    if insert_after in text:
        text = text.replace(insert_after, insert_after + block + "\n")
    else:
        raise SystemExit("MAPS_MANIFEST_END marker not found")

helpers = (
    "function normalizeMapName(name) {\n"
    "    if (!name) return '';\n"
    "    return name.toLowerCase().replace(/_/g, ' ').replace(/\\s+/g, ' ').trim();\n"
    "}\n"
    "function getAllowedMapsByRuleId(ruleId) {\n"
    "    var rules = (CHANNEL_RULES && CHANNEL_RULES.rules) ? CHANNEL_RULES.rules : [];\n"
    "    var rule = rules.find(function (r) { return Number(r.id) === Number(ruleId); }) || null;\n"
    "    return buildAllowedMaps(rule);\n"
    "}\n"
    "function getAllowedMapsByRuleName(ruleName) {\n"
    "    var rules = (CHANNEL_RULES && CHANNEL_RULES.rules) ? CHANNEL_RULES.rules : [];\n"
    "    var rule = rules.find(function (r) { return String(r.name).toLowerCase() === String(ruleName).toLowerCase(); }) || null;\n"
    "    return buildAllowedMaps(rule);\n"
    "}\n"
    "function buildAllowedMaps(rule) {\n"
    "    var serverMaps = (MAPS_MANIFEST && MAPS_MANIFEST.server_maps) ? MAPS_MANIFEST.server_maps : {};\n"
    "    var normalized = {};\n"
    "    Object.keys(serverMaps).forEach(function (k) { normalized[normalizeMapName(k)] = k; });\n"
    "    var allowed = [];\n"
    "    var missing = [];\n"
    "    if (!rule || !rule.maps) {\n"
    "        return { rule: rule, allowed: allowed, missing: missing };\n"
    "    }\n"
    "    rule.maps.forEach(function (m) {\n"
    "        var name = m.name || '';\n"
    "        var key = normalized[normalizeMapName(name)];\n"
    "        if (key) allowed.push(key);\n"
    "        else missing.push(name);\n"
    "    });\n"
    "    return { rule: rule, allowed: allowed, missing: missing };\n"
    "}\n\n"
)

if "function normalizeMapName(" not in text:
    m = re.search(r"function getMapsManifest\(\)\s*\{[\s\S]*?\}\n\n", text)
    if not m:
        raise SystemExit("getMapsManifest block not found")
    text = text[: m.end()] + helpers + text[m.end() :]

rpc = (
    "var rpcGetAllowedMaps = function (ctx, logger, nk, payload) {\n"
    "    var input = payload ? JSON.parse(payload) : {};\n"
    "    var ruleId = input.ruleId;\n"
    "    var ruleName = input.ruleName;\n"
    "    var result = null;\n"
    "    if (ruleId !== undefined && ruleId !== null) {\n"
    "        result = getAllowedMapsByRuleId(ruleId);\n"
    "    } else if (ruleName) {\n"
    "        result = getAllowedMapsByRuleName(ruleName);\n"
    "    } else {\n"
    "        result = { rule: null, allowed: [], missing: [] };\n"
    "    }\n"
    "    return JSON.stringify(result);\n"
    "};\n\n"
)

if "var rpcGetAllowedMaps" not in text:
    m = re.search(r"var rpcGetMapsManifest\b", text)
    if not m:
        raise SystemExit("rpcGetMapsManifest anchor not found")
    text = text[: m.start()] + rpc + text[m.start() :]

if "exports.rpcGetAllowedMaps" not in text:
    text = text.replace(
        "exports.rpcGetMapsManifest = rpcGetMapsManifest;\n",
        "exports.rpcGetMapsManifest = rpcGetMapsManifest;\n    exports.rpcGetAllowedMaps = rpcGetAllowedMaps;\n",
    )

if "var rpcGetAllowedMaps = MainBundle.rpcGetAllowedMaps;" not in text:
    text = text.replace(
        "var rpcGetMapsManifest = MainBundle.rpcGetMapsManifest;\n",
        "var rpcGetMapsManifest = MainBundle.rpcGetMapsManifest;\nvar rpcGetAllowedMaps = MainBundle.rpcGetAllowedMaps;\n",
    )

if "registerRpc('get_allowed_maps'" not in text:
    text = text.replace(
        "initializer.registerRpc('get_maps_manifest', rpcGetMapsManifest);\n",
        "initializer.registerRpc('get_maps_manifest', rpcGetMapsManifest);\n    initializer.registerRpc('get_allowed_maps', rpcGetAllowedMaps);\n",
    )

main_js_path.write_text(text, encoding="utf-8")
