import { readFileSync } from "node:fs";
import { parseBlog } from "../src/lib/parser.ts";
import {
  buildMetadataPrompt,
  buildThumbnailPrompt,
  adaptImagePromptForYoutube,
  extractJson,
} from "../src/lib/prompts.ts";

const BASE = process.argv[2] || "https://youtube-jjangsaem.vercel.app";
const raw = readFileSync(
  "C:/Users/bsuha/Claude-prj/ebook/jjangsaem-bookshop/naver-blog/03-moro-reflex-hajunho2005.txt",
  "utf8"
);
const blog = parseBlog(raw);
console.log("파싱:", blog.meta.title, "| 슬라이드", blog.imageSlots.length, "장");

async function post(path: string, body: unknown) {
  const t0 = Date.now();
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, ms: Date.now() - t0, data };
}

// 1) Claude — 메타데이터 (가벼운 단계)
console.log("\n[1] /api/claude (메타데이터) 호출 중…");
const meta = await post("/api/claude", { prompt: buildMetadataPrompt(blog), maxTokens: 4000 });
console.log("  HTTP", meta.status, "·", (meta.ms / 1000).toFixed(1) + "s");
if (!meta.ok) {
  console.log("  ❌ 오류:", meta.data.error);
} else {
  try {
    const parsed = extractJson<{ titles: string[]; tags: string[] }>(meta.data.text);
    console.log("  ✅ 제목 후보:", parsed.titles?.[0]);
    console.log("     태그", parsed.tags?.length, "개:", parsed.tags?.slice(0, 5).join(", "));
  } catch (e) {
    console.log("  ⚠️ JSON 파싱 실패:", (e as Error).message);
    console.log("  원문 앞부분:", meta.data.text?.slice(0, 200));
  }
}

// 2) Gemini — 슬라이드 이미지 1장
console.log("\n[2] /api/gemini-image (slide-01) 호출 중…");
const imgPrompt = adaptImagePromptForYoutube(blog.imageSlots[0].prompt);
const img = await post("/api/gemini-image", { prompt: imgPrompt });
console.log("  HTTP", img.status, "·", (img.ms / 1000).toFixed(1) + "s");
if (!img.ok) {
  console.log("  ❌ 오류:", img.data.error);
} else {
  const url: string = img.data.dataUrl || "";
  console.log("  ✅ 이미지 수신:", url.slice(0, 40), "… 길이", url.length, "bytes(base64)");
}
console.log("\n점검 완료.");
