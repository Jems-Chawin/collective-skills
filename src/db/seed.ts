import { insertCase, updateEmbedding } from "../db/index.js";
import { embed } from "../embeddings/index.js";
import { EXAMPLE_CASE } from "../schema.js";

async function seed() {
  console.log("Inserting example case...");
  const saved = insertCase(EXAMPLE_CASE);
  console.log(`Stored: ${saved.id} — "${saved.title}"`);

  console.log("Generating embedding...");
  const text = [
    saved.title,
    saved.situation,
    saved.friction,
    saved.insight,
    saved.solution,
    ...saved.attempts,
    ...saved.watchouts,
  ].join("\n");

  const vector = await embed(text);
  updateEmbedding(saved.id, vector);
  console.log(`Embedding stored (${vector.length} dimensions)`);
  console.log("Done.");
}

seed();
