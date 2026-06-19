/** 결과 객체들 → 최종 텍스트 산출물(파일 내용) 조립 */
import type { ParsedBlog } from "./parser";
import {
  adaptImagePromptForYoutube,
  type ScriptResult,
  type MetadataResult,
  type ThumbnailResult,
  type VideoFormat,
} from "./prompts";

/** 대본이 실제로 가리키는 인포그래픽 슬라이드 번호 집합 (imageRef). 숏폼은 일부만 사용. */
export function usedSlideIndices(script: ScriptResult | null): Set<number> {
  const used = new Set<number>();
  if (script) {
    for (const s of script.slides) {
      if (s.imageRef != null) used.add(s.imageRef);
    }
  }
  return used;
}

/** 영상 폴더용 slug. 영문 슬러그가 마땅찮으면 제목 일부 + 타임스탬프(인자) */
export function videoSlug(blog: ParsedBlog, fallback?: string): string {
  const fromFile = fallback?.replace(/\.txt$/i, "").trim();
  if (fromFile) return fromFile.replace(/[^a-zA-Z0-9가-힣_-]/g, "-");
  const base = blog.meta.mainKeyword || blog.meta.title || "youtube-video";
  return base.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9가-힣_-]/g, "");
}

const TTS_HEADER = (title: string) => `═══════════════════════════════════════════════════════════════
🎙️ Google AI Studio TTS 설정 — 복사해서 Playground에 붙여넣기
═══════════════════════════════════════════════════════════════

[Scene]
A warm, intimate parenting explainer studio. A single voice — a seasoned
Korean child development specialist with 25 years of clinical experience —
calmly narrating to worried Korean parents. Soft natural light, no background
music. Korean language. Topic: ${title}

[Sample Context]
Read this Korean narration as a friendly, warm, yet professional single-voice
explainer at about 1.15x speaking speed. The narrator sounds calm, kind, and
authoritative without being clinical — gently reassuring while delivering
factual neuroscience and parenting guidance. Keep micro-pauses natural,
breathe between sentences, slightly emphasize key takeaway phrases. Avoid
robotic intonation. Avoid sing-song news-anchor tone.

[Playback]
Speed: 1.15×
Tone: friendly + warm + professional (single narrator, 짱샘)
═══════════════════════════════════════════════════════════════`;

function thumbnailBlock(t: ThumbnailResult | null): string {
  if (!t) return "";
  return `═══════════════════════════════════════════════════════════════
🖼️ YouTube 썸네일 — Gemini / Google Flow 프롬프트
═══════════════════════════════════════════════════════════════

[Prompt]
${t.imagePrompt}

[Negative]
${t.negativePrompt}

[추천 썸네일 문구 — 편집 단계에서 이미지 위에 합성]
${t.phrases.map((p, i) => `${i + 1}) ${p}`).join("\n")}

좌측 상단 보조 카피: "${t.miniCopyLeft}"
우측 상단 보조 카피: "${t.miniCopyRight}"
═══════════════════════════════════════════════════════════════`;
}

export function buildScriptTxt(
  blog: ParsedBlog,
  script: ScriptResult,
  thumb: ThumbnailResult | null
): string {
  const parts: string[] = [];
  if (thumb) parts.push(thumbnailBlock(thumb), "");
  parts.push(TTS_HEADER(blog.meta.title ?? ""), "");
  // 대본이 실제로 쓰는 슬라이드 수 (숏폼은 전체 중 일부만 사용).
  const usedCount = usedSlideIndices(script).size || blog.imageSlots.length;
  parts.push(
    `영상 길이 목표: ${script.estimatedMinutes}분`,
    `Hook 패턴: ${script.hookPattern} (${script.hookPatternLabel})`,
    `화자: 짱샘 단독 내레이션`,
    `시각 트랙: 인포그래픽 슬라이드 ${usedCount}장`,
    `※ 대본에는 화자 라벨·연출 메모·괄호 부연 설명을 넣지 않습니다.`,
    ""
  );

  script.slides.forEach((s, i) => {
    const n = String(i + 1).padStart(2, "0");
    const ref = s.imageRef ? ` · 🖼 slide-${String(s.imageRef).padStart(2, "0")}.png` : "";
    parts.push(
      "───────────────────────────────────────────────────────────────",
      `[Slide ${n}] ${s.heading} · ${s.seconds}초${ref}`,
      "───────────────────────────────────────────────────────────────",
      s.narration.trim(),
      ""
    );
  });

  return parts.join("\n");
}

/** 발화 텍스트를 글자 단위로 띄움 — 어절 내 한 칸, 어절 사이 두 칸, 문장부호 앞 공백 제거 */
export function spaceNarration(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      const words = line.trim().split(/\s+/);
      return words
        .map((w) => w.split("").join(" ").replace(/\s+([.,!?…·)\]}」』"'%])/g, "$1"))
        .join("  ");
    })
    .join("\n");
}

/** script.txt 의 [Slide] 발화 본문만 글자 단위로 띄운 변형본 */
export function buildScriptSpacedTxt(scriptTxt: string): string {
  const lines = scriptTxt.split("\n");
  const out: string[] = [];
  let inSlide = false;
  for (const ln of lines) {
    if (/^\[Slide \d+\]/.test(ln)) {
      inSlide = true;
      out.push(ln);
      continue;
    }
    if (/^[═─]{5,}/.test(ln) || ln.startsWith("[") || /^영상 길이|^Hook 패턴|^화자|^시각 트랙|^※/.test(ln)) {
      // 헤더/구분선/메타는 그대로
      out.push(ln);
      continue;
    }
    if (inSlide && ln.trim()) {
      out.push(spaceNarration(ln));
    } else {
      out.push(ln);
    }
  }
  return out.join("\n");
}

export function buildMetadataTxt(meta: MetadataResult): string {
  return `■ 제목 후보 (5개)
${meta.titles.map((t, i) => `${i + 1}) ${t}`).join("\n")}

■ 디스크립션
${meta.description}

■ 태그 (${meta.tags.length}개)
${meta.tags.join(", ")}

${meta.pinnedComment ? `■ 고정댓글 후보\n${meta.pinnedComment}\n` : ""}`;
}

/** 슬라이드 + 썸네일 이미지 프롬프트 모음 (수동 생성용) */
export function buildImagePromptsTxt(
  blog: ParsedBlog,
  thumb: ThumbnailResult | null,
  format: VideoFormat = "long",
  /** 지정 시 이 번호의 슬라이드만 출력 (숏폼: 대본이 실제로 쓰는 슬라이드만) */
  onlyIndices?: Set<number>
): string {
  const ratioNote =
    format === "short"
      ? "# 원본 블로그 내장 프롬프트를 숏폼 1:1 1080x1080 으로 보정함"
      : "# 원본 블로그 내장 프롬프트를 유튜브 16:9 1920x1080 으로 보정함";
  const parts: string[] = [
    "# 인포그래픽 슬라이드 이미지 프롬프트 (Gemini / Google Flow 수동 생성용)",
    ratioNote,
    "",
  ];
  const slots =
    onlyIndices && onlyIndices.size > 0
      ? blog.imageSlots.filter((s) => onlyIndices.has(s.index))
      : blog.imageSlots;
  for (const slot of slots) {
    const n = String(slot.index).padStart(2, "0");
    parts.push(
      `## slide-${n}  [${slot.type}]${slot.isHero ? "  ⭐대표/썸네일 후보" : ""}`,
      adaptImagePromptForYoutube(slot.prompt, format),
      ""
    );
  }
  if (thumb) {
    parts.push(
      "## 썸네일",
      thumb.imagePrompt,
      "",
      "[Negative]",
      thumb.negativePrompt,
      ""
    );
  }
  return parts.join("\n");
}
