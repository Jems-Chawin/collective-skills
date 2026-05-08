import { pipeline } from "@xenova/transformers";

let embedder: ReturnType<typeof pipeline> | null = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

export async function embed(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const output = await (model as any)(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}
