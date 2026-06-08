# 짱샘 유튜브 메이커

"짱샘의 책방" 네이버 블로그 txt 한 편을 **유튜브 영상 제작 자산**으로 변환하는 웹앱.

- 입력: `jjangsaem-bookshop/naver-blog/*.txt` (또는 직접 붙여넣기) — **txt 1개 = 유튜브 1편**
- 출력: 대본(짱샘 단독 내레이션) · 인포그래픽 슬라이드 이미지 · 썸네일(문구+이미지) · 제목 후보 · 디스크립션 · 태그
- 모든 생성 단계는 **자동(API)** 과 **수동(프롬프트 복사 → Claude.ai / Google Flow 결과 붙여넣기)** 병행

## 스택

Next.js 16 · React 19 · Tailwind v4 · `@anthropic-ai/sdk`(Claude Opus 4.8) · `@google/genai`(Gemini 이미지)

## 셋업

```bash
cp .env.local.example .env.local   # 키 입력
npm install
npm run dev                        # http://localhost:3000
```

`.env.local` 에 다음 키 필요 (jjangsaem-bookshop 과 동일):

```
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
OUTPUT_DIR=./output   # 로컬 저장 폴더 (선택)
```

> ⚠️ API 키는 절대 커밋하지 마세요. `.env.local` 은 `.gitignore` 에 포함되어 있습니다.

## 사용 흐름

1. **업로드** — 블로그 txt 선택/붙여넣기 → 파싱(메타·본문·이미지 슬롯 9~10장 추출)
2. **대본** — 짱샘 단독 내레이션. 영상 길이 지정. Hook(A~J) + retention hook + TTS 친화(괄호 금지)
3. **메타데이터** — 제목 후보 5개 · 디스크립션 · 태그 15~20개
4. **썸네일** — 문구 5개 + 인포그래픽 썸네일 이미지
5. **인포그래픽 슬라이드** — 블로그 내장 프롬프트를 유튜브 16:9 로 보정 → 슬라이드별 Gemini 자동 / Google Flow 수동
6. **산출물** — `output/<slug>/` 로컬 저장 또는 ZIP 다운로드

### 산출물 구조

```
output/<slug>/
├── script.txt          # 썸네일 프롬프트 + TTS 헤더 + 슬라이드별 짱샘 내레이션
├── script-spaced.txt   # 빠른 발화용 글자 띄어쓰기 변형본
├── metadata.txt        # 제목 후보 / 디스크립션 / 태그 / 고정댓글
├── images/
│   ├── prompts.txt     # 슬라이드+썸네일 이미지 프롬프트 (수동 생성용)
│   └── slide-NN.png    # 자동 생성한 인포그래픽 (선택)
└── thumbnail/thumbnail.png
```

## 수동 모드 (비용 절약)

각 Claude 단계는 `자동/수동` 토글이 있습니다.
- **수동**: 화면의 프롬프트를 복사 → claude.ai(Opus 4.8)에 입력 → 응답(```json … ```)을 그대로 붙여넣으면 앱이 파싱합니다.
- **이미지 수동**: 프롬프트를 복사 → Google Flow/Gemini 웹에서 생성 → png 업로드.

## Vercel 배포

- GitHub repo: https://github.com/haemiru/youtube-jjangsaem (독립 repo)
- Vercel 에서 이 repo import → Root Directory: `./` (Framework: Next.js 자동 감지)
- 환경변수: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- 서버리스 환경에서는 `output/` 로컬 저장이 불가하므로 **ZIP 다운로드**를 사용하세요.
