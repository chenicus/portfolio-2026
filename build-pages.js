const fs = require("node:fs");
const path = require("node:path");

const source = process.cwd();
const output = path.join(source, ".pages-build");
// Keep this archived source video in GitHub, but leave it out of the public Pages build.
const excluded = new Set([".git", ".pages-build", "images/Extra projects/Untitled.mov"]);

fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(source, output, {
  recursive: true,
  filter: (file) => {
    const relative = path.relative(source, file).split(path.sep).join("/");
    return !excluded.has(relative);
  },
});
