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

/** 영상 구조·리텐션 규칙 (2026 발달/육아 채널 기준) */
export const SCRIPT_STRUCTURE = `영상 구조·이탈 방지 규칙 (육아·치료에 지친 시청자 기준):
- 분량: 공백 제외 한국어 발화 기준 분당 약 300~350자. (예: 8분 영상 ≈ 2,400~2,800자)
- [인트로 훅 / 0~30초] 인사·채널 소개는 생략하거나 뒤로 미룬다. 시작하자마자 부모·치료사가 겪는 가장 가려운 통점을 짚고, 이 영상으로 얻을 '하나의 명확한 해결책'을 약속한다. 두괄식.
  예) "STNR, 대칭성 긴장성 목 반사가 안 빠지면 아이가 똑바로 앉지 못합니다. 오늘 집에서 3분 만에 체크하는 법을 알려드릴게요."
- [본론 / 30초~7분] 핵심 요점을 3가지 이내로 쪼갠다. 전문 용어(TLR, ATNR 등)가 나오면 반드시 그 자리에서 쉬운 말로 풀고, 해당 슬라이드(시각자료)가 그 설명을 받친다고 전제하고 쓴다. 매 20~30초마다 화면 전환·예시·반전 등 '패턴 브레이크'가 들어갈 지점을 의식해 리듬을 끊어준다.
- [아웃트로 / 7~8분] 핵심을 요약한 뒤, 무거운 구독 요청 대신 "이 원리를 알았다면 다음은 이 영상을 보세요"로 다음 단계 영상(엔드스크린)으로 연결해 연쇄 시청을 유도한다.`;

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

${SCRIPT_STRUCTURE}

[작업]
아래 네이버 블로그 글 한 편을, 짱샘이 혼자 내레이션하는 유튜브 영상 대본으로 변환한다.
영상의 시각 트랙은 본문에 표시된 인포그래픽 슬라이드 ${blog.imageSlots.length}장이다.
각 슬라이드가 화면에 떠 있는 동안 짱샘이 그 내용을 풀어 설명하는 구조로, 슬라이드 순서대로 내레이션을 배치한다.
- 맨 앞에 imageRef=null 인 인트로(Hook) 1개를 둔다. 영상 첫 문장은 Hook 패턴 A~J 중 가장 맞는 것으로 시작.
- 각 인포그래픽 슬라이드(#1~#${blog.imageSlots.length})마다 슬라이드 1개를 만들고 imageRef에 번호를 넣는다.
- 3~4번째 슬라이드 직전 / 중반(50%) / 마무리 직전에 retention hook 한 줄("그런데 진짜 중요한 건", "여기서 많은 분이 놓치는 게" 등)을 내레이션에 자연스럽게 녹인다.
- 맨 끝에 imageRef=null 인 아웃트로 1개: 핵심 3줄 요약 + "이 원리를 알았다면 다음은 ~ 영상을 보세요" 식 다음 단계 영상 유도(연쇄 시청) + 짱샘의 책방「${blog.meta.title ?? "관련 전자책"}」 안내 + YMYL 면책 1줄. 구독·좋아요는 가볍게 한 번만(무겁게 매달리지 말 것). 매번 다른 표현으로.
- 전체 분량 목표: 약 ${opts.minutes}분 (공백 제외 한국어 발화 기준 분당 약 300~350자 = 약 ${opts.minutes * 300}~${opts.minutes * 350}자).
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
- 제목 후보 5개 (SEO + 호기심 동시 충족):
  · 첫 40글자 이내에 핵심 검색어 "${blog.meta.mainKeyword ?? ""}"를 넣되, 뒷부분에서 궁금증을 유발하는 구조.
  · '정보'와 '결과'의 비대칭성: 무엇에 관한 이야기인지는 밝히되 그 '결과·방법'은 비밀로 남겨 클릭하게 만든다.
  · '부정형 프레이밍/손실 회피'를 우선: 부모·치료사는 '더 좋은 것'보다 '놓쳐서 아이에게 해가 되는 것'에 훨씬 민감하다.
  · 5개를 서로 다른 구조로: 호기심형 / 손실회피형 / 타겟팅형 / 숫자형 / 결과비밀형.
    예) 호기심형 "산만한 아이, ADHD가 아니라 '이것'이 원인일 수 있습니다 (STNR 체크법)"
        손실회피형 "발달 치료 수업 전, 반드시 확인해야 할 원시반사 3가지"
        타겟팅형 "자폐 스펙트럼 아동을 둔 부모가 집에서 매일 해야 하는 '이 행동'"
  · 과한 어그로·단정("무조건 낫는다") 금지.
- 디스크립션 (AI가 맥락을 이해해 관련영상 추천에 쓰는 핵심 소스. 타임라인은 넣지 않는다):
  · 첫 2줄: '더보기' 전 노출 구역. 핵심 키워드("${blog.meta.mainKeyword ?? ""}" 등)를 자연스럽게 녹인 핵심 요약 2줄.
  · 본문은 이모지로 문단을 나눠 스캐닝하기 좋게. 예시 문단:
      💡 영상 요약: 이 영상에서 다루는 핵심 한두 문장.
      🌱 이런 분들께 추천해요: 가정에서 아이 발달을 돕고 싶은 부모님, 현장의 아동 치료사 선생님.
      📚 짱샘의 책방「${blog.meta.title ?? ""}」 안내 1줄 (관련 링크: ${blog.meta.relatedEbook ?? "https://jjangsaem.com/n"}).
  · 맨 아래에 해시태그 3~5개만. 대분류→중분류→소분류 순(예: #발달장애아동 #원시반사 #ATNR). 그 이상은 스팸 처리되니 금지.
  · 마크다운 기호 금지, 자연스러운 한국어.
- 태그: 10~15개 이내. 아래 카테고리를 섞는다.
  · 핵심 타겟 키워드 1~3개 (영상 메인 주제)
  · 연관·확장 키워드 3~5개 (검색할 만한 문장형/단어형)
  · 오타·유사어·약어 2~3개 (자주 틀리는 표기, 영문/한글 표기 변형)
  · 채널 고유 태그 1개 (브랜드명)
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
  phrases: string[]; // 5개, 8~12자(3~4단어)
  miniCopyLeft: string;
  miniCopyRight: string;
}

export function buildThumbnailPrompt(blog: ParsedBlog): string {
  const hero = blog.imageSlots.find((s) => s.isHero) ?? blog.imageSlots[0];
  return `${PERSONA}

[작업]
아래 블로그 기반 유튜브 영상의 썸네일을 설계한다.
채널 톤은 부드러운 한국 육아 매거진풍 인포그래픽이다. 아래 원본 대표 인포그래픽 프롬프트의 스타일·색감을 계승하되, 유튜브 피드에서 눈에 띄도록 임팩트를 키운다.

요구사항 (2026 발달·아동 카테고리 추세: '자극적 표정' 지양, '신뢰감·명확성' 극대화. 유튜브 비전 모델이 썸네일을 직접 분석하므로 반드시 영상 내용과 직결된 직관적 이미지):
- imagePrompt: 영문. 16:9, 1920x1080.
  · 단일 포커스(One Focal Point) — 복잡한 배경이나 여러 인물 금지. 깔끔한 단색 또는 치료실/연구실 배경 위에, ① 발달 지연 아이의 특정 행동(예: 까치발, 독특한 앉은 자세) 또는 ② 신뢰감 있는 전문가의 모습 중 '하나만' 크게 배치.
  · 핵심 인물·오브젝트에 미세한 아웃라인(Glow) 효과로 배경과 분리해 시선을 모은다.
  · 채널 톤은 부드러운 한국 육아 매거진풍 카툰 인포그래픽. 따뜻한 고대비 색. 텍스트는 넣지 말 것(문구는 편집 단계 합성).
- negativePrompt: 텍스트·로고·워터마크·실사 사진·3D·과장된 표정·여러 인물·산만한 배경을 강하게 배제.
- phrases: 썸네일에 얹을 한국어 문구 5개. 핵심은 "3~4단어, 8~12자 내외, 제목의 요약이 아니라 감정·호기심·즉각적 이득 자극". 제목에 이미 있는 단어를 그대로 반복하지 말고 제목과 '보완' 관계로. 과한 어그로 금지(예: "우리 아이 자폐일까?"처럼 거부감 유발하는 직접 단정 금지). 느낌표·물음표 최대 2개.
    좋은 예) "이것" 모르면 고생합니다 / "설마 우리 아이도?" / 똑바로 못 앉는 이유
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
