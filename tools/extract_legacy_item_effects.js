const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const zitemPath = path.join(root, "ogz-source-master", "src", "Gunz", "XML", "zitem.xml");
const zeffectPath = path.join(root, "ogz-source-master", "src", "Gunz", "XML", "zeffect.xml");
const outPath = path.join(root, "nakama-server", "src", "data", "legacy_item_effects.json");
const outEffectsPath = path.join(root, "nakama-server", "src", "data", "legacy_effects.json");

const readText = (p) => fs.readFileSync(p, "utf8");

const parseAttributes = (chunk) => {
  const attrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(chunk))) {
    attrs[m[1]] = m[2];
  }
  return attrs;
};

const parseZitem = (text) => {
  const items = {};
  const parts = text.split("<ITEM");
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const end = block.indexOf("/>");
    if (end === -1) continue;
    const tag = block.slice(0, end);
    const attrs = parseAttributes(tag);
    if (!attrs.id) continue;
    items[String(attrs.id)] = {
      id: Number(attrs.id),
      name: attrs.name || "",
      weapon: attrs.weapon || "",
      mesh_name: attrs.mesh_name || "",
      effect_id: attrs.effect_id ? Number(attrs.effect_id) : 0,
      effect_level: attrs.effect_level ? Number(attrs.effect_level) : 0,
      damage: attrs.damage ? Number(attrs.damage) : 0,
      delay: attrs.delay ? Number(attrs.delay) : 0,
      limitspeed: attrs.limitspeed ? Number(attrs.limitspeed) : 0,
    };
  }
  return items;
};

const parseZeffect = (text) => {
  const effects = {};
  const re = /<EFFECT\s+([^>]+?)\/>/g;
  let m;
  while ((m = re.exec(text))) {
    const attrs = parseAttributes(m[1]);
    if (!attrs.id) continue;
    effects[String(attrs.id)] = {
      id: Number(attrs.id),
      name: attrs.name || "",
      knockback: attrs.knockback ? Number(attrs.knockback) : 0,
    };
  }
  return effects;
};

const zitem = readText(zitemPath);
const zeffect = readText(zeffectPath);

const items = parseZitem(zitem);
const effects = parseZeffect(zeffect);

fs.writeFileSync(outPath, JSON.stringify(items, null, 2));
fs.writeFileSync(outEffectsPath, JSON.stringify(effects, null, 2));

console.log(`Wrote ${Object.keys(items).length} items to ${outPath}`);
console.log(`Wrote ${Object.keys(effects).length} effects to ${outEffectsPath}`);
