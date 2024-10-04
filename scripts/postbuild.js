// Adapted from: https://github.com/sz-piotr/js13k-webpack-starter/blob/master/postbuild.js

/* eslint-disable no-undef */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import archiver from "archiver";

revertChangesToVersionFile();
createDeployPackage();

function revertChangesToVersionFile() {
    execSync("git checkout HEAD -- ./src/version.ts");
}

function createDeployPackage() {
    const output = fs.createWriteStream("./build.zip");
    const archive = archiver("zip", {
        zlib: { level: 9 }, // set compression to best
    });

    output.on("close", function () {
        const bytes = archive.pointer();
        console.log(`Size: ${bytes} bytes`);
    });

    archive.on("warning", function (err) {
        if (err.code === "ENOENT") {
            console.warn(err);
        } else {
            throw err;
        }
    });
    archive.on("error", function (err) {
        throw err;
    });
    archive.pipe(output);

    fs.readdirSync("dist", { recursive: true, withFileTypes: true })
        .filter((dirent) => dirent.isFile())
        .map((f) => path.join(f.path, f.name))
        .forEach((path) => {
            archive.append(fs.createReadStream(path), {
                name: path.replace(/dist(\\|\/)/, ""),
            });
        });

    archive.finalize();
}
