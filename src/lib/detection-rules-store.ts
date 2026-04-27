import { promises as fs } from "fs";
import path from "path";

export type DetectionRule = {
  id: number;
  label: string;       // short name, e.g. "Cheat Menu Visible"
  description: string; // what to look for, fed directly to Claude
  enabled: boolean;
  created_at: string;
};

export type FlaggedEntry = {
  id: string;          // unique_id of the screenshot
  player_guid: string;
  screenshot_time: string;
  flagged_at: string;
  verdict: string;     // Claude's summary
  rules_triggered: string[];
};

const RULES_PATH  = path.join(process.cwd(), "data", "detection-rules.json");
const FLAGGED_PATH = path.join(process.cwd(), "data", "flagged-screenshots.json");

async function ensureDir() {
  await fs.mkdir(path.dirname(RULES_PATH), { recursive: true });
}

// ── Rules ──────────────────────────────────────────────────────────
export async function readRules(): Promise<DetectionRule[]> {
  try {
    return JSON.parse(await fs.readFile(RULES_PATH, "utf-8")) as DetectionRule[];
  } catch { return []; }
}

export async function writeRules(rules: DetectionRule[]): Promise<void> {
  await ensureDir();
  const tmp = RULES_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(rules, null, 2), "utf-8");
  await fs.rename(tmp, RULES_PATH);
}

// ── Flagged list ────────────────────────────────────────────────────
export async function readFlagged(): Promise<FlaggedEntry[]> {
  try {
    return JSON.parse(await fs.readFile(FLAGGED_PATH, "utf-8")) as FlaggedEntry[];
  } catch { return []; }
}

export async function writeFlagged(entries: FlaggedEntry[]): Promise<void> {
  await ensureDir();
  const tmp = FLAGGED_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(entries, null, 2), "utf-8");
  await fs.rename(tmp, FLAGGED_PATH);
}

export async function addFlagged(entry: FlaggedEntry): Promise<void> {
  const existing = await readFlagged();
  // Replace if already flagged, otherwise prepend
  const filtered = existing.filter((e) => e.id !== entry.id);
  await writeFlagged([entry, ...filtered]);
}

export async function removeFlagged(id: string): Promise<void> {
  const existing = await readFlagged();
  await writeFlagged(existing.filter((e) => e.id !== id));
}
