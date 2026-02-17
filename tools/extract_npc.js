const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "..", "..", "ogz-client-master", "system", "npc.xml");
const outPath = path.join(__dirname, "..", "src", "data", "npcs.json");

const xml = fs.readFileSync(srcPath, "utf8");

const parseAttrs = (raw) => {
  const attrs = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
};

const npcRe = /<NPC\s+([^>]+)>([\s\S]*?)<\/NPC>/gi;
const skillRe = /<SKILL\s+([^>]+?)\s*\/>/gi;
const tagRe = /<(COLLISION|ATTACK|SPEED|FLAG|DROP)\s+([^>]+?)\s*\/>/gi;

const npcs = {};
let nm;
while ((nm = npcRe.exec(xml)) !== null) {
  const npcAttrs = parseAttrs(nm[1]);
  const body = nm[2] || "";
  const npc = {
    id: Number(npcAttrs.id),
    name: npcAttrs.name,
    desc: npcAttrs.desc,
    meshname: npcAttrs.meshname,
    grade: npcAttrs.grade,
    max_hp: Number(npcAttrs.max_hp || 0),
    max_ap: Number(npcAttrs.max_ap || 0),
    int: Number(npcAttrs.int || 0),
    agility: Number(npcAttrs.agility || 0),
    view_angle: Number(npcAttrs.view_angle || 0),
    dc: Number(npcAttrs.dc || 0),
    offensetype: Number(npcAttrs.offensetype || 0),
    dyingtime: Number(npcAttrs.dyingtime || 0),
    scale: npcAttrs.scale,
    collision: null,
    attack: null,
    speed: null,
    flags: {},
    drop: null,
    skills: []
  };

  let tm;
  while ((tm = tagRe.exec(body)) !== null) {
    const tag = tm[1];
    const attrs = parseAttrs(tm[2]);
    if (tag === "COLLISION") {
      npc.collision = {
        radius: Number(attrs.radius || 0),
        height: Number(attrs.height || 0),
        tremble: Number(attrs.tremble || 0),
        pick: attrs.pick === "true"
      };
    } else if (tag === "ATTACK") {
      npc.attack = {
        type: attrs.type,
        range: Number(attrs.range || 0),
        weaponitem_id: Number(attrs.weaponitem_id || 0)
      };
    } else if (tag === "SPEED") {
      npc.speed = {
        default: Number(attrs.default || 0),
        rotate: Number(attrs.rotate || 0)
      };
    } else if (tag === "FLAG") {
      Object.keys(attrs).forEach((k) => {
        npc.flags[k] = attrs[k] === "true";
      });
    } else if (tag === "DROP") {
      npc.drop = { table: attrs.table };
    }
  }

  let sm;
  while ((sm = skillRe.exec(body)) !== null) {
    const attrs = parseAttrs(sm[1]);
    if (attrs.id) npc.skills.push(Number(attrs.id));
  }

  if (Number.isFinite(npc.id)) {
    npcs[String(npc.id)] = npc;
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(npcs, null, 2));
console.log(`Wrote ${outPath}`);
