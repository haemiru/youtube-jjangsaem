/**
 * 네이버 블로그 txt 파서
 *
 * "짱샘의 책방" /generate-naver-blog 스킬이 생성한 txt 한 편을 구조화한다.
 * 서버·클라이언트 양쪽에서 쓸 수 있도록 Node 의존성 없는 순수 함수로 작성.
 *
 * txt 포맷 (요약):
 *   ════════ (메타 구분선)
 *   제목: ... / 카테고리: ... / 메인 키워드: ... ...
 *   ════════
 *   [여기서부터 네이버 블로그에 복사-붙여넣기]
 *   <본문 + 이미지 슬롯 블록 반복>
 *   #해시태그 #해시태그 ...
 *
 * 이미지 슬롯 블록:
 *   ━━━━━
 *   📷 이미지 #1 [타입: ...] — 여기에 이미지를 넣어주세요 ⭐홈판 대표이미지
 *   [Gemini 프롬프트]
 *   <영문 프롬프트 여러 줄>
 *   [/Gemini 프롬프트]
 *   ━━━━━
 */

export interface BlogMeta {
  title?: string;
  category?: string;
  account?: string;
  linkPolicy?: string;
  seriesIndex?: string;
  mainKeyword?: string;
  subKeywords: string[];
  longtailKeywords: string[];
  hashtags: string[];
  relatedEbook?: string;
  checklist?: string;
  author?: string;
  /** 인식하지 못한 키까지 포함한 원본 key:value */
  raw: Record<string, string>;
}

export interface ImageSlot {
  /** 이미지 #N 의 N */
  index: number;
  /** [타입: ...] 안의 텍스트 (예: "DIAGRAM", "COMPARISON 패턴 I", "썸네일 최적화 인포그래픽") */
  type: string;
  /** ⭐홈판 대표이미지 표시 여부 (= 썸네일/히어로 후보) */
  isHero: boolean;
  /** 📷 라벨 줄 전체 텍스트 */
  label: string;
  /** [Gemini 프롬프트] ~ [/Gemini 프롬프트] 안쪽 영문 프롬프트 */
  prompt: string;
}

export interface BlogSection {
  /** 섹션 첫머리 이모지 (없으면 "") */
  emoji: string;
  /** 이모지 제외한 제목 텍스트 */
  heading: string;
  /** 섹션 본문 (제목 줄 제외) */
  text: string;
}

export interface ParsedBlog {
  meta: BlogMeta;
  /** 이미지 슬롯 블록을 제거한 순수 본문 */
  bodyText: string;
  sections: BlogSection[];
  imageSlots: ImageSlot[];
  /** 본문 하단 해시태그 (메타 해시태그와 별개일 수 있음) */
  hashtags: string[];
  /** 본문 글자수 (공백·줄바꿈 제외) */
  charCount: number;
  warnings: string[];
}

const META_KEY_MAP: Record<string, keyof BlogMeta | "subKeywords" | "longtailKeywords" | "hashtags"> = {
  제목: "title",
  카테고리: "category",
  계정: "account",
  "링크 정책": "linkPolicy",
  "링크정책": "linkPolicy",
  "시리즈 순번": "seriesIndex",
  "메인 키워드": "mainKeyword",
  "서브 키워드": "subKeywords",
  "롱테일 키워드": "longtailKeywords",
  해시태그: "hashtags",
  "관련 전자책": "relatedEbook",
  체크리스트: "checklist",
  저자: "author",
};

/** 쉼표/가운뎃점/슬래시 등으로 나눈 키워드 리스트 정리 */
function splitList(value: string): string[] {
  return value
    .split(/[,，、/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** "#a #b #c" → ["#a", "#b", "#c"] */
function splitHashtags(value: string): string[] {
  return value
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("#"));
}

/** 선두 이모지(그림문자) 추출. 없으면 "" */
function leadingEmoji(line: string): string {
  const m = line.match(/^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/u);
  return m ? m[1] : "";
}

/** 인라인 강조 마커(섹션 헤딩이 아님) 라인인지 */
function isInlineMarker(line: string): boolean {
  return /^(💡|📌|✅|⚠️|🔗|👉|📖)\s*\S/.test(line) && /[:：]/.test(line.slice(0, 12));
}

export function parseBlog(input: string): ParsedBlog {
  const warnings: string[] = [];
  const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");

  // ── 1. 메타 블록 (첫 ═ 구분선 ~ 두 번째 ═ 구분선) ──────────────
  const sepIdx: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^═{5,}/.test(lines[i].trim())) sepIdx.push(i);
  }

  const raw: Record<string, string> = {};
  let contentStart = 0;
  if (sepIdx.length >= 2) {
    const metaLines = lines.slice(sepIdx[0] + 1, sepIdx[1]);
    for (const ln of metaLines) {
      const m = ln.match(/^\s*([^:：]+)\s*[:：]\s*(.+)\s*$/);
      if (m) raw[m[1].trim()] = m[2].trim();
    }
    contentStart = sepIdx[1] + 1;
  } else {
    warnings.push("메타 구분선(═════)을 찾지 못했습니다. 헤더 없이 본문만 파싱합니다.");
  }

  const meta: BlogMeta = {
    subKeywords: [],
    longtailKeywords: [],
    hashtags: [],
    raw,
  };
  for (const [k, v] of Object.entries(raw)) {
    const field = META_KEY_MAP[k];
    if (!field) continue;
    if (field === "subKeywords" || field === "longtailKeywords") {
      meta[field] = splitList(v);
    } else if (field === "hashtags") {
      meta.hashtags = splitHashtags(v);
    } else {
      (meta as unknown as Record<string, unknown>)[field] = v;
    }
  }
  if (!meta.title) warnings.push("제목(title)을 찾지 못했습니다.");

  // ── 2. 본문 영역 ──────────────────────────────────────────────
  let content = lines.slice(contentStart).join("\n");
  // "[여기서부터 네이버 블로그에 복사-붙여넣기]" 안내 줄 제거
  content = content.replace(/^\s*\[여기서부터[^\]]*\]\s*$/m, "");

  // ── 3. 이미지 슬롯 추출 ───────────────────────────────────────
  // 📷 이미지 #N [타입: ...] ... \n [Gemini 프롬프트] ... [/Gemini 프롬프트]
  const imageSlots: ImageSlot[] = [];
  const slotRe =
    /📷\s*이미지\s*#(\d+)\s*\[타입:\s*([^\]]+)\]([^\n]*)\n+\[Gemini 프롬프트\]\s*\n([\s\S]*?)\n\[\/Gemini 프롬프트\]/g;
  let sm: RegExpExecArray | null;
  while ((sm = slotRe.exec(content)) !== null) {
    const label = sm[0].split("\n")[0].trim();
    imageSlots.push({
      index: parseInt(sm[1], 10),
      type: sm[2].trim(),
      isHero: /⭐|홈판|대표이미지|썸네일/.test(sm[3]) || /썸네일/.test(sm[2]),
      label,
      prompt: sm[4].trim(),
    });
  }
  if (imageSlots.length === 0) {
    warnings.push("이미지 슬롯([Gemini 프롬프트] 블록)을 찾지 못했습니다.");
  }

  // ── 4. 이미지 블록 + 구분선 제거 → 순수 본문 ──────────────────
  let body = content
    // 슬롯 블록 전체 제거 (📷 라벨 ~ [/Gemini 프롬프트])
    .replace(
      /📷\s*이미지\s*#\d+[\s\S]*?\[\/Gemini 프롬프트\]/g,
      ""
    )
    // ━━━ 구분선 제거
    .replace(/^[━─]{5,}.*$/gm, "");

  // ── 5. 하단 해시태그 ──────────────────────────────────────────
  const bodyLines = body.split("\n");
  let hashtags: string[] = [];
  for (let i = bodyLines.length - 1; i >= 0; i--) {
    const t = bodyLines[i].trim();
    if (!t) continue;
    if (t.startsWith("#")) {
      hashtags = splitHashtags(t);
      bodyLines.splice(i, 1);
    }
    break;
  }
  body = bodyLines.join("\n");

  // 빈 줄 3개 이상 → 2개로 정리
  const bodyText = body.replace(/\n{3,}/g, "\n\n").trim();

  // ── 6. 섹션 분할 (이모지 선두 헤딩 기준, 인라인 마커 제외) ────
  const sections: BlogSection[] = [];
  let cur: BlogSection | null = null;
  for (const ln of bodyText.split("\n")) {
    const trimmed = ln.trim();
    const emoji = leadingEmoji(trimmed);
    const isHeading =
      emoji &&
      trimmed.length <= 60 &&
      !isInlineMarker(trimmed) &&
      // 헤딩은 보통 콜론으로 끝나는 인라인 강조가 아님
      !/[:：]\s*$/.test(trimmed);
    if (isHeading) {
      if (cur) sections.push(cur);
      cur = {
        emoji,
        heading: trimmed.slice(emoji.length).trim(),
        text: "",
      };
    } else if (cur) {
      cur.text += (cur.text ? "\n" : "") + ln;
    } else if (trimmed) {
      // 첫 헤딩 이전 도입부
      cur = { emoji: "", heading: "도입부", text: ln };
    }
  }
  if (cur) sections.push(cur);
  for (const s of sections) s.text = s.text.trim();

  // ── 7. 글자수 ─────────────────────────────────────────────────
  const charCount = bodyText.replace(/\s/g, "").length;

  return {
    meta,
    bodyText,
    sections,
    imageSlots,
    hashtags: hashtags.length ? hashtags : meta.hashtags,
    charCount,
    warnings,
  };
}
