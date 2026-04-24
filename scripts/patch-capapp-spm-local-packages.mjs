import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "ios", "App", "CapApp-SPM", "Package.swift");

const pairs = [
    [
        'path: "../../../node_modules/@capacitor/device"',
        'path: "../CapacitorSpmPlugins/device"',
    ],
    [
        'path: "../../../node_modules/@capacitor/network"',
        'path: "../CapacitorSpmPlugins/network"',
    ],
    [
        'path: "../../../node_modules/@capacitor/push-notifications"',
        'path: "../CapacitorSpmPlugins/push-notifications"',
    ],
];

let text = fs.readFileSync(file, "utf8");
let changed = false;
for (const [from, to] of pairs) {
    if (text.includes(from)) {
        text = text.split(from).join(to);
        changed = true;
    }
}
if (!changed && !pairs.every(([, to]) => text.includes(to))) {
    console.warn(
        "patch-capapp-spm-local-packages: Package.swift had no node_modules paths to replace (already patched?)",
    );
}
fs.writeFileSync(file, text);
