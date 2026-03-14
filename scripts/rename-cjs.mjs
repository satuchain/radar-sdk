// Rename .js → .cjs in the CJS output directory
import { readdir, rename } from "node:fs/promises";
import { join } from "node:path";

const dir = new URL("../dist/cjs", import.meta.url).pathname;

async function renameAll(d) {
  const entries = await readdir(d, { withFileTypes: true });
  for (const e of entries) {
    const full = join(d, e.name);
    if (e.isDirectory()) {
      await renameAll(full);
    } else if (e.name.endsWith(".js")) {
      await rename(full, full.replace(/\.js$/, ".cjs"));
    } else if (e.name.endsWith(".js.map")) {
      await rename(full, full.replace(/\.js\.map$/, ".cjs.map"));
    }
  }
}

renameAll(dir).catch((e) => { console.error(e); process.exit(1); });
