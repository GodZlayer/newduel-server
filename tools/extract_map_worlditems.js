const fs = require("fs");
const path = require("path");

const mapsRoot = path.join(__dirname, "..", "data", "maps", "client");
const outPath = path.join(__dirname, "..", "src", "data", "map_worlditems.json");

const readFileSafe = (p) => {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
};

const parseSpawnXml = (xml) => {
  const result = { solo: [], team: [] };
  if (!xml) return result;

  const gametypeRe = /<GAMETYPE[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/GAMETYPE>/gi;
  const spawnRe = /<SPAWN[^>]*item="([^"]+)"[^>]*timesec="([^"]+)"[^>]*>[\s\S]*?<POSITION>([^<]+)<\/POSITION>/gi;

  let gm;
  while ((gm = gametypeRe.exec(xml)) !== null) {
    const id = (gm[1] || "").toLowerCase();
    const body = gm[2] || "";
    let sp;
    while ((sp = spawnRe.exec(body)) !== null) {
      const item = sp[1];
      const timeSec = Number(sp[2]);
      const posParts = (sp[3] || "").trim().split(/\s+/).map(Number);
      const pos = { x: posParts[0] || 0, y: posParts[1] || 0, z: posParts[2] || 0 };
      const entry = { item, timeSec: Number.isFinite(timeSec) ? timeSec : 0, pos };
      if (id === "team") result.team.push(entry);
      else result.solo.push(entry);
    }
  }

  return result;
};

const maps = fs.readdirSync(mapsRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
const output = {};

for (const dir of maps) {
  const name = dir.name;
  const spawnPath = path.join(mapsRoot, name, "spawn.xml");
  const xml = readFileSafe(spawnPath);
  if (!xml) continue;
  output[name] = parseSpawnXml(xml);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${outPath}`);
