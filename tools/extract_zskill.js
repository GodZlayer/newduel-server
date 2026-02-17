const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "..", "..", "ogz-client-master", "system", "zskill.xml");
const outPath = path.join(__dirname, "..", "src", "data", "skills.json");

const xml = fs.readFileSync(srcPath, "utf8");

const parseAttrs = (raw) => {
  const attrs = {};
  const re = /([\w.]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
};

const skillRe = /<ns0:SKILL\s+([^>]+)>([\s\S]*?)<\/ns0:SKILL>|<ns0:SKILL\s+([^>]+?)\s*\/>/gi;
const repeatRe = /<ns0:REPEAT\s+([^>]+?)\s*\/>/gi;

const skills = {};
let sm;
while ((sm = skillRe.exec(xml)) !== null) {
  const rawAttrs = sm[1] || sm[3] || "";
  const body = sm[2] || "";
  const attrs = parseAttrs(rawAttrs);
  const id = Number(attrs.id || 0);
  if (!Number.isFinite(id) || id <= 0) continue;

  const skill = {
    id,
    name: attrs.name,
    resisttype: Number(attrs.resisttype || 0),
    hitcheck: attrs.hitcheck === "true",
    guidable: attrs.guidable === "true",
    velocity: Number(attrs.velocity || 0),
    delay: Number(attrs.delay || 0),
    lifetime: Number(attrs.lifetime || 0),
    colradius: Number(attrs.colradius || 0),
    difficulty: Number(attrs.difficulty || 0),
    knockback: Number(attrs.knockback || 0),
    throughnpc: attrs.throughnpc === "true",
    effecttype: Number(attrs.effecttype || 0),
    effectstarttime: Number(attrs.effectstarttime || 0),
    effecttime: Number(attrs.effecttime || 0),
    effectarea: Number(attrs.effectarea || 0),
    effectareamin: Number(attrs.effectareamin || 0),
    effectangle: Number(attrs.effectangle || 0),
    effect_startpos_type: Number(attrs.effect_startpos_type || 0),
    mod: {
      damage: Number(attrs["mod.damage"] || 0),
      criticalrate: Number(attrs["mod.criticalrate"] || 0),
      speed: Number(attrs["mod.speed"] || 100),
      antimotion: attrs["mod.antimotion"] === "true",
      root: attrs["mod.root"] === "true",
      heal: Number(attrs["mod.heal"] || 0),
      dot: Number(attrs["mod.dot"] || 0)
    },
    repeats: []
  };

  let rm;
  while ((rm = repeatRe.exec(body)) !== null) {
    const rattrs = parseAttrs(rm[1]);
    skill.repeats.push({
      delay: Number(rattrs.delay || 0),
      angle: rattrs.angle || "0 0 0"
    });
  }

  skills[String(id)] = skill;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(skills, null, 2));
console.log(`Wrote ${outPath}`);
