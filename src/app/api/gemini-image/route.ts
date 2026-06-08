import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Gemini 이미지 생성: 프롬프트 → base64 data URL */
export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt 가 필요합니다." }, { status: 400 });
    }
    const img = await generateImage(prompt);
    return NextResponse.json(img);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
