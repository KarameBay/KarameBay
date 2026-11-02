import { spawnSync } from "node:child_process";

if (process.env.STAGING_SEED_ACCOUNTS !== "true" || !process.env.DATABASE_URL) {
  throw new Error("Staging preparation requires an isolated staging database.");
}

for (const [command, args, env] of [
  ["npx", ["prisma", "migrate", "deploy"], process.env],
  ["npx", ["tsx", "prisma/seed.ts"], { ...process.env, NODE_ENV: "staging", ALLOW_DEVELOPMENT_SEED: "true" }],
]) {
  const result = spawnSync(command, args, { env, stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
