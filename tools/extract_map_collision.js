const fs = require("fs");
const path = require("path");

const mapsRoot = path.join(__dirname, "..", "data", "maps", "client");
const outPath = path.join(__dirname, "..", "src", "data", "map_collision.json");

const R_COL_ID = 0x5050178f;

const readFloat = (buf, offset) => [buf.readFloatLE(offset), offset + 4];
const readInt = (buf, offset) => [buf.readInt32LE(offset), offset + 4];
const readUint = (buf, offset) => [buf.readUInt32LE(offset), offset + 4];
const readBool = (buf, offset) => [buf.readUInt8(offset) !== 0, offset + 1];

const parseCol = (buffer) => {
  let offset = 0;
  let v;
  [v, offset] = readUint(buffer, offset);
  if (v !== R_COL_ID) return null;
  [v, offset] = readUint(buffer, offset); // version
  let nodeCount, polyCount;
  [nodeCount, offset] = readInt(buffer, offset);
  [polyCount, offset] = readInt(buffer, offset);

  const nodes = [];

  const parseNode = () => {
    const idx = nodes.length;
    const plane = {};
    [plane.a, offset] = readFloat(buffer, offset);
    [plane.b, offset] = readFloat(buffer, offset);
    [plane.c, offset] = readFloat(buffer, offset);
    [plane.d, offset] = readFloat(buffer, offset);
    let solid;
    [solid, offset] = readBool(buffer, offset);
    let hasPos, hasNeg;
    [hasPos, offset] = readBool(buffer, offset);
    const pos = hasPos ? parseNode() : -1;
    [hasNeg, offset] = readBool(buffer, offset);
    const neg = hasNeg ? parseNode() : -1;
    let nPolygon;
    [nPolygon, offset] = readInt(buffer, offset);
    if (nPolygon > 0) {
      const skip = nPolygon * 4 * 3 * 4; // (3 vertices + normal) * 3 floats * 4 bytes
      offset += skip;
    }
    nodes.push({
      plane,
      solid,
      pos,
      neg
    });
    return idx;
  };

  const root = parseNode();
  if (nodeCount !== nodes.length) {
    // keep but annotate for debug
  }

  return { root, nodes, nodeCount, polyCount };
};

const output = {};
const dirs = fs.readdirSync(mapsRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
for (const dir of dirs) {
  const files = fs.readdirSync(path.join(mapsRoot, dir.name));
  const col = files.find((f) => f.toLowerCase().endsWith(".rs.col"));
  if (!col) continue;
  const full = path.join(mapsRoot, dir.name, col);
  const buf = fs.readFileSync(full);
  const parsed = parseCol(buf);
  if (!parsed) continue;
  const mapName = col.replace(/\.rs\.col$/i, "");
  output[mapName] = parsed;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output));
console.log(`Wrote ${outPath}`);
