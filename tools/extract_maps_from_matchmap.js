const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const matchMapPath = path.join(ROOT, '..', 'ogz-source-master', 'src', 'CSCommon', 'Include', 'MMatchMap.h');
const manifestPath = path.join(ROOT, 'data', 'game', 'maps_manifest.json');
const gameTypeCfgPath = path.join(ROOT, '..', 'ogz-client-master', 'system', 'gametypecfg.xml');

const matchText = fs.readFileSync(matchMapPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const gameTypeCfg = fs.readFileSync(gameTypeCfgPath, 'utf8');

const entryRe = /\{\s*MMATCH_MAP_[^,]+,\s*"([^"]+)",\s*"([^"]*)",\s*"([^"]*)",\s*([0-9.]+)f?,\s*(\d+),\s*(true|false)\s*\}/g;

const legacy = [];
let m;
while ((m = entryRe.exec(matchText)) !== null) {
  legacy.push({
    name: m[1],
    image: m[2],
    banner: m[3],
    exp_ratio: Number(m[4]),
    max_players: Number(m[5]),
    only_duel: m[6] === 'true'
  });
}

if (legacy.length === 0) {
  throw new Error('No legacy map entries parsed');
}

const gameTypeDefaults = new Map();
const gameTypeRe = /<GAMETYPE\s+id="(\d+)">([\s\S]*?)<\/GAMETYPE>/gi;
let gt;
while ((gt = gameTypeRe.exec(gameTypeCfg)) !== null) {
  const id = Number(gt[1]);
  const block = gt[2];
  const maxRe = /<MAXPLAYERS[^>]*?>/gi;
  let first = null;
  let chosen = null;
  let mp;
  while ((mp = maxRe.exec(block)) !== null) {
    const tag = mp[0];
    const playerMatch = tag.match(/player="(\d+)"/i);
    if (!playerMatch) continue;
    const val = Number(playerMatch[1]);
    if (first === null) first = val;
    if (/default="true"/i.test(tag)) chosen = val;
  }
  if (chosen === null) chosen = first;
  if (chosen !== null) gameTypeDefaults.set(id, chosen);
}

const MODE_TO_GAMETYPE = {
  DM: 0,
  TDM: 1,
  GL: 2,
  TGL: 3,
  TRAIN: 5
};

const legacyByName = new Map();
const legacyLower = new Map();
legacy.forEach((e, idx) => {
  legacyByName.set(e.name, { id: idx, ...e });
  legacyLower.set(e.name.toLowerCase(), e.name);
});

const manifestNames = new Map();
const manifestLower = new Set();
const addName = (name) => {
  const lower = name.toLowerCase();
  manifestLower.add(lower);
  if (legacyLower.has(lower)) return;
  if (!manifestNames.has(lower)) manifestNames.set(lower, name);
};

const clientMaps = manifest.client_maps || {};
const serverMaps = manifest.server_maps || {};
Object.keys(clientMaps).forEach(addName);
Object.keys(serverMaps).forEach(addName);

const allNames = Array.from(manifestNames.values()).sort((a, b) => a.localeCompare(b));

const maps = {};

// Keep legacy IDs
legacy.forEach((e, idx) => {
  const available = manifestLower.has(e.name.toLowerCase());
  const modes = e.only_duel ? ['DUEL'] : ['DM', 'TDM'];
  maps[String(idx)] = { id: idx, ...e, modes, available, source: 'legacy' };
});

let nextId = legacy.length;
allNames.forEach((name) => {
  const modes = ['DM', 'TDM', 'GL', 'TGL', 'TRAIN'];
  const defaults = modes
    .map(m => MODE_TO_GAMETYPE[m])
    .map(id => gameTypeDefaults.get(id))
    .filter(v => typeof v === 'number');
  const maxPlayers = defaults.length ? Math.max(...defaults) : 8;
  maps[String(nextId)] = {
    id: nextId,
    name,
    image: '',
    banner: '',
    exp_ratio: 1,
    max_players: maxPlayers,
    only_duel: false,
    modes,
    available: true,
    source: 'custom'
  };
  nextId += 1;
});

const outPath = path.join(ROOT, 'src', 'data', 'maps.json');
fs.writeFileSync(outPath, JSON.stringify(maps, null, 2), 'utf8');
console.log(`wrote ${outPath} (${Object.keys(maps).length} maps, legacy=${legacy.length}, custom=${Object.keys(maps).length - legacy.length})`);
