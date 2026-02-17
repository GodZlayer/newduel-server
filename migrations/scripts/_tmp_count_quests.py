import json
from pathlib import Path
root = Path(r'.\\nakama-server\\data\\game')
questmap = json.loads((root/'questmap.json').read_text(encoding='utf-8'))
scenario = json.loads((root/'scenario.json').read_text(encoding='utf-8'))
report_qm = json.loads((root/'report_questmap.json').read_text(encoding='utf-8'))
print('questmap mapsets', len(questmap.get('mapsets', [])))
print('scenario count', len(scenario.get('scenarios', [])))
print('report_questmap mapsets', len(report_qm.get('mapsets', [])))
