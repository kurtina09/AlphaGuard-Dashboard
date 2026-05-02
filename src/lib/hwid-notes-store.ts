import { promises as fs } from "fs";
import path from "path";

export type HwidNote = {
  banned_hwid_id: number;
  note: string;
  updated_at: string;
};

const FILE_PATH = path.join(process.cwd(), "data", "hwid-notes.json");

async function ensureDir() {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
}

export async function readNotes(): Promise<HwidNote[]> {
  try {
    return JSON.parse(await fs.readFile(FILE_PATH, "utf-8")) as HwidNote[];
  } catch { return []; }
}

export async function writeNotes(notes: HwidNote[]): Promise<void> {
  await ensureDir();
  const tmp = FILE_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(notes, null, 2), "utf-8");
  await fs.rename(tmp, FILE_PATH);
}

export async function upsertNote(banned_hwid_id: number, note: string): Promise<void> {
  const notes = await readNotes();
  const idx = notes.findIndex((n) => n.banned_hwid_id === banned_hwid_id);
  const entry: HwidNote = { banned_hwid_id, note, updated_at: new Date().toISOString() };
  if (idx >= 0) notes[idx] = entry;
  else notes.push(entry);
  await writeNotes(notes);
}

export async function deleteNote(banned_hwid_id: number): Promise<void> {
  const notes = await readNotes();
  await writeNotes(notes.filter((n) => n.banned_hwid_id !== banned_hwid_id));
}
