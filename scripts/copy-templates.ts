import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Go *up* from dist/scripts to the project root
const projectRoot = path.resolve(__dirname, "../../");

const src = path.join(projectRoot, "templates");
const dest = path.join(projectRoot, "dist/templates");

fs.copySync(src, dest);
