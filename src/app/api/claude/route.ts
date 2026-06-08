import { NextRequest, NextResponse } from "next/server";
import { runClaude } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 300;

/** 얇은 Claude 프록시: 프롬프트를 받아 원문 텍스트를 반환. 파싱은 클라이언트가 담당. */
export async function POST(req: NextRequest) {
  try {
    const { prompt, maxTokens } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt 가 필요합니다." }, { status: 400 });
    }
    const text = await runClaude(prompt, { maxTokens });
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
