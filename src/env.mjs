import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function loadLocalEnv(rootDir = process.cwd()) {
  for (const name of [".env", ".env.local"]) {
    const filePath = path.join(rootDir, name);
    if (!existsSync(filePath)) continue;
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
    }
  }
}

export function maskPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `${digits.slice(0, 3)}******${digits.slice(-2)}`;
}
