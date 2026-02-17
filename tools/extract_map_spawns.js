const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const mapsPath = path.join(ROOT, 'src', 'data', 'maps.json');
const maps = JSON.parse(fs.readFileSync(mapsPath, 'utf8'));

const out = {};
let updated = false;

const readSpawnFile = (filePath) => {
  const xml = fs.readFileSync(filePath, 'utf8');
  const result = { solo: [], team1: [], team2: [], fallback: null };
  const dummyRe = /<DUMMY\s+name="([^"]+)">([\s\S]*?)<\/DUMMY>/gi;
  let m;
  while ((m = dummyRe.exec(xml)) !== null) {
    const name = m[1];
    const block = m[2];
    const posMatch = block.match(/<POSITION>([^<]+)<\/POSITION>/i);
    if (!posMatch) continue;
    const parts = posMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length < 3 || parts.some(n => Number.isNaN(n))) continue;
    const pos = { x: parts[0], y: parts[1], z: parts[2] };
    if (name === 'wait_pos_01' && !result.fallback) {
      result.fallback = pos;
      continue;
    }
    if (!name.startsWith('spawn_')) continue;
    if (name.startsWith('spawn_team1_')) result.team1.push(pos);
    else if (name.startsWith('spawn_team2_')) result.team2.push(pos);
    else if (name.startsWith('spawn_solo_')) result.solo.push(pos);
  }
  if (result.solo.length === 0 && result.team1.length === 0 && result.team2.length === 0 && result.fallback) {
    result.solo.push(result.fallback);
  }
  if (result.fallback) delete result.fallback;
  return result;
};

for (const key of Object.keys(maps)) {
  const map = maps[key];
  const name = map.name;
  const filePath = path.join(ROOT, 'data', 'maps', 'client', name, `${name}.RS.xml`);
  if (!fs.existsSync(filePath)) {
    out[name] = { solo: [], team1: [], team2: [] };
    if (map.available !== false) {
      maps[key].available = false;
      updated = true;
    }
    continue;
  }
  const spawns = readSpawnFile(filePath);
  out[name] = spawns;
  const soloCount = spawns.solo?.length || 0;
  const team1Count = spawns.team1?.length || 0;
  const team2Count = spawns.team2?.length || 0;
  const hasSpawns = (soloCount + team1Count + team2Count) > 0;
  const desiredAvailable = !!hasSpawns;
  if (map.available !== desiredAvailable) {
    maps[key].available = desiredAvailable;
    updated = true;
  }
}

const outPath = path.join(ROOT, 'src', 'data', 'map_spawns.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
if (updated) {
  fs.writeFileSync(mapsPath, JSON.stringify(maps, null, 2), 'utf8');
}
console.log(`wrote ${outPath}`);
