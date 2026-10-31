import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const walk = (dir: string): string[] => {
  const entries = readdirSync(dir);
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
};

describe("api module boundaries", () => {
  it("does not import @gc/store or @gc/webview within packages/api/src/api", () => {
    const apiDir = join(__dirname, "..");
    const files = walk(apiDir).filter((f) => f.endsWith(".ts"));

    const banned = ["@gc/store", "@gc/webview"];
    const offenders: Array<{ file: string; banned: string }> = [];

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const b of banned) {
        if (text.includes(`from "${b}"`) || text.includes(`from '${b}'`)) {
          offenders.push({ file, banned: b });
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
