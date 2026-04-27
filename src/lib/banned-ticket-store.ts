import { promises as fs } from "fs";
import path from "path";

export type BannedTicketEntry = {
  id: number;
  player_guid: string;
  codename?: string;
  reason: string;
  added_by: string;
  added_at: string;
};

const FILE_PATH = path.join(process.cwd(), "data", "banned-tickets.json");

async function ensureDir() {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
}

export async function readBannedTickets(): Promise<BannedTicketEntry[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as BannedTicketEntry[];
  } catch {
    return [];
  }
}

export async function writeBannedTickets(entries: BannedTicketEntry[]): Promise<void> {
  await ensureDir();
  const tmp = FILE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(entries, null, 2), "utf-8");
  await fs.rename(tmp, FILE_PATH);
}
