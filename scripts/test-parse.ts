import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseBlog } from "../src/lib/parser.ts";

const dir =
  process.argv[2] ||
  "C:/Users/bsuha/Claude-prj/ebook/jjangsaem-bookshop/naver-blog";

const files = readdirSync(dir).filter((f) => f.endsWith(".txt"));
for (const f of files) {
  const raw = readFileSync(join(dir, f), "utf8");
  const p = parseBlog(raw);
  console.log("═".repeat(60));
  console.log("FILE:", f);
  console.log("제목:", p.meta.title);
  console.log("카테고리:", p.meta.category, "| 계정:", p.meta.account);
  console.log("메인키워드:", p.meta.mainKeyword);
  console.log("서브키워드:", p.meta.subKeywords.join(", "));
  console.log("해시태그:", p.hashtags.join(" "));
  console.log("관련전자책:", p.meta.relatedEbook);
  console.log("본문 글자수:", p.charCount);
  console.log("섹션 수:", p.sections.length);
  console.log("  섹션 헤딩:", p.sections.map((s) => `${s.emoji}${s.heading}`).join(" | "));
  console.log("이미지 슬롯 수:", p.imageSlots.length);
  for (const s of p.imageSlots) {
    console.log(
      `  #${s.index} [${s.type}]${s.isHero ? " ⭐" : ""} prompt ${s.prompt.length}자`
    );
  }
  if (p.warnings.length) console.log("⚠️ 경고:", p.warnings);
}
console.log("═".repeat(60));
console.log("총", files.length, "개 파일 파싱 완료");
