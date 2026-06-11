# 짱샘 유튜브 메이커 — WORK-LOG

> 네이버 블로그 txt 한 편(= 유튜브 1편)을 유튜브 대본·인포그래픽·썸네일·제목·디스크립션·태그로 변환하는 웹앱.
> **돌아왔을 때: 이 파일 §4(돌아오면 곧바로 할 일)부터 읽고 to-do를 제시할 것.**

최종 업데이트: 2026-06-11 (오늘 변경 이력은 §9 참고)

---

## 1. 프로젝트 개요

- **위치**: `C:\Users\bsuha\Claude-prj\youtue-jjangsaem` (폴더명 오타 `youtue-`, GitHub repo는 `youtube-jjangsaem`)
- **목적**: `짱샘의 책방` 네이버 블로그용 txt를 그대로 유튜브 영상 제작 자산으로 변환. txt 1개 = 유튜브 1편.
- **소스 txt 위치**: `C:\Users\bsuha\Claude-prj\ebook\jjangsaem-bookshop\naver-blog\*.txt`
  - `/generate-naver-blog` 스킬이 생성. 메타헤더 + 짱샘 1인칭 본문 + **인포그래픽 슬라이드 9~10장의 영문 Gemini 프롬프트가 내장**되어 있어 그대로 재활용.
- **스택**: Next.js 16 + React 19 + Tailwind v4 (jjangsaem-bookshop과 동일 인프라)
  - Claude Opus 4.8 (`claude-opus-4-8`, `@anthropic-ai/sdk`) = 대본/메타데이터/썸네일 문구
  - Gemini (`gemini-3.1-flash-image-preview`, `@google/genai`) = 인포그래픽/썸네일 이미지 (2026-06-11 모델 교체, 이미지 내 한글 렌더 개선)
- **핵심 설계 원칙**: 모든 생성 단계가 **자동(API) / 수동(프롬프트 복사 → claude.ai·Google Flow 결과 붙여넣기)** 병행 (비용 절약).

---

## 2. 사용자와 확정한 결정사항 (이 세션 초반 AskUserQuestion)

| 결정 | 선택 |
|---|---|
| 실행 환경 | txt 업로드 입력 + **Vercel 배포** (로컬·배포 모두 동작) |
| 대본 형식 | **짱샘 단독 내레이션/강의 톤** (호스트+답변자 2인 아님). 대본만 출력 → 사용자가 TTS로 음성 제작 |
| 이미지 전략 | **txt 내장 프롬프트 재활용 + 유튜브 16:9 보정** |
| 산출물 저장 | 새 프로젝트 내 `output/` 폴더 (로컬) |

**정합성 보정**: Vercel 서버리스는 파일시스템 쓰기 불가 → 로컬은 `output/` 자동 저장, 배포본은 **ZIP 다운로드**로 폴백.

---

## 3. 구현 내역 (파일별)

```
youtue-jjangsaem/
├── src/lib/
│   ├── parser.ts        txt → 메타·본문·섹션·이미지슬롯(내장 프롬프트)·해시태그 구조화 (순수 함수, 서버/클라 공용)
│   ├── prompts.ts       "짱샘 두뇌": buildScriptPrompt(롱폼/숏폼 분기·Hook 10패턴·TTS친화·SCRIPT_STRUCTURE)
│   │                    / buildShortsScriptPrompt(SHORTS_STRUCTURE, 60초 미만) / buildMetadataPrompt
│   │                    / buildThumbnailPrompt(실사풍) / extractJson / adaptImagePromptForYoutube(format)
│   │                    ※ VideoFormat="long"|"short" 타입. 2026 발달/육아 채널 카피·SEO 규칙 내장 (§8 참고)
│   ├── assemble.ts      결과 → script.txt / script-spaced.txt(글자 띄어쓰기) / metadata.txt / images/prompts.txt
│   ├── anthropic.ts     서버 전용 Claude 호출 (CLAUDE_MODEL = claude-opus-4-8)
│   ├── gemini.ts        서버 전용 Gemini 이미지 (IMAGE_MODEL = gemini-3.1-flash-image-preview)
│   │                    generateImage(prompt, aspectRatio) — config.imageConfig.aspectRatio로 비율 강제
│   └── client.ts        클라 fetch 헬퍼 + JSZip ZIP 다운로드 + 이미지 다운로드/복사
├── src/app/
│   ├── page.tsx         6단계 위저드 (업로드→대본→메타→썸네일→슬라이드이미지→산출물)
│   ├── layout.tsx, globals.css   다크 테마, 유튜브 레드 액센트
│   └── api/
│       ├── claude/route.ts        얇은 프록시: {prompt,maxTokens} → text (파싱은 클라가)
│       ├── gemini-image/route.ts  {prompt} → base64 dataUrl
│       └── save/route.ts          로컬 output/ 저장 (서버리스에선 실패→클라 ZIP 폴백)
├── src/components/
│   ├── ClaudeStep.tsx   Claude 단계 공용 UI: 자동(API 호출)/수동(프롬프트 복사+결과 붙여넣기) 토글
│   ├── ImageStep.tsx    이미지 공용 UI: 자동(Gemini)/수동(Google Flow 프롬프트 복사 후 png 업로드)
│   └── ui.tsx           Card·Button·ModeToggle·CopyBox·TextArea·Spinner·ErrorMsg
├── scripts/
│   ├── test-parse.ts    파서 검증용 (node --experimental-strip-types)
│   └── live-test.ts     배포본 API 라이브 점검용 (미커밋, 머신 종속 경로)
├── README.md, vercel.json, .env.local.example, .gitignore, package.json, tsconfig.json
└── output/              (gitignore) 로컬 산출물
```

### 동작 흐름
1. txt 업로드/붙여넣기 → `parseBlog`로 구조화 미리보기
2. **대본**: **롱폼/숏폼 토글** 선택. 롱폼=영상 길이(분) 지정 → `buildScriptPrompt`. 숏폼=`buildShortsScriptPrompt`(60초 미만, 250~320자, 핵심 하나 압축) → 자동/수동 → JSON 파싱. 인트로(Hook)+슬라이드별 내레이션+아웃트로
3. **메타데이터**: 제목 후보 5개 / 디스크립션 / 태그 10~15개 / 고정댓글
4. **썸네일** (롱폼만, 숏폼은 생략): 메인 문구 5개(택1, 12~18자 또는 두 줄) + **실사풍** 썸네일 이미지 (텍스트 없는 이미지 + 합성용 문구)
5. **슬라이드 이미지**: 내장 프롬프트를 `adaptImagePromptForYoutube(prompt, format)`로 보정(롱폼=16:9 1920x1080 / 숏폼=1:1 1080x1080) → 슬라이드별 자동/수동. 비율은 Gemini API `aspectRatio`로 강제
6. **산출물**: `output/<slug>/` 저장(로컬) 또는 ZIP 다운로드

### 산출물 구조
```
output/<slug>/
├── script.txt          썸네일 프롬프트 + TTS Scene/Context 헤더 + Slide별 짱샘 내레이션
├── script-spaced.txt   발화만 글자 단위 띄어쓰기(어절내 1칸·어절간 2칸·문장부호 앞 공백X)
├── metadata.txt        제목 후보 / 디스크립션 / 태그 / 고정댓글
├── images/
│   ├── prompts.txt     슬라이드+썸네일 이미지 프롬프트 (수동 생성용)
│   └── slide-NN.png    자동 생성 인포그래픽 (선택)
└── thumbnail/thumbnail.png
```

---

## 4. 돌아오면 곧바로 할 일 (TODO) ⭐

**🟢 현재 상태: 구현 완료 + 배포 완료. 2026-06-11 피드백 1차 반영 완료(§9). 🔴 긴급 블로커 없음.**

다음 우선순위(모두 선택):

0. **2026-06-11 변경분 배포 결과 확인** — 실사 썸네일·숏폼 대본·`gemini-3.1-flash-image-preview` 이미지가 배포본에서 의도대로 나오는지. 특히 ①preview 모델 404 여부 ②실사 아이 표정·손가락 품질 편차 ③숏폼 1:1 비율 적용. 문제 시 네거티브/모델ID 보강.
1. **사용자 실사용 피드백 반영** — 사용자가 배포 환경에서 직접 테스트 중. 돌아왔을 때 먼저 "테스트 결과/피드백 있었는지" 물을 것. 대본 톤·썸네일 문구·JSON 파싱 등 조정 요청 가능성.
2. **전체 대본 생성(20k 토큰) 미검증** — 가장 무거운 단계만 비용상 직접 안 돌림. 같은 `/api/claude`+`extractJson` 경로라 정상 가능성 높음. 실패 시 maxTokens·JSON 펜스 파싱 점검.
3. **슬라이드 일괄 생성 UX** — 현재 슬라이드 9장을 하나씩 `⚡ 생성`. "전체 자동 생성" 버튼(순차/병렬) 추가 검토.
4. **대본 편집 기능** — 현재 생성 결과는 읽기 표시. 슬라이드별 내레이션 인라인 편집 후 재조립 기능 검토.
5. **로컬 폴더 자동 읽기(선택)** — 지금은 업로드만. 로컬 dev에서 `naver-blog/` 폴더 목록을 바로 고르는 편의 기능 추가 가능(보안상 배포본은 제외).

---

## 5. 검증 내역 (정직하게)

| 항목 | 상태 |
|---|---|
| `npm run build` (Next 16) | ✅ 통과 (2026-06-11 변경분 포함 재확인) |
| `tsc --noEmit` | ✅ 통과 (2026-06-11 재확인) |
| 2026-06-11 변경분 배포본 실결과(실사 썸네일/숏폼/3.1 모델) | ⚠️ 사용자 배포 테스트 대기 |
| 파서 — 실제 naver-blog txt 4개 | ✅ 메타·키워드·섹션·슬라이드9장+프롬프트 정확 추출 |
| 띄어쓰기 변환 | ✅ 스펙 일치 |
| 로컬 dev 홈 렌더 | ✅ HTTP 200 |
| **배포본 `/api/claude` (메타데이터)** | ✅ HTTP 200 · 19.9s · JSON 정상 (제목+태그20개) |
| **배포본 `/api/gemini-image`** | ✅ HTTP 200 · 7.9s · 유효 PNG ~1.5MB |
| 전체 대본 생성(무거운 단계) | ⚠️ 직접 미실행 (동일 경로라 정상 추정) |

---

## 6. 운영 / 배포 정보

- **배포 URL**: https://youtube-jjangsaem.vercel.app/
- **GitHub**: https://github.com/haemiru/youtube-jjangsaem (독립 repo, `main` 브랜치)
  - ⚠️ Claude-prj monorepo 안에 있지만 **자체 .git을 가진 독립 repo** (stoss·regist-form과 동일 패턴). monorepo로 커밋하지 말 것.
- **Vercel**: junominu's projects (Pro 플랜), Project=youtube-jjangsaem, Root Directory=`./`, Preset=Next.js
  - Pro 플랜 필수 이유: `vercel.json`에서 `/api/claude` maxDuration=300s (Hobby는 60s 한도라 긴 대본 타임아웃)
- **환경변수** (Vercel + 로컬 `.env.local`): `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` (사용자가 신규 발급해 입력함). `OUTPUT_DIR`은 로컬 전용.
- **로컬 실행**: `npm run dev` → http://localhost:3000

---

## 7. 주의사항

- **배포본에선 "💾 로컬 저장" 버튼 불가** (서버리스 읽기전용) → **ZIP 다운로드** 사용. 앱이 자동 폴백 처리.
- API 키는 절대 커밋 금지. `.env.local`은 `.gitignore` 처리됨 (`.env.local.example` 템플릿만 커밋).
- 대본은 BGM 없는 짱샘 단독 내레이션 (youtube-factory 정책과 일관). 2인 대화 아님.
- 이미지 모델 `gemini-3.1-flash-image-preview`로 이미지 내 한글 렌더 개선(2026-06-11). 단 **썸네일은 여전히 텍스트 없는 이미지 + 합성용 문구** 방식 유지(편집 단계 합성).
  - ⚠️ `gemini-3.1-flash-image-preview`는 preview 모델 — API 호출 시 모델명 404가 나면 정식 ID로 교체 필요.
- **썸네일 화풍 = 실사풍(photorealistic)**. 본문 슬라이드(카툰 인포그래픽)와 의도적으로 분리. 카툰 일관형은 사용자 요청으로 폐기(§9 참고).

---

## 8. 카피·SEO 규칙 내장 (2026-06-09, 발달/아동 채널 기준)

사용자가 확정한 2026 추세 규칙을 `src/lib/prompts.ts`에 직접 반영. 자동(API)/수동 어느 모드로 생성하든 항상 동일 규칙 적용.

| 산출물 | 빌더 / 위치 | 핵심 규칙 |
|---|---|---|
| **대본** | `SCRIPT_STRUCTURE` 상수 + `buildScriptPrompt` | 분당 300~350자(8분≈2,400~2,800자, 공백 제외) · 인트로 훅 0~30초 통점+해결책 두괄식 · 본론 3요점 이내·전문용어 시각자료 동반·20~30초 패턴브레이크 · **아웃트로는 구독 강요 대신 "다음 영상 보세요" 연쇄 시청(엔드스크린) 유도**, 구독·좋아요는 가볍게 1회 |
| **제목** | `buildMetadataPrompt` | 첫 40자 내 핵심 검색어 + 뒤에 궁금증 · 정보/결과 비대칭 · **손실회피 프레이밍 우선** · 호기심/손실회피/타겟팅/숫자/결과비밀 5종 |
| **디스크립션** | `buildMetadataPrompt` | 첫 2줄 키워드 요약(더보기 전 노출) · 💡/🌱/📚 이모지 문단 · **해시태그 3~5개(대→중→소)** · **타임라인 제외** |
| **태그** | `buildMetadataPrompt` | **10~15개** · 핵심타겟(1~3)/연관확장(3~5)/오타유사어(2~3)/채널고유(1) 카테고리화 |
| **썸네일 이미지** | `buildThumbnailPrompt` | (2026-06-11 개정) **실사풍(photorealistic)** · cinematic 자연광 + 얕은 심도 배경 보케로 깊이·맥락 · 한국 아이 1명 close-up이 프레임 60~75% · 한쪽 치우친 구도 + 반대쪽 제목 공간 · 텍스트 전면 금지(편집 합성) · 16:9 |
| **썸네일 문구** | `buildThumbnailPrompt` | (2026-06-11 개정) **메인 문구 5개 = 택1 후보** · 한 줄 12~18자 또는 두 줄(각 8~14자, `\n` 구분) · 제목 요약 아닌 감정/호기심 · 보완관계 · 과한 어그로 금지 |

**변경 전후 차이**: 태그 15~20→**10~15개**, 디스크립션 해시태그 5→**3~5개**, 디스크립션 타임스탬프 자리표시 **제거**, 아웃트로 구독 중심→**연쇄 시청 중심**.

---

## 9. 변경 이력 — 2026-06-11

이날 사용자 실사용 피드백을 받아 연속 개선. 모두 `main`에 커밋·푸시·Vercel 배포 완료. (시간순)

1. **이미지 모델 교체 + 16:9 비율 강제** (`cfdf39d`)
   - `gemini-2.5-flash-image` → **`gemini-3.1-flash-image-preview`** (이미지 내 한글 깨짐 개선).
   - 비율 1:1로 나오던 버그 수정: 프롬프트 문자열 치환이 아니라 **API `config.imageConfig.aspectRatio`로 강제**. `AspectRatio` 타입 추가, client→route→generateImage→ImageStep까지 인자 연결(기본 16:9, 검증·폴백).
2. **대본 롱폼/숏폼 선택** (`c35d176`)
   - STEP 2에 토글 추가. 롱폼=기존(분 단위). **숏폼=`buildShortsScriptPrompt`+`SHORTS_STRUCTURE`** (250~320자/45~55초, 핵심 하나 압축).
   - 숏폼 선택 시 **썸네일(STEP 4) 생략**, 인포그래픽 이미지 **1:1**. `adaptImagePromptForYoutube`/`buildImagePromptsTxt`에 `format` 인자 추가. 단계 번호 동적 조정.
3. **썸네일 개편 (3단계 반복)**
   - (a) `731be83` — 처음엔 **카툰 인포그래픽 일관형**: 슬라이드 스타일 첫 줄+Avoid 라인을 추출해 썸네일 화풍 고정.
   - (b) `7a8ee05` — 결과가 "거대한 여백에 아이가 작게 떠 있음". 원인=추출한 문장의 `single central visual/ample whitespace/blog thumbnail card`. 화풍 키워드만 쓰고 **피사체 크게(60~75%)·치우친 구도**로 수정.
   - (c) `2813a9d` — 사용자가 "이미지+편집 합성으로 가되, 너무 단순하지 않게 **실사**로". → **photorealistic·풍부한 장면(배경 보케)**으로 전환. 카툰 강제·추출 헬퍼(`extractStyleLine`/`extractAvoidLine`) 제거. **본문 슬라이드는 카툰 인포그래픽 유지, 썸네일만 실사.**
4. **썸네일 문구 길이 확장** (`9f80d81`)
   - "너무 짧다" 피드백 → `8~12자` → **한 줄 12~18자 또는 두 줄(`\n`)**. 5개가 택1 후보임을 명시. UI에 `white-space: pre-line`로 두 줄 미리보기.

**확정된 사용자 결정 (이날)**:
- 이미지 모델은 `gemini-3.1-flash-image-preview` 사용(한글 렌더 개선 목적).
- 숏폼 이미지는 **1:1**(쇼츠 9:16 캔버스 가운데 얹는 편집 전제). 9:16 풀화면 원하면 추후 변경.
- 썸네일은 **이미지+편집 합성** 유지(문구는 이미지에 안 박음) + **실사풍**.

**다음에 확인할 것**: 배포본에서 실사 썸네일/숏폼 대본/3.1 이미지모델 실제 결과. 실사 아이 표정·손가락 등 품질 편차 있으면 네거티브 추가 보강. preview 모델 404 여부.
