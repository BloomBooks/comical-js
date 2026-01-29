const fs = require("fs");
const cp = require("child_process");

function readPackageJson() {
    return JSON.parse(fs.readFileSync("package.json", "utf8"));
}

function writePackageJson(pkg) {
    fs.writeFileSync("package.json", JSON.stringify(pkg, null, 4) + "\n");
}

function parseIntStrict(value, name) {
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isFinite(parsed) === false) {
        throw new Error(`Invalid ${name}: ${value}`);
    }
    return parsed;
}

function getMajorMinor(version) {
    const parts = String(version).split(".");
    if (parts.length < 2) {
        throw new Error(`Unexpected version: ${version}`);
    }
    return { major: parts[0], minor: parts[1] };
}

function getPublishedVersions(pkgName) {
    try {
        const out = cp
            .execSync(`npm view ${pkgName} versions --json`, {
                stdio: ["ignore", "pipe", "pipe"]
            })
            .toString()
            .trim();

        if (!out) return [];

        const parsed = JSON.parse(out);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (_e) {
        return [];
    }
}

function computeNextPatch({ versions, major, minor, firstPatch }) {
    const base = `${major}.${minor}`;
    const prefix = base + ".";

    const patches = versions
        .filter(v => typeof v === "string" && v.startsWith(prefix))
        .map(v => Number.parseInt(v.slice(prefix.length).split(".")[0], 10))
        .filter(n => Number.isFinite(n));

    if (patches.length === 0) return firstPatch;

    return Math.max(...patches) + 1;
}

function main() {
    const pkg = readPackageJson();
    const { major, minor } = getMajorMinor(pkg.version);

    const explicitBuild = process.env.BUILD_NUMBER ? String(process.env.BUILD_NUMBER).trim() : "";

    let patch;
    if (explicitBuild) {
        patch = parseIntStrict(explicitBuild, "BUILD_NUMBER");
    } else {
        const firstPatch = parseIntStrict(process.env.FIRST_PATCH ?? "0", "FIRST_PATCH");
        const versions = getPublishedVersions(pkg.name);
        patch = computeNextPatch({ versions, major, minor, firstPatch });
    }

    pkg.version = `${major}.${minor}.${patch}`;

    if (process.argv.includes("--dry-run")) {
        process.stdout.write(pkg.version + "\n");
        return;
    }

    writePackageJson(pkg);
    console.log("Version set to", pkg.version);
}

main();
