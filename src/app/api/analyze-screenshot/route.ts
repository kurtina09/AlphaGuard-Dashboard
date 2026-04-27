import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { readRules, addFlagged } from "@/lib/detection-rules-store";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

async function callClaude(base64: string, mediaType: string, prompt: string) {
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
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Anthropic API error (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    content: { type: string; text?: string }[];
  };
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

  // Load enabled rules
  const allRules = await readRules();
  const rules = allRules.filter((r) => r.enabled);
  if (rules.length === 0) {
    return NextResponse.json(
      { error: "No detection rules are enabled. Add rules on the Cheat Detection page first." },
      { status: 400 },
    );
  }

  // Fetch screenshot image from our own API
  const origin = req.nextUrl.origin;
  const imgRes = await fetch(`${origin}/api/screenshots/${unique_id}`, { cache: "no-store" });
  if (!imgRes.ok) {
    return NextResponse.json({ error: `Could not fetch screenshot (${imgRes.status}).` }, { status: 502 });
  }
  const imgBuffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(imgBuffer).toString("base64");
  const mediaType = (imgRes.headers.get("content-type") ?? "image/jpeg")
    .split(";")[0]
    .trim();

  // Build detection prompt
  const ruleList = rules.map((r, i) => `${i + 1}. **${r.label}**: ${r.description}`).join("\n");
  const prompt = `You are an anti-cheat analyst reviewing a screenshot from the online game Soldier Front (SF Alpha).

Examine this screenshot carefully and check for the following cheat indicators:

${ruleList}

Respond with a JSON object in this exact format:
{
  "flagged": true or false,
  "rules_triggered": ["Rule Label 1", "Rule Label 2"],
  "verdict": "Short 1-2 sentence summary of your findings.",
  "details": "More detailed explanation of what you observed in the screenshot."
}

Only flag if you are reasonably confident. If nothing suspicious is found, set flagged to false and rules_triggered to [].`;

  let claudeResult: {
    flagged: boolean;
    rules_triggered: string[];
    verdict: string;
    details: string;
  };

  try {
    const text = await callClaude(base64, mediaType, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude returned no parseable JSON.");
    claudeResult = JSON.parse(jsonMatch[0]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Save to flagged list if suspicious
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
