import { promises as fs } from "fs";
import path from "path";

export type CheatSample = {
  id: number;
  label: string;
  data: string;      // base64 image data
  mediaType: string; // e.g. "image/jpeg"
  created_at: string;
};

const FILE_PATH = path.join(process.cwd(), "data", "cheat-samples.json");

async function ensureDir() {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
}

export async function readSamples(): Promise<CheatSample[]> {
  try {
    return JSON.parse(await fs.readFile(FILE_PATH, "utf-8")) as CheatSample[];
  } catch { return []; }
}

export async function writeSamples(samples: CheatSample[]): Promise<void> {
  await ensureDir();
  const tmp = FILE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(samples, null, 2), "utf-8");
  await fs.rename(tmp, FILE_PATH);
}
