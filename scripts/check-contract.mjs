// Fails when contract/openapi.yaml differs from the contract at the commit pinned in
// package.json (`config.contractRepo` and `config.contractCommit`). See contract/README.md.
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const path = "contract/openapi.yaml";

const { config } = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const { contractRepo: repo, contractCommit: commit } = config;
const pin = `${repo} at ${commit.slice(0, 7)}`;
const source = `https://github.com/${repo}/blob/${commit}/${path}`;

const url = `https://raw.githubusercontent.com/${repo}/${commit}/${path}`;
let response;
try {
  response = await fetch(url);
} catch (error) {
  console.error(`Could not download the pinned contract from ${url}: ${error.message}`);
  process.exit(1);
}
if (!response.ok) {
  console.error(`Could not download the pinned contract from ${url}: HTTP ${response.status}.`);
  process.exit(1);
}

const pinned = Buffer.from(await response.arrayBuffer());
const local = await readFile(new URL(path, root));

if (!local.equals(pinned)) {
  console.error(`${path} differs from the contract in ${pin}.`);
  console.error(`Copy it again from ${source}, or update the pin (see contract/README.md).`);
  process.exit(1);
}

console.log(`${path} matches the contract in ${pin}.`);
