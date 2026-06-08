/**
 * 짱샘 유튜브 메이커 — Claude 프롬프트 템플릿 ("짱샘 두뇌")
 *
 * 기존 jjangsaem-bookshop /generate-youtube-video 스킬의 규칙
 * (Hook 10패턴 · TTS 친화 · CTA · 썸네일 · 디스크립션·태그)을
 * "짱샘 단독 내레이션" 버전으로 재구성.
 *
 * 모든 프롬프트는 결과를 ```json 펜스로 감싼 구조화 출력으로 요청한다.
 * → 자동(API)/수동(Claude.ai 붙여넣기) 모드가 동일한 파서로 흐른다.
 */

import type { ParsedBlog } from "./parser";

/** 짱샘 페르소나·톤 공통 지침 */
export const PERSONA = `너는 "짱샘"이다. 25년차 소아 재활치료사이며 발달지연·이른둥이 아동 재활 전문가다.
대상 시청자는 발달이 걱정되는 아이를 키우는 30~40대 부모다.
톤: 부모에게 옆집 전문가가 차 한잔 하며 들려주듯 친근하면서도 전문적. 따뜻하고 신뢰감 있게, 강의처럼 딱딱하지 않게.
'진료실'이라는 단어는 절대 쓰지 말 것 — 반드시 '치료실'.
정보 제공 목적이며 전문의 상담을 대체하지 않는다는 점을 마무리에 1회 언급.`;

/** Hook 10패턴 요약 (대본 첫 문장용) */
export const HOOK_PATTERNS = `Hook 패턴 (영상 첫 문장은 반드시 아래 중 하나로 시작):
A 충격적 문제 제기(가정형) — "만약 ~라면 어떨까요?"
B 상식 반박 — "~라고 믿지만 사실은 ~"
C 시간 약속 — "다음 N분만 보시면 ~"
D 통계/충격 수치 — 구체 숫자를 첫 줄에
E 비밀/교과서 밖 — "치료실에서는 잘 말해주지 않는~"
F 시청자 정조준 — "지금 ~하고 계신가요? 그게 ~"
G 회상 자극 — "마지막으로 ~한 게 언제였나요?"
H 결과 먼저 — 핵심 결과를 첫 컷에
I 최근 발견 — "저도 최근에서야 알게 된~"
J 비교 한 줄 — "A와 B, 단 한 가지로 갈립니다"`;

/** TTS 친화 규칙 (단독 내레이션) */
export const TTS_RULES = `대본 작성 규칙 (Google AI Studio TTS 단독 보이스로 녹음):
- 발화 안에 소괄호 ( ) 절대 금지. 영문 약어·부연은 쉼표·줄바꿈으로 풀어 쓴다.
  예) ❌ "ATNR이라는 반사(비대칭 긴장성 목 반사)" → ✅ "ATNR, 비대칭 긴장성 목 반사라고 부르는 반사"
- 마크다운 기호(**, #, > 등) 금지. 순수 텍스트.
- 화자 라벨·연출 메모·[자막] 같은 메타 라인 금지. 내레이션 텍스트만.
- 문장 길이를 의도적으로 변주(짧·짧·긴 리듬). 같은 길이 문장 3연속 금지.
- 도입 금지문구: "안녕하세요", "오늘은 ~에 대해 알아보겠습니다", "이번 영상에서는".`;

function blogContext(blog: ParsedBlog): string {
  const slotLines = blog.imageSlots
    .map((s) => `  - 슬라이드 #${s.index} [${s.type}]${s.isHero ? " (대표/썸네일 후보)" : ""}`)
    .join("\n");
  return `[원본 블로그 메타]
제목: ${blog.meta.title ?? ""}
카테고리: ${blog.meta.category ?? ""}
메인 키워드: ${blog.meta.mainKeyword ?? ""}
서브 키워드: ${blog.meta.subKeywords.join(", ")}
롱테일 키워드: ${blog.meta.longtailKeywords.join(", ")}
관련 전자책: ${blog.meta.relatedEbook ?? ""}

[인포그래픽 슬라이드 ${blog.imageSlots.length}장 — 영상의 시각 트랙]
${slotLines}

[원본 블로그 본문]
${blog.bodyText}`;
}

/* ────────────────────────────────────────────────────────────────
 * 1) 대본 (짱샘 단독 내레이션) — 주제·앵글·Hook 선택까지 포함
 * ──────────────────────────────────────────────────────────────── */

export interface ScriptSlide {
  /** 매칭되는 인포그래픽 슬라이드 번호. 인트로/아웃트로는 null */
  imageRef: number | null;
  heading: string;
  seconds: number;
  narration: string;
}

export interface ScriptResult {
  videoTitleWorking: string;
  hookPattern: string; // A~J
  hookPatternLabel: string;
  estimatedMinutes: number;
  slides: ScriptSlide[];
}

export function buildScriptPrompt(
  blog: ParsedBlog,
  opts: { minutes: number }
): string {
  return `${PERSONA}

${HOOK_PATTERNS}

${TTS_RULES}

[작업]
아래 네이버 블로그 글 한 편을, 짱샘이 혼자 내레이션하는 유튜브 영상 대본으로 변환한다.
영상의 시각 트랙은 본문에 표시된 인포그래픽 슬라이드 ${blog.imageSlots.length}장이다.
각 슬라이드가 화면에 떠 있는 동안 짱샘이 그 내용을 풀어 설명하는 구조로, 슬라이드 순서대로 내레이션을 배치한다.
- 맨 앞에 imageRef=null 인 인트로(Hook) 1개를 둔다. 영상 첫 문장은 Hook 패턴 A~J 중 가장 맞는 것으로 시작.
- 각 인포그래픽 슬라이드(#1~#${blog.imageSlots.length})마다 슬라이드 1개를 만들고 imageRef에 번호를 넣는다.
- 3~4번째 슬라이드 직전 / 중반(50%) / 마무리 직전에 retention hook 한 줄("그런데 진짜 중요한 건", "여기서 많은 분이 놓치는 게" 등)을 내레이션에 자연스럽게 녹인다.
- 맨 끝에 imageRef=null 인 아웃트로 1개: 핵심 3줄 요약 + 짱샘의 책방「${blog.meta.title ?? "관련 전자책"}」 안내 + 구독·좋아요 CTA + YMYL 면책 1줄. 매번 다른 표현으로.
- 전체 분량 목표: 약 ${opts.minutes}분 (한국어 발화 기준 분당 약 320~350자).
- 본문 내용을 그대로 베끼지 말고 말로 설명하듯 자연스럽게 재구성. 단정적 인과("무조건 좋아집니다") 금지, 개별 차이 명시.

[출력 — 반드시 아래 JSON 한 덩어리만, 코드펜스로 감싸서]
\`\`\`json
{
  "videoTitleWorking": "영상 내부용 작업 제목",
  "hookPattern": "A~J 중 한 글자",
  "hookPatternLabel": "패턴 한국어 라벨",
  "estimatedMinutes": ${opts.minutes},
  "slides": [
    { "imageRef": null, "heading": "인트로(Hook)", "seconds": 10, "narration": "..." },
    { "imageRef": 1, "heading": "...", "seconds": 45, "narration": "..." }
  ]
}
\`\`\`

${blogContext(blog)}`;
}

/* ────────────────────────────────────────────────────────────────
 * 2) 메타데이터 (제목 후보 · 디스크립션 · 태그)
 * ──────────────────────────────────────────────────────────────── */

export interface MetadataResult {
  titles: string[]; // 5개
  description: string;
  tags: string[];
  pinnedComment?: string;
}

export function buildMetadataPrompt(blog: ParsedBlog): string {
  return `${PERSONA}

[작업]
아래 블로그 기반 유튜브 영상의 메타데이터를 작성한다.

요구사항:
- 제목 후보 5개: 각 서로 다른 패턴(숫자형/질문형/반전형/결과형/비밀형). 핵심 키워드 "${blog.meta.mainKeyword ?? ""}"를 앞쪽에. 클릭베이트 금지, 40자 이내 권장.
- 디스크립션: 첫 2줄에 핵심 후킹 + 키워드(미리보기 노출 영역), 이어서 영상 요약 3~5줄, 짱샘의 책방「${blog.meta.title ?? ""}」 안내 1줄(관련 링크: ${blog.meta.relatedEbook ?? "https://jjangsaem.com/n"}), "타임스탬프는 영상 편집 후 추가" 자리 표시, 마지막에 해시태그 5개. 자연스러운 한국어, 마크다운 금지.
- 태그: 15~20개. 메인/서브/롱테일/연관 키워드 혼합, 띄어쓰기 변형 포함.
- 고정댓글 후보 1개: 시청자 참여 유도 질문형.

[출력 — JSON 한 덩어리만, 코드펜스로 감싸서]
\`\`\`json
{
  "titles": ["", "", "", "", ""],
  "description": "여러 줄 문자열",
  "tags": ["", ""],
  "pinnedComment": ""
}
\`\`\`

${blogContext(blog)}`;
}

/* ────────────────────────────────────────────────────────────────
 * 3) 썸네일 (이미지 프롬프트 + 문구 5개)
 * ──────────────────────────────────────────────────────────────── */

export interface ThumbnailResult {
  imagePrompt: string;
  negativePrompt: string;
  phrases: string[]; // 5개, 8~14자
  miniCopyLeft: string;
  miniCopyRight: string;
}

export function buildThumbnailPrompt(blog: ParsedBlog): string {
  const hero = blog.imageSlots.find((s) => s.isHero) ?? blog.imageSlots[0];
  return `${PERSONA}

[작업]
아래 블로그 기반 유튜브 영상의 썸네일을 설계한다.
채널 톤은 부드러운 한국 육아 매거진풍 인포그래픽이다. 아래 원본 대표 인포그래픽 프롬프트의 스타일·색감을 계승하되, 유튜브 피드에서 눈에 띄도록 임팩트를 키운다.

요구사항:
- imagePrompt: 영문. 16:9, 1920x1080. 굵고 단순한 중심 비주얼 1개(카툰 캐릭터 클로즈업 또는 큰 핵심 심볼) + 고대비 따뜻한 색. 실사 사진 금지(카툰 인포그래픽만). 텍스트는 넣지 말 것 — 문구는 편집 단계에서 합성.
- negativePrompt: 텍스트·로고·워터마크·실사·3D 등 강하게 배제.
- phrases: 썸네일에 얹을 한국어 문구 5개. 각 8~14자, 서로 다른 패턴(숫자/질문/반전/결과/비밀). 느낌표·물음표 최대 2개.
- miniCopyLeft: 좌측 상단 8자 이내 후크(예: "혹시 우리 아이도?").
- miniCopyRight: "25년차 소아발달 재활 전문가" 고정.

[원본 대표 인포그래픽 프롬프트 — 스타일 참고]
${hero?.prompt ?? "(없음)"}

[출력 — JSON 한 덩어리만, 코드펜스로 감싸서]
\`\`\`json
{
  "imagePrompt": "",
  "negativePrompt": "",
  "phrases": ["", "", "", "", ""],
  "miniCopyLeft": "",
  "miniCopyRight": "25년차 소아발달 재활 전문가"
}
\`\`\`

제목: ${blog.meta.title ?? ""}
메인 키워드: ${blog.meta.mainKeyword ?? ""}`;
}

/* ────────────────────────────────────────────────────────────────
 * 공통 — Claude 응답에서 JSON 추출
 * ──────────────────────────────────────────────────────────────── */

export function extractJson<T>(text: string): T {
  // ```json ... ``` 우선, 없으면 첫 { ~ 마지막 }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("JSON을 찾지 못했습니다. Claude 응답 형식을 확인하세요.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

/* ────────────────────────────────────────────────────────────────
 * 이미지 프롬프트 — 블로그용 → 유튜브 슬라이드용 보정 (코드 레벨, Claude 불필요)
 * ──────────────────────────────────────────────────────────────── */

export function adaptImagePromptForYoutube(prompt: string): string {
  return prompt
    .replace(/suitable for blog reading on mobile/gi, "suitable for a full-screen YouTube explainer video slide")
    .replace(/suitable for a mobile feed thumbnail/gi, "suitable for a full-screen YouTube video slide")
    .replace(/16:9 1280x720 aspect ratio/gi, "16:9 1920x1080 aspect ratio")
    .replace(/16:9 aspect ratio/gi, "16:9 1920x1080 aspect ratio")
    .trim();
}
