import fs from "node:fs";
import path from "node:path";

const encoding = "utf8";
const versionFilePath = path.join("src", "version.ts");

const now = new Date();
const dateString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .replace("T", " ") // Separate date and time with a space
    .replace(/:[0-9]{2}\..*$/, ""); // Only hours and minutes

const versionFileContent = fs.readFileSync(versionFilePath, encoding);

const modifiedContent = versionFileContent.replace(
    /"[^"]*"/,
    `"${dateString}"`,
);

fs.writeFileSync(versionFilePath, modifiedContent, encoding);
