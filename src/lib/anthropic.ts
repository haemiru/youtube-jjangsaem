/** 서버 전용 — Claude Opus 4.8 호출 (API 키는 서버에만 존재) */
import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-opus-4-8";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY 가 설정되지 않았습니다.");
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export async function runClaude(
  prompt: string,
  opts?: { maxTokens?: number }
): Promise<string> {
  const res = await getClient().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts?.maxTokens ?? 16000,
    messages: [{ role: "user", content: prompt }],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
