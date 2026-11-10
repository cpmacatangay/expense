import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const files = ["types.ts", "validate.ts", "allocate.ts", "computeShares.ts"];
const target = resolve("supabase/functions/finalize-outing/money");

mkdirSync(target, { recursive: true });
for (const file of files) {
  const destination = resolve(target, file);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(resolve("src/domain/money", file), destination);
}

console.log(`Synced ${files.length} money files to ${target}`);
