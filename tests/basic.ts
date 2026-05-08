import fs from "fs";
import path from "path";
import os from "os";

const TEST_DB = path.join(os.tmpdir(), `cs-test-${Date.now()}.db`);
process.env.CS_DB_PATH = TEST_DB;

// Dynamic imports so env var is set before db module loads
const { insertCase, updateEmbedding, searchByEmbedding } = await import("../src/db/index.js");
const { embed } = await import("../src/embeddings/index.js");
const { EXAMPLE_CASE } = await import("../src/schema.js");

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.log(`  ✗ ${msg}`);
    failed++;
  }
}

console.log("Test: push and search flow\n");

// Push
const saved = insertCase(EXAMPLE_CASE);
assert(!!saved.id, "Case gets an ID");
assert(saved.title === EXAMPLE_CASE.title, "Title preserved");
assert(saved.attempts.length === 4, "Attempts preserved");

// Embed
const text = [saved.title, saved.situation, saved.friction, saved.insight].join("\n");
const vector = await embed(text);
assert(vector.length === 384, `Embedding has 384 dimensions (got ${vector.length})`);
updateEmbedding(saved.id, vector);

// Search — related query
const relatedVector = await embed("Prisma connection pool timeout Next.js hot reload");
const results = searchByEmbedding(relatedVector, 5);
assert(results.length === 1, "Related query finds the case");
assert(results[0].similarity_score > 0.5, `Similarity > 0.5 (got ${results[0].similarity_score.toFixed(3)})`);

// Search — unrelated query
const unrelatedVector = await embed("CSS flexbox alignment in Safari mobile");
const noResults = searchByEmbedding(unrelatedVector, 5);
assert(noResults.length === 0, "Unrelated query returns nothing (threshold filters it)");

console.log(`\nResults: ${passed} passed, ${failed} failed`);

// Cleanup
fs.unlinkSync(TEST_DB);
process.exit(failed > 0 ? 1 : 0);
