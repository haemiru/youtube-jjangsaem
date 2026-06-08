"use client";
import { useMemo, useState } from "react";
import { parseBlog, type ParsedBlog } from "@/lib/parser";
import {
  buildScriptPrompt,
  buildMetadataPrompt,
  buildThumbnailPrompt,
  adaptImagePromptForYoutube,
  extractJson,
  type ScriptResult,
  type MetadataResult,
  type ThumbnailResult,
} from "@/lib/prompts";
import {
  videoSlug,
  buildScriptTxt,
  buildScriptSpacedTxt,
  buildMetadataTxt,
  buildImagePromptsTxt,
} from "@/lib/assemble";
import { saveToOutput, downloadZip, type OutFile } from "@/lib/client";
import { Card, Button, TextArea, ErrorMsg } from "@/components/ui";
import { ClaudeStep } from "@/components/ClaudeStep";
import { ImageStep } from "@/components/ImageStep";

export default function Home() {
  const [fileName, setFileName] = useState("");
  const [rawTxt, setRawTxt] = useState("");
  const [blog, setBlog] = useState<ParsedBlog | null>(null);
  const [parseErr, setParseErr] = useState("");
  const [minutes, setMinutes] = useState(8);

  const [script, setScript] = useState<ScriptResult | null>(null);
  const [metadata, setMetadata] = useState<MetadataResult | null>(null);
  const [thumbnail, setThumbnail] = useState<ThumbnailResult | null>(null);
  const [slideImages, setSlideImages] = useState<Record<number, string>>({});
  const [thumbImage, setThumbImage] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState("");

  const scriptPrompt = useMemo(
    () => (blog ? buildScriptPrompt(blog, { minutes }) : ""),
    [blog, minutes]
  );
  const metadataPrompt = useMemo(() => (blog ? buildMetadataPrompt(blog) : ""), [blog]);
  const thumbnailPrompt = useMemo(() => (blog ? buildThumbnailPrompt(blog) : ""), [blog]);

  function doParse(text: string, name: string) {
    setParseErr("");
    try {
      const p = parseBlog(text);
      setBlog(p);
      setFileName(name);
      // 새 파일이면 결과 초기화
      setScript(null);
      setMetadata(null);
      setThumbnail(null);
      setSlideImages({});
      setThumbImage(null);
      setSaveMsg("");
    } catch (e) {
      setParseErr(e instanceof Error ? e.message : "파싱 실패");
    }
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const t = reader.result as string;
      setRawTxt(t);
      doParse(t, file.name);
    };
    reader.readAsText(file, "utf-8");
  }

  const slug = blog ? videoSlug(blog, fileName) : "video";

  function collectFiles(): OutFile[] {
    const files: OutFile[] = [];
    if (blog && script) {
      const scriptTxt = buildScriptTxt(blog, script, thumbnail);
      files.push({ path: "script.txt", content: scriptTxt });
      files.push({ path: "script-spaced.txt", content: buildScriptSpacedTxt(scriptTxt) });
    }
    if (metadata) files.push({ path: "metadata.txt", content: buildMetadataTxt(metadata) });
    if (blog) files.push({ path: "images/prompts.txt", content: buildImagePromptsTxt(blog, thumbnail) });
    for (const [idx, dataUrl] of Object.entries(slideImages)) {
      files.push({
        path: `images/slide-${String(idx).padStart(2, "0")}.png`,
        content: dataUrl,
        isDataUrl: true,
      });
    }
    if (thumbImage) files.push({ path: "thumbnail/thumbnail.png", content: thumbImage, isDataUrl: true });
    return files;
  }

  async function onSave() {
    setSaveMsg("저장 중…");
    const files = collectFiles();
    const res = await saveToOutput(slug, files);
    if (res.saved) setSaveMsg(`✓ 로컬 저장 완료: ${res.path}`);
    else setSaveMsg(`로컬 저장 불가(${res.error || "서버리스 환경"}). ZIP 다운로드를 사용하세요.`);
  }

  async function onZip() {
    await downloadZip(slug, collectFiles());
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 80px" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--accent)" }}>▶</span> 짱샘 유튜브 메이커
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14, lineHeight: 1.6 }}>
          네이버 블로그 txt 한 편 → 유튜브 대본·인포그래픽·썸네일·제목·디스크립션·태그.
          각 단계는 <b style={{ color: "var(--foreground)" }}>자동(API)</b> 과{" "}
          <b style={{ color: "var(--foreground)" }}>수동(프롬프트 복사)</b> 을 선택할 수 있어요.
        </p>
      </header>

      {/* STEP 1 — 업로드 */}
      <Card title="블로그 txt 업로드 / 붙여넣기" step={1} done={!!blog}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label>
            <span
              style={{
                display: "inline-block",
                background: "var(--accent)",
                color: "#fff",
                borderRadius: 8,
                padding: "10px 18px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              📄 txt 파일 선택
            </span>
            <input
              type="file"
              accept=".txt,text/plain"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
          {fileName && <span style={{ color: "var(--muted)", fontSize: 13 }}>{fileName}</span>}
        </div>

        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "14px 0 0" }}>또는 본문을 직접 붙여넣기:</p>
        <TextArea value={rawTxt} onChange={setRawTxt} placeholder="블로그 txt 전체 내용 붙여넣기" rows={4} />
        <div style={{ marginTop: 8 }}>
          <Button onClick={() => doParse(rawTxt, fileName || "pasted.txt")} disabled={!rawTxt.trim()} variant="accent2">
            파싱하기
          </Button>
        </div>

        {parseErr && <ErrorMsg msg={parseErr} />}

        {blog && (
          <div
            style={{
              marginTop: 16,
              background: "var(--panel-2)",
              borderRadius: 10,
              padding: 16,
              fontSize: 13.5,
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{blog.meta.title}</div>
            <div style={{ color: "var(--muted)" }}>
              카테고리 {blog.meta.category} · 메인키워드 <b style={{ color: "var(--foreground)" }}>{blog.meta.mainKeyword}</b>
            </div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>
              본문 {blog.charCount.toLocaleString()}자 · 섹션 {blog.sections.length}개 · 인포그래픽 슬라이드{" "}
              <b style={{ color: "var(--foreground)" }}>{blog.imageSlots.length}장</b>
            </div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>해시태그 {blog.hashtags.join(" ")}</div>
            {blog.warnings.length > 0 && (
              <div style={{ color: "#ffcf8b", marginTop: 6 }}>⚠️ {blog.warnings.join(" / ")}</div>
            )}
          </div>
        )}
      </Card>

      {/* STEP 2 — 대본 */}
      <Card title="대본 (짱샘 단독 내레이션)" step={2} done={!!script} disabled={!blog}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>영상 길이</span>
          <input
            type="number"
            min={3}
            max={20}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            style={{
              width: 64,
              background: "var(--panel-2)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "6px 8px",
              fontSize: 13,
            }}
          />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>분</span>
        </div>
        {blog && (
          <ClaudeStep<ScriptResult>
            prompt={scriptPrompt}
            parse={(raw) => extractJson<ScriptResult>(raw)}
            result={script}
            onResult={setScript}
            maxTokens={20000}
            autoLabel="⚡ 대본 생성 (Opus 4.8)"
            render={(r) => (
              <div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                  Hook 패턴 {r.hookPattern} ({r.hookPatternLabel}) · 약 {r.estimatedMinutes}분 · 슬라이드 {r.slides.length}컷
                </div>
                {r.slides.map((s, i) => (
                  <div key={i} style={{ borderTop: "1px solid var(--border)", padding: "10px 0" }}>
                    <div style={{ fontSize: 12.5, color: "var(--accent-2)", marginBottom: 4 }}>
                      [{String(i + 1).padStart(2, "0")}] {s.heading} · {s.seconds}초
                      {s.imageRef ? ` · 🖼 slide-${String(s.imageRef).padStart(2, "0")}` : ""}
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{s.narration}</div>
                  </div>
                ))}
              </div>
            )}
          />
        )}
      </Card>

      {/* STEP 3 — 메타데이터 */}
      <Card title="제목 · 디스크립션 · 태그" step={3} done={!!metadata} disabled={!blog}>
        {blog && (
          <ClaudeStep<MetadataResult>
            prompt={metadataPrompt}
            parse={(raw) => extractJson<MetadataResult>(raw)}
            result={metadata}
            onResult={setMetadata}
            autoLabel="⚡ 메타데이터 생성 (Opus 4.8)"
            render={(r) => (
              <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                <b>제목 후보</b>
                <ol style={{ margin: "6px 0 14px", paddingLeft: 20 }}>
                  {r.titles.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
                <b>디스크립션</b>
                <div style={{ whiteSpace: "pre-wrap", background: "var(--panel-2)", borderRadius: 8, padding: 12, margin: "6px 0 14px" }}>
                  {r.description}
                </div>
                <b>태그 ({r.tags.length})</b>
                <div style={{ color: "var(--muted)", marginTop: 6 }}>{r.tags.join(", ")}</div>
                {r.pinnedComment && (
                  <>
                    <b style={{ display: "block", marginTop: 14 }}>고정댓글</b>
                    <div style={{ color: "var(--muted)", marginTop: 6 }}>{r.pinnedComment}</div>
                  </>
                )}
              </div>
            )}
          />
        )}
      </Card>

      {/* STEP 4 — 썸네일 */}
      <Card title="썸네일 (문구 + 이미지)" step={4} done={!!thumbnail} disabled={!blog}>
        {blog && (
          <ClaudeStep<ThumbnailResult>
            prompt={thumbnailPrompt}
            parse={(raw) => extractJson<ThumbnailResult>(raw)}
            result={thumbnail}
            onResult={setThumbnail}
            autoLabel="⚡ 썸네일 문구·프롬프트 생성"
            render={(r) => (
              <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                <b>썸네일 문구 후보</b>
                <ol style={{ margin: "6px 0 14px", paddingLeft: 20 }}>
                  {r.phrases.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ol>
                <div style={{ color: "var(--muted)", marginBottom: 14 }}>
                  좌측 상단: {r.miniCopyLeft} · 우측 상단: {r.miniCopyRight}
                </div>
                <b style={{ display: "block", marginBottom: 8 }}>썸네일 이미지</b>
                <ImageStep
                  prompt={r.imagePrompt}
                  filename={`${slug}-thumbnail.png`}
                  value={thumbImage}
                  onResult={setThumbImage}
                />
              </div>
            )}
          />
        )}
      </Card>

      {/* STEP 5 — 인포그래픽 이미지 */}
      <Card title={`인포그래픽 슬라이드 이미지${blog ? ` (${blog.imageSlots.length}장)` : ""}`} step={5} disabled={!blog}>
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 12px" }}>
          블로그 내장 프롬프트를 유튜브 16:9 로 보정했습니다. 슬라이드별로 자동(Gemini) 또는 수동(Google Flow)을 선택하세요.
        </p>
        {blog?.imageSlots.map((slot) => {
          const p = adaptImagePromptForYoutube(slot.prompt);
          return (
            <div key={slot.index} style={{ borderTop: "1px solid var(--border)", padding: "14px 0" }}>
              <div style={{ fontSize: 13, color: "var(--accent-2)", marginBottom: 8 }}>
                slide-{String(slot.index).padStart(2, "0")} · {slot.type}
                {slot.isHero ? " · ⭐대표" : ""}
              </div>
              <ImageStep
                prompt={p}
                filename={`${slug}-slide-${String(slot.index).padStart(2, "0")}.png`}
                value={slideImages[slot.index] ?? null}
                onResult={(d) => setSlideImages((prev) => ({ ...prev, [slot.index]: d }))}
                compact
              />
            </div>
          );
        })}
      </Card>

      {/* STEP 6 — 산출물 */}
      <Card title="산출물 저장 / 다운로드" step={6} disabled={!blog}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
          폴더명: <b style={{ color: "var(--foreground)" }}>output/{slug}/</b> — script.txt · script-spaced.txt · metadata.txt · images/ · thumbnail/
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={onSave} disabled={!script && !metadata}>💾 로컬 output 폴더에 저장</Button>
          <Button onClick={onZip} variant="accent2" disabled={!script && !metadata}>⬇ ZIP 다운로드</Button>
        </div>
        {saveMsg && <div style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>{saveMsg}</div>}
      </Card>
    </main>
  );
}
