const fs = require("node:fs");
const path = require("node:path");
const { zipSync } = require("../apps/web/node_modules/fflate");
const root = path.resolve(__dirname, "../themes/atelier");
const files = {};
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const location = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(location);
    else files["atelier/" + path.relative(root, location).replaceAll("\\", "/")] = new Uint8Array(fs.readFileSync(location));
  }
}
collect(root);
const target = path.resolve(__dirname, "../apps/web/public/theme-packages");
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, "atelier.zip"), zipSync(files, { level: 6 }));
console.log("Built public/theme-packages/atelier.zip from themes/atelier");
