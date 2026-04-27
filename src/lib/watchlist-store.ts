import { promises as fs } from "fs";
import path from "path";

export type WatchlistEntry = {
  id: number;
  player_guid: string;
  codename?: string;
  reason: string;
  added_by: string;
  added_at: string;
};

// Store file lives next to the app root, outside .next so it survives builds
const FILE_PATH = path.join(process.cwd(), "data", "watchlist.json");

async function ensureDir() {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
}

export async function readWatchlist(): Promise<WatchlistEntry[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as WatchlistEntry[];
  } catch {
    // File doesn't exist yet — return empty list
    return [];
  }
}

export async function writeWatchlist(entries: WatchlistEntry[]): Promise<void> {
  await ensureDir();
  // Atomic write: write to temp file then rename
  const tmp = FILE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(entries, null, 2), "utf-8");
  await fs.rename(tmp, FILE_PATH);
}
