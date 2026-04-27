import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { readRules, addFlagged } from "@/lib/detection-rules-store";
import { readSamples } from "@/lib/cheat-sample-store";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

type ContentBlock =
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "text"; text: string };

async function callClaude(content: ContentBlock[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in .env.local");

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Anthropic API error (${res.status}): ${err}`);
  }

  const data = await res.json() as { content: { type: string; text?: string }[] };
  return data.content.find((b) => b.type === "text")?.text ?? "";
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { unique_id, player_guid, screenshot_time } = await req.json() as {
    unique_id: string;
    player_guid: string;
    screenshot_time?: string;
  };

  if (!unique_id) return NextResponse.json({ error: "unique_id is required." }, { status: 400 });

  const [allRules, samples] = await Promise.all([readRules(), readSamples()]);
  const rules = allRules.filter((r) => r.enabled);

  // Fetch screenshot image
  const origin = req.nextUrl.origin;
  const imgRes = await fetch(`${origin}/api/screenshots/${unique_id}`, { cache: "no-store" });
  if (!imgRes.ok) {
    return NextResponse.json({ error: `Could not fetch screenshot (${imgRes.status}).` }, { status: 502 });
  }
  const imgBuffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(imgBuffer).toString("base64");
  const mediaType = imgRes.headers.get("content-type")?.split(";")[0].trim() ?? "image/jpeg";

  // Build message content
  const content: ContentBlock[] = [];

  const intro = `You are an expert anti-cheat analyst for Soldier Front (SF Alpha), a tactical online FPS game.

Your job is to identify ANY visual evidence of cheating. You should flag screenshots even when evidence is subtle or uncertain — it is far better to flag for human review than to miss a cheater.

ALWAYS scan for these universal FPS cheat indicators regardless of what else you are told:

1. **ESP / Wallhack overlays** — colored boxes, rectangles, outlines, or highlights drawn around players or enemies, especially visible THROUGH walls, floors, or terrain. Also: player names, health bars, distance numbers, or item markers shown through solid surfaces that the normal game UI would not show.
2. **Aimbot signs** — crosshair or reticle perfectly locked onto an enemy's head when the player's viewpoint would not naturally aim there; suspiciously perfect headshot angles.
3. **Non-standard HUD elements** — any overlay, colored marker, or UI widget that does not belong to the normal Soldier Front game interface. Unusual colored outlines or glows on player models.
4. **Impossible positioning or clipping** — a player or their weapon clipping through geometry, standing inside a wall, or in a physically unreachable location.
5. **No-recoil / no-spread patterns** — bullet spray that is impossibly tight or a weapon that shows no movement between shots at long range.
6. **Speed hacks** — motion blur artifacts or player positions that suggest movement far faster than normal.

If you see ANY of the above, or anything else that looks out of place for a normal gameplay screenshot, set flagged to true.`;

  // Include sample images as positive examples
  if (samples.length > 0) {
    content.push({
      type: "text",
      text: `${intro}\n\nHere are ${samples.length} confirmed example screenshot(s) of players caught cheating in this game. Study these carefully — the same types of visual artifacts may appear in the screenshot you are about to analyze:`,
    });
    for (const s of samples) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: s.mediaType, data: s.data },
      });
      content.push({ type: "text", text: `(Confirmed cheat sample: "${s.label}")` });
    }
    content.push({ type: "text", text: "\nNow analyze the following new screenshot:" });
  } else {
    content.push({
      type: "text",
      text: `${intro}\n\nAnalyze the following screenshot:`,
    });
  }

  content.push({
    type: "image",
    source: { type: "base64", media_type: mediaType, data: base64 },
  });

  // Build rule list
  const ruleSection = rules.length > 0
    ? `\nIn addition to the universal indicators above, also check specifically for these admin-defined cheat indicators:\n${rules.map((r, i) => `${i + 1}. **${r.label}**: ${r.description}`).join("\n")}`
    : "";

  content.push({
    type: "text",
    text: `${ruleSection}

IMPORTANT: Your goal is to help human reviewers — they will make the final call. Flag anything that looks suspicious, unusual, or that you cannot explain as normal gameplay. Do NOT require certainty to flag.

Respond with ONLY a JSON object in this exact format, no markdown, no code fences:
{
  "flagged": true or false,
  "rules_triggered": ["Rule Label 1", "Rule Label 2"],
  "verdict": "One or two sentence summary of what you found.",
  "details": "Detailed description of every suspicious element you can see, or why the screenshot looks clean."
}

If the screenshot looks completely clean and normal with no suspicious overlays, artifacts, or anomalies, set flagged to false. Otherwise set flagged to true.`,
  });

  let claudeResult: {
    flagged: boolean;
    rules_triggered: string[];
    verdict: string;
    details: string;
  };

  try {
    const text = await callClaude(content);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude returned no parseable JSON.");
    claudeResult = JSON.parse(jsonMatch[0]);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed." },
      { status: 500 },
    );
  }

  if (claudeResult.flagged) {
    await addFlagged({
      id: unique_id,
      player_guid,
      screenshot_time: screenshot_time ?? "",
      flagged_at: new Date().toISOString(),
      verdict: claudeResult.verdict,
      rules_triggered: claudeResult.rules_triggered,
    });
  }

  return NextResponse.json(claudeResult);
}
