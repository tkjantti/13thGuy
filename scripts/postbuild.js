import { execSync } from "node:child_process";

revertChangesToVersionFile();

function revertChangesToVersionFile() {
    execSync("git checkout HEAD -- ./src/version.ts");
}
