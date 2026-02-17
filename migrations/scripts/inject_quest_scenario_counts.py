import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
questmap_path = ROOT / "data" / "game" / "questmap.json"
scenario_path = ROOT / "data" / "game" / "scenario.json"
main_js_path = ROOT / "data" / "modules" / "main.js"

questmap = json.loads(questmap_path.read_text(encoding="utf-8"))
scenario = json.loads(scenario_path.read_text(encoding="utf-8"))

questmap_json = json.dumps(questmap, ensure_ascii=False, indent=2)
scenario_json = json.dumps(scenario, ensure_ascii=False, indent=2)

text = main_js_path.read_text(encoding="utf-8")

qm_block = "// QUESTMAP_DATA_START\nvar QUESTMAP_DATA = " + questmap_json + ";\n// QUESTMAP_DATA_END\n"
sc_block = "// SCENARIO_DATA_START\nvar SCENARIO_DATA = " + scenario_json + ";\n// SCENARIO_DATA_END\n"

if "// QUESTMAP_DATA_START" in text and "// QUESTMAP_DATA_END" in text:
    text = re.sub(r"// QUESTMAP_DATA_START[\s\S]*?// QUESTMAP_DATA_END\n", qm_block, text)
else:
    marker = "// CHANNEL_RULES_END\n"
    if marker in text:
        text = text.replace(marker, marker + qm_block + "\n")
    else:
        raise SystemExit("CHANNEL_RULES_END marker not found")

if "// SCENARIO_DATA_START" in text and "// SCENARIO_DATA_END" in text:
    text = re.sub(r"// SCENARIO_DATA_START[\s\S]*?// SCENARIO_DATA_END\n", sc_block, text)
else:
    marker = "// QUESTMAP_DATA_END\n"
    if marker in text:
        text = text.replace(marker, marker + sc_block + "\n")
    else:
        raise SystemExit("QUESTMAP_DATA_END marker not found")

text = re.sub(
    r"var itemsCount = 0;\s*var mapsCount = 0;\s*var questsCount = 0;",
    "var itemsCount = 0;\n    var mapsCount = 0;\n    var questsCount = 0;\n    var scenariosCount = 0;\n    var bossQuestsCount = 0;",
    text,
)

load_block = (
    "function loadGameData(nk) {\n"
    "    itemsCount = Object.keys(ZITEM_SERVER_DATA).length;\n"
    "    mapsCount = (MAPS_MANIFEST && MAPS_MANIFEST.summary && MAPS_MANIFEST.summary.server_count) || 0;\n"
    "    questsCount = (QUESTMAP_DATA && QUESTMAP_DATA.mapsets ? QUESTMAP_DATA.mapsets.length : (QUESTMAP_DATA && QUESTMAP_DATA.count ? QUESTMAP_DATA.count : 0));\n"
    "    scenariosCount = (SCENARIO_DATA && SCENARIO_DATA.count_total ? SCENARIO_DATA.count_total : ((SCENARIO_DATA && SCENARIO_DATA.scenarios ? SCENARIO_DATA.scenarios.length : 0) + (SCENARIO_DATA && SCENARIO_DATA.special_scenarios ? SCENARIO_DATA.special_scenarios.length : 0)));\n"
    "    bossQuestsCount = 0;\n"
    "    function countBossIn(list) {\n"
    "        if (!list) return;\n"
    "        list.forEach(function (sc) {\n"
    "            if (!sc.maps) return;\n"
    "            sc.maps.forEach(function (m) {\n"
    "                if (m.boss === true || m.boss === 'true') bossQuestsCount++;\n"
    "            });\n"
    "        });\n"
    "    }\n"
    "    if (SCENARIO_DATA) {\n"
    "        countBossIn(SCENARIO_DATA.scenarios);\n"
    "        countBossIn(SCENARIO_DATA.special_scenarios);\n"
    "    }\n"
    "}\n"
)

text = re.sub(r"function loadGameData\(nk\)\s*\{[\s\S]*?\}\n", load_block, text, count=1)

text = re.sub(
    r"return\s*\{\s*items:\s*itemsCount,\s*maps:\s*mapsCount,\s*quests:\s*questsCount\s*\};",
    "return {\n            items: itemsCount,\n            maps: mapsCount,\n            quests: questsCount,\n            scenarios: scenariosCount,\n            bossQuests: bossQuestsCount\n        };",
    text,
)

text = text.replace(
    "logger.info(\">> DATA LOADED: Items: %d, Maps: %d, Quests: %d\", counts.items, counts.maps, counts.quests);",
    "logger.info(\">> DATA LOADED: Items: %d, Maps: %d, Quests: %d, Scenarios: %d, BossQuests: %d\", counts.items, counts.maps, counts.quests, counts.scenarios, counts.bossQuests);",
)

main_js_path.write_text(text, encoding="utf-8")
