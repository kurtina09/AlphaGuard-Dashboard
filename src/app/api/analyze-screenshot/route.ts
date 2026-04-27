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
      max_tokens: 1024,
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

  if (rules.length === 0 && samples.length === 0) {
    return NextResponse.json(
      { error: "No detection rules or samples configured. Set them up on the Cheat Detection page." },
      { status: 400 },
    );
  }

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

  // Include sample images as positive examples
  if (samples.length > 0) {
    content.push({
      type: "text",
      text: `You are an anti-cheat analyst for the online FPS game Soldier Front (SF Alpha).\n\nHere are ${samples.length} confirmed example screenshot(s) of players caught cheating:`,
    });
    for (const s of samples) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: s.mediaType, data: s.data },
      });
      content.push({ type: "text", text: `(Sample: "${s.label}")` });
    }
    content.push({ type: "text", text: "\nNow analyze the following new screenshot:" });
  } else {
    content.push({
      type: "text",
      text: "You are an anti-cheat analyst for the online FPS game Soldier Front (SF Alpha).\n\nAnalyze the following screenshot:",
    });
  }

  content.push({
    type: "image",
    source: { type: "base64", media_type: mediaType, data: base64 },
  });

  // Build rule list
  const ruleSection = rules.length > 0
    ? `\nCheck specifically for these cheat indicators:\n${rules.map((r, i) => `${i + 1}. **${r.label}**: ${r.description}`).join("\n")}`
    : "";

  content.push({
    type: "text",
    text: `${ruleSection}

Respond with ONLY a JSON object in this exact format, no markdown:
{
  "flagged": true or false,
  "rules_triggered": ["Rule Label 1"],
  "verdict": "One or two sentence summary.",
  "details": "Detailed explanation of what you see."
}

Only flag if you are reasonably confident cheating is visible. If nothing suspicious, set flagged to false and rules_triggered to [].`,
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
