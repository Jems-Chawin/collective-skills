import { pipeline } from "@xenova/transformers";

let embedder: ReturnType<typeof pipeline> | null = null;
let initFailed = false;

async function getEmbedder() {
  if (initFailed) throw new Error("Embedding model failed to load");
  if (!embedder) {
    try {
      embedder = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    } catch (e) {
      initFailed = true;
      throw new Error(
        `Failed to load embedding model. This may be a network issue (first run downloads ~23MB). Error: ${e}`
      );
    }
  }
  return embedder;
}

export async function embed(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const output = await (model as any)(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
